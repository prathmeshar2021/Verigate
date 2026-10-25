// Routing, events, dialogs. Hash routes keep it to one page, so state
// survives navigation when opened straight from disk.

(() => {
  const S = VG.store, V = VG.views, { esc, day, clock } = VG.h;
  let view, modalRoot, toasts, lastKey = null, lastFocus = null;

  const ui = {
    seen: {},
    editing: null,
    focus: null,
    filters: { status: 'all', category: 'all', date: 'all' },
    draft: null,
    modal: null
  };
  const resetFilters = () => { ui.filters = { status: 'all', category: 'all', date: 'all' }; };
  const TITLES = { home: 'Overview', approvals: 'Approvals', rules: 'Rules', memory: 'Memory', log: 'Log', how: 'How it works' };

  function route() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const [name = 'home', id = null] = path.split('/');
    const params = Object.fromEntries(new URLSearchParams(query));
    return { name: name || 'home', id, params, key: raw || 'home' };
  }

  const freshDraft = () => ({ rules: S.clone(S.get().rules), expiry: S.get().agent.expiry });

  function renderView() {
    const st = S.get(), r = route();
    const changed = r.key !== lastKey;

    // Keep focus and typed text through background re-renders.
    const el = document.activeElement;
    const keep = el && el.id && view.contains(el) && ['INPUT', 'SELECT'].includes(el.tagName)
      ? { id: el.id, value: el.value, start: el.selectionStart, end: el.selectionEnd } : null;

    let html;
    switch (r.name) {
      case 'home': html = V.home(st, ui); break;
      case 'approvals':
        if (r.id) { if (changed) S.markGuide('reviewed'); html = V.approval(st, r.id); }
        else html = V.approvals(st);
        break;
      case 'rules':
        if (!ui.draft || changed) ui.draft = freshDraft();
        html = V.rules(st, ui.draft);
        break;
      case 'memory':
        if (changed) { ui.focus = r.id; S.markGuide('memory'); }
        html = V.memory(st, ui);
        break;
      case 'log':
        if (r.id) { if (changed) S.markGuide('receipt'); html = V.receipt(st, r.id); break; }
        if (changed && r.params.status) ui.filters = { status: r.params.status, category: 'all', date: 'all' };
        else if (changed && !/^log\//.test(lastKey || '')) resetFilters();
        html = V.log(st, ui);
        break;
      case 'how': html = V.how(); break;
      default: html = V.notFound();
    }
    view.innerHTML = html;
    if (st.run) st.run.receipts.forEach(id => { ui.seen[id] = true; });

    if (keep) {
      const k = document.getElementById(keep.id);
      if (k) {
        k.value = keep.value;
        k.focus({ preventScroll: true });
        try { if (keep.start != null) k.setSelectionRange(keep.start, keep.end); } catch (e) { /* number inputs */ }
      }
    }
    if (changed) {
      lastKey = r.key;
      window.scrollTo(0, 0);
      const h1 = view.querySelector('h1');
      if (h1 && !keep) h1.focus({ preventScroll: true });
      if (r.name === 'memory' && ui.focus) {
        const row = document.getElementById('mem-' + ui.focus);
        if (row) row.scrollIntoView({ block: 'center' });
      }
    }
    if (ui.editing) {
      const inp = document.getElementById('edit-' + ui.editing);
      if (inp && document.activeElement !== inp) { inp.focus(); inp.select(); }
    }
    document.title = `${TITLES[r.name] || 'Not found'} · Verigate`;
  }

  function renderChrome() {
    const st = S.get(), r = route();
    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === r.name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const n = S.pending().length;
    document.querySelectorAll('[data-badge="approvals"]').forEach(b => { b.textContent = n; b.hidden = !n; });

    const status = st.agent.status;
    const state = document.getElementById('agent-state');
    state.className = 'state state--' + status;
    state.textContent = 'Nova ' + { active: 'active', paused: 'paused', revoked: 'revoked' }[status];

    const btn = document.getElementById('pause-btn');
    btn.disabled = status === 'revoked';
    btn.dataset.act = status === 'active' ? 'pause' : status === 'paused' ? 'resume' : '';
    btn.textContent = status === 'active' ? 'Pause Nova' : status === 'paused' ? 'Resume' : 'Revoked';
    btn.className = 'btn btn--small ' + (status === 'active' ? 'btn--pause' : status === 'paused' ? 'btn--ink' : '');

    const strip = document.getElementById('pause-strip');
    strip.hidden = status === 'active';
    strip.className = 'strip strip--' + status;
    strip.innerHTML = status === 'paused'
      ? '<b>Nova is paused.</b> Nothing goes through the gateway until you resume.'
      : '<b>Nova’s access is revoked.</b> Every request is blocked. Reconnect it under <a href="#/rules">Rules</a>.';

    document.getElementById('clock').textContent = `${day(S.now())} 2040, ${clock(S.now())} IST`;
  }

  const render = () => { renderView(); renderChrome(); };

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 4000);
    setTimeout(() => t.remove(), 4400);
  }

  function openModal(opts) {
    lastFocus = document.activeElement;
    ui.modal = opts;
    modalRoot.innerHTML = `<div class="scrim" data-act="modal-close"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">${opts.title}</h2>
        <div class="modal-body">${opts.body}</div>
        <div class="modal-actions">
          <button class="btn btn--plain" data-act="modal-close">Cancel</button>
          <button class="btn ${opts.danger ? 'btn--stop-solid' : 'btn--ink'}" data-act="modal-ok">${opts.ok}</button>
        </div>
      </div>`;
    modalRoot.hidden = false;
    document.body.classList.add('has-modal');
    (modalRoot.querySelector('input, select') || modalRoot.querySelector('[data-act="modal-ok"]')).focus();
  }

  function closeModal() {
    ui.modal = null;
    modalRoot.hidden = true;
    modalRoot.innerHTML = '';
    document.body.classList.remove('has-modal');
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  const confirm = (title, body, ok, onOk, danger) => openModal({ title, body: `<p>${body}</p>`, ok, onOk, danger });

  const money = (v, fallback) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 10000000) : fallback;
  };

  function editRuleModal(id) {
    const st = S.get(), r = S.find(id);
    const cat = r ? r.category : 'purchase';
    const c = st.rules.categories[cat];
    let body = `<p class="fine">This changes what happens to future requests. The one that’s held still needs your decision.</p>
      <label class="field">${esc(c.label)}<select id="m-mode">${['AUTO', 'ASK', 'NEVER'].map(m => `<option${c.mode === m ? ' selected' : ''}>${m}</option>`).join('')}</select></label>`;
    if (cat === 'purchase') {
      body += `<label class="field">Go ahead without asking up to (₹)<input id="m-limit" type="number" min="0" step="500" value="${c.autoLimit}"></label>
        <label class="field">Always block above (₹)<input id="m-cap" type="number" min="0" step="1000" value="${c.hardCap}"></label>`;
    }
    if (r && r.findings) {
      body += `<label class="field">When there’s a possible conflict<select id="m-conflict">
        <option value="pause"${st.rules.conflictPolicy === 'pause' ? ' selected' : ''}>Hold it for me</option>
        <option value="note"${st.rules.conflictPolicy === 'note' ? ' selected' : ''}>Just note it</option></select></label>`;
    }
    body += `<p class="fine">Never rules are changed under <a href="#/rules" data-act="modal-close">Rules</a>.</p>`;
    openModal({
      title: 'Change a rule', body, ok: 'Save',
      onOk() {
        const next = S.clone(st.rules);
        const nc = next.categories[cat];
        nc.mode = document.getElementById('m-mode').value;
        if (cat === 'purchase') {
          nc.autoLimit = money(document.getElementById('m-limit').value, nc.autoLimit);
          nc.hardCap = money(document.getElementById('m-cap').value, nc.hardCap);
        }
        const cf = document.getElementById('m-conflict');
        if (cf) next.conflictPolicy = cf.value;
        toast(S.saveRules(next).length ? 'Saved. Applies from the next request.' : 'Nothing changed.');
        ui.draft = null;
      }
    });
  }

  function download(id) {
    const r = S.find(id);
    if (!r) return;
    const out = {
      receipt: r.id, time: new Date(r.at).toISOString(), title: r.title, kind: r.kind, status: r.status,
      decided_by: r.decidedBy, task: r.task || null, category: r.category || null, destination: r.destination || null,
      data_requested: r.data || [], data_sent: r.dataAccessed || [], rule: r.rule || null, checks: r.checks || null,
      outcome: r.outcome, reversibility: r.reversibility || null, saved_inr: r.savings || 0,
      findings: r.findings ? { verified: r.findings.verified, potential: r.findings.potential, unknown: r.findings.unknown } : null,
      history: r.history.map(e => ({ time: new Date(e.at).toISOString(), event: e.text }))
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.download = r.id + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Downloaded ${r.id}.json`);
  }

  const actions = {
    run() {
      if (!S.startRun()) return toast('Decide on the held request first.');
      if (route().name !== 'home') location.hash = '#/home';
    },
    pause() { S.setAgentStatus('paused'); toast('Nova paused.'); },
    resume() {
      confirm('Resume Nova?', 'Requests will go through again, checked against your rules. A stopped task won’t restart by itself.', 'Resume',
        () => { S.setAgentStatus('active'); toast('Nova resumed.'); });
    },
    revoke() {
      confirm('Revoke Nova’s access?', 'Nova’s gateway credentials are withdrawn and every request is blocked until you reconnect. Direct connections that skip the gateway aren’t affected.', 'Revoke',
        () => { S.setAgentStatus('revoked'); toast('Access revoked.'); }, true);
    },
    reconnect() {
      confirm('Reconnect Nova?', 'Gives Nova its gateway access back, under your current rules.', 'Reconnect',
        () => { S.setAgentStatus('active'); toast('Nova reconnected.'); });
    },
    approve(el) {
      const res = S.approve(el.dataset.id);
      if (!res.ok) return res.message && toast(res.message);
      toast(res.receipt.outcome);
    },
    reject(el) {
      const res = S.reject(el.dataset.id);
      if (!res.ok) return;
      toast('Rejected. Nothing booked.');
      if (res.retry) location.hash = '#/home';
    },
    alt(el) {
      const res = S.chooseAlternative(el.dataset.id);
      if (!res.ok) return res.message && toast(res.message);
      toast(res.receipt.savings ? `Booked. Saved ${VG.inr(res.receipt.savings)}.` : res.receipt.outcome);
    },
    'edit-rule': el => editRuleModal(el.dataset.id),
    'jump-decide'() {
      const d = document.getElementById('decide');
      if (!d) return;
      d.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const b = d.querySelector('button');
      if (b) b.focus({ preventScroll: true });
    },
    'modal-close': closeModal,
    'modal-ok'() {
      const m = ui.modal;
      if (!m) return;
      // Read the form before the dialog is torn down.
      if (m.onOk) m.onOk();
      closeModal();
    },
    mode(el) { ui.draft.rules.categories[el.dataset.cat].mode = el.dataset.mode; renderView(); },
    boundary(el) {
      const b = ui.draft.rules.boundaries[Number(el.dataset.index)];
      if (el.checked) { b.active = true; return renderView(); }
      el.checked = true; // stays on until confirmed
      confirm('Turn this off?', `“${esc(b.text)}”<br><br>Matching requests would fall back to your category rules. You’ll still need to save.`, 'Turn off',
        () => { b.active = false; renderView(); }, true);
    },
    'rules-save'() {
      const n = S.saveRules(ui.draft.rules, ui.draft.expiry).length;
      ui.draft = freshDraft();
      toast(n ? `Saved ${n} change${n > 1 ? 's' : ''}.` : 'Nothing changed.');
      render();
    },
    'rules-discard'() { ui.draft = freshDraft(); renderView(); },
    'mem-edit'(el) { ui.editing = el.dataset.id; renderView(); },
    'mem-cancel'() { ui.editing = null; renderView(); },
    'mem-restrict'(el) { S.toggleRestrict(el.dataset.id); },
    'mem-confirm'(el) { S.setInference(el.dataset.id, 'confirmed'); },
    'mem-incorrect'(el) { S.setInference(el.dataset.id, 'incorrect'); toast('Marked wrong. Nova won’t be sent it.'); },
    'mem-delete'(el) {
      const id = el.dataset.id;
      const m = S.get().memory.find(x => x.id === id);
      confirm(`Delete “${esc(m.label)}”?`,
        'It’s removed from this device and the gateway stops sending it on. Nova Labs may already have a copy; a deletion request goes to them, but the gateway can’t confirm it was done.', 'Delete',
        () => { if (ui.editing === id) ui.editing = null; S.deleteMemory(id); }, true);
    },
    'filter-status'(el) { ui.filters.status = el.dataset.status; renderView(); },
    download: el => download(el.dataset.id),
    reset() {
      confirm('Reset the demo?', 'Clears every run, decision, rule change and memory edit.', 'Reset', () => {
        Object.assign(ui, { seen: {}, draft: null, editing: null, focus: null });
        resetFilters();
        S.init();
        location.hash = '#/home';
      }, true);
    }
  };

  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.tagName === 'FORM' || !actions[el.dataset.act]) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') return actions[el.dataset.act](el);
    if (el.tagName === 'A' && el.dataset.act === 'modal-close') return closeModal();
    e.preventDefault();
    actions[el.dataset.act](el);
  }

  function onChange(e) {
    const el = e.target, f = el.dataset.field;
    if (f && ui.draft && route().name === 'rules') {
      const R = ui.draft.rules, p = R.categories.purchase;
      if (f === 'autoLimit') p.autoLimit = money(el.value, p.autoLimit);
      else if (f === 'hardCap') p.hardCap = money(el.value, p.hardCap);
      else if (f === 'minimise') R.categories.read.minimise = el.checked;
      else if (f === 'expiry') ui.draft.expiry = el.value;
      else if (f === 'conflictPolicy') R.conflictPolicy = el.value;
      return renderView();
    }
    if (el.dataset.filter) { ui.filters[el.dataset.filter] = el.value; renderView(); }
  }

  function onSubmit(e) {
    const form = e.target;
    if (form.dataset.act !== 'mem-save') return;
    e.preventDefault();
    ui.editing = null;
    S.editMemory(form.dataset.id, form.querySelector('input').value);
    renderView();
  }

  function onKey(e) {
    if (e.key === 'Escape' && ui.modal) return closeModal();
    if (e.key === 'Escape' && ui.editing) { ui.editing = null; return renderView(); }
    if (e.key === 'Tab' && ui.modal) {
      const f = modalRoot.querySelectorAll('button, input, select, a[href]');
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function boot() {
    view = document.getElementById('view');
    modalRoot = document.getElementById('modal-root');
    toasts = document.getElementById('toasts');
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => { ui.editing = null; render(); });
    S.subscribe(render);
    S.init();
    if (!location.hash) {
      try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; }
    }
    render();
    setInterval(() => {
      renderChrome();
      const r = route();
      if (r.name === 'approvals' && r.id && !ui.modal) renderView();
    }, 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
