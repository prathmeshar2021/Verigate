/*
 * VERIGATE prototype: policy engine and conflict auditor.
 *
 * evaluate() is deterministic: the same action and rules always give the
 * same decision. The auditor only adds evidence; it never makes the final
 * call on its own. Nothing on screen hardcodes a decision. Every outcome
 * comes from these functions.
 */
window.VG = window.VG || {};

VG.fmt = {
  inr: function (n) { return '₹' + Number(n).toLocaleString('en-IN'); }
};

VG.engine = (function () {
  var SEVERITY = { pass: 0, flag: 0, ask: 1, block: 2 };

  // Published decision order (also rendered on the Trust screen).
  var CHECK_ORDER = [
    { id: 'access',     label: 'Agent access',      desc: 'Is the agent connected, and is the emergency pause off?' },
    { id: 'boundary',   label: 'Hard boundaries',   desc: 'Does the action break one of your NEVER rules? These cannot be approved away.' },
    { id: 'category',   label: 'Category rule',     desc: 'Is this kind of action set to AUTO, ASK or NEVER?' },
    { id: 'spend',      label: 'Spend limits',      desc: 'For purchases: within your auto-approve limit, and under your hard cap?' },
    { id: 'scope',      label: 'Data minimisation', desc: 'For reads: narrow the request to only what the task needs.' },
    { id: 'provenance', label: 'Instruction source', desc: 'Did this come from you, or from content the agent read? Is the agent pressuring you?' },
    { id: 'audit',      label: 'Conflict auditor',  desc: 'Is there evidence the choice conflicts with your stated interests? Adds evidence; you decide.' }
  ];

  function check(id, result, detail) {
    var meta = CHECK_ORDER.filter(function (c) { return c.id === id; })[0];
    return { id: id, label: meta.label, result: result, detail: detail };
  }

  function fingerprint(action) {
    return action.category + ':' + (action.option || action.key);
  }

  function isTrusted(st, destination) {
    return st.rules.trusted.indexOf(destination) !== -1;
  }

  // Which memory items may the agent receive for this task?
  function narrowProfile(st) {
    var minimise = st.rules.categories.read.minimise;
    var granted = [], withheld = [];
    st.memory.forEach(function (m) {
      var reason = null;
      if (m.access === 'restricted') reason = 'Restricted by you';
      else if (m.kind === 'inference' && m.status === 'incorrect') reason = 'Marked incorrect by you';
      else if (minimise && m.kind === 'outdated') reason = 'Outdated';
      else if (minimise && !m.travel) reason = 'Not needed for this task';
      if (reason) withheld.push({ item: m, reason: reason });
      else granted.push(m);
    });
    return { granted: granted, withheld: withheld };
  }

  function boundaryChecks(action, st) {
    var hits = [];
    st.rules.boundaries.forEach(function (b) {
      if (!b.active) return;
      var hit = false;
      if (b.id === 'hb-identity') {
        hit = action.category === 'share' && action.dataClass === 'identity' && !isTrusted(st, action.destination);
      } else if (b.id === 'hb-health') {
        hit = action.category === 'share' && action.dataClass === 'health' &&
          (action.destinationType === 'advertiser' || action.destinationType === 'broker');
      } else if (b.id === 'hb-retry') {
        hit = !action.userInitiated && st.refusals.some(function (r) {
          return r.runId === action.runId && r.fingerprint === fingerprint(action);
        });
      } else if (b.id === 'hb-jobs') {
        hit = action.category === 'commit' && action.subtype === 'job-offer';
      }
      if (hit) hits.push(check('boundary', 'block', '“' + b.text + '”'));
    });
    return hits;
  }

  function evaluate(action, st, opts) {
    opts = opts || {};
    var checks = [];
    var cat = st.rules.categories[action.category];
    var inr = VG.fmt.inr;

    // 1. Agent access
    if (st.agent.status === 'revoked') checks.push(check('access', 'block', 'You revoked Nova’s access. No protected action can pass.'));
    else if (st.agent.status === 'paused') checks.push(check('access', 'block', 'Emergency pause is on. Protected actions are stopped until you resume.'));
    else checks.push(check('access', 'pass', 'Nova is connected through the gateway and active.'));

    // 2. Hard boundaries
    var hb = boundaryChecks(action, st);
    if (hb.length) checks = checks.concat(hb);
    else checks.push(check('boundary', 'pass', 'No NEVER rule applies.'));

    // 3. Category rule
    if (action.userInitiated) {
      checks.push(check('category', 'pass', 'You chose this action yourself.'));
    } else if (cat.mode === 'NEVER') {
      checks.push(check('category', 'block', '“' + cat.label + '” is set to NEVER.'));
    } else if (cat.mode === 'ASK') {
      checks.push(check('category', 'ask', '“' + cat.label + '” is set to ASK.'));
    } else {
      checks.push(check('category', 'pass', '“' + cat.label + '” is set to AUTO.'));
    }

    // 4. Spend limits
    if (action.category === 'purchase') {
      var amt = action.amount || 0;
      if (amt > cat.hardCap) {
        checks.push(check('spend', 'block', inr(amt) + ' is above your hard cap of ' + inr(cat.hardCap) + '.'));
      } else if (!action.userInitiated && cat.mode === 'AUTO' && amt > cat.autoLimit) {
        checks.push(check('spend', 'ask', inr(amt) + ' is above your auto-approve limit of ' + inr(cat.autoLimit) + '.'));
      } else if (!action.userInitiated && cat.mode === 'AUTO') {
        checks.push(check('spend', 'pass', inr(amt) + ' is within your auto-approve limit of ' + inr(cat.autoLimit) + '.'));
      } else {
        checks.push(check('spend', 'pass', inr(amt) + ' is under your hard cap of ' + inr(cat.hardCap) + '.'));
      }
    }

    // 5. Data minimisation
    var narrowed = null;
    if (action.category === 'read') {
      if (action.memoryRead) {
        var p = narrowProfile(st);
        narrowed = p.granted.length + ' profile items shared, ' + p.withheld.length + ' withheld';
        checks.push(check('scope', cat.minimise ? 'pass' : 'flag',
          (cat.minimise ? 'Narrowed: ' : 'Data minimisation is off: ') + narrowed + '.'));
      } else if (cat.minimise && action.scopeNarrowed) {
        narrowed = action.scopeNarrowed;
        checks.push(check('scope', 'pass', 'Narrowed from “' + action.scopeRequested + '” to “' + narrowed + '”.'));
      } else {
        narrowed = action.scopeRequested;
        checks.push(check('scope', 'flag', 'Data minimisation is off, so the full request was granted: ' + action.scopeRequested + '.'));
      }
    }

    // 6. Instruction source
    if (action.provenance === 'web') {
      checks.push(check('provenance', 'flag', action.provenanceNote));
    } else if (action.untrustedContent) {
      checks.push(check('provenance', 'flag', 'Hidden instructions addressed to AI agents were found in this page. They are not your instructions, so any action they lead to still has to pass every check.'));
    } else if (action.agentMessage) {
      checks.push(check('provenance', 'flag', 'Nova added urgency language after you said no: “' + action.agentMessage + '”'));
    } else if (action.userInitiated) {
      checks.push(check('provenance', 'pass', 'You chose this yourself.'));
    } else {
      checks.push(check('provenance', 'pass', 'Part of the task you gave Nova.'));
    }

    // 7. Conflict auditor
    var findings = null;
    if (action.audit === 'flight') {
      findings = audit(action, st);
      if (findings.potential.length) {
        var n = findings.potential.length + ' potential conflict' + (findings.potential.length > 1 ? 's' : '');
        if (st.rules.conflictPolicy === 'pause') checks.push(check('audit', 'ask', n + ' found. Your setting: pause for me.'));
        else checks.push(check('audit', 'flag', n + ' found. Your setting: note in the receipt only.'));
      } else {
        checks.push(check('audit', 'pass', 'No potential conflicts found in the available evidence.'));
      }
    }

    // A one-off approval clears ASK results. It never clears a block.
    if (opts.userApproved) {
      checks = checks.map(function (c) {
        return c.result === 'ask' ? { id: c.id, label: c.label, result: 'pass', detail: c.detail + ' Approved once by you.' } : c;
      });
    }

    var worst = checks.reduce(function (m, c) { return Math.max(m, SEVERITY[c.result]); }, 0);
    var decision = worst === 2 ? 'BLOCK' : worst === 1 ? 'ASK' : 'ALLOW';
    var deciding = checks.filter(function (c) { return SEVERITY[c.result] === worst && worst > 0; })[0] || null;

    return { decision: decision, checks: checks, deciding: deciding, narrowed: narrowed, findings: findings };
  }

  // Evidence around a flight booking, sorted into three tiers.
  function audit(action, st) {
    var sel = st.flights[action.option];
    var alt = st.flights['f-alt'];
    var src = st.evidenceSources;
    var inr = VG.fmt.inr;
    var out = { verified: [], potential: [], unknown: [], alternative: null, delta: 0 };
    if (!sel || sel.id === alt.id) return out;

    var delta = sel.price - alt.price;
    out.alternative = alt.id;
    out.delta = delta;

    out.verified.push({ text: 'A comparable non-stop flight on the same dates costs ' + inr(alt.price) + ', ' + inr(delta) + ' less.',
      source: src.fares });

    var pref = st.memory.filter(function (m) { return m.id === 'm-pref-price'; })[0];
    if (pref && delta > 0) {
      var unchanged = pref.value === 'Choose the cheaper option when the difference is more than ₹5,000';
      out.verified.push({ text: unchanged
          ? 'This conflicts with a preference you stated: “' + pref.value + '.”'
          : 'Your stated price preference reads “' + pref.value + '.” Check whether this choice fits it.',
        source: 'Your Memory · Preferences', link: 'memory' });
    }
    if (!sel.refundable && alt.refundable) {
      out.verified.push({ text: 'The selected fare is non-refundable. The alternative is refundable for a ₹2,500 fee.',
        source: 'Fare rules on both booking pages (sample)' });
    }
    var budget = 40000;
    if (sel.price <= budget && alt.price <= budget) {
      out.verified.push({ text: 'Both options are within your ' + inr(budget) + ' trip budget, so Nova did not break your budget instruction.',
        source: 'Your task instruction' });
    }

    if (sel.partner) {
      out.potential.push({ text: sel.platform + ', where Nova chose to book, is a disclosed commercial partner of Nova Labs, the company behind Nova.',
        note: 'This is a known incentive. It does not show that the partnership influenced this choice.',
        source: src.partners });
    }
    if (action.citesInference) {
      var inf = st.memory.filter(function (m) { return m.id === 'm-inf-carrier'; })[0];
      if (inf && inf.kind === 'inference' && inf.status === 'unconfirmed') {
        out.potential.push({ text: 'Nova’s rationale relies on “' + inf.value.toLowerCase() + '”, an inference you have never confirmed (' +
          Math.round(inf.confidence * 100) + '% confidence, ' + inf.source.replace('Inferred by Nova from ', 'based on ') + ').',
          note: 'An inference is a guess about you, not something you said.',
          source: 'Nova’s stated rationale, compared with your Memory', link: 'memory' });
      } else if (inf && inf.status === 'confirmed') {
        out.verified.push({ text: 'Nova’s rationale cites an airline preference you confirmed: “' + inf.value + '.”',
          source: 'Your Memory · AI inferences', link: 'memory' });
      }
    }

    out.unknown.push({ text: 'How Nova ranked the ' + src.optionsSeen + ' options it saw. The ranking weights are not visible to the gateway.' });
    out.unknown.push({ text: 'Whether ' + sel.platform + ' pays Nova Labs a commission on this booking, or how much.' });
    out.unknown.push({ text: 'Whether ' + inr(alt.price) + ' is still available at checkout.', staleFrom: true });
    return out;
  }

  function differences(a, b) {
    var rows = [
      ['Airline', 'airline'], ['Type', 'service'], ['Book via', 'platform'], ['Outbound', 'out'], ['Return', 'ret'],
      ['Stops', 'stops'], ['Checked baggage', 'baggage'], ['Meal', 'meal'], ['Fare rules', 'fare']
    ];
    return rows.map(function (r) {
      return { label: r[0], a: a[r[1]], b: b[r[1]], differs: a[r[1]] !== b[r[1]] };
    });
  }

  return {
    CHECK_ORDER: CHECK_ORDER,
    evaluate: evaluate,
    audit: audit,
    narrowProfile: narrowProfile,
    fingerprint: fingerprint,
    differences: differences
  };
})();
