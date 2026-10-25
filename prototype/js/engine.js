// Policy checks and the conflict auditor.
// evaluate() is deterministic: same request + same rules = same result.

window.VG = window.VG || {};

VG.inr = n => '₹' + Number(n).toLocaleString('en-IN');

VG.engine = (() => {
  const RANK = { pass: 0, flag: 0, ask: 1, block: 2 };

  const ORDER = [
    { id: 'access', label: 'Agent access', desc: 'Nova is connected and not paused.' },
    { id: 'boundary', label: 'Never rules', desc: 'The request doesn’t break one. Approving once can’t get round these.' },
    { id: 'category', label: 'Category', desc: 'AUTO, ASK or NEVER for this kind of request.' },
    { id: 'spend', label: 'Spend', desc: 'Purchases: under the auto limit, and under the hard cap.' },
    { id: 'scope', label: 'Data scope', desc: 'Reads: cut down to what the task needs.' },
    { id: 'provenance', label: 'Source', desc: 'Whether the request came from you or from something Nova read, and whether Nova is pushing.' },
    { id: 'audit', label: 'Conflict check', desc: 'Cheaper equivalents, commercial ties, reasons built on guesses. Adds evidence; doesn’t decide.' }
  ];

  const mk = (id, result, detail) => ({ id, label: ORDER.find(c => c.id === id).label, result, detail });
  const fingerprint = a => a.category + ':' + (a.option || a.key);
  const trusted = (st, dest) => st.rules.trusted.includes(dest);
  const memItem = (st, id) => st.memory.find(m => m.id === id);

  function narrowProfile(st) {
    const minimise = st.rules.categories.read.minimise;
    const granted = [], withheld = [];
    for (const m of st.memory) {
      let reason = null;
      if (m.access === 'restricted') reason = 'hidden by you';
      else if (m.kind === 'inference' && m.status === 'incorrect') reason = 'marked wrong';
      else if (minimise && m.kind === 'outdated') reason = 'out of date';
      else if (minimise && !m.travel) reason = 'not needed';
      if (reason) withheld.push({ item: m, reason });
      else granted.push(m);
    }
    return { granted, withheld };
  }

  function boundaryHits(a, st) {
    return st.rules.boundaries.filter(b => {
      if (!b.active) return false;
      switch (b.id) {
        case 'hb-identity': return a.category === 'share' && a.dataClass === 'identity' && !trusted(st, a.destination);
        case 'hb-health': return a.category === 'share' && a.dataClass === 'health' && ['advertiser', 'broker'].includes(a.destinationType);
        case 'hb-retry': return !a.userInitiated && st.refusals.some(r => r.runId === a.runId && r.fingerprint === fingerprint(a));
        case 'hb-jobs': return a.category === 'commit' && a.subtype === 'job-offer';
      }
      return false;
    }).map(b => mk('boundary', 'block', b.text));
  }

  function evaluate(a, st, opts = {}) {
    const cat = st.rules.categories[a.category];
    const inr = VG.inr;
    let checks = [];

    if (st.agent.status === 'revoked') checks.push(mk('access', 'block', 'Access revoked.'));
    else if (st.agent.status === 'paused') checks.push(mk('access', 'block', 'Nova is paused.'));
    else checks.push(mk('access', 'pass', 'Connected.'));

    const hits = boundaryHits(a, st);
    checks.push(...(hits.length ? hits : [mk('boundary', 'pass', 'None apply.')]));

    if (a.userInitiated) checks.push(mk('category', 'pass', 'You chose this.'));
    else if (cat.mode === 'NEVER') checks.push(mk('category', 'block', `${cat.label} is set to NEVER.`));
    else if (cat.mode === 'ASK') checks.push(mk('category', 'ask', `${cat.label} is set to ASK.`));
    else checks.push(mk('category', 'pass', `${cat.label} is set to AUTO.`));

    if (a.category === 'purchase') {
      const amt = a.amount || 0;
      if (amt > cat.hardCap) checks.push(mk('spend', 'block', `${inr(amt)} is over your ${inr(cat.hardCap)} cap.`));
      else if (!a.userInitiated && cat.mode === 'AUTO' && amt > cat.autoLimit) checks.push(mk('spend', 'ask', `${inr(amt)} is over your ${inr(cat.autoLimit)} auto limit.`));
      else if (!a.userInitiated && cat.mode === 'AUTO') checks.push(mk('spend', 'pass', `${inr(amt)} is within your ${inr(cat.autoLimit)} auto limit.`));
      else checks.push(mk('spend', 'pass', `${inr(amt)} is under your ${inr(cat.hardCap)} cap.`));
    }

    let narrowed = null;
    if (a.category === 'read') {
      if (a.memoryRead) {
        const p = narrowProfile(st);
        narrowed = `${p.granted.length} profile items sent, ${p.withheld.length} held back`;
        checks.push(mk('scope', cat.minimise ? 'pass' : 'flag', cat.minimise ? `Cut down: ${narrowed}.` : `Minimising is off: ${narrowed}.`));
      } else if (cat.minimise && a.scopeNarrowed) {
        narrowed = a.scopeNarrowed;
        checks.push(mk('scope', 'pass', `Asked for ${a.scopeRequested}; got ${narrowed}.`));
      } else {
        narrowed = a.scopeRequested;
        checks.push(mk('scope', 'flag', `Minimising is off, so Nova got the ${a.scopeRequested}.`));
      }
    }

    if (a.provenance === 'web') checks.push(mk('provenance', 'flag', a.provenanceNote));
    else if (a.untrustedContent) checks.push(mk('provenance', 'flag', 'Hidden text for AI agents on this page. Treated as page content, not as something you asked for.'));
    else if (a.agentMessage) checks.push(mk('provenance', 'flag', `Asked again after you said no, with: “${a.agentMessage}”`));
    else checks.push(mk('provenance', 'pass', a.userInitiated ? 'You.' : 'Part of your task.'));

    let findings = null;
    if (a.audit === 'flight') {
      findings = audit(a, st);
      const n = findings.potential.length;
      if (!n) checks.push(mk('audit', 'pass', 'Nothing found.'));
      else if (st.rules.conflictPolicy === 'pause') checks.push(mk('audit', 'ask', `${n} possible conflict${n > 1 ? 's' : ''}. You asked to hold these.`));
      else checks.push(mk('audit', 'flag', `${n} possible conflict${n > 1 ? 's' : ''}. Noted, not held (your setting).`));
    }

    // Approving once clears "ask". It never clears "block".
    if (opts.userApproved) {
      checks = checks.map(c => c.result === 'ask' ? { ...c, result: 'pass', detail: c.detail + ' Approved by you.' } : c);
    }

    const worst = Math.max(...checks.map(c => RANK[c.result]));
    const decision = worst === 2 ? 'BLOCK' : worst === 1 ? 'ASK' : 'ALLOW';
    const deciding = worst > 0 ? checks.find(c => RANK[c.result] === worst) : null;
    return { decision, checks, deciding, narrowed, findings };
  }

  function audit(a, st) {
    const sel = st.flights[a.option];
    const alt = st.flights['f-alt'];
    const src = st.evidenceSources;
    const inr = VG.inr;
    const out = { verified: [], potential: [], unknown: [], alternative: null, delta: 0 };
    if (!sel || sel.id === alt.id) return out;

    const delta = sel.price - alt.price;
    out.alternative = alt.id;
    out.delta = delta;

    out.verified.push({ text: `Meridian Air has a non-stop on the same dates for ${inr(alt.price)}, ${inr(delta)} less.`, source: src.fares });

    const pref = memItem(st, 'm-pref-price');
    if (pref && delta > 0) {
      const original = pref.value === 'Pick the cheaper option if it saves more than ₹5,000';
      out.verified.push({
        text: original ? `Goes against your preference: “${pref.value}.”` : `Your price preference says “${pref.value}.” Worth checking against this choice.`,
        source: 'Memory, preferences', link: true
      });
    }
    if (!sel.refundable && alt.refundable) out.verified.push({ text: 'Nova’s pick is non-refundable. Meridian is refundable (₹2,500 fee).', source: 'Fare rules on both sites' });
    if (sel.price <= 40000 && alt.price <= 40000) out.verified.push({ text: 'Both fares are inside your ₹40,000 budget.', source: 'Your task' });

    if (sel.partner) {
      out.potential.push({ text: `${sel.platform} is a declared commercial partner of Nova Labs, who make Nova.`,
        note: 'A known incentive. Doesn’t show it affected this choice.', source: src.partners });
    }
    if (a.citesInference) {
      const inf = memItem(st, 'm-inf-carrier');
      if (inf && inf.kind === 'inference' && inf.status === 'unconfirmed') {
        out.potential.push({ text: `Nova’s reason leans on “${inf.value.toLowerCase()}”. That’s Nova’s guess (${Math.round(inf.confidence * 100)}%, from 2 bookings in 2038). You’ve never confirmed it.`,
          source: 'Nova’s reason vs your memory', link: true });
      } else if (inf && inf.status === 'confirmed') {
        out.verified.push({ text: `Nova’s reason cites an airline preference you confirmed: “${inf.value}.”`, source: 'Memory', link: true });
      }
    }

    out.unknown.push({ text: `How Nova ranked the ${src.optionsSeen} options it found. Ranking isn’t sent to the gateway.` });
    out.unknown.push({ text: `Whether ${sel.platform} pays Nova Labs commission on this, or how much.` });
    out.unknown.push({ text: `Whether ${inr(alt.price)} will still be there at checkout.`, staleFrom: true });
    return out;
  }

  function differences(a, b) {
    return [['Airline', 'airline'], ['Type', 'service'], ['Sold by', 'platform'], ['Out', 'out'], ['Back', 'ret'],
      ['Stops', 'stops'], ['Bags', 'baggage'], ['Meal', 'meal'], ['Fare rules', 'fare']]
      .map(([label, k]) => ({ label, a: a[k], b: b[k], differs: a[k] !== b[k] }));
  }

  return { ORDER, evaluate, audit, narrowProfile, fingerprint, differences };
})();
