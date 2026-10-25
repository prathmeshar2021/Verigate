/*
 * VERIGATE prototype: state, receipts and the simulated agent run.
 * All state lives in memory. Reloading the page resets the demo.
 */
window.VG = window.VG || {};

VG.store = (function () {
  var STEP_MS = 1100;
  var listeners = [];
  var timer = null;
  var st = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function emit() { listeners.forEach(function (fn) { fn(); }); }
  function now() { return VG.DEMO_START + (Date.now() - st.realStart); }
  function nextId() { st.seq += 1; return 'VG-2040-' + String(st.seq).padStart(4, '0'); }
  function find(id) { return st.log.filter(function (r) { return r.id === id; })[0] || null; }
  function parseIST(s) { return Date.parse(s + ':00+05:30'); }

  function init() {
    if (timer) { clearTimeout(timer); timer = null; }
    st = VG.seed();
    st.realStart = Date.now();
    st.seq = 30;
    st.log = [];
    st.run = null;
    st.runs = 0;
    st.refusals = [];
    st.guide = { ran: 0 };
    st.toasts = [];
    st.history.slice().sort(function (a, b) { return parseIST(a.at) - parseIST(b.at); }).forEach(function (h) {
      var r = {
        id: nextId(), at: parseIST(h.at), runId: null, task: null, kind: h.status === 'uninspected' ? 'uninspected' : 'action',
        category: h.category || null, title: h.title, status: h.status, decidedBy: h.decidedBy || null,
        rule: h.rule || null, checks: null, data: h.data || [], dataAccessed: h.status === 'allowed' ? (h.data || []) : [],
        destination: h.destination || null, outcome: h.outcome, reversibility: h.reversibility || '—',
        findings: null, savings: 0, wasAsked: h.decidedBy === 'you', amount: h.amount || 0, seeded: true,
        history: [{ at: parseIST(h.at), text: h.status === 'uninspected' ? 'Detected outside the gateway' : 'Decided: ' + h.status }]
      };
      st.log.unshift(r);
    });
    delete st.history;
    emit();
  }

  // ---------- receipts ----------

  function statusFor(decision) { return decision === 'ALLOW' ? 'allowed' : decision === 'ASK' ? 'paused' : 'blocked'; }

  function ruleText(ev) {
    if (ev.deciding) return ev.deciding.label + ': ' + ev.deciding.detail;
    var cat = ev.checks.filter(function (c) { return c.id === 'spend'; })[0] || ev.checks.filter(function (c) { return c.id === 'category'; })[0];
    return cat ? cat.label + ': ' + cat.detail : 'All checks passed';
  }

  function outcomeFor(action, ev) {
    var d = ev.decision;
    if (d === 'BLOCK') {
      if (ev.deciding && ev.deciding.id === 'access') return 'Not performed: ' + (st.agent.status === 'revoked' ? 'access revoked.' : 'emergency pause is on.');
      if (action.retryOf) return 'Not booked. Re-request blocked and logged as a steering attempt.';
      if (action.category === 'share') return 'Not sent. Nova was told this is prohibited.';
      return 'Not performed. Nova was told this needs a rule change by you.';
    }
    if (d === 'ASK') return 'Waiting for your decision. Nothing has been sent, booked or charged.';
    if (action.key === 'calendar') return 'Granted: ' + ev.narrowed + '.';
    if (action.key === 'profile') return 'Granted ' + ev.narrowed + '.';
    if (action.key === 'page') return 'Page read. Hidden instructions flagged and not treated as yours.';
    if (action.category === 'purchase') return 'Booked. ' + VG.fmt.inr(action.amount) + ' charged to card ending 0912 (simulated).';
    return action.detail || 'Completed.';
  }

  function dataAccessedFor(action, ev) {
    if (ev.decision !== 'ALLOW') return [];
    if (action.key === 'profile') return VG.engine.narrowProfile(st).granted.map(function (m) { return m.label + ': ' + m.value; });
    if (action.key === 'calendar') return [ev.narrowed];
    return action.data || [];
  }

  function makeReceipt(action, ev, decidedBy) {
    var t = now();
    var r = {
      id: nextId(), at: t, runId: action.runId || null, task: st.task.short, kind: 'action',
      category: action.category, title: action.title, status: statusFor(ev.decision), decidedBy: decidedBy || 'policy',
      rule: ruleText(ev), checks: ev.checks, action: action,
      data: action.data || [], dataAccessed: dataAccessedFor(action, ev), destination: action.destination || null,
      outcome: outcomeFor(action, ev), reversibility: action.reversibility || '—',
      findings: ev.findings, auditAt: ev.findings ? t : null, savings: 0, wasAsked: ev.decision === 'ASK',
      amount: action.amount || 0,
      history: [{ at: t, text: 'Requested by ' + (action.userInitiated ? 'you' : 'Nova') }]
    };
    r.history.push({ at: t, text: ev.decision === 'ALLOW' ? 'Allowed by policy' : ev.decision === 'ASK' ? 'Paused for your decision' : 'Blocked by ' + (ev.deciding ? ev.deciding.label.toLowerCase() : 'policy') });
    st.log.unshift(r);
    return r;
  }

  function systemEvent(title, outcome) {
    var t = now();
    st.log.unshift({ id: nextId(), at: t, kind: 'system', status: 'system', title: title, outcome: outcome,
      decidedBy: 'you', history: [{ at: t, text: title }], data: [], dataAccessed: [] });
  }

  // ---------- agent run ----------

  function buildAction(tpl) {
    var a = clone(tpl);
    a.runId = st.run.id;
    if (a.audit === 'flight') {
      var granted = VG.engine.narrowProfile(st).granted;
      a.citesInference = granted.some(function (m) { return m.id === 'm-inf-carrier'; });
      a.rationale = 'Non-stop full-service flight with 30 kg baggage and an included vegetarian meal.' +
        (a.citesInference ? ' Matches your preference for full-service carriers.' : '');
    }
    return a;
  }

  function pendingBooking() {
    return st.log.filter(function (r) { return r.status === 'paused'; });
  }

  function canRun() {
    if (st.run && (st.run.status === 'running' || st.run.status === 'awaiting')) return false;
    return pendingBooking().length === 0;
  }

  function startRun() {
    if (!canRun()) return false;
    st.runs += 1;
    st.guide.ran += 1;
    if (st.guide.ruleEdited) st.guide.rerunAfterRule = true;
    st.refusals = [];
    st.run = { id: 'R' + st.runs, status: 'running', index: 0, receipts: [], startedAt: now(), haltReason: null };
    emit();
    timer = setTimeout(step, 450);
    return true;
  }

  function step() {
    timer = null;
    var run = st.run;
    if (!run || run.status !== 'running') return;
    var tpl = run.pendingRetry ? st.retry : st.script[run.index];
    var action = buildAction(tpl);
    var ev = VG.engine.evaluate(action, st);
    var r = makeReceipt(action, ev);
    run.receipts.push(r.id);

    if (ev.decision === 'ASK') { run.status = 'awaiting'; run.awaiting = r.id; emit(); return; }
    if (ev.decision === 'BLOCK' && ev.deciding && ev.deciding.id === 'access') {
      run.status = 'halted'; run.haltReason = st.agent.status === 'revoked' ? 'Access revoked' : 'Emergency pause';
      emit(); return;
    }
    if (ev.decision === 'BLOCK' && tpl.critical) { run.status = 'halted'; run.haltReason = 'Nova needs search to continue'; emit(); return; }

    if (run.pendingRetry) { run.pendingRetry = false; run.status = 'done'; emit(); return; }
    run.index += 1;
    if (run.index >= st.script.length) { run.status = 'done'; emit(); return; }
    emit();
    timer = setTimeout(step, STEP_MS);
  }

  function resolveRun(receipt, retry) {
    var run = st.run;
    if (!run || run.awaiting !== receipt.id) return;
    run.awaiting = null;
    if (retry) {
      run.status = 'running'; run.pendingRetry = true;
      timer = setTimeout(step, 1600);
      return;
    }
    // A step paused mid-task: once you decide, Nova carries on with the rest.
    var wasRetry = receipt.action && receipt.action.retryOf;
    if (!wasRetry && run.index < st.script.length - 1) {
      run.index += 1; run.status = 'running';
      timer = setTimeout(step, STEP_MS);
      return;
    }
    run.status = 'done';
  }

  function finalise(r, status, outcome, text) {
    var t = now();
    r.status = status;
    r.decidedBy = 'you';
    r.outcome = outcome;
    r.history.push({ at: t, text: text });
    st.guide.decided = true;
  }

  function agentBlockedReason() {
    if (st.agent.status === 'paused') return 'Nova is paused. Resume the agent to carry out an approved action.';
    if (st.agent.status === 'revoked') return 'Nova’s access is revoked. Reconnect it on Agents & Rules first.';
    return null;
  }

  function approve(id) {
    var r = find(id); if (!r || r.status !== 'paused') return { ok: false };
    var why = agentBlockedReason(); if (why) return { ok: false, message: why };
    var ev = VG.engine.evaluate(r.action, st, { userApproved: true });
    if (ev.decision === 'BLOCK') {
      finalise(r, 'blocked', 'Not performed. A NEVER rule or hard cap now applies, and an approval cannot override it.', 'Approval refused by ' + ev.deciding.label.toLowerCase());
      r.checks = ev.checks; r.rule = ruleText(ev);
    } else {
      r.checks = ev.checks; r.rule = 'Approved once by you. ' + r.rule;
      r.findings = r.findings ? VG.engine.audit(r.action, st) : null;
      r.dataAccessed = r.data.slice();
      finalise(r, 'allowed', r.category === 'purchase' ? 'Booked. ' + VG.fmt.inr(r.amount) + ' charged to card ending 0912 (simulated).' : 'Performed after your one-off approval.', 'Approved once by you');
    }
    resolveRun(r, false); emit(); return { ok: true, receipt: r };
  }

  function reject(id) {
    var r = find(id); if (!r || r.status !== 'paused') return { ok: false };
    if (r.findings) r.findings = VG.engine.audit(r.action, st);
    finalise(r, 'blocked', 'Not performed. Nova was told no.', 'Rejected by you');
    r.rule = 'Rejected by you. ' + r.rule;
    var willRetry = r.action && r.action.key === 'book' && st.agent.status === 'active';
    if (r.action) st.refusals.push({ runId: r.runId, fingerprint: VG.engine.fingerprint(r.action) });
    resolveRun(r, willRetry); emit(); return { ok: true, receipt: r, retry: willRetry };
  }

  function chooseAlternative(id) {
    var r = find(id); if (!r || r.status !== 'paused' || !r.findings || !r.findings.alternative) return { ok: false };
    var why = agentBlockedReason(); if (why) return { ok: false, message: why };
    var alt = st.flights[r.findings.alternative];
    var action = {
      key: 'alt', category: 'purchase', option: alt.id, userInitiated: true, runId: r.runId,
      title: 'Book ' + alt.airline + ' via ' + alt.platform + ' — ' + VG.fmt.inr(alt.price),
      destination: alt.platformDomain, amount: alt.price,
      data: ['Passenger name', 'Passport number', 'Payment card ending 0912'],
      reversibility: 'Yes — refundable (cancellation fee ₹2,500)'
    };
    var ev = VG.engine.evaluate(action, st, { userApproved: true });
    r.findings = VG.engine.audit(r.action, st);
    finalise(r, 'blocked', 'Not booked. You chose the ' + alt.airline + ' alternative instead.', 'You chose the alternative');
    r.rule = 'Replaced by your choice. ' + r.rule;
    var nr = makeReceipt(action, ev, 'you');
    if (ev.decision === 'ALLOW') {
      nr.savings = r.amount - alt.price;
      nr.outcome = 'Booked. ' + VG.fmt.inr(alt.price) + ' charged to card ending 0912 (simulated). Verified saving: ' + VG.fmt.inr(nr.savings) + ' against Nova’s choice.';
      nr.related = r.id; r.related = nr.id;
    }
    resolveRun(r, false); emit(); return { ok: true, receipt: nr };
  }

  // ---------- rules, agent controls ----------

  function describeRuleChanges(a, b) {
    var out = [];
    Object.keys(a.categories).forEach(function (k) {
      var x = a.categories[k], y = b.categories[k];
      if (x.mode !== y.mode) out.push(x.label + ': ' + x.mode + ' → ' + y.mode);
      if (x.autoLimit !== y.autoLimit) out.push('Auto-approve limit: ' + VG.fmt.inr(x.autoLimit) + ' → ' + VG.fmt.inr(y.autoLimit));
      if (x.hardCap !== y.hardCap) out.push('Hard cap: ' + VG.fmt.inr(x.hardCap) + ' → ' + VG.fmt.inr(y.hardCap));
      if (x.minimise !== y.minimise) out.push('Data minimisation: ' + (y.minimise ? 'on' : 'off'));
    });
    a.boundaries.forEach(function (bd, i) {
      if (bd.active !== b.boundaries[i].active) out.push((b.boundaries[i].active ? 'Turned on' : 'Turned off') + ' boundary: “' + bd.text + '”');
    });
    if (a.conflictPolicy !== b.conflictPolicy) out.push('When the auditor finds a conflict: ' + (b.conflictPolicy === 'pause' ? 'pause for me' : 'note in receipt only'));
    return out;
  }

  function saveRules(newRules, newExpiry) {
    var changes = describeRuleChanges(st.rules, newRules);
    if (newExpiry && newExpiry !== st.agent.expiry) {
      changes.push('Nova’s permissions now expire after ' + VG.expiryLabel(newExpiry));
      st.agent.expiry = newExpiry;
    }
    if (!changes.length) return [];
    st.rules = clone(newRules);
    st.guide.ruleEdited = true;
    systemEvent('Rules updated by you', changes.join(' · ') + '. Applies to future actions.');
    emit();
    return changes;
  }

  function setAgentStatus(status) {
    var prev = st.agent.status;
    if (prev === status) return;
    st.agent.status = status;
    if (status === 'paused') { st.guide.paused = true; systemEvent('Emergency pause turned on', 'Nova cannot perform protected actions through the gateway.'); }
    if (status === 'revoked') systemEvent('Nova’s access revoked', 'Gateway credentials withdrawn. Every protected action is now blocked.');
    if (status === 'active') systemEvent(prev === 'revoked' ? 'Nova reconnected' : 'Emergency pause turned off', 'Protected actions are checked against your rules again.');
    emit();
  }

  // ---------- memory ----------

  function mem(id) { return st.memory.filter(function (m) { return m.id === id; })[0]; }

  function editMemory(id, value) {
    var m = mem(id); if (!m || !value.trim() || value.trim() === m.value) return;
    var before = m.value;
    m.value = value.trim();
    m.updated = new Date(now()).toISOString().slice(0, 10);
    if (m.kind === 'inference' || m.kind === 'outdated') {
      m.kind = 'preference'; m.source = 'Corrected by you'; delete m.confidence; delete m.status;
    } else {
      m.source = 'Edited by you';
    }
    systemEvent('Memory corrected: ' + m.label, '“' + before + '” → “' + m.value + '”. Nova will receive the corrected version.');
    emit();
  }

  function toggleRestrict(id) {
    var m = mem(id); if (!m) return;
    m.access = m.access === 'allowed' ? 'restricted' : 'allowed';
    systemEvent('Memory ' + (m.access === 'restricted' ? 'restricted' : 'allowed') + ': ' + m.label,
      m.access === 'restricted' ? 'The gateway will withhold “' + m.value + '” from Nova.' : 'Nova may receive “' + m.value + '” when a task needs it.');
    emit();
  }

  function setInference(id, status) {
    var m = mem(id); if (!m || m.kind !== 'inference') return;
    m.status = status;
    if (status === 'incorrect') m.access = 'restricted';
    systemEvent('Inference ' + (status === 'confirmed' ? 'confirmed' : 'marked incorrect') + ': ' + m.label,
      status === 'confirmed' ? '“' + m.value + '” is now treated as true.' : '“' + m.value + '” will be withheld from Nova.');
    emit();
  }

  function deleteMemory(id) {
    var m = mem(id); if (!m) return;
    st.memory = st.memory.filter(function (x) { return x.id !== id; });
    systemEvent('Memory deleted: ' + m.label,
      'Removed from VERIGATE’s local profile. A deletion request was sent to Nova Labs (simulated). Status: awaiting confirmation. VERIGATE cannot verify or erase copies held by other services.');
    emit();
  }

  // Silent: called during rendering, so it must not trigger another render.
  function markGuide(k) { st.guide[k] = true; }

  // ---------- derived ----------

  function stats() {
    var acts = st.log.filter(function (r) { return r.kind === 'action'; });
    var unins = st.log.filter(function (r) { return r.kind === 'uninspected'; }).length;
    var c = function (s) { return acts.filter(function (r) { return r.status === s; }).length; };
    var asked = acts.filter(function (r) { return r.wasAsked; }).length;
    return {
      reviewed: acts.length, allowed: c('allowed'), paused: c('paused'), blocked: c('blocked'),
      uninspected: unins, coverage: acts.length ? Math.round(100 * acts.length / (acts.length + unins)) : 0,
      asked: asked, savings: acts.reduce(function (s, r) { return s + (r.savings || 0); }, 0)
    };
  }

  return {
    init: init,
    get: function () { return st; },
    now: now,
    find: find,
    subscribe: function (fn) { listeners.push(fn); },
    canRun: canRun,
    startRun: startRun,
    approve: approve,
    reject: reject,
    chooseAlternative: chooseAlternative,
    saveRules: saveRules,
    setAgentStatus: setAgentStatus,
    editMemory: editMemory,
    toggleRestrict: toggleRestrict,
    setInference: setInference,
    deleteMemory: deleteMemory,
    markGuide: markGuide,
    pending: pendingBooking,
    stats: stats,
    clone: clone
  };
})();

VG.expiryLabel = function (v) {
  return { '24h': '24 hours', '7d': '7 days', '30d': '30 days', 'never': 'no expiry' }[v] || v;
};
