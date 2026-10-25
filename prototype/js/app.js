/*
 * VERIGATE prototype: router, event wiring, modals and toasts.
 * Hash routing keeps everything in one page, so in-memory state survives
 * navigation. That matters because the demo runs from file:// with no server.
 */
(function () {
  var S = VG.store, V = VG.views, h = VG.h, I = VG.icon, inr = VG.fmt.inr;
  var viewEl, modalEl, toastEl;
  var lastRouteKey = null;
  var lastFocus = null;
  var ui = {
    seen: {},
    memTab: 'all',
    editing: null,
    focus: null,
    filters: { status: 'all', category: 'all', date: 'all' },
    draft: null,
    modal: null
  };

  var TITLES = { home: 'Home', approvals: 'Approvals', rules: 'Agents & Rules', memory: 'Memory', activity: 'Activity', trust: 'Trust' };

  function route() {
    var raw = (location.hash || '#/home').replace(/^#\/?/, '');
    var q = raw.split('?');
    var parts = q[0].split('/');
    var params = {};
    (q[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } });
    return { name: parts[0] || 'home', id: parts[1] || null, params: params, key: raw || 'home' };
  }

  function freshDraft() {
    var st = S.get();
    return { rules: S.clone(st.rules), expiry: st.agent.expiry };
  }

  // ---------- rendering ----------

  function renderView() {
    var st = S.get(), r = route();
    var routeChanged = r.key !== lastRouteKey;

    // Remember focus and typed values so a background re-render doesn't lose them.
    var active = document.activeElement;
    var keep = active && active.id && viewEl.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'SELECT')
      ? { id: active.id, value: active.value, start: active.selectionStart, end: active.selectionEnd } : null;

    var html;
    switch (r.name) {
      case 'home': html = V.home(st, ui); break;
      case 'approvals':
        if (r.id) { html = V.approval(st, r.id); if (routeChanged) S.markGuide('reviewed'); }
        else html = V.approvals(st);
        break;
      case 'rules':
        if (!ui.draft || routeChanged) ui.draft = freshDraft();
        html = V.rules(st, ui.draft); break;
      case 'memory':
        if (routeChanged) { ui.focus = r.id || null; if (r.id) ui.memTab = 'all'; S.markGuide('memory'); }
        html = V.memory(st, ui); break;
      case 'activity':
        if (r.id) { html = V.receipt(st, r.id); if (routeChanged) S.markGuide('receipt'); }
        else {
          if (routeChanged && r.params.status) ui.filters = { status: r.params.status, category: 'all', date: 'all' };
          else if (routeChanged && !/^activity\//.test(lastRouteKey || '')) ui.filters = { status: 'all', category: 'all', date: 'all' };
          html = V.activity(st, ui);
        }
        break;
      case 'trust': html = V.trust(st); break;
      default: html = V.notFound();
    }
    viewEl.innerHTML = html;

    // Mark feed items as seen after their entrance animation is rendered once.
    if (st.run) st.run.receipts.forEach(function (id) { ui.seen[id] = true; });

    if (keep) {
      var el = document.getElementById(keep.id);
      if (el) {
        el.value = keep.value; el.focus({ preventScroll: true });
        try { if (keep.start != null) el.setSelectionRange(keep.start, keep.end); } catch (e) { /* number inputs */ }
      }
    }

    if (routeChanged) {
      lastRouteKey = r.key;
      window.scrollTo(0, 0);
      var h1 = viewEl.querySelector('h1');
      if (h1 && !keep) h1.focus({ preventScroll: true });
      if (r.name === 'memory' && ui.focus) {
        var card = document.getElementById('mem-' + ui.focus);
        if (card) card.scrollIntoView({ block: 'center' });
      }
    }
    if (ui.editing) {
      var inp = document.getElementById('edit-' + ui.editing);
      if (inp && document.activeElement !== inp) { inp.focus(); inp.select(); }
    }
    document.title = (TITLES[r.name] || 'VERIGATE') + ' · VERIGATE prototype';
  }

  function renderChrome() {
    var st = S.get(), r = route();
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === r.name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var n = S.pending().length;
    document.querySelectorAll('[data-badge="approvals"]').forEach(function (b) {
      b.textContent = n; b.hidden = n === 0;
    });
    var a = st.agent;
    var pill = { active: ['active', 'Nova · Active'], paused: ['paused', 'Nova · Paused'], revoked: ['revoked', 'Nova · Access revoked'] }[a.status];
    document.getElementById('agent-pill').className = 'pill pill--' + pill[0];
    document.getElementById('agent-pill').innerHTML = '<span class="dot"></span>' + pill[1];
    var pb = document.getElementById('pause-btn');
    if (a.status === 'active') { pb.innerHTML = I('pause') + '<span>Pause agent</span>'; pb.className = 'btn btn--pause'; pb.disabled = false; pb.dataset.act = 'pause'; }
    else if (a.status === 'paused') { pb.innerHTML = I('play') + '<span>Resume</span>'; pb.className = 'btn btn--resume'; pb.disabled = false; pb.dataset.act = 'resume'; }
    else { pb.innerHTML = I('lock') + '<span>Revoked</span>'; pb.className = 'btn'; pb.disabled = true; pb.dataset.act = ''; }
    var strip = document.getElementById('pause-strip');
    strip.hidden = a.status === 'active';
    strip.className = 'pause-strip pause-strip--' + a.status;
    strip.innerHTML = a.status === 'paused'
      ? I('pause') + '<span><strong>Emergency pause is on.</strong> Nova can’t perform any protected action through the gateway until you resume.</span>'
      : I('lock') + '<span><strong>Nova’s access is revoked.</strong> Every protected request is blocked. Reconnect it on <a href="#/rules">Agents &amp; Rules</a>.</span>';
    document.getElementById('clock').textContent = h.dayShort(S.now()) + ' 2040 · ' + h.clock(S.now()) + ' IST';
  }

  function render() { renderView(); renderChrome(); }

  // ---------- toasts & modals ----------

  function toast(msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast toast--' + (kind || 'info');
    t.setAttribute('role', 'status');
    t.innerHTML = I(kind === 'blocked' ? 'x' : kind === 'allowed' ? 'check' : 'info') + '<span>' + h.esc(msg) + '</span>';
    toastEl.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, 4200);
    setTimeout(function () { t.remove(); }, 4600);
  }

  function openModal(opts) {
    lastFocus = document.activeElement;
    ui.modal = opts;
    modalEl.innerHTML = '<div class="modal-backdrop" data-act="modal-close"></div>' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<h2 id="modal-title">' + opts.title + '</h2><div class="modal-body">' + opts.body + '</div>' +
      '<div class="modal-actions"><button class="btn btn--ghost" data-act="modal-close">Cancel</button>' +
      '<button class="btn ' + (opts.danger ? 'btn--danger-solid' : 'btn--primary') + '" data-act="modal-ok">' + opts.ok + '</button></div></div>';
    modalEl.hidden = false;
    document.body.classList.add('has-modal');
    var first = modalEl.querySelector('input, select') || modalEl.querySelector('[data-act="modal-ok"]');
    if (first) first.focus();
  }

  function closeModal() {
    ui.modal = null;
    modalEl.hidden = true;
    modalEl.innerHTML = '';
    document.body.classList.remove('has-modal');
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function confirm(title, body, ok, onOk, danger) {
    openModal({ title: title, body: '<p>' + body + '</p>', ok: ok, onOk: onOk, danger: danger });
  }

  function editRuleModal(receiptId) {
    var st = S.get(), r = S.find(receiptId);
    var cat = r ? r.category : 'purchase';
    var c = st.rules.categories[cat];
    var body = '<p class="small muted">Rule changes apply to <strong>future</strong> requests. This pending request will still wait for your decision. Your rules never change silently.</p>' +
      '<div class="mfield"><label for="m-mode">' + h.esc(c.label) + '</label><select id="m-mode">' +
        ['AUTO', 'ASK', 'NEVER'].map(function (m) { return '<option' + (c.mode === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>';
    if (cat === 'purchase') {
      body += '<div class="mfield"><label for="m-limit">Auto-approve purchases up to (₹)</label><input id="m-limit" type="number" min="0" step="500" value="' + c.autoLimit + '"></div>' +
        '<div class="mfield"><label for="m-cap">Always block purchases above (₹)</label><input id="m-cap" type="number" min="0" step="1000" value="' + c.hardCap + '"></div>';
    }
    if (r && r.findings) {
      body += '<div class="mfield"><label for="m-conflict">When the auditor finds a potential conflict</label><select id="m-conflict">' +
        '<option value="pause"' + (st.rules.conflictPolicy === 'pause' ? ' selected' : '') + '>Pause for me</option>' +
        '<option value="note"' + (st.rules.conflictPolicy === 'note' ? ' selected' : '') + '>Note it in the receipt only</option></select></div>';
    }
    body += '<p class="small muted">Hard boundaries can only be changed on <a href="#/rules" data-act="modal-close">Agents &amp; Rules</a>.</p>';
    openModal({
      title: 'Edit rule', body: body, ok: 'Save rule',
      onOk: function () {
        var next = S.clone(st.rules);
        var nc = next.categories[cat];
        nc.mode = document.getElementById('m-mode').value;
        if (cat === 'purchase') {
          nc.autoLimit = clampMoney(document.getElementById('m-limit').value, nc.autoLimit);
          nc.hardCap = clampMoney(document.getElementById('m-cap').value, nc.hardCap);
        }
        var cf = document.getElementById('m-conflict');
        if (cf) next.conflictPolicy = cf.value;
        var changes = S.saveRules(next);
        toast(changes.length ? 'Rule saved. It applies to future requests.' : 'No changes to save.', changes.length ? 'allowed' : 'info');
        ui.draft = null;
      }
    });
  }

  function clampMoney(v, fallback) {
    var n = Math.round(Number(v));
    if (!isFinite(n) || n < 0) return fallback;
    return Math.min(n, 10000000);
  }

  // ---------- downloads ----------

  function download(id) {
    var r = S.find(id); if (!r) return;
    var out = {
      receipt: r.id, generated_by: 'VERIGATE prototype (sample data)', time: new Date(r.at).toISOString(),
      title: r.title, kind: r.kind, status: r.status, decided_by: r.decidedBy, task: r.task || null,
      category: r.category || null, destination: r.destination || null,
      data_requested: r.data || [], data_shared: r.dataAccessed || [],
      rule_applied: r.rule || null, checks: r.checks || null, outcome: r.outcome,
      reversibility: r.reversibility || null, verified_saving_inr: r.savings || 0,
      findings: r.findings ? { verified: r.findings.verified, potential: r.findings.potential, unknown: r.findings.unknown } : null,
      history: r.history.map(function (e) { return { time: new Date(e.at).toISOString(), event: e.text }; })
    };
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = r.id + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Receipt ' + r.id + ' downloaded.', 'allowed');
  }

  // ---------- actions ----------

  var actions = {
    run: function () {
      if (!S.startRun()) { toast('Decide on the pending request first.', 'info'); return; }
      if (route().name !== 'home') location.hash = '#/home';
    },
    pause: function () { S.setAgentStatus('paused'); toast('Emergency pause on. Nova’s protected actions are stopped.', 'blocked'); },
    resume: function () {
      confirm('Resume Nova?', 'Nova will be able to perform protected actions again, still checked against your rules. A task that was halted won’t restart on its own.', 'Resume Nova',
        function () { S.setAgentStatus('active'); toast('Nova resumed.', 'allowed'); });
    },
    revoke: function () {
      confirm('Revoke Nova’s access?', 'VERIGATE will withdraw Nova’s gateway credentials. Every protected request will be blocked until you reconnect. Direct connections outside the gateway are not affected. That is a known coverage gap.', 'Revoke access',
        function () { S.setAgentStatus('revoked'); toast('Nova’s access revoked.', 'blocked'); }, true);
    },
    reconnect: function () {
      confirm('Reconnect Nova?', 'This restores Nova’s gateway access under your current rules (simulated).', 'Reconnect',
        function () { S.setAgentStatus('active'); toast('Nova reconnected.', 'allowed'); });
    },
    approve: function (el) {
      var res = S.approve(el.dataset.id);
      if (!res.ok) { if (res.message) toast(res.message, 'info'); return; }
      toast(res.receipt.status === 'allowed' ? 'Approved once. ' + res.receipt.outcome : res.receipt.outcome, res.receipt.status === 'allowed' ? 'allowed' : 'blocked');
    },
    reject: function (el) {
      var res = S.reject(el.dataset.id);
      if (!res.ok) return;
      toast('Rejected. Nothing was booked.', 'blocked');
      if (res.retry) location.hash = '#/home';
    },
    alt: function (el) {
      var res = S.chooseAlternative(el.dataset.id);
      if (!res.ok) { if (res.message) toast(res.message, 'info'); return; }
      toast(res.receipt.savings ? 'Alternative booked. Verified saving ' + inr(res.receipt.savings) + '.' : res.receipt.outcome, res.receipt.savings ? 'allowed' : 'blocked');
    },
    'edit-rule': function (el) { editRuleModal(el.dataset.id); },
    'jump-decide': function () {
      var d = document.getElementById('decide');
      if (d) { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); var b = d.querySelector('button'); if (b) b.focus({ preventScroll: true }); }
    },
    'modal-close': function () { closeModal(); },
    'modal-ok': function () {
      var m = ui.modal; if (!m) return;
      // Run first: some handlers read form values from the open modal.
      if (m.onOk) m.onOk();
      closeModal();
    },
    mode: function (el) {
      ui.draft.rules.categories[el.dataset.cat].mode = el.dataset.mode;
      renderView();
    },
    boundary: function (el) {
      var i = Number(el.dataset.index);
      var b = ui.draft.rules.boundaries[i];
      if (el.checked) { b.active = true; renderView(); return; }
      el.checked = true; // stay on until confirmed
      confirm('Turn off this hard boundary?', '“' + h.esc(b.text) + '”<br><br>Without it, matching requests fall back to your category rules and may be allowed or sent to you for approval. You will still need to press <strong>Save rules</strong>.', 'Turn off',
        function () { b.active = false; renderView(); }, true);
    },
    'rules-save': function () {
      var d = ui.draft;
      var changes = S.saveRules(d.rules, d.expiry);
      ui.draft = freshDraft();
      toast(changes.length ? 'Rules saved: ' + changes.length + ' change' + (changes.length > 1 ? 's' : '') + '. They apply to future requests.' : 'No changes to save.', 'allowed');
      render();
    },
    'rules-discard': function () { ui.draft = freshDraft(); renderView(); toast('Changes discarded.'); },
    'mem-tab': function (el) { ui.memTab = el.dataset.tab; ui.editing = null; ui.focus = null; renderView(); },
    'mem-edit': function (el) { ui.editing = el.dataset.id; renderView(); },
    'mem-cancel': function () { ui.editing = null; renderView(); },
    'mem-restrict': function (el) { S.toggleRestrict(el.dataset.id); },
    'mem-confirm': function (el) { S.setInference(el.dataset.id, 'confirmed'); toast('Inference confirmed.', 'allowed'); },
    'mem-incorrect': function (el) { S.setInference(el.dataset.id, 'incorrect'); toast('Marked incorrect. The gateway will withhold it from Nova.', 'allowed'); },
    'mem-delete': function (el) {
      var id = el.dataset.id;
      var m = S.get().memory.filter(function (x) { return x.id === id; })[0];
      confirm('Delete “' + h.esc(m.label) + '”?',
        'This removes it from VERIGATE’s local profile, and the gateway stops passing it on. VERIGATE will send a deletion request to Nova Labs (simulated), but <strong>it cannot erase copies Nova Labs or other services already hold</strong>. The request’s status will appear in Activity.', 'Delete locally',
        function () { if (ui.editing === id) ui.editing = null; S.deleteMemory(id); toast('Deleted locally. Deletion request sent (simulated).', 'allowed'); }, true);
    },
    'filter-status': function (el) { ui.filters.status = el.dataset.status; renderView(); },
    download: function (el) { download(el.dataset.id); },
    reset: function () {
      confirm('Reset the demo?', 'This clears every run, decision, rule change and memory edit, and starts again from the sample data.', 'Reset demo',
        function () { ui.seen = {}; ui.draft = null; ui.editing = null; ui.focus = null; ui.memTab = 'all'; ui.filters = { status: 'all', category: 'all', date: 'all' }; S.init(); location.hash = '#/home'; toast('Demo reset.'); }, true);
    }
  };

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var act = el.dataset.act;
    if (!actions[act]) return;
    if (el.tagName === 'FORM') return; // handled on submit
    if (el.tagName === 'INPUT' && el.type === 'checkbox') { actions[act](el); return; }
    if (el.tagName === 'A' && act === 'modal-close') { closeModal(); return; }
    e.preventDefault();
    actions[act](el);
  }

  function onChange(e) {
    var el = e.target;
    var f = el.dataset.field;
    if (f && ui.draft && route().name === 'rules') {
      var R = ui.draft.rules;
      if (f === 'autoLimit') R.categories.purchase.autoLimit = clampMoney(el.value, R.categories.purchase.autoLimit);
      else if (f === 'hardCap') R.categories.purchase.hardCap = clampMoney(el.value, R.categories.purchase.hardCap);
      else if (f === 'minimise') R.categories.read.minimise = el.checked;
      else if (f === 'expiry') ui.draft.expiry = el.value;
      else if (f === 'conflictPolicy') R.conflictPolicy = el.value;
      renderView();
      return;
    }
    if (el.dataset.filter) { ui.filters[el.dataset.filter] = el.value; renderView(); }
  }

  function onSubmit(e) {
    var form = e.target;
    if (form.dataset.act !== 'mem-save') return;
    e.preventDefault();
    var input = form.querySelector('input');
    var id = form.dataset.id;
    ui.editing = null;
    S.editMemory(id, input.value);
    renderView();
  }

  function onKey(e) {
    if (e.key === 'Escape' && ui.modal) { closeModal(); return; }
    if (e.key === 'Escape' && ui.editing) { ui.editing = null; renderView(); return; }
    if (e.key === 'Tab' && ui.modal) {
      var f = modalEl.querySelectorAll('button, input, select, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function boot() {
    viewEl = document.getElementById('view');
    modalEl = document.getElementById('modal-root');
    toastEl = document.getElementById('toast-root');
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', function () { ui.editing = null; render(); });
    S.subscribe(render);
    S.init();
    if (!location.hash) {
      try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; }
    }
    render();
    // Keep the clock and "price last checked" text current.
    setInterval(function () {
      renderChrome();
      if (route().name === 'approvals' && route().id && !ui.modal) renderView();
    }, 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
