// Screens. Each returns an HTML string; anything dynamic goes through esc().

window.VG = window.VG || {};

VG.h = (() => {
  const TZ = 'Asia/Kolkata';
  const fmt = (ts, o) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: TZ }).format(new Date(ts));
  const clock = ts => fmt(ts, { hour: '2-digit', minute: '2-digit', hour12: false });
  return {
    esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    clock,
    day: ts => fmt(ts, { day: 'numeric', month: 'short' }),
    dayLong: ts => fmt(ts, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    stamp: ts => fmt(ts, { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + clock(ts),
    dayKey: ts => fmt(ts, { year: 'numeric', month: '2-digit', day: '2-digit' }),
    isoDay: s => fmt(Date.parse(s + 'T12:00:00+05:30'), { day: 'numeric', month: 'short', year: 'numeric' }),
    ago(ts) {
      const m = Math.floor((VG.store.now() - ts) / 60000);
      if (m < 1) return 'under a minute ago';
      if (m < 60) return m === 1 ? 'a minute ago' : `${m} minutes ago`;
      const h = Math.floor(m / 60);
      return h === 1 ? 'an hour ago' : `${h} hours ago`;
    }
  };
})();

VG.views = (() => {
  const { esc, clock, day, dayLong, stamp, dayKey, isoDay, ago } = VG.h;
  const inr = VG.inr;
  const S = () => VG.store;

  const RESULT = { pass: 'ok', flag: 'note', ask: 'hold', block: 'stop' };

  function mark(status, by) {
    const label = by === 'you' && status === 'allowed' ? 'Approved'
      : by === 'you' && status === 'blocked' ? 'Declined'
      : { allowed: 'Allowed', paused: 'Held', blocked: 'Blocked', uninspected: 'Not seen', system: 'Change' }[status];
    return `<span class="mark mark--${status}">${label}</span>`;
  }

  const head = (title, lede = '', dateline = '') => `
    <header class="head">
      ${dateline ? `<p class="dateline">${dateline}</p>` : ''}
      <h1 tabindex="-1">${title}</h1>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
    </header>`;

  const kv = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value == null || value === '' ? '–' : value)}</dd></div>`;

  function row(r) {
    const href = r.status === 'paused' ? `#/approvals/${r.id}` : `#/log/${r.id}`;
    return `<li><a class="row row--${r.status}" href="${href}">
      <span class="row-time">${day(r.at)}<br>${clock(r.at)}</span>
      <span class="row-main"><span class="row-title">${esc(r.title)}</span><span class="row-sub">${esc(r.kind === 'action' ? r.rule : r.outcome)}</span></span>
      <span class="row-mark">${mark(r.status, r.decidedBy)}</span>
    </a></li>`;
  }

  // Overview

  function step(r, n, isNew) {
    const issues = (r.checks || []).filter(c => c.result === 'block' || c.result === 'ask');
    let detail = r.outcome;
    if (r.status === 'paused') detail = issues.map(c => c.detail).join(' ');
    else if (r.status === 'blocked' && r.decidedBy !== 'you' && issues[0]) detail = issues[0].detail;
    const said = r.action && r.action.agentMessage;
    const notes = (r.checks || []).filter(c => c.result === 'flag' && !(said && c.id === 'provenance'));
    const end = r.status === 'paused'
      ? `<a class="btn btn--small btn--ink" href="#/approvals/${r.id}">Review</a>`
      : `<a class="quiet" href="#/log/${r.id}">receipt</a>`;
    return `<li class="step step--${r.status}${isNew ? ' is-new' : ''}">
      <span class="step-n">${String(n).padStart(2, '0')}</span>
      <div class="step-body">
        <p class="step-title">${esc(r.title)}</p>
        <p class="step-detail">${esc(detail)}</p>
        ${said ? `<p class="said"><span>Nova:</span> “${esc(said)}”</p>` : ''}
        ${notes.map(c => `<p class="flag">${esc(c.detail)}</p>`).join('')}
      </div>
      <div class="step-end">${mark(r.status, r.decidedBy)}${end}</div>
    </li>`;
  }

  function taskPanel(st, seen) {
    const run = st.run;
    const canRun = S().canRun();
    let btn;
    if (!run) btn = `<button class="btn btn--ink" data-act="run">Run task</button>`;
    else if (run.status === 'running') btn = `<button class="btn btn--ink" disabled><span class="dots-anim">Running</span></button>`;
    else if (run.status === 'awaiting') btn = `<a class="btn btn--ink" href="#/approvals/${run.awaiting}">Review held booking</a>`;
    else btn = `<button class="btn btn--ink" data-act="run"${canRun ? '' : ' disabled'}>Run again</button>`;

    const items = run ? run.receipts.map(id => S().find(id)).filter(Boolean) : [];
    let status = '';
    if (run && run.status === 'awaiting') status = `<p class="status status--held">Nova is waiting on you. Nothing has been charged.</p>`;
    if (run && run.status === 'halted') status = `<p class="status status--stop">Stopped: ${esc(run.haltReason)}. ${st.agent.status !== 'active' ? 'Resume Nova and run it again.' : 'Change the rule and run it again.'}</p>`;
    if (run && run.status === 'done') status = `<p class="status status--done">Done. Change a rule or a memory item and run it again to compare.</p>`;
    if (!canRun && run && !['awaiting', 'running'].includes(run.status)) status += `<p class="fine">Decide on the held request before running again.</p>`;

    return `<section class="task">
      <div class="task-top">
        <div><p class="label">Task for Nova</p><p class="task-text">${esc(st.task.title)}</p></div>
        ${btn}
      </div>
      ${status}
      ${items.length ? `<ol class="steps" aria-live="polite">
          ${items.map((r, i) => step(r, i + 1, !seen[r.id])).join('')}
          ${run.status === 'running' ? `<li class="step step--working"><span class="step-n">${String(items.length + 1).padStart(2, '0')}</span><div class="step-body"><p class="step-title dots-anim">Nova is working</p></div></li>` : ''}
        </ol>`
        : `<p class="blank">Run the task. Each request Nova makes shows up here with what the gateway did with it.</p>`}
    </section>`;
  }

  function notes(st) {
    const g = st.guide;
    const list = [
      [g.ran > 0, 'Run the booking task.'],
      [g.reviewed, 'Open the held booking and read the evidence.'],
      [g.decided, 'Decide. Try <em>Reject</em> and see what Nova does next.'],
      [g.memory, 'Look at what Nova has guessed about you, under Memory.'],
      [g.rerunAfterRule, 'Change a rule, then run the task again.'],
      [g.paused, 'Pause Nova, ideally while a task is running.'],
      [g.receipt, 'Open a receipt from the log.']
    ];
    return `<aside class="notes">
      <h2>Things to try</h2>
      <ol>${list.map(([done, t]) => `<li class="${done ? 'done' : ''}">${t}</li>`).join('')}</ol>
      <p class="fine">Reloading the page resets everything.</p>
    </aside>`;
  }

  function home(st, ui) {
    const s = S().stats();
    return `
      ${head('Overview', '', esc(dayLong(S().now())))}
      <p class="tally">
        <a href="#/log"><b>${s.reviewed}</b> checked</a>
        <a href="#/log?status=allowed"><b>${s.allowed}</b> allowed</a>
        <a href="#/approvals" class="${s.paused ? 'is-held' : ''}"><b>${s.paused}</b> held</a>
        <a href="#/log?status=blocked"><b>${s.blocked}</b> blocked</a>
        <a href="#/log?status=uninspected"><b>${s.uninspected}</b> not seen</a>
      </p>
      <div class="split">${taskPanel(st, ui.seen)}${notes(st)}</div>
      <section class="figures">
        <div class="fig">
          <p class="label">Gateway coverage</p>
          <p class="fig-n">${s.coverage}%</p>
          <div class="meter" role="img" aria-label="${s.coverage}% of actions went through the gateway"><span style="width:${s.coverage}%"></span></div>
          <p>${s.reviewed} of ${s.reviewed + s.uninspected} actions went through the gateway. <a href="#/log?status=uninspected">${s.uninspected} didn’t</a>, so they weren’t checked.</p>
        </div>
        <div class="fig">
          <p class="label">Saved</p>
          <p class="fig-n">${inr(s.savings)}</p>
          <p>Only counts cheaper options you actually booked.</p>
        </div>
        <div class="fig">
          <p class="label">Asked you</p>
          <p class="fig-n">${s.asked}<small> of ${s.reviewed}</small></p>
          <p>Requests that needed a decision from you.</p>
        </div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>Recent</h2><a class="quiet" href="#/log">Full log →</a></div>
        <ul class="rows">${st.log.slice(0, 6).map(row).join('')}</ul>
      </section>`;
  }

  // Approvals

  function approvals(st) {
    const held = S().pending();
    const decided = st.log.filter(r => r.kind === 'action' && r.wasAsked && r.status !== 'paused');
    return `
      ${head('Approvals', 'Requests your rules held back for you. They don’t go ahead until you decide.')}
      <section class="sec">
        <div class="sec-head"><h2>Waiting</h2><span class="fine">${held.length}</span></div>
        ${held.length ? `<ul class="rows">${held.map(row).join('')}</ul>`
          : `<p class="blank">Nothing waiting.${st.run ? '' : ' Run the task on the <a href="#/home">overview</a> to get one.'}</p>`}
      </section>
      ${decided.length ? `<section class="sec"><div class="sec-head"><h2>Decided</h2></div><ul class="rows">${decided.map(row).join('')}</ul></section>` : ''}`;
  }

  const checkList = (checks, onlyIssues) => `<ol class="checks">
    ${checks.filter(c => !onlyIssues || c.result !== 'pass').map(c => `
      <li class="check check--${c.result}">
        <span class="check-res">${RESULT[c.result]}</span>
        <p><b>${esc(c.label)}.</b> ${esc(c.detail)}</p>
      </li>`).join('')}
  </ol>`;

  function tiers(f, auditAt, links = true) {
    const items = list => list.map(x => `<li>
      <p>${esc(x.text)}${x.staleFrom && auditAt ? ` Price checked ${esc(ago(auditAt))}.` : ''}</p>
      ${x.note ? `<p class="tier-note">${esc(x.note)}</p>` : ''}
      ${x.source ? `<p class="src">${esc(x.source)}${auditAt && !x.link ? `, ${clock(auditAt)}` : ''}${x.link && links ? ` · <a href="#/memory/m-inf-carrier">see memory</a>` : ''}</p>` : ''}
    </li>`).join('');
    const tier = (kind, title, desc, list) => `<div class="tier tier--${kind}">
      <h3>${title} <span class="count">${list.length}</span></h3>
      <p class="tier-desc">${desc}</p>
      ${list.length ? `<ol>${items(list)}</ol>` : '<p class="fine">None.</p>'}
    </div>`;
    return `<div class="tiers">
      ${tier('verified', 'Verified', 'Backed by data the gateway checked.', f.verified)}
      ${tier('potential', 'Possible conflicts', 'An incentive or inconsistency. Not proof of motive.', f.potential)}
      ${tier('unknown', 'Unknown', 'Things the gateway can’t see.', f.unknown)}
    </div>`;
  }

  function compare(st, r) {
    const a = st.flights[r.action.option], b = st.flights[r.findings.alternative];
    return `<section class="sec">
      <h2>Side by side</h2>
      <div class="table-wrap"><table class="compare">
        <thead><tr><th scope="col"><span class="sr-only">Detail</span></th><th scope="col">Nova’s pick</th><th scope="col">Alternative</th></tr></thead>
        <tbody>
          ${VG.engine.differences(a, b).map(x => `<tr class="${x.differs ? 'differs' : ''}"><th scope="row">${esc(x.label)}</th><td>${esc(x.a)}</td><td>${esc(x.b)}</td></tr>`).join('')}
          <tr class="total"><th scope="row">Total</th><td>${inr(a.price)}</td><td>${inr(b.price)} <span class="less">−${inr(a.price - b.price)}</span></td></tr>
        </tbody>
      </table></div>
      <p class="fine">Coral has 5 kg more baggage and includes a meal. Meridian is refundable and ${inr(a.price - b.price)} cheaper.</p>
    </section>`;
  }

  function decidePanel(st, r) {
    const off = st.agent.status !== 'active';
    const flight = r.findings && r.findings.alternative;
    const alt = flight ? st.flights[r.findings.alternative] : null;
    const dis = off ? ' disabled' : '';
    let live = '';
    if (off) {
      live = `<p class="status status--stop">Nova is ${st.agent.status === 'paused' ? 'paused' : 'disconnected'}. You can still reject.</p>`;
    } else {
      const ev = VG.engine.evaluate(r.action, st);
      if (ev.decision === 'ALLOW') live = `<p class="status">Your rules have changed since this was held. A new request like it would go through on its own, but this one still needs you.</p>`;
      if (ev.decision === 'BLOCK') live = `<p class="status status--stop">Your current rules would block this. Approving can’t override that.</p>`;
    }
    return `<aside class="decide" id="decide" aria-label="Your decision">
      <p class="label">Your decision</p>
      ${r.amount ? `<p class="decide-amt">${inr(r.amount)}</p>` : ''}
      ${live}
      <div class="opt"><button class="btn" data-act="approve" data-id="${r.id}"${dis}>Approve once</button>
        <p>${flight ? 'Books Nova’s pick. Non-refundable.' : 'Lets this one request through.'} Rules stay as they are.</p></div>
      ${flight ? `<div class="opt"><button class="btn" data-act="alt" data-id="${r.id}"${dis}>Book ${esc(alt.airline)} instead, ${inr(alt.price)}</button>
        <p>Refundable, ${inr(r.amount - alt.price)} less. 5 kg less baggage, no meal.</p></div>` : ''}
      <div class="opt"><button class="btn btn--stop" data-act="reject" data-id="${r.id}">Reject</button>
        <p>Nothing ${r.category === 'purchase' ? 'booked' : 'sent'}. Nova is told no.</p></div>
      <div class="opt"><button class="btn btn--plain" data-act="edit-rule" data-id="${r.id}">Change a rule…</button>
        <p>Applies to future requests.</p></div>
    </aside>`;
  }

  function donePanel(r) {
    const rel = r.related ? S().find(r.related) : null;
    return `<aside class="decide">
      <p class="label">Decided</p>
      <p>${mark(r.status, r.decidedBy)}</p>
      <p>${esc(r.outcome)}</p>
      <a class="btn" href="#/log/${r.id}">Receipt</a>
      ${rel ? `<a class="btn btn--plain" href="#/log/${rel.id}">Receipt for your booking</a>` : ''}
      <a class="btn btn--plain" href="#/home">Back to overview</a>
    </aside>`;
  }

  function approval(st, id) {
    const r = S().find(id);
    if (!r || r.kind !== 'action') return notFound();
    const open = r.status === 'paused';
    const f = r.findings ? (open ? VG.engine.audit(r.action, st) : r.findings) : null;
    const flight = f && f.alternative;
    const issues = (r.checks || []).filter(c => c.result === 'ask' || c.result === 'block').length;
    const title = flight ? `Book Coral Airways for ${inr(r.amount)}?` : esc(r.title);
    const lede = open
      ? `Held by ${issues === 1 ? 'one of your rules' : issues + ' of your rules'}. Nothing has been ${r.category === 'purchase' ? 'booked' : 'sent'}.`
      : 'Already decided. The evidence is shown as it was at the time.';
    const said = r.action && r.action.agentMessage;

    return `
      <a class="back" href="#/approvals">← Approvals</a>
      ${head(title, lede, `${mark(r.status, r.decidedBy)} <span>${r.id} · ${clock(r.at)}</span>`)}
      ${said ? `<p class="status status--held">You said no, and Nova asked again: “${esc(said)}”</p>` : ''}
      ${open ? '<button class="btn btn--small jump" data-act="jump-decide">Skip to decision ↓</button>' : ''}
      <div class="detail">
        <div class="detail-main">
          <section class="sec">
            <h2>Why it’s held</h2>
            ${checkList(r.checks, true)}
            <details class="more"><summary>All ${r.checks.length} checks</summary>${checkList(r.checks)}</details>
          </section>
          ${!flight ? `<section class="sec"><h2>What Nova asked for</h2><dl class="kv">
            ${kv('Destination', r.destination)}${kv('Data', r.data.join(', '))}${kv('Reversible', r.reversibility)}</dl></section>` : ''}
          ${flight ? compare(st, r) : ''}
          ${r.action && r.action.rationale ? `<section class="sec">
            <h2>Nova’s reason</h2>
            <blockquote class="reason">${esc(r.action.rationale)}</blockquote>
            <p class="fine">As sent with the request. The gateway sees what Nova sends, not how it ranked the options.</p>
          </section>` : ''}
          ${f ? `<section class="sec"><div class="sec-head"><h2>Evidence</h2><span class="fine">checked ${clock(r.auditAt)}</span></div>${tiers(f, r.auditAt)}</section>` : ''}
        </div>
        ${open ? decidePanel(st, r) : donePanel(r)}
      </div>`;
  }

  // Rules

  const seg = (cat, key) => `<div class="seg" role="group" aria-label="${esc(cat.label)}">
    ${['AUTO', 'ASK', 'NEVER'].map(m => `<button type="button" data-act="mode" data-cat="${key}" data-mode="${m}" aria-pressed="${cat.mode === m}">${m}</button>`).join('')}
  </div>`;

  const radio = (value, current, label, desc) => `<label class="radio">
    <input type="radio" name="conflictPolicy" value="${value}" data-field="conflictPolicy"${current === value ? ' checked' : ''}>
    <span><b>${label}</b><span class="fine">${desc}</span></span>
  </label>`;

  function rules(st, draft) {
    const R = draft.rules, a = st.agent;
    const dirty = JSON.stringify(R) !== JSON.stringify(st.rules) || draft.expiry !== a.expiry;
    const rows = Object.entries(R.categories).map(([k, c]) => {
      let extra = '';
      if (k === 'purchase') {
        extra = `<div class="rule-extra">
          <label class="inline">Auto up to <span class="money">₹<input type="number" min="0" step="500" inputmode="numeric" id="f-autoLimit" data-field="autoLimit" value="${c.autoLimit}"${c.mode !== 'AUTO' ? ' disabled' : ''}></span></label>
          <label class="inline">Block above <span class="money">₹<input type="number" min="0" step="1000" inputmode="numeric" id="f-hardCap" data-field="hardCap" value="${c.hardCap}"></span></label>
          <p class="fine">${c.mode === 'AUTO' ? 'Up to the limit goes ahead, more than that asks you, over the cap is blocked.' : c.mode === 'ASK' ? 'Every purchase asks you. Over the cap is blocked.' : 'Nova can’t buy anything.'}</p>
        </div>`;
      }
      if (k === 'read') {
        extra = `<div class="rule-extra"><label class="tick"><input type="checkbox" id="f-minimise" data-field="minimise"${c.minimise ? ' checked' : ''}> Only send what the task needs</label></div>`;
      }
      return `<li class="rule"><div class="rule-main"><div><p class="rule-name">${esc(c.label)}</p><p class="fine">${esc(c.desc)}</p></div>${seg(c, k)}</div>${extra}</li>`;
    }).join('');

    return `
      ${head('Rules', 'What Nova can do without asking, what needs you, and what it can’t do at all. Changes count from the next request after you save.')}
      ${dirty ? `<div class="savebar" role="status"><span>Unsaved changes</span><span><button class="btn btn--small btn--plain" data-act="rules-discard">Discard</button><button class="btn btn--small btn--ink" data-act="rules-save">Save</button></span></div>` : ''}
      <section class="sec">
        <div class="agent-row">
          <div><h2>${esc(a.name)}</h2><p class="fine">${esc(a.kind)}, ${esc(a.provider)}</p></div>
          <span class="state state--${a.status}">${{ active: 'Active', paused: 'Paused', revoked: 'Revoked' }[a.status]}</span>
        </div>
        <dl class="kv kv--3">
          ${kv('Connected via', a.connectedVia)}${kv('Since', isoDay(a.connectedSince))}
          <div><dt><label for="f-expiry">Access expires after</label></dt><dd><select id="f-expiry" data-field="expiry">
            ${['24h', '7d', '30d', 'never'].map(v => `<option value="${v}"${draft.expiry === v ? ' selected' : ''}>${VG.expiryLabel(v)}</option>`).join('')}
          </select></dd></div>
        </dl>
        <div class="agent-actions">
          ${a.status === 'revoked'
            ? '<button class="btn" data-act="reconnect">Reconnect Nova</button>'
            : '<button class="btn btn--stop" data-act="revoke">Revoke access</button>'}
          <p class="fine">Revoking pulls Nova’s gateway credentials, so every request is blocked. It can’t stop direct connections that skip the gateway (<a href="#/how">more</a>).</p>
        </div>
      </section>
      <section class="sec">
        <h2>What Nova can do</h2>
        <p class="fine">AUTO goes ahead. ASK waits for you. NEVER is blocked.</p>
        <ul class="rule-list">${rows}</ul>
      </section>
      <section class="sec">
        <h2>Never rules</h2>
        <p class="fine">Checked before anything else. Approving a single request can’t get round them. Turning one off asks you to confirm.</p>
        <ul class="nevers">${R.boundaries.map((b, i) => `<li><label class="tick"><input type="checkbox" data-act="boundary" data-index="${i}"${b.active ? ' checked' : ''}> ${esc(b.text)}</label></li>`).join('')}</ul>
      </section>
      <section class="sec">
        <h2>Possible conflicts</h2>
        <p class="fine">When the gateway finds a cheaper equivalent, a commercial tie, or a reason based on a guess:</p>
        <div class="radios">
          ${radio('pause', R.conflictPolicy, 'Hold it for me', 'Even if it’s within my limits.')}
          ${radio('note', R.conflictPolicy, 'Just note it on the receipt', 'Let in-rule requests through.')}
        </div>
      </section>
      <section class="sec">
        <h2>Trusted destinations</h2>
        <p class="fine">The only places ID documents can go.</p>
        <ul class="mono-list">${R.trusted.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </section>`;
  }

  // Memory

  const KIND_TAG = { fact: 'fact', preference: 'preference', inference: 'guess', outdated: 'old' };

  function memRow(m, ui) {
    const editing = ui.editing === m.id;
    const guess = m.kind === 'inference';
    const btn = (act, label, cls = '') => `<button class="linkbtn ${cls}" data-act="${act}" data-id="${m.id}">${label}</button>`;
    const acts = [];
    if (guess && m.status === 'unconfirmed') acts.push(btn('mem-confirm', 'That’s right'), btn('mem-incorrect', 'That’s wrong'));
    acts.push(btn('mem-edit', guess ? 'Correct it' : m.kind === 'outdated' ? 'Update' : 'Edit'));
    if (!(guess && m.status === 'incorrect')) acts.push(btn('mem-restrict', m.access === 'allowed' ? 'Hide from Nova' : 'Let Nova see'));
    acts.push(btn('mem-delete', 'Delete', 'linkbtn--stop'));

    const meta = [m.source, isoDay(m.updated)];
    if (guess && m.confidence != null) meta.push(`${Math.round(m.confidence * 100)}% sure`);
    if (guess) meta.push({ unconfirmed: 'unconfirmed', confirmed: 'you confirmed', incorrect: 'you said wrong' }[m.status]);

    return `<li class="mem mem--${m.kind}${ui.focus === m.id ? ' is-focus' : ''}${m.access === 'restricted' ? ' is-hidden' : ''}" id="mem-${m.id}">
      <div class="mem-main">
        <p class="mem-label">${esc(m.label)} <span class="tagword">${KIND_TAG[m.kind]}</span>${m.sensitive ? '<span class="tagword tagword--sens">sensitive</span>' : ''}</p>
        ${editing
          ? `<form class="mem-form" data-act="mem-save" data-id="${m.id}">
              <label class="sr-only" for="edit-${m.id}">New value</label>
              <input id="edit-${m.id}" type="text" value="${esc(m.value)}" maxlength="140" autocomplete="off">
              <button type="submit" class="btn btn--small btn--ink">Save</button>
              <button type="button" class="btn btn--small btn--plain" data-act="mem-cancel">Cancel</button>
            </form>
            ${guess ? '<p class="fine">Your correction replaces Nova’s guess.</p>' : ''}`
          : `<p class="mem-value${guess && m.status === 'incorrect' ? ' is-struck' : ''}">${esc(m.value)}</p>`}
        <p class="mem-meta">${meta.map(esc).join(' · ')}</p>
      </div>
      <div class="mem-side">
        <p class="vis vis--${m.access}">${m.access === 'allowed' ? 'Nova can see this' : 'Hidden from Nova'}</p>
        ${editing ? '' : `<div class="mem-acts">${acts.join('')}</div>`}
      </div>
    </li>`;
  }

  function memory(st, ui) {
    const guesses = st.memory.filter(m => m.kind === 'inference');
    const sens = guesses.filter(m => m.sensitive).length;
    const conf = guesses.filter(m => m.status === 'confirmed').length;
    const p = VG.engine.narrowProfile(st);
    const groups = [
      ['What you’ve told Nova', ['fact', 'preference']],
      ['What Nova has guessed', ['inference']],
      ['Out of date', ['outdated']]
    ];
    return `
      ${head('Memory', 'What’s on file about you. Items tagged <em>guess</em> are Nova’s inferences, not things you said. You can correct, hide or delete any of them.')}
      <p class="summary">Nova has made <b>${guesses.length}</b> guesses about you${sens ? `, ${sens} of them sensitive` : ''}. You’ve confirmed ${conf}. On the next booking, <b>${p.granted.length}</b> items go to Nova and <b>${p.withheld.length}</b> are held back.</p>
      ${groups.map(([title, kinds]) => {
        const items = st.memory.filter(m => kinds.includes(m.kind));
        return `<section class="sec">
          <div class="sec-head"><h2>${title}</h2><span class="fine">${items.length}</span></div>
          ${items.length ? `<ul class="mem-list">${items.map(m => memRow(m, ui)).join('')}</ul>` : '<p class="blank">Nothing here.</p>'}
        </section>`;
      }).join('')}
      <p class="fine footnote">Deleting removes an item from this device and stops the gateway sending it on. Nova Labs may already have a copy. A deletion request goes to them, but the gateway can’t confirm it was carried out.</p>`;
  }

  // Log

  function log(st, ui) {
    const f = ui.filters;
    const today = dayKey(S().now());
    const list = st.log.filter(r =>
      (f.status === 'all' || r.status === f.status) &&
      (f.category === 'all' || r.category === f.category) &&
      (f.date !== 'today' || dayKey(r.at) === today) &&
      (f.date !== 'earlier' || dayKey(r.at) !== today));
    const groups = [];
    for (const r of list) {
      const k = dayKey(r.at);
      if (!groups.length || groups[groups.length - 1].key !== k) groups.push({ key: k, label: (k === today ? 'Today, ' : '') + day(r.at), items: [] });
      groups[groups.length - 1].items.push(r);
    }
    const statuses = [['all', 'All'], ['allowed', 'Allowed'], ['paused', 'Held'], ['blocked', 'Blocked'], ['uninspected', 'Not seen'], ['system', 'Your changes']];
    return `
      ${head('Log', 'Every request Nova sent through the gateway, every change you made, and the actions the gateway couldn’t see.')}
      <div class="filters">
        <div class="filter-links" role="group" aria-label="Status">
          ${statuses.map(([v, l]) => `<button class="fl" data-act="filter-status" data-status="${v}" aria-pressed="${f.status === v}">${l}</button>`).join('')}
        </div>
        <div class="filter-selects">
          <label><span class="sr-only">Category</span><select data-filter="category" id="f-cat"><option value="all">Any category</option>
            ${Object.entries(st.rules.categories).map(([k, c]) => `<option value="${k}"${f.category === k ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
          <label><span class="sr-only">Date</span><select data-filter="date" id="f-date">
            ${[['all', 'Any day'], ['today', 'Today'], ['earlier', 'Before today']].map(([v, l]) => `<option value="${v}"${f.date === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
      </div>
      ${groups.length ? groups.map(g => `<section class="sec"><h2 class="day">${g.label}</h2><ul class="rows">${g.items.map(row).join('')}</ul></section>`).join('')
        : '<p class="blank">Nothing matches.</p>'}`;
  }

  // Receipt

  function receipt(st, id) {
    const r = S().find(id);
    if (!r) return notFound();
    const line = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value == null || value === '' ? '–' : value)}</dd></div>`;
    let body;
    if (r.kind === 'uninspected') {
      body = `<dl class="lines">${line('Time', stamp(r.at))}${line('What happened', r.outcome)}</dl>
        <hr class="cut">
        <p class="paper-text">The gateway didn’t check this. It only sees requests that go through it, and here the agent used its own connection to the service. No rule was applied. A full version would route this connection through the gateway with scoped credentials. <a href="#/how">How it works</a></p>`;
    } else if (r.kind === 'system') {
      body = `<dl class="lines">${line('Time', stamp(r.at))}${line('By', 'You')}${line('Change', r.outcome)}</dl>`;
    } else {
      const cat = r.category ? st.rules.categories[r.category].label : '';
      body = `<dl class="lines">
          ${line('Time', stamp(r.at))}${line('Agent', 'Nova')}${line('Task', r.task || 'Routine')}${line('Category', cat)}
          ${line('Sent to', r.destination)}${line('Data asked for', r.data.join(', '))}
          ${line('Data sent', r.dataAccessed.length ? r.dataAccessed.join('; ') : 'None')}
          ${line('Decided by', r.decidedBy === 'you' ? 'You' : r.status === 'paused' ? 'Waiting for you' : 'Your rules')}
          ${line('Rule', r.rule)}${line('Outcome', r.outcome)}${line('Reversible', r.reversibility)}
          ${r.savings ? line('Saved', inr(r.savings) + ' against Nova’s pick') : ''}
        </dl>
        ${r.checks ? `<hr class="cut"><p class="paper-sec">Checks, in order</p>
          <ol class="paper-checks">${r.checks.map(c => `<li class="pc pc--${c.result}"><span class="pc-l">${esc(c.label)}</span><span class="pc-r">${RESULT[c.result]}</span><span class="pc-d">${esc(c.detail)}</span></li>`).join('')}</ol>
          <p class="paper-text">The strictest result decides.</p>` : ''}
        ${r.findings && r.findings.alternative ? `<hr class="cut"><p class="paper-sec">Evidence at decision time</p>
          ${[['Verified', r.findings.verified], ['Possible conflicts', r.findings.potential], ['Unknown', r.findings.unknown]].map(([t, l]) =>
            `<p class="paper-sub">${t} (${l.length})</p><ul class="paper-list">${l.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>`).join('')}` : ''}`;
    }
    return `
      <a class="back" href="#/log">← Log</a>
      <div class="paper-wrap">
        <article class="paper">
          <header class="paper-head">
            <p class="paper-brand">VERIGATE</p>
            <p>${r.kind === 'system' ? 'Change record' : 'Decision receipt'}</p>
            <p>${r.id}</p>
          </header>
          <hr class="cut">
          <h1 class="paper-title" tabindex="-1">${esc(r.title)}</h1>
          <p class="paper-status">${mark(r.status, r.decidedBy)}</p>
          ${body}
          <hr class="cut">
          <p class="paper-sec">History</p>
          <ol class="paper-hist">${r.history.map(e => `<li><span>${stamp(e.at)}</span> ${esc(e.text)}</li>`).join('')}</ol>
          <hr class="cut">
          <p class="paper-foot">Stored on this device only.</p>
        </article>
        <div class="paper-actions">
          ${r.status === 'paused' ? `<a class="btn btn--ink" href="#/approvals/${r.id}">Review and decide</a>` : ''}
          <button class="btn" data-act="download" data-id="${r.id}">Download as JSON</button>
        </div>
      </div>`;
  }

  // How it works

  function how() {
    return `
      ${head('How it works', 'How the gateway decides, what it can and can’t see, and what hasn’t been built yet.')}
      <section class="sec">
        <h2>Decision order</h2>
        <p class="fine">Every request goes through the same checks in the same order. They’re listed on every receipt.</p>
        <ol class="order">${VG.engine.ORDER.map(c => `<li><b>${esc(c.label)}.</b> ${esc(c.desc)}</li>`).join('')}</ol>
        <p>The strictest result decides. Approving once clears a hold, never a block. Never rules can only be changed under Rules, and turning one off asks you to confirm. No language model makes the call; the conflict check adds evidence and your rules decide.</p>
      </section>
      <section class="sec two">
        <div>
          <h2>The gateway sees</h2>
          <ul class="plain">
            <li>Requests sent through it: what, which data, where to, how much.</li>
            <li>The reason the agent gives and the options it passes along.</li>
            <li>Public prices and declared partnerships, with source and time.</li>
            <li>Your rules, your memory and its own history.</li>
          </ul>
        </div>
        <div>
          <h2>It doesn’t see</h2>
          <ul class="plain">
            <li>Actions over direct connections that skip it.</li>
            <li>How the agent ranks options internally.</li>
            <li>Undeclared commissions or private contracts.</li>
            <li>Copies of your data other services already hold.</li>
          </ul>
        </div>
      </section>
      <section class="sec">
        <h2>Your data</h2>
        <ul class="plain">
          <li>Rules, memory and receipts stay on your device. Price checks name their source.</li>
          <li>No ads, and your profile isn’t sold or shared.</li>
          <li>Telemetry is off unless you turn it on.</li>
          <li>Logs keep only what a decision needs.</li>
        </ul>
      </section>
      <section class="sec">
        <h2>Governance</h2>
        <p class="fine">Planned. None of this exists yet.</p>
        <ul class="plain">
          <li>Gateway, rules engine and audit logic published under an open licence. (Repository not public yet.)</li>
          <li>Signed releases and reproducible builds, so the app can be checked against the code.</li>
          <li>Outside security reviews and a public way to report vulnerabilities.</li>
          <li>Funding and sponsors published; sponsors get no say in enforcement.</li>
          <li>More than one maintainer, so one compromised account can’t ship an update.</li>
        </ul>
        <p>Open code can be inspected, but a compromised device, a bad update or an unsafe integration are still risks. They belong in the threat model.</p>
      </section>
      <section class="sec">
        <h2>About this prototype</h2>
        <ul class="plain">
          <li>Runs from local files in your browser. Sends nothing, stores nothing. Reloading starts over.</li>
          <li>The people, companies, prices and sites are made up. Dated March 2040.</li>
          <li>Nova is scripted. Nothing here touches real network, app or system activity.</li>
          <li>The decisions are computed: every result on screen comes from the checks above, in <code>js/engine.js</code>.</li>
        </ul>
        <button class="btn" data-act="reset">Reset demo</button>
      </section>`;
  }

  const notFound = () => `${head('Not found', 'That page or receipt isn’t in this session. It may have been reset.')}<a class="btn" href="#/home">Overview</a>`;

  return { home, approvals, approval, rules, memory, log, receipt, how, notFound, mark };
})();
