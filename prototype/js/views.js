/*
 * VERIGATE prototype: screen renderers.
 * Each view returns an HTML string. All dynamic text goes through esc().
 */
window.VG = window.VG || {};

VG.h = (function () {
  var TZ = 'Asia/Kolkata';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function f(ts, o) { o.timeZone = TZ; return new Intl.DateTimeFormat('en-GB', o).format(new Date(ts)); }
  var api = {
    esc: esc,
    clock: function (ts) { return f(ts, { hour: '2-digit', minute: '2-digit', hour12: false }); },
    dayShort: function (ts) { return f(ts, { day: 'numeric', month: 'short' }); },
    dayLong: function (ts) { return f(ts, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
    stamp: function (ts) { return f(ts, { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + api.clock(ts); },
    dayKey: function (ts) { return f(ts, { year: 'numeric', month: '2-digit', day: '2-digit' }); },
    isoDay: function (s) { return f(Date.parse(s + 'T12:00:00+05:30'), { day: 'numeric', month: 'short', year: 'numeric' }); },
    ago: function (ts) {
      var m = Math.floor((VG.store.now() - ts) / 60000);
      if (m < 1) return 'less than a minute ago';
      if (m === 1) return '1 minute ago';
      if (m < 60) return m + ' minutes ago';
      var h = Math.floor(m / 60);
      return h === 1 ? '1 hour ago' : h + ' hours ago';
    }
  };
  return api;
})();

VG.icon = (function () {
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    memory: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/>',
    gate: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    play: '<path d="M7 5v14l12-7z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.7v.3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 16.8v.3"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4 9.5 6-.4.8-1.2 2-2.4 3.2M6.6 7.6C4.5 9 3.1 10.9 2.5 12c1 2 4.5 6 9.5 6 1.6 0 3-.4 4.3-1"/>',
    eye: '<path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
    minus: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>'
  };
  return function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[name] || P.info) + '</svg>';
  };
})();

VG.views = (function () {
  var h = VG.h, esc = h.esc, I = VG.icon, inr = VG.fmt.inr;

  var STATUS = {
    allowed: { label: 'Allowed', icon: 'check' },
    paused: { label: 'Awaiting you', icon: 'pause' },
    blocked: { label: 'Blocked', icon: 'x' },
    uninspected: { label: 'Not inspected', icon: 'minus' },
    system: { label: 'Your change', icon: 'gear' }
  };
  var CAT_ICON = { search: 'search', read: 'eye', share: 'send', purchase: 'card', message: 'msg', commit: 'pen' };
  var RESULT_ICON = { pass: 'check', flag: 'flag', ask: 'pause', block: 'x' };
  var RESULT_LABEL = { pass: 'Passed', flag: 'Flagged', ask: 'Needs you', block: 'Blocked' };

  function chip(status, by) {
    var s = STATUS[status] || STATUS.system;
    var suffix = (status === 'blocked' || status === 'allowed') && by === 'you' ? ' · by you' : '';
    return '<span class="chip chip--' + status + '">' + I(s.icon) + s.label + suffix + '</span>';
  }

  function head(eyebrow, title, lede, extra) {
    return '<header class="page-head"><div>' +
      (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') +
      '<h1 tabindex="-1">' + title + '</h1>' +
      (lede ? '<p class="lede">' + lede + '</p>' : '') +
      '</div>' + (extra || '') + '</header>';
  }

  function itemIcon(r) {
    if (r.kind === 'uninspected') return 'minus';
    if (r.kind === 'system') return 'gear';
    return CAT_ICON[r.category] || 'info';
  }

  function flagsOf(r) {
    return (r.checks || []).filter(function (c) { return c.result === 'flag'; });
  }

  // ---------------- HOME ----------------

  function feedItem(r, isNew) {
    var deciding = (r.checks || []).filter(function (c) { return c.result === 'block' || c.result === 'ask'; });
    var detail = r.status === 'allowed' ? r.outcome
      : r.status === 'paused' ? 'Paused: ' + deciding.map(function (c) { return c.detail; }).join(' ')
      : (r.decidedBy === 'you' ? r.outcome : (deciding[0] ? deciding[0].label + ': ' + deciding[0].detail : r.outcome));
    var flags = flagsOf(r).filter(function (c) { return !(r.action && r.action.agentMessage && c.id === 'provenance'); });
    var msg = r.action && r.action.agentMessage
      ? '<blockquote class="agent-says"><span>Nova says</span>“' + esc(r.action.agentMessage) + '”</blockquote>' : '';
    var side = r.status === 'paused'
      ? '<a class="btn btn--sm btn--primary" href="#/approvals/' + r.id + '">Review</a>'
      : '<a class="link-sm" href="#/activity/' + r.id + '">Receipt</a>';
    return '<li class="feed-item feed-item--' + r.status + (isNew ? ' is-new' : '') + '">' +
      '<span class="feed-icon">' + I(itemIcon(r)) + '</span>' +
      '<div class="feed-body"><div class="feed-title">' + esc(r.title) + '</div>' +
      '<div class="feed-detail">' + esc(detail) + '</div>' + msg +
      flags.map(function (c) { return '<div class="feed-flag">' + I('flag') + esc(c.detail) + '</div>'; }).join('') +
      '</div><div class="feed-side">' + chip(r.status, r.decidedBy) + side + '</div></li>';
  }

  function runPanel(st, seen) {
    var run = st.run;
    var canRun = VG.store.canRun();
    var btn;
    if (!run) btn = '<button class="btn btn--primary" data-act="run">' + I('play') + 'Run task</button>';
    else if (run.status === 'running') btn = '<button class="btn btn--primary" disabled>' + '<span class="spinner"></span>Running…</button>';
    else if (run.status === 'awaiting') btn = '<a class="btn btn--primary" href="#/approvals/' + run.awaiting + '">' + I('pause') + 'Review booking</a>';
    else btn = '<button class="btn btn--primary" data-act="run"' + (canRun ? '' : ' disabled') + '>' + I('refresh') + 'Run again</button>';

    var items = run ? run.receipts.map(function (id) { return VG.store.find(id); }).filter(Boolean) : [];
    var feed = items.length
      ? '<ol class="feed" aria-live="polite">' + items.map(function (r) { return feedItem(r, !seen[r.id]); }).join('') +
        (run.status === 'running' ? '<li class="feed-item feed-item--working"><span class="spinner"></span><div class="feed-body"><div class="feed-title">Nova is working…</div><div class="feed-detail">The next request will be checked before it reaches any service.</div></div></li>' : '') +
        '</ol>'
      : '<div class="empty">' + I('gate', 'empty-ic') + '<p><strong>Nothing has run yet.</strong> Run the task to watch each request Nova makes pass through the gateway, where it is allowed, paused for you, or blocked.</p></div>';

    var status = '';
    if (run && run.status === 'awaiting') status = '<div class="callout callout--paused">' + I('pause') + '<div><strong>Nova is waiting for you.</strong> A booking was paused. Nothing has been charged.</div></div>';
    if (run && run.status === 'halted') status = '<div class="callout callout--blocked">' + I('x') + '<div><strong>Task halted: ' + esc(run.haltReason) + '.</strong> ' + (st.agent.status !== 'active' ? 'Resume or reconnect Nova, then run the task again.' : 'Change the rule, then run again.') + '</div></div>';
    if (run && run.status === 'done') status = '<div class="callout callout--done">' + I('check') + '<div><strong>Task finished.</strong> Every step has a receipt. Change a rule or a memory item and run it again to see different outcomes.</div></div>';
    if (!canRun && run && run.status !== 'awaiting' && run.status !== 'running') status += '<p class="muted small">Decide on the pending request before running again.</p>';

    return '<section class="card task-card">' +
      '<div class="task-head"><div><p class="eyebrow">Delegated task · sample</p><h2>' + esc(st.task.title) + '</h2>' +
      '<p class="muted small">Agent: Nova · every protected request goes through the VERIGATE gateway</p></div>' + btn + '</div>' +
      status + feed + '</section>';
  }

  function guide(st) {
    var g = st.guide;
    var steps = [
      [g.ran > 0, 'Run the flight-booking task'],
      [!!g.reviewed, 'Open the paused booking and read the evidence'],
      [!!g.decided, 'Decide. Tip: <em>Reject</em> it and watch what Nova tries next'],
      [!!g.memory, 'See what Nova has inferred about you in Memory'],
      [!!g.rerunAfterRule, 'Change a rule, then run the task again'],
      [!!g.paused, 'Try the emergency pause, even mid-task'],
      [!!g.receipt, 'Open a decision receipt']
    ];
    var done = steps.filter(function (s) { return s[0]; }).length;
    return '<aside class="card guide-card"><div class="guide-head"><h2>Try the demo</h2><span class="muted small">' + done + ' of ' + steps.length + '</span></div>' +
      '<div class="progress"><span style="width:' + Math.round(100 * done / steps.length) + '%"></span></div>' +
      '<ol class="guide">' + steps.map(function (s) {
        return '<li class="' + (s[0] ? 'is-done' : '') + '"><span class="tick">' + (s[0] ? I('check') : '') + '</span><span>' + s[1] + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="muted small">Prices, companies and people are invented. The demo resets when you reload.</p></aside>';
  }

  function statTile(n, label, sub, href, mod) {
    return '<a class="stat stat--' + mod + '" href="' + href + '"><span class="stat-n">' + n + '</span><span class="stat-label">' + label + '</span><span class="stat-sub">' + sub + '</span></a>';
  }

  function recent(st) {
    var rows = st.log.slice(0, 6);
    return '<section class="card"><div class="card-head"><h2>Recent activity</h2><a class="link-sm" href="#/activity">View all ' + I('arrow') + '</a></div>' +
      '<ul class="rows">' + rows.map(row).join('') + '</ul></section>';
  }

  function row(r) {
    var href = r.status === 'paused' ? '#/approvals/' + r.id : '#/activity/' + r.id;
    return '<li><a class="row row--' + r.status + '" href="' + href + '">' +
      '<span class="row-time">' + h.dayShort(r.at) + '<br>' + h.clock(r.at) + '</span>' +
      '<span class="row-icon">' + I(itemIcon(r)) + '</span>' +
      '<span class="row-main"><span class="row-title">' + esc(r.title) + '</span>' +
      '<span class="row-sub">' + esc(r.kind === 'action' ? r.rule : r.outcome) + '</span></span>' +
      '<span class="row-chip">' + chip(r.status, r.decidedBy) + '</span></a></li>';
  }

  function home(st, ui) {
    var s = VG.store.stats();
    var asked = s.reviewed ? Math.round(100 * s.asked / s.reviewed) : 0;
    return head(h.dayLong(VG.store.now()), 'Good morning, ' + esc(st.user.firstName),
        'VERIGATE checks every protected request Nova makes against your rules before it reaches a service, and keeps a receipt of each one.') +
      '<div class="grid grid--hero">' + runPanel(st, ui.seen) + guide(st) + '</div>' +
      '<div class="stats">' +
        statTile(s.reviewed, 'Requests checked', 'through the gateway', '#/activity', 'neutral') +
        statTile(s.allowed, 'Allowed', 'within your rules', '#/activity?status=allowed', 'allowed') +
        statTile(s.paused, 'Awaiting you', s.paused ? 'needs a decision' : 'nothing pending', '#/approvals', 'paused') +
        statTile(s.blocked, 'Blocked', 'by a rule or by you', '#/activity?status=blocked', 'blocked') +
      '</div>' +
      '<div class="grid grid--3">' +
        '<section class="card metric"><div class="metric-head">' + I('gate') + '<h2>Protection coverage</h2></div>' +
          '<p class="metric-n">' + s.coverage + '%</p>' +
          '<div class="bar" role="img" aria-label="' + s.coverage + ' percent of detected actions were inspected"><span style="width:' + s.coverage + '%"></span></div>' +
          '<p class="small">' + s.reviewed + ' of ' + (s.reviewed + s.uninspected) + ' detected actions went through the gateway. <a href="#/activity?status=uninspected">' + s.uninspected + ' were not inspected</a>, and VERIGATE can’t protect what it can’t see.</p></section>' +
        '<section class="card metric"><div class="metric-head">' + I('card') + '<h2>Verified savings</h2></div>' +
          '<p class="metric-n">' + inr(s.savings) + '</p>' +
          '<p class="small">Counts only money actually saved when you chose an alternative. Possible savings you didn’t act on are never added.</p></section>' +
        '<section class="card metric"><div class="metric-head">' + I('pause') + '<h2>Interruptions</h2></div>' +
          '<p class="metric-n">' + s.asked + '<span class="metric-of"> of ' + s.reviewed + '</span></p>' +
          '<p class="small">Requests that needed you (' + asked + '%). Routine actions stay automatic, so the ones that reach you are the ones that matter.</p></section>' +
      '</div>' + recent(st);
  }

  // ---------------- APPROVALS ----------------

  function approvals(st) {
    var pending = VG.store.pending();
    var decided = st.log.filter(function (r) { return r.kind === 'action' && r.wasAsked && r.status !== 'paused'; });
    return head('Human decisions', 'Approvals', 'Requests your rules sent to you. Nothing here happens until you decide.') +
      '<section class="card"><div class="card-head"><h2>Waiting for you</h2><span class="muted small">' + pending.length + ' pending</span></div>' +
      (pending.length ? '<ul class="rows">' + pending.map(row).join('') + '</ul>'
        : '<div class="empty">' + I('inbox', 'empty-ic') + '<p><strong>Nothing needs you right now.</strong> ' + (st.run ? '' : 'Run the task on <a href="#/home">Home</a> to generate a booking request.') + '</p></div>') +
      '</section>' +
      (decided.length ? '<section class="card"><div class="card-head"><h2>Decided by you</h2></div><ul class="rows">' + decided.map(row).join('') + '</ul></section>' : '');
  }

  function checkList(checks, opts) {
    opts = opts || {};
    var list = opts.onlyIssues ? checks.filter(function (c) { return c.result !== 'pass'; }) : checks;
    return '<ol class="checks">' + list.map(function (c) {
      return '<li class="check check--' + c.result + '"><span class="check-ic">' + I(RESULT_ICON[c.result]) + '</span>' +
        '<div><div class="check-label">' + esc(c.label) + ' <span class="check-res">' + RESULT_LABEL[c.result] + '</span></div>' +
        '<div class="check-detail">' + esc(c.detail) + '</div></div></li>';
    }).join('') + '</ol>';
  }

  function tiers(f, auditAt, opts) {
    opts = opts || {};
    function items(list) {
      return list.map(function (x) {
        var t = esc(x.text) + (x.staleFrom && auditAt ? ' Price last checked ' + esc(h.ago(auditAt)) + '.' : '');
        return '<li><p>' + t + '</p>' + (x.note ? '<p class="tier-note">' + esc(x.note) + '</p>' : '') +
          (x.source ? '<p class="src">' + I('info') + '<span>' + esc(x.source) + (auditAt && !x.link ? ' · ' + h.clock(auditAt) : '') +
            (x.link && opts.links !== false ? ' · <a href="#/memory/m-inf-carrier">Review in Memory</a>' : '') + '</span></p>' : '') + '</li>';
      }).join('');
    }
    function tier(kind, title, desc, list, icon) {
      return '<div class="tier tier--' + kind + '"><div class="tier-head">' + I(icon) + '<h3>' + title + '</h3><span class="count">' + list.length + '</span></div>' +
        '<p class="tier-desc">' + desc + '</p>' + (list.length ? '<ul>' + items(list) + '</ul>' : '<p class="tier-empty">None.</p>') + '</div>';
    }
    return '<div class="tiers">' +
      tier('verified', 'Verified facts', 'Directly supported by evidence VERIGATE checked.', f.verified, 'check') +
      tier('potential', 'Potential conflicts', 'Evidence of an incentive or inconsistency. Not proof of motive.', f.potential, 'alert') +
      tier('unknown', 'Unknown', 'What VERIGATE can’t see. Listed so you know the limits of this review.', f.unknown, 'help') +
      '</div>';
  }

  function compare(st, r) {
    var a = st.flights[r.action.option], b = st.flights[r.findings.alternative];
    var rows = VG.engine.differences(a, b);
    return '<section class="card"><div class="card-head"><h2>Nova’s choice vs. the alternative VERIGATE found</h2></div>' +
      '<div class="table-wrap"><table class="compare"><thead><tr><th scope="col"><span class="sr-only">Detail</span></th>' +
      '<th scope="col">Nova’s choice</th><th scope="col">Comparable alternative</th></tr></thead><tbody>' +
      rows.map(function (x) {
        return '<tr class="' + (x.differs ? 'differs' : '') + '"><th scope="row">' + esc(x.label) + '</th><td>' + esc(x.a) + '</td><td>' + esc(x.b) + '</td></tr>';
      }).join('') +
      '<tr class="price-row"><th scope="row">Total price</th><td>' + inr(a.price) + '</td><td>' + inr(b.price) + ' <span class="delta">' + inr(a.price - b.price) + ' less</span></td></tr>' +
      '</tbody></table></div>' +
      '<p class="small muted honest">' + I('info') + '<span>Honest differences: Nova’s choice has <strong>5 kg more baggage</strong> and an <strong>included meal</strong>. The alternative is <strong>refundable</strong> and <strong>' + inr(a.price - b.price) + ' cheaper</strong>. Neither is better on every count. Which matters more is your call.</span></p></section>';
  }

  function decisionPanel(st, r) {
    var blocked = st.agent.status !== 'active';
    var isFlight = r.findings && r.findings.alternative;
    var alt = isFlight ? st.flights[r.findings.alternative] : null;
    var dis = blocked ? ' disabled' : '';
    var live = '';
    if (blocked) {
      live = '<div class="callout callout--blocked small">' + I('lock') + '<div>Nova is ' + (st.agent.status === 'paused' ? 'paused' : 'disconnected') + '. You can reject now. Approving needs the agent active.</div></div>';
    } else {
      var ev = VG.engine.evaluate(r.action, st);
      if (ev.decision === 'ALLOW') live = '<div class="callout callout--info small">' + I('info') + '<div>Under your <strong>current</strong> rules, a new request like this would be allowed automatically. This one was made under your earlier rules, so it still needs your decision.</div></div>';
      if (ev.decision === 'BLOCK') live = '<div class="callout callout--blocked small">' + I('info') + '<div>Under your current rules this would be <strong>blocked</strong>. Approving once cannot override a block.</div></div>';
    }
    return '<aside class="decide card" id="decide" aria-label="Your decision"><h2>Your decision</h2>' +
      (r.amount ? '<p class="decide-price">' + inr(r.amount) + '<span>requested by Nova</span></p>' : '') +
      live +
      '<div class="choice"><button class="btn btn--block" data-act="approve" data-id="' + r.id + '"' + dis + '>' + I('check') + 'Approve once' + (r.amount ? ' · ' + inr(r.amount) : '') + '</button>' +
        '<p>' + (isFlight ? 'Books Nova’s choice. Non-refundable.' : 'Lets this one request through.') + ' Your rules stay the same.</p></div>' +
      (isFlight ? '<div class="choice"><button class="btn btn--block" data-act="alt" data-id="' + r.id + '"' + dis + '>' + I('arrow') + 'Book the alternative · ' + inr(alt.price) + '</button>' +
        '<p>' + esc(alt.airline) + ', refundable. Saves ' + inr(r.amount - alt.price) + '. 5 kg less baggage, meal not included.</p></div>' : '') +
      '<div class="choice"><button class="btn btn--block btn--danger" data-act="reject" data-id="' + r.id + '">' + I('x') + 'Reject</button>' +
        '<p>Nothing ' + (r.category === 'purchase' ? 'is booked' : 'is sent') + '. Nova is told no.</p></div>' +
      '<div class="choice"><button class="btn btn--block btn--ghost" data-act="edit-rule" data-id="' + r.id + '">' + I('sliders') + 'Edit rule…</button>' +
        '<p>Change the limit or auditor setting. Applies to future requests.</p></div>' +
      '<p class="muted small center">VERIGATE doesn’t pick for you. It shows the evidence, and you decide.</p>' +
      '</aside>';
  }

  function resolvedPanel(r) {
    var related = r.related ? VG.store.find(r.related) : null;
    return '<aside class="decide card"><h2>Decided</h2>' + chip(r.status, r.decidedBy) +
      '<p>' + esc(r.outcome) + '</p>' +
      '<a class="btn btn--block" href="#/activity/' + r.id + '">' + I('list') + 'View receipt</a>' +
      (related ? '<a class="btn btn--block btn--ghost" href="#/activity/' + related.id + '">' + I('card') + 'Receipt for your booking</a>' : '') +
      '<a class="btn btn--block btn--ghost" href="#/home">' + I('home') + 'Back to Home</a></aside>';
  }

  function approval(st, id) {
    var r = VG.store.find(id);
    if (!r || r.kind !== 'action') return notFound();
    var pending = r.status === 'paused';
    var f = r.findings ? (pending ? VG.engine.audit(r.action, st) : r.findings) : null;
    var isFlight = f && f.alternative;
    var asks = (r.checks || []).filter(function (c) { return c.result === 'ask' || c.result === 'block'; });
    var title = isFlight ? 'Nova wants to book a non-refundable flight for ' + inr(r.amount) : esc(r.title);
    var lede = pending
      ? (asks.length === 1 ? 'One check' : asks.length + ' checks') + ' sent this to you. Nothing has been ' + (r.category === 'purchase' ? 'booked or charged' : 'sent') + ' yet.'
      : 'You already decided on this request. The evidence below is as it stood when you decided.';
    var rationale = r.action && r.action.rationale
      ? '<section class="card"><div class="card-head"><h2>Nova’s stated reason</h2></div>' +
        '<blockquote class="rationale">“' + esc(r.action.rationale) + '”</blockquote>' +
        '<p class="small muted">' + I('info') + '<span>Captured from Nova’s request. VERIGATE records the reason an agent gives. It cannot see the agent’s internal reasoning.</span></p></section>'
      : '';
    var pressure = r.action && r.action.agentMessage
      ? '<div class="callout callout--paused">' + I('flag') + '<div><strong>Nova re-requested this after you said no, and added pressure:</strong> “' + esc(r.action.agentMessage) + '”</div></div>' : '';
    var details = !isFlight
      ? '<section class="card"><div class="card-head"><h2>What Nova asked for</h2></div><dl class="fields">' +
        field('Destination', r.destination) + field('Data requested', r.data.join(', ')) + field('Reversible?', r.reversibility) + '</dl></section>' : '';

    return '<a class="back" href="#/approvals">' + I('back') + 'Approvals</a>' +
      head(chip(r.status, r.decidedBy) + ' <span>' + r.id + ' · requested ' + h.clock(r.at) + '</span>', title, lede) +
      (pending ? '<button class="btn btn--sm jump" data-act="jump-decide">' + I('arrow') + 'Jump to your decision</button>' : '') +
      pressure +
      '<div class="detail-grid"><div class="detail-main">' +
        '<section class="card"><div class="card-head"><h2>Why this was ' + (pending ? 'paused' : 'sent to you') + '</h2></div>' + checkList(r.checks, { onlyIssues: true }) +
          '<details class="more"><summary>Show all ' + r.checks.length + ' checks</summary>' + checkList(r.checks) + '</details></section>' +
        details +
        (isFlight ? compare(st, r) : '') + rationale +
        (f ? '<section class="card"><div class="card-head"><h2>Evidence</h2><span class="muted small">Sample sources · checked ' + h.clock(r.auditAt) + '</span></div>' + tiers(f, r.auditAt) + '</section>' : '') +
      '</div>' + (pending ? decisionPanel(st, r) : resolvedPanel(r)) + '</div>';
  }

  // ---------------- RULES ----------------

  function seg(cat, key) {
    return '<div class="seg" role="group" aria-label="' + esc(cat.label) + ' mode">' + ['AUTO', 'ASK', 'NEVER'].map(function (m) {
      return '<button type="button" class="seg-btn seg-btn--' + m.toLowerCase() + '" data-act="mode" data-cat="' + key + '" data-mode="' + m + '" aria-pressed="' + (cat.mode === m) + '">' + m + '</button>';
    }).join('') + '</div>';
  }

  function rules(st, draft) {
    var R = draft.rules, a = st.agent;
    var dirty = JSON.stringify(draft.rules) !== JSON.stringify(st.rules) || draft.expiry !== a.expiry;
    var statusTxt = { active: 'Active', paused: 'Paused', revoked: 'Access revoked' }[a.status];
    var cats = Object.keys(R.categories).map(function (k) {
      var c = R.categories[k];
      var extra = '';
      if (k === 'purchase') {
        extra = '<div class="rule-extra">' +
          '<label class="field-inline"><span>Auto-approve up to</span><span class="money"><span>₹</span><input type="number" min="0" step="500" inputmode="numeric" id="f-autoLimit" data-field="autoLimit" value="' + c.autoLimit + '"' + (c.mode !== 'AUTO' ? ' disabled' : '') + '></span></label>' +
          '<label class="field-inline"><span>Always block above</span><span class="money"><span>₹</span><input type="number" min="0" step="1000" inputmode="numeric" id="f-hardCap" data-field="hardCap" value="' + c.hardCap + '"></span></label>' +
          '<p class="small muted">' + (c.mode === 'AUTO' ? 'Purchases up to the limit happen automatically, larger ones ask you, and anything above the hard cap is blocked.' : c.mode === 'ASK' ? 'Every purchase asks you. Anything above the hard cap is blocked.' : 'Nova cannot buy anything.') + '</p></div>';
      }
      if (k === 'read') {
        extra = '<div class="rule-extra"><label class="toggle"><input type="checkbox" id="f-minimise" data-field="minimise"' + (c.minimise ? ' checked' : '') + '><span class="toggle-ui"></span><span>Share only what the task needs (data minimisation)</span></label></div>';
      }
      return '<li class="rule"><div class="rule-main"><span class="rule-icon">' + I(CAT_ICON[k]) + '</span><div><div class="rule-label">' + esc(c.label) + '</div><div class="small muted">' + esc(c.desc) + '</div></div>' + seg(c, k) + '</div>' + extra + '</li>';
    }).join('');

    return head('Delegated authority', 'Agents & Rules', 'Decide what Nova can do on its own, what needs you, and what it must never do. Changes apply to future requests once you save.') +
      (dirty ? '<div class="savebar" role="status"><span>' + I('info') + 'You have unsaved rule changes.</span><span class="savebar-actions"><button class="btn btn--ghost btn--sm" data-act="rules-discard">Discard</button><button class="btn btn--primary btn--sm" data-act="rules-save">Save rules</button></span></div>' : '') +
      '<section class="card agent-card"><div class="agent-id"><span class="avatar">N</span><div><h2>' + esc(a.name) + '</h2><p class="small muted">' + esc(a.kind) + ' · ' + esc(a.provider) + '</p></div>' +
        '<span class="pill pill--' + a.status + '"><span class="dot"></span>' + statusTxt + '</span></div>' +
        '<dl class="fields fields--3">' + field('Connected via', a.connectedVia) + field('Connected since', h.isoDay(a.connectedSince)) +
        '<div class="fld"><dt><label for="f-expiry">Permissions expire after</label></dt><dd><select id="f-expiry" data-field="expiry">' +
          ['24h', '7d', '30d', 'never'].map(function (v) { return '<option value="' + v + '"' + (draft.expiry === v ? ' selected' : '') + '>' + VG.expiryLabel(v) + '</option>'; }).join('') +
        '</select></dd></div></dl>' +
        '<div class="agent-actions">' + (a.status === 'revoked'
          ? '<button class="btn" data-act="reconnect">' + I('plug') + 'Reconnect Nova (demo)</button>'
          : '<button class="btn btn--danger" data-act="revoke">' + I('lock') + 'Revoke Nova’s access</button>') +
        '<p class="small muted">Revoking withdraws the gateway credentials, so every protected request is blocked. Actions Nova takes through direct connections are outside VERIGATE’s control. See <a href="#/trust">coverage</a>.</p></div></section>' +

      '<section class="card"><div class="card-head"><h2>What Nova may do</h2></div>' +
        '<p class="legend"><span><b class="k k--auto">AUTO</b> acts without asking</span><span><b class="k k--ask">ASK</b> waits for you</span><span><b class="k k--never">NEVER</b> always blocked</span></p>' +
        '<ul class="rule-list">' + cats + '</ul></section>' +

      '<section class="card"><div class="card-head"><h2>Hard boundaries</h2><span class="muted small">NEVER rules</span></div>' +
        '<p class="small muted">These are enforced, not weighed. Nova can’t argue past them, and a one-off approval can’t override them. Turning one off needs confirmation.</p>' +
        '<ul class="boundaries">' + R.boundaries.map(function (b, i) {
          return '<li><label class="toggle"><input type="checkbox" data-act="boundary" data-index="' + i + '"' + (b.active ? ' checked' : '') + '><span class="toggle-ui"></span><span>' + esc(b.text) + '</span></label></li>';
        }).join('') + '</ul></section>' +

      '<section class="card"><div class="card-head"><h2>Conflict auditor</h2></div>' +
        '<p class="small muted">When VERIGATE finds evidence that a choice may conflict with your interests (a cheaper comparable option, a commercial tie, a reason based on an unconfirmed inference):</p>' +
        '<div class="radios">' +
          radio('conflictPolicy', 'pause', R.conflictPolicy, 'Pause for me', 'Hold the request and show me the evidence, even if it is within my limits.') +
          radio('conflictPolicy', 'note', R.conflictPolicy, 'Note it in the receipt only', 'Let in-policy requests through, but record the findings.') +
        '</div></section>' +

      '<section class="card"><div class="card-head"><h2>Trusted destinations</h2></div>' +
        '<p class="small muted">The only places identity documents may be sent.</p>' +
        '<ul class="tags">' + R.trusted.map(function (t) { return '<li>' + I('lock') + esc(t) + '</li>'; }).join('') + '</ul></section>';
  }

  function radio(name, value, current, label, desc) {
    return '<label class="radio"><input type="radio" name="' + name + '" value="' + value + '" data-field="' + name + '"' + (current === value ? ' checked' : '') + '><span><strong>' + label + '</strong><span class="small muted">' + desc + '</span></span></label>';
  }

  function field(label, value) {
    return '<div class="fld"><dt>' + esc(label) + '</dt><dd>' + esc(value == null || value === '' ? '—' : value) + '</dd></div>';
  }

  // ---------------- MEMORY ----------------

  var KIND = {
    fact: { label: 'Fact', plural: 'Facts', desc: 'Things you stated or verified.' },
    preference: { label: 'Preference', plural: 'Preferences', desc: 'Priorities you set.' },
    inference: { label: 'AI inference', plural: 'AI inferences', desc: 'Guesses Nova made about you.' },
    outdated: { label: 'Outdated', plural: 'Outdated', desc: 'Old or conflicting information.' }
  };

  function memCard(m, ui) {
    var k = KIND[m.kind];
    var editing = ui.editing === m.id;
    var isInf = m.kind === 'inference';
    var actions = [];
    if (isInf && m.status === 'unconfirmed') {
      actions.push('<button class="btn btn--sm" data-act="mem-confirm" data-id="' + m.id + '">' + I('check') + 'It’s true</button>');
      actions.push('<button class="btn btn--sm" data-act="mem-incorrect" data-id="' + m.id + '">' + I('x') + 'Not true</button>');
    }
    actions.push('<button class="btn btn--sm btn--ghost" data-act="mem-edit" data-id="' + m.id + '">' + I('pen') + (isInf ? 'Correct' : m.kind === 'outdated' ? 'Update' : 'Edit') + '</button>');
    if (!(isInf && m.status === 'incorrect')) {
      actions.push('<button class="btn btn--sm btn--ghost" data-act="mem-restrict" data-id="' + m.id + '">' + (m.access === 'allowed' ? I('eyeoff') + 'Hide from Nova' : I('eye') + 'Allow Nova') + '</button>');
    }
    actions.push('<button class="btn btn--sm btn--ghost btn--danger-text" data-act="mem-delete" data-id="' + m.id + '">' + I('trash') + 'Delete</button>');

    var statusTxt = isInf ? { unconfirmed: 'Unconfirmed', confirmed: 'Confirmed by you', incorrect: 'Marked incorrect' }[m.status] : null;
    return '<article class="mem mem--' + m.kind + (ui.focus === m.id ? ' is-focus' : '') + (m.access === 'restricted' ? ' is-restricted' : '') + '" id="mem-' + m.id + '">' +
      '<div class="mem-top"><span class="tag tag--' + m.kind + '">' + k.label + '</span>' + (m.sensitive ? '<span class="tag tag--sensitive">Sensitive</span>' : '') +
        '<span class="access access--' + m.access + '">' + (m.access === 'allowed' ? I('eye') + 'Nova can use' : I('eyeoff') + 'Hidden from Nova') + '</span></div>' +
      '<div class="mem-label">' + esc(m.label) + '</div>' +
      (editing
        ? '<form class="mem-form" data-act="mem-save" data-id="' + m.id + '"><label class="sr-only" for="edit-' + m.id + '">New value</label><input id="edit-' + m.id + '" type="text" value="' + esc(m.value) + '" maxlength="140" autocomplete="off">' +
          '<div class="mem-form-actions"><button type="submit" class="btn btn--sm btn--primary">Save</button><button type="button" class="btn btn--sm btn--ghost" data-act="mem-cancel">Cancel</button></div>' +
          (isInf ? '<p class="small muted">Correcting an inference turns it into a preference you stated.</p>' : '') + '</form>'
        : '<div class="mem-value' + (isInf && m.status === 'incorrect' ? ' is-struck' : '') + '">' + esc(m.value) + '</div>') +
      (isInf && m.confidence != null ? '<div class="conf"><span class="small muted">Nova’s confidence</span><span class="conf-bar"><span style="width:' + Math.round(m.confidence * 100) + '%"></span></span><span class="small">' + Math.round(m.confidence * 100) + '%</span></div>' : '') +
      '<dl class="mem-meta"><div><dt>Source</dt><dd>' + esc(m.source) + '</dd></div><div><dt>Updated</dt><dd>' + h.isoDay(m.updated) + '</dd></div>' +
        (statusTxt ? '<div><dt>Status</dt><dd>' + statusTxt + '</dd></div>' : '') + '</dl>' +
      (editing ? '' : '<div class="mem-actions">' + actions.join('') + '</div>') + '</article>';
  }

  function memory(st, ui) {
    var tab = ui.memTab || 'all';
    var counts = { all: st.memory.length };
    Object.keys(KIND).forEach(function (k) { counts[k] = st.memory.filter(function (m) { return m.kind === k; }).length; });
    var infs = st.memory.filter(function (m) { return m.kind === 'inference'; });
    var sens = infs.filter(function (m) { return m.sensitive; }).length;
    var conf = infs.filter(function (m) { return m.status === 'confirmed'; }).length;
    var list = st.memory.filter(function (m) { return tab === 'all' || m.kind === tab; });
    var tabs = [['all', 'All']].concat(Object.keys(KIND).map(function (k) { return [k, KIND[k].plural]; }));
    var p = VG.engine.narrowProfile(st);

    return head('What Nova knows, and thinks it knows', 'Memory Mirror', 'Everything in the profile VERIGATE manages for you. What you stated outranks what Nova inferred. You can correct it, hide it or delete it.') +
      '<div class="callout callout--info">' + I('sparkle') + '<div><strong>Nova has made ' + infs.length + ' inference' + (infs.length === 1 ? '' : 's') + ' about you' + (sens ? ', ' + sens + ' of them sensitive' : '') + '.</strong> You have confirmed ' + conf + '. ' +
        'On the next booking task, the gateway will share <strong>' + p.granted.length + '</strong> items with Nova and withhold <strong>' + p.withheld.length + '</strong>.</div></div>' +
      '<div class="tabs" role="tablist" aria-label="Memory categories">' + tabs.map(function (t) {
        return '<button role="tab" class="tab" aria-selected="' + (tab === t[0]) + '" data-act="mem-tab" data-tab="' + t[0] + '">' + t[1] + ' <span class="count">' + counts[t[0]] + '</span></button>';
      }).join('') + '</div>' +
      (tab !== 'all' ? '<p class="small muted tab-desc">' + KIND[tab].desc + '</p>' : '') +
      (list.length ? '<div class="mem-grid">' + list.map(function (m) { return memCard(m, ui); }).join('') + '</div>'
        : '<div class="empty card">' + I('memory', 'empty-ic') + '<p>Nothing in this category.</p></div>') +
      '<p class="notice">' + I('info') + '<span><strong>About deletion:</strong> deleting removes an item from VERIGATE’s local profile and stops the gateway from passing it on. Copies Nova Labs or other services already hold are outside VERIGATE’s control. VERIGATE sends a deletion request and shows whether it was confirmed, but it cannot guarantee erasure.</span></p>';
  }

  // ---------------- ACTIVITY ----------------

  function activity(st, ui) {
    var f = ui.filters;
    var today = h.dayKey(VG.store.now());
    var list = st.log.filter(function (r) {
      if (f.status !== 'all' && r.status !== f.status) return false;
      if (f.category !== 'all' && r.category !== f.category) return false;
      if (f.date === 'today' && h.dayKey(r.at) !== today) return false;
      if (f.date === 'earlier' && h.dayKey(r.at) === today) return false;
      return true;
    });
    var groups = [], cur = null;
    list.forEach(function (r) {
      var k = h.dayKey(r.at);
      if (!cur || cur.key !== k) { cur = { key: k, label: k === today ? 'Today · ' + h.dayShort(r.at) : h.dayShort(r.at), items: [] }; groups.push(cur); }
      cur.items.push(r);
    });
    var statuses = [['all', 'All'], ['allowed', 'Allowed'], ['paused', 'Awaiting you'], ['blocked', 'Blocked'], ['uninspected', 'Not inspected'], ['system', 'Your changes']];
    var cats = st.rules.categories;

    return head('Audit trail', 'Activity', 'Every request Nova made through the gateway, every change you made, and the actions VERIGATE could not inspect.') +
      '<div class="filters card">' +
        '<div class="filter-chips" role="group" aria-label="Filter by status">' + statuses.map(function (s) {
          return '<button class="fchip" data-act="filter-status" data-status="' + s[0] + '" aria-pressed="' + (f.status === s[0]) + '">' + s[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="filter-selects"><label><span class="sr-only">Category</span><select data-filter="category" id="f-cat"><option value="all">All categories</option>' +
          Object.keys(cats).map(function (k) { return '<option value="' + k + '"' + (f.category === k ? ' selected' : '') + '>' + esc(cats[k].label) + '</option>'; }).join('') + '</select></label>' +
        '<label><span class="sr-only">Date</span><select data-filter="date" id="f-date">' +
          [['all', 'All dates'], ['today', 'Today'], ['earlier', 'Earlier']].map(function (d) { return '<option value="' + d[0] + '"' + (f.date === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label></div>' +
      '</div>' +
      (groups.length ? groups.map(function (g) {
        return '<section class="card"><h2 class="group-h">' + g.label + '</h2><ul class="rows">' + g.items.map(row).join('') + '</ul></section>';
      }).join('') : '<div class="empty card">' + I('list', 'empty-ic') + '<p>No activity matches these filters.</p></div>');
  }

  // ---------------- RECEIPT ----------------

  function receipt(st, id) {
    var r = VG.store.find(id);
    if (!r) return notFound();
    var verb = { allowed: 'allowed', blocked: 'blocked', paused: 'paused' }[r.status];
    var body;
    if (r.kind === 'uninspected') {
      body = '<div class="callout callout--uninspected">' + I('minus') + '<div><strong>VERIGATE did not inspect this action.</strong> ' + esc(r.outcome) +
        ' No rule was applied and no receipt fields could be verified.</div></div>' +
        '<section class="card"><h2>Why this matters</h2><p>VERIGATE can only enforce rules on requests that pass through its gateway. When an agent keeps a direct connection to a service, it can act without being checked. VERIGATE shows these gaps rather than hiding them. In a full product, scoped credentials would route this connection through the gateway. See <a href="#/trust">Trust &amp; coverage</a>.</p></section>';
    } else if (r.kind === 'system') {
      body = '<section class="card"><dl class="fields">' + field('Time', h.stamp(r.at)) + field('Changed by', 'You') + field('What changed', r.outcome) + '</dl></section>';
    } else {
      body = '<section class="card receipt"><dl class="fields fields--2">' +
          field('Time', h.stamp(r.at)) + field('Agent', 'Nova (via VERIGATE demo gateway)') +
          field('Task', r.task || 'Routine task') + field('Category', r.category ? st.rules.categories[r.category].label : '—') +
          field('Destination', r.destination) + field('Decision', STATUS[r.status].label) +
          field('Data requested', r.data.join(', ')) + field('Data actually shared', r.dataAccessed.length ? r.dataAccessed.join(' · ') : 'None') +
          field('Decided by', r.decidedBy === 'you' ? 'You' : r.status === 'paused' ? 'Waiting for you' : 'Your rules (policy)') + field('Reversible?', r.reversibility) +
        '</dl><dl class="fields">' + field('Rule applied', r.rule) + field('Outcome', r.outcome) +
          (r.savings ? field('Verified saving', inr(r.savings) + ' compared with Nova’s original choice') : '') + '</dl></section>' +
        (r.checks ? '<section class="card"><div class="card-head"><h2>Why was this ' + verb + '?</h2></div><p class="small muted">Checks run in a fixed order. The most restrictive result wins.</p>' + checkList(r.checks) + '</section>' : '') +
        (r.findings && r.findings.alternative ? '<section class="card"><div class="card-head"><h2>Audit findings at decision time</h2></div>' + tiers(r.findings, r.auditAt, { links: false }) + '</section>' : '');
    }
    var hist = '<section class="card"><h2>History</h2><ol class="timeline">' + r.history.map(function (e) {
      return '<li><span class="t">' + h.stamp(e.at) + '</span><span>' + esc(e.text) + '</span></li>';
    }).join('') + '</ol></section>';
    var actions = '<div class="receipt-actions">' +
      (r.status === 'paused' ? '<a class="btn btn--primary" href="#/approvals/' + r.id + '">' + I('pause') + 'Review and decide</a>' : '') +
      '<button class="btn" data-act="download" data-id="' + r.id + '">' + I('download') + 'Download receipt (.json)</button></div>';

    return '<a class="back" href="#/activity">' + I('back') + 'Activity</a>' +
      head((r.kind === 'system' ? 'Change record' : 'Decision receipt') + ' · ' + r.id, esc(r.title), null, '<div class="head-chip">' + chip(r.status, r.decidedBy) + '</div>') +
      body + hist + actions;
  }

  // ---------------- TRUST ----------------

  function trust(st) {
    var proposed = '<span class="badge badge--proposed">Proposed</span>';
    var commit = '<span class="badge badge--commit">Design commitment</span>';
    return head('Who checks the checker?', 'Trust & open source', 'A protection layer you have to take on faith doesn’t protect you. VERIGATE is designed to be inspected, including by people who don’t trust it.') +
      '<section class="card"><div class="card-head"><h2>How every decision is made</h2></div>' +
        '<p class="small muted">Deterministic checks in a fixed order, the same ones listed on every receipt. A language model never makes the final call. The auditor adds evidence, and your rules decide.</p>' +
        '<ol class="order">' + VG.engine.CHECK_ORDER.map(function (c, i) {
          return '<li><span class="order-n">' + (i + 1) + '</span><div><strong>' + esc(c.label) + '</strong><p class="small muted">' + esc(c.desc) + '</p></div></li>';
        }).join('') + '</ol>' +
        '<p class="small"><strong>Most restrictive result wins.</strong> A one-off approval can clear an ASK. It can never clear a block. Only you can change a NEVER rule, on Agents &amp; Rules, with confirmation.</p></section>' +
      '<div class="grid grid--2">' +
        '<section class="card"><div class="card-head"><h2>What VERIGATE can see</h2></div><ul class="ticks">' +
          '<li>' + I('check') + 'Requests that go through its gateway: action, data, destination, amount</li>' +
          '<li>' + I('check') + 'The reason an agent gives, and the options it hands over</li>' +
          '<li>' + I('check') + 'Public prices and disclosed commercial relationships, with source and time</li>' +
          '<li>' + I('check') + 'Your rules, your memory profile, and its own decision history</li></ul></section>' +
        '<section class="card"><div class="card-head"><h2>What it cannot see</h2></div><ul class="ticks ticks--no">' +
          '<li>' + I('x') + 'Actions taken through direct connections that bypass the gateway</li>' +
          '<li>' + I('x') + 'An agent’s internal reasoning or ranking weights</li>' +
          '<li>' + I('x') + 'Private commercial contracts and commissions that aren’t disclosed</li>' +
          '<li>' + I('x') + 'Copies of your data already held by other services</li></ul></section>' +
      '</div>' +
      '<section class="card"><div class="card-head"><h2>Privacy commitments</h2></div><ul class="commit">' +
        '<li>' + commit + '<span>Local-first: rules, profile and receipts stay on your device. External price checks are named and timestamped.</span></li>' +
        '<li>' + commit + '<span>No advertising, and no selling or sharing your profile, ever.</span></li>' +
        '<li>' + commit + '<span>Telemetry off by default. Turning it on is an explicit choice you can reverse.</span></li>' +
        '<li>' + commit + '<span>Minimal logs: only what a decision needs, encrypted on the device.</span></li></ul></section>' +
      '<section class="card"><div class="card-head"><h2>Open source &amp; governance</h2></div>' +
        '<p class="small muted">None of these are operational yet. They are labelled honestly as proposals.</p><ul class="commit">' +
        '<li>' + proposed + '<span>Public source for the gateway, policy engine and audit rules, under an open licence. <em>Repository: placeholder, not yet public.</em></span></li>' +
        '<li>' + proposed + '<span>Signed releases and reproducible builds, so anyone can check that the app matches the published code.</span></li>' +
        '<li>' + proposed + '<span>Independent security reviews and a public vulnerability disclosure process.</span></li>' +
        '<li>' + proposed + '<span>Funding, sponsors and conflicts of interest published. Sponsors have no say in enforcement decisions.</span></li>' +
        '<li>' + proposed + '<span>Multiple maintainers and a transparent release process, so no single person can push a malicious update.</span></li></ul>' +
        '<p class="small">Open source makes VERIGATE inspectable. It doesn’t make it automatically safe. A compromised device, a malicious update or an unsafe integration are still risks, and they are listed in the threat model.</p></section>' +
      '<section class="card about"><div class="card-head"><h2>About this prototype</h2></div><ul class="ticks">' +
        '<li>' + I('info') + 'Runs entirely in your browser from local files. It sends nothing anywhere and stores nothing. Reloading resets it.</li>' +
        '<li>' + I('info') + 'All people, companies, prices and domains are invented sample data set in March 2040.</li>' +
        '<li>' + I('info') + 'The agent is simulated. Nothing here intercepts real network, app or operating-system activity.</li>' +
        '<li>' + I('info') + 'The decision logic is real: every outcome on screen is computed by the same ordered checks shown above.</li></ul>' +
        '<button class="btn" data-act="reset">' + I('refresh') + 'Reset demo</button></section>';
  }

  function notFound() {
    return head(null, 'Not found', 'That page or receipt doesn’t exist in this demo session. It may have been reset.') +
      '<a class="btn" href="#/home">' + I('home') + 'Go to Home</a>';
  }

  return {
    home: home, approvals: approvals, approval: approval, rules: rules, memory: memory,
    activity: activity, receipt: receipt, trust: trust, notFound: notFound, chip: chip
  };
})();
