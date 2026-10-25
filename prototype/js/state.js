// App state, receipts, and Nova’s scripted run. Everything is in memory;
// a reload starts over.

window.VG = window.VG || {};

VG.expiryLabel = v => ({ '24h': '24 hours', '7d': '7 days', '30d': '30 days', never: 'never' })[v] || v;

VG.store = (() => {
  const STEP_MS = 1100;
  const listeners = [];
  let timer = null;
  let st = null;

  const clone = o => JSON.parse(JSON.stringify(o));
  const emit = () => listeners.forEach(fn => fn());
  const now = () => VG.DEMO_START + (Date.now() - st.realStart);
  const nextId = () => 'VG-2040-' + String(++st.seq).padStart(4, '0');
  const find = id => st.log.find(r => r.id === id) || null;
  const ist = s => Date.parse(s + ':00+05:30');
  const later = (fn, ms) => { timer = setTimeout(fn, ms); };

  function init() {
    clearTimeout(timer);
    st = VG.seed();
    Object.assign(st, { realStart: Date.now(), seq: 30, log: [], run: null, runs: 0, refusals: [], guide: { ran: 0 } });
    st.history
      .sort((a, b) => ist(a.at) - ist(b.at))
      .forEach(h => {
        const at = ist(h.at);
        const unseen = h.status === 'uninspected';
        st.log.unshift({
          id: nextId(), at, runId: null, task: null, kind: unseen ? 'uninspected' : 'action',
          category: h.category || null, title: h.title, status: h.status, decidedBy: h.decidedBy || null,
          rule: h.rule || null, checks: null, data: h.data || [], dataAccessed: h.status === 'allowed' ? (h.data || []) : [],
          destination: h.destination || null, outcome: h.outcome, reversibility: h.reversibility || '–',
          findings: null, savings: 0, wasAsked: h.decidedBy === 'you', amount: h.amount || 0,
          history: [{ at, text: unseen ? 'Seen outside the gateway' : h.status === 'allowed' ? 'Allowed' : 'Blocked' }]
        });
      });
    delete st.history;
    emit();
  }

  // Receipts

  const statusFor = d => ({ ALLOW: 'allowed', ASK: 'paused', BLOCK: 'blocked' })[d];

  function ruleText(ev) {
    if (ev.deciding) return `${ev.deciding.label}: ${ev.deciding.detail}`;
    const c = ev.checks.find(c => c.id === 'spend') || ev.checks.find(c => c.id === 'category');
    return c ? `${c.label}: ${c.detail}` : 'All checks passed';
  }

  function outcomeFor(a, ev) {
    if (ev.decision === 'BLOCK') {
      if (ev.deciding && ev.deciding.id === 'access') return st.agent.status === 'revoked' ? 'Not done. Access revoked.' : 'Not done. Nova is paused.';
      if (a.retryOf) return 'Not booked. Logged as asking again after a no.';
      if (a.category === 'share') return 'Not sent.';
      return 'Not done.';
    }
    if (ev.decision === 'ASK') return 'Waiting for you. Nothing sent or charged.';
    if (a.key === 'calendar') return `Sent ${ev.narrowed}.`;
    if (a.key === 'profile') return `${ev.narrowed}.`;
    if (a.key === 'page') return 'Read. Hidden text flagged.';
    if (a.category === 'purchase') return `Booked. ${VG.inr(a.amount)} on card ending 0912.`;
    return a.detail || 'Done.';
  }

  function dataAccessedFor(a, ev) {
    if (ev.decision !== 'ALLOW') return [];
    if (a.key === 'profile') return VG.engine.narrowProfile(st).granted.map(m => `${m.label}: ${m.value}`);
    if (a.key === 'calendar') return [ev.narrowed];
    return a.data || [];
  }

  function makeReceipt(a, ev, decidedBy = 'policy') {
    const t = now();
    const r = {
      id: nextId(), at: t, runId: a.runId || null, task: st.task.short, kind: 'action',
      category: a.category, title: a.title, status: statusFor(ev.decision), decidedBy,
      rule: ruleText(ev), checks: ev.checks, action: a,
      data: a.data || [], dataAccessed: dataAccessedFor(a, ev), destination: a.destination || null,
      outcome: outcomeFor(a, ev), reversibility: a.reversibility || '–',
      findings: ev.findings, auditAt: ev.findings ? t : null, savings: 0, wasAsked: ev.decision === 'ASK',
      amount: a.amount || 0,
      history: [
        { at: t, text: a.userInitiated ? 'You asked for this' : 'Nova asked for this' },
        { at: t, text: { ALLOW: 'Allowed', ASK: 'Held for you', BLOCK: 'Blocked (' + (ev.deciding ? ev.deciding.label.toLowerCase() : 'rules') + ')' }[ev.decision] }
      ]
    };
    st.log.unshift(r);
    return r;
  }

  function note(title, outcome) {
    const t = now();
    st.log.unshift({ id: nextId(), at: t, kind: 'system', status: 'system', title, outcome,
      decidedBy: 'you', history: [{ at: t, text: title }], data: [], dataAccessed: [] });
  }

  // The agent run

  function buildAction(tpl) {
    const a = clone(tpl);
    a.runId = st.run.id;
    if (a.audit === 'flight') {
      a.citesInference = VG.engine.narrowProfile(st).granted.some(m => m.id === 'm-inf-carrier');
      a.rationale = 'Non-stop, full-service, 30 kg bags and a vegetarian meal included.' +
        (a.citesInference ? ' You prefer full-service airlines.' : '');
    }
    return a;
  }

  const pending = () => st.log.filter(r => r.status === 'paused');

  function canRun() {
    if (st.run && ['running', 'awaiting'].includes(st.run.status)) return false;
    return pending().length === 0;
  }

  function startRun() {
    if (!canRun()) return false;
    st.runs += 1;
    st.guide.ran += 1;
    if (st.guide.ruleEdited) st.guide.rerunAfterRule = true;
    st.refusals = [];
    st.run = { id: 'R' + st.runs, status: 'running', index: 0, receipts: [], haltReason: null };
    emit();
    later(step, 450);
    return true;
  }

  function step() {
    const run = st.run;
    if (!run || run.status !== 'running') return;
    const tpl = run.pendingRetry ? st.retry : st.script[run.index];
    const a = buildAction(tpl);
    const ev = VG.engine.evaluate(a, st);
    const r = makeReceipt(a, ev);
    run.receipts.push(r.id);

    if (ev.decision === 'ASK') { run.status = 'awaiting'; run.awaiting = r.id; return emit(); }
    if (ev.decision === 'BLOCK' && ev.deciding && ev.deciding.id === 'access') {
      run.status = 'halted';
      run.haltReason = st.agent.status === 'revoked' ? 'access revoked' : 'Nova paused';
      return emit();
    }
    if (ev.decision === 'BLOCK' && tpl.critical) { run.status = 'halted'; run.haltReason = 'search is blocked'; return emit(); }
    if (run.pendingRetry) { run.pendingRetry = false; run.status = 'done'; return emit(); }

    run.index += 1;
    if (run.index >= st.script.length) run.status = 'done';
    else later(step, STEP_MS);
    emit();
  }

  function resolveRun(r, retry) {
    const run = st.run;
    if (!run || run.awaiting !== r.id) return;
    run.awaiting = null;
    if (retry) { run.status = 'running'; run.pendingRetry = true; return later(step, 1600); }
    // Held partway through: carry on with the rest of the task.
    if (!(r.action && r.action.retryOf) && run.index < st.script.length - 1) {
      run.index += 1; run.status = 'running';
      return later(step, STEP_MS);
    }
    run.status = 'done';
  }

  function decide(r, status, outcome, text) {
    Object.assign(r, { status, decidedBy: 'you', outcome });
    r.history.push({ at: now(), text });
    st.guide.decided = true;
  }

  function agentBlocked() {
    if (st.agent.status === 'paused') return 'Nova is paused. Resume it first.';
    if (st.agent.status === 'revoked') return 'Nova’s access is revoked. Reconnect it under Rules first.';
    return null;
  }

  function approve(id) {
    const r = find(id);
    if (!r || r.status !== 'paused') return { ok: false };
    const why = agentBlocked();
    if (why) return { ok: false, message: why };
    const ev = VG.engine.evaluate(r.action, st, { userApproved: true });
    r.checks = ev.checks;
    if (ev.decision === 'BLOCK') {
      r.rule = ruleText(ev);
      decide(r, 'blocked', 'Not done. A never rule or cap applies now, and approving can’t override it.', 'Approval refused');
    } else {
      r.rule = 'Approved once by you. ' + r.rule;
      if (r.findings) r.findings = VG.engine.audit(r.action, st);
      r.dataAccessed = r.data.slice();
      decide(r, 'allowed', r.category === 'purchase' ? `Booked. ${VG.inr(r.amount)} on card ending 0912.` : 'Done, after you approved it.', 'Approved once by you');
    }
    resolveRun(r, false);
    emit();
    return { ok: true, receipt: r };
  }

  function reject(id) {
    const r = find(id);
    if (!r || r.status !== 'paused') return { ok: false };
    if (r.findings) r.findings = VG.engine.audit(r.action, st);
    decide(r, 'blocked', 'Not done. Nova was told no.', 'Rejected by you');
    r.rule = 'Rejected by you. ' + r.rule;
    const retry = !!r.action && r.action.key === 'book' && st.agent.status === 'active';
    if (r.action) st.refusals.push({ runId: r.runId, fingerprint: VG.engine.fingerprint(r.action) });
    resolveRun(r, retry);
    emit();
    return { ok: true, receipt: r, retry };
  }

  function chooseAlternative(id) {
    const r = find(id);
    if (!r || r.status !== 'paused' || !r.findings || !r.findings.alternative) return { ok: false };
    const why = agentBlocked();
    if (why) return { ok: false, message: why };
    const alt = st.flights[r.findings.alternative];
    const a = {
      key: 'alt', category: 'purchase', option: alt.id, userInitiated: true, runId: r.runId,
      title: `Book ${alt.airline} direct, ${VG.inr(alt.price)}`,
      destination: alt.platformDomain, amount: alt.price,
      data: ['Passenger name', 'Passport number', 'Card ending 0912'],
      reversibility: 'Yes. Refundable, ₹2,500 fee'
    };
    const ev = VG.engine.evaluate(a, st, { userApproved: true });
    r.findings = VG.engine.audit(r.action, st);
    decide(r, 'blocked', `Not booked. You picked ${alt.airline} instead.`, 'You picked the alternative');
    r.rule = 'Replaced by your choice. ' + r.rule;
    const nr = makeReceipt(a, ev, 'you');
    if (ev.decision === 'ALLOW') {
      nr.savings = r.amount - alt.price;
      nr.outcome = `Booked. ${VG.inr(alt.price)} on card ending 0912. ${VG.inr(nr.savings)} less than Nova’s pick.`;
      nr.related = r.id;
      r.related = nr.id;
    }
    resolveRun(r, false);
    emit();
    return { ok: true, receipt: nr };
  }

  // Rules and agent controls

  function diffRules(a, b) {
    const out = [];
    for (const k of Object.keys(a.categories)) {
      const x = a.categories[k], y = b.categories[k];
      if (x.mode !== y.mode) out.push(`${x.label}: ${x.mode} → ${y.mode}`);
      if (x.autoLimit !== y.autoLimit) out.push(`auto limit ${VG.inr(x.autoLimit)} → ${VG.inr(y.autoLimit)}`);
      if (x.hardCap !== y.hardCap) out.push(`cap ${VG.inr(x.hardCap)} → ${VG.inr(y.hardCap)}`);
      if (x.minimise !== y.minimise) out.push(`data minimising ${y.minimise ? 'on' : 'off'}`);
    }
    a.boundaries.forEach((bd, i) => {
      if (bd.active !== b.boundaries[i].active) out.push(`${b.boundaries[i].active ? 'on' : 'off'}: “${bd.text}”`);
    });
    if (a.conflictPolicy !== b.conflictPolicy) out.push(`conflicts: ${b.conflictPolicy === 'pause' ? 'hold' : 'note only'}`);
    return out;
  }

  function saveRules(rules, expiry) {
    const changes = diffRules(st.rules, rules);
    if (expiry && expiry !== st.agent.expiry) {
      changes.push(`access expires after ${VG.expiryLabel(expiry)}`);
      st.agent.expiry = expiry;
    }
    if (!changes.length) return [];
    st.rules = clone(rules);
    st.guide.ruleEdited = true;
    note('Rules changed', changes.join('; ') + '. Applies from the next request.');
    emit();
    return changes;
  }

  function setAgentStatus(status) {
    const prev = st.agent.status;
    if (prev === status) return;
    st.agent.status = status;
    if (status === 'paused') { st.guide.paused = true; note('Nova paused', 'No requests go through until you resume.'); }
    if (status === 'revoked') note('Nova’s access revoked', 'Gateway credentials withdrawn.');
    if (status === 'active') note(prev === 'revoked' ? 'Nova reconnected' : 'Nova resumed', 'Requests are checked against your rules again.');
    emit();
  }

  // Memory

  const mem = id => st.memory.find(m => m.id === id);
  const today = () => new Date(now()).toISOString().slice(0, 10);

  function editMemory(id, value) {
    const m = mem(id);
    const v = value.trim();
    if (!m || !v || v === m.value) return;
    const before = m.value;
    m.value = v;
    m.updated = today();
    if (m.kind === 'inference' || m.kind === 'outdated') {
      // Correcting a guess turns it into something you said.
      Object.assign(m, { kind: 'preference', source: 'You (corrected)' });
      delete m.confidence;
      delete m.status;
    } else {
      m.source = 'You (edited)';
    }
    note(`Memory edited: ${m.label}`, `“${before}” → “${m.value}”`);
    emit();
  }

  function toggleRestrict(id) {
    const m = mem(id);
    if (!m) return;
    m.access = m.access === 'allowed' ? 'restricted' : 'allowed';
    note(`${m.label}: ${m.access === 'restricted' ? 'hidden from' : 'visible to'} Nova`, `“${m.value}”`);
    emit();
  }

  function setInference(id, status) {
    const m = mem(id);
    if (!m || m.kind !== 'inference') return;
    m.status = status;
    if (status === 'incorrect') m.access = 'restricted';
    note(`Guess ${status === 'confirmed' ? 'confirmed' : 'marked wrong'}: ${m.label}`,
      status === 'confirmed' ? `“${m.value}” now counts as true.` : `“${m.value}” won’t be sent to Nova.`);
    emit();
  }

  function deleteMemory(id) {
    const m = mem(id);
    if (!m) return;
    st.memory = st.memory.filter(x => x.id !== id);
    note(`Memory deleted: ${m.label}`, 'Removed locally. Deletion request sent to Nova Labs, not yet confirmed. Copies held elsewhere aren’t covered.');
    emit();
  }

  // Called while rendering, so it mustn't emit.
  const markGuide = k => { st.guide[k] = true; };

  function stats() {
    const acts = st.log.filter(r => r.kind === 'action');
    const unseen = st.log.filter(r => r.kind === 'uninspected').length;
    const count = s => acts.filter(r => r.status === s).length;
    return {
      reviewed: acts.length, allowed: count('allowed'), paused: count('paused'), blocked: count('blocked'),
      uninspected: unseen, coverage: acts.length ? Math.round(100 * acts.length / (acts.length + unseen)) : 0,
      asked: acts.filter(r => r.wasAsked).length,
      savings: acts.reduce((s, r) => s + (r.savings || 0), 0)
    };
  }

  return {
    init, now, find, canRun, startRun, approve, reject, chooseAlternative, saveRules, setAgentStatus,
    editMemory, toggleRestrict, setInference, deleteMemory, markGuide, pending, stats, clone,
    get: () => st,
    subscribe: fn => listeners.push(fn)
  };
})();
