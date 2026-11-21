/* LRStudy v1.7 — app shell, router, shared UI */
(function () {
  'use strict';

  const LR = window.LR;
  const App = (window.App = window.App || {});
  const actions = (App.actions = App.actions || {});
  const pages = (App.pages = App.pages || {});
  const ui = (App.ui = {
    notebookFilter: 'all',
    reviewNotebookId: null,
    settingsOpenModule: null,
    questionSelectMode: false,
    questionSelected: [],
    reviewMode: 'ai',
    reviewModeDrawer: false,
    reviewHistorySelectMode: false,
    reviewHistorySelected: [],
    reviewPrintSelection: [],
    busyDepth: 0,
    modal: null,
    route: null
  });

  const e = LR.escapeHTML;
  const attr = LR.escapeAttr;
  App.e = e;

  /* ------------------------------- icons --------------------------------- */

  const ICON_PATHS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    book: '<path d="M5 4.5h10.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2Z"/><path d="M5 17.5h12.5"/><path d="M8.5 4.5v8l2.2-1.6 2.3 1.6v-8"/>',
    review: '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/><path d="M12 8v4l2.5 1.5"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    sparkle: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z"/><path d="M18.5 15.5 19 17l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 17l1.5-.5Z"/>',
    pen: '<path d="m15 4 5 5L8 21H3v-5Z"/><path d="m12 7 5 5"/>',
    eraser: '<path d="m7 20-3-3L16 5a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L9 22"/><path d="m11 8 7 7M7 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.8-7.92A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1 0 8.5Z"/><path d="M12 12v6M9.5 14.5 12 12l2.5 2.5"/>',
    printer: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
    folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    eyeOff: '<path d="m3 3 18 18M10.5 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3 3.7M6.2 6.7C3.5 8.6 2 12 2 12s3.5 6 10 6c1 0 2-.2 2.8-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    downloadCloud: '<path d="M7 17a4 4 0 0 1-.8-7.92A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1 0 8.5"/><path d="M12 11v8M8.5 15.5 12 19l3.5-3.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
    warning: '<path d="M12 3 2.5 20h19Z"/><path d="M12 9v5M12 17h.01"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    edit: '<path d="M12 20h9"/><path d="m16.5 3.5 4 4L8 20H4v-4Z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    bookOpen: '<path d="M3 5h6a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H3Z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h6Z"/>',
    sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z"/>'
  };

  function icon(name, className) {
    const path = ICON_PATHS[name] || ICON_PATHS.info;
    return '<svg class="' + (className || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + path + '</svg>';
  }
  App.icon = icon;

  function avatarHTML(extraClass) {
    const state = LR.db && LR.db.state;
    if (!state) return '';
    const avatar = state.profile.avatar;
    const initial = String(state.profile.nickname || '学').trim().charAt(0) || '学';
    if (avatar) {
      return '<span class="avatar ' + (extraClass || '') + '"><img src="' + attr(avatar) + '" alt="用户头像"></span>';
    }
    return '<span class="avatar ' + (extraClass || '') + '">' + e(initial) + '</span>';
  }
  App.avatarHTML = avatarHTML;

  function avatarMiniHTML() {
    const state = LR.db.state;
    if (state.profile.avatar) {
      return '<img src="' + attr(state.profile.avatar) + '" alt="">';
    }
    return e(String(state.profile.nickname || '学').trim().charAt(0) || '学');
  }
  App.avatarMiniHTML = avatarMiniHTML;

  /* ------------------------------- toast --------------------------------- */

  function toast(message, type, duration) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    while (root.children.length >= 3) root.removeChild(root.firstElementChild);
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.textContent = String(message || '');
    root.appendChild(el);
    const delay = duration || (type === 'error' ? 5200 : 2800);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 220);
    }, delay);
  }
  App.toast = toast;

  /* ------------------------------- busy ---------------------------------- */

  function showBusy(title, copy) {
    ui.busyDepth += 1;
    let overlay = document.getElementById('busyOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'busyOverlay';
      overlay.className = 'busy-overlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = '<div class="busy-card"><span class="spinner spinner--large" aria-hidden="true"></span><p class="busy-title"></p><p class="busy-copy"></p></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.busy-title').textContent = title || '正在处理…';
    overlay.querySelector('.busy-copy').textContent = copy || '';
    return function hide() {
      ui.busyDepth = Math.max(0, ui.busyDepth - 1);
      if (!ui.busyDepth) {
        const node = document.getElementById('busyOverlay');
        if (node) node.remove();
      }
    };
  }
  App.showBusy = showBusy;

  async function withBusy(title, copy, fn) {
    const hide = showBusy(title, copy);
    try {
      return await fn();
    } finally {
      hide();
    }
  }
  App.withBusy = withBusy;

  /* ------------------------------- modal --------------------------------- */

  function modalShell(options) {
    const opts = options || {};
    return (
      '<div class="modal-head">' +
        '<div class="modal-head-copy">' +
          (opts.eyebrow ? '<div class="modal-eyebrow">' + e(opts.eyebrow) + '</div>' : '') +
          '<div class="modal-title">' + e(opts.title || '') + '</div>' +
        '</div>' +
        (opts.noClose ? '' : '<button type="button" class="icon-button modal-close" data-action="close-modal" aria-label="关闭">' + icon('close') + '</button>') +
      '</div>' +
      '<div class="modal-body ' + (opts.flushBody ? 'modal-body--flush' : '') + '">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '')
    );
  }
  App.modalShell = modalShell;

  function openModal(config) {
    const opts = config || {};
    // Opening a new modal discards the previous one without firing callbacks.
    if (ui.modal) {
      const old = ui.modal;
      ui.modal = null;
      if (old.onClose) old.onClose();
    }
    const root = document.getElementById('modalRoot');
    const sizeClass = opts.size === 'full' ? 'modal--full' : opts.size === 'viewer' ? 'modal--viewer' : opts.size === 'dialog' ? 'modal--dialog' : '';
    const centerClass = opts.center ? ' modal-backdrop--center' : '';
    const dismissible = opts.dismissible !== false;
    root.innerHTML =
      '<div class="modal-backdrop' + centerClass + '" data-modal-backdrop="1">' +
        '<div class="modal ' + sizeClass + '" role="dialog" aria-modal="true" aria-label="' + attr(opts.ariaLabel || opts.title || '对话框') + '">' +
          opts.html +
        '</div>' +
      '</div>';
    document.body.classList.add('modal-open');
    const backdrop = root.querySelector('[data-modal-backdrop]');
    const modal = root.querySelector('.modal');
    ui.modal = {
      root: modal,
      backdrop: backdrop,
      onClose: opts.onClose,
      onMount: opts.onMount
    };
    if (dismissible) {
      backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) closeModal();
      });
    }
    if (opts.onMount) {
      try { opts.onMount(modal); } catch (err) { console.error(err); toast('弹窗加载失败：' + err.message, 'error'); }
    }
    requestAnimationFrame(function () {
      const target = modal.querySelector('[autofocus]') || modal.querySelector('input:not([type="hidden"]), textarea, .btn--primary, button');
      if (target) target.focus({ preventScroll: true });
    });
    return ui.modal;
  }
  App.openModal = openModal;

  function openBasicModal(options) {
    const opts = options || {};
    return openModal({
      html: modalShell(opts),
      size: opts.size || (opts.center ? 'dialog' : undefined),
      center: !!opts.center,
      dismissible: opts.dismissible !== false,
      ariaLabel: opts.title,
      onMount: opts.onMount,
      onClose: opts.onClose
    });
  }
  App.openBasicModal = openBasicModal;

  function closeModal() {
    const active = ui.modal;
    if (!active) return;
    ui.modal = null;
    const root = document.getElementById('modalRoot');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (active.onClose) {
      try { active.onClose(); } catch (err) { console.error(err); }
    }
  }
  App.closeModal = closeModal;

  function confirmDialog(options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      let settled = false;
      let modal;
      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
        if (ui.modal === modal) closeModal();
      }
      modal = openBasicModal({
        title: opts.title || '确认操作',
        eyebrow: opts.eyebrow || 'CONFIRM',
        body: '<p class="analysis-text">' + LR.textToHTML(opts.message || '') + '</p>' +
          (opts.hint ? '<p class="modal-note">' + LR.textToHTML(opts.hint) + '</p>' : ''),
        footer: '<button type="button" class="btn btn--ghost" data-confirm="no">' + e(opts.cancelLabel || '取消') + '</button>' +
          '<button type="button" class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-confirm="yes"><span>' + e(opts.confirmLabel || '确认') + '</span></button>',
        center: true,
        onMount: function (root) {
          root.querySelector('[data-confirm="no"]').addEventListener('click', function () { finish(false); });
          root.querySelector('[data-confirm="yes"]').addEventListener('click', function () { finish(true); });
        },
        onClose: function () { if (!settled) { settled = true; resolve(false); } }
      });
    });
  }
  App.confirm = confirmDialog;

  /* ----------------------------- file pickers ---------------------------- */

  function pickFiles(options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = opts.accept || 'image/*';
      input.multiple = !!opts.multiple;
      if (opts.capture) input.setAttribute('capture', opts.capture);
      input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(input);
      let finished = false;
      function finish(files) {
        if (finished) return;
        finished = true;
        input.remove();
        resolve(files);
      }
      input.addEventListener('change', function () {
        finish(Array.prototype.slice.call(input.files || []));
      });
      // A "cancel" event is available in modern Chrome/Safari.
      input.addEventListener('cancel', function () { finish([]); });
      input.click();
    });
  }
  App.pickFiles = pickFiles;

  /* ------------------------------ routes --------------------------------- */

  function parseHash() {
    const raw = String(location.hash || '').replace(/^#/, '');
    const parts = raw.split('/').filter(Boolean).map(function (part) {
      try { return decodeURIComponent(part); } catch (_) { return part; }
    });
    if (parts[0] === 'notebooks') {
      if (parts[1]) return { page: 'notebook', tab: 'notebooks', notebookId: parts[1] };
      return { page: 'notebooks', tab: 'notebooks' };
    }
    if (parts[0] === 'review') {
      if (parts[1]) return { page: 'session', tab: 'review', sessionId: parts[1] };
      return { page: 'review', tab: 'review' };
    }
    if (parts[0] === 'settings') return { page: 'settings', tab: 'settings' };
    return { page: 'notebooks', tab: 'notebooks' };
  }

  function navigate(path, options) {
    const opts = options || {};
    closeModal();
    if (opts.replace) {
      history.replaceState(null, '', path);
      render();
    } else if (location.hash === path) {
      render();
    } else {
      location.hash = path;
    }
  }
  App.navigate = navigate;

  function route() {
    return parseHash();
  }
  App.route = route;

  /* ------------------------------ chrome --------------------------------- */

  function renderHeader(r) {
    const header = document.getElementById('appHeader');
    const shell = document.getElementById('appShell');
    if (!header) return;
    // Root tabs follow the minimalist reference: no persistent brand bar.
    // Content titles carry the identity; sub-pages get a compact back bar.
    if (r.page === 'notebooks' || r.page === 'review' || r.page === 'settings') {
      header.innerHTML = '';
      if (shell) shell.classList.remove('has-topbar');
      return;
    }
    let inner = '';
    if (r.page === 'notebook') {
      inner =
        '<button type="button" class="icon-button" data-nav="#/notebooks" aria-label="返回错题本列表">' + icon('arrowLeft') + '</button>' +
        '<span class="topbar-flex-spacer"></span>' +
        '<button type="button" class="icon-button" data-action="notebook-menu" data-id="' + attr(r.notebookId) + '" aria-label="管理错题本">' + icon('more') + '</button>';
    } else if (r.page === 'session') {
      inner =
        '<button type="button" class="icon-button" data-nav="#/review" aria-label="返回复习">' + icon('arrowLeft') + '</button>' +
        '<span class="topbar-flex-spacer"></span>' +
        '<span class="topbar-mini-mark">LR</span>';
    }
    if (shell) shell.classList.add('has-topbar');
    header.innerHTML = '<header class="topbar topbar--minimal"><div class="topbar-inner">' + inner + '</div></header>';
  }

  function renderTabbar(r) {
    const tabbar = document.getElementById('tabbar');
    if (!tabbar) return;
    if (!tabbar.dataset.ready) {
      const tabs = [
        { key: 'notebooks', label: '错题本', href: '#/notebooks', icon: 'book' },
        { key: 'review', label: '复习', href: '#/review', icon: 'review' },
        { key: 'settings', label: '设置', href: '#/settings', icon: 'settings' }
      ];
      tabbar.innerHTML = '<div class="tabbar-inner">' + tabs.map(function (tab) {
        return '<button type="button" class="tab-button ' + (r.tab === tab.key ? 'is-active' : '') + '" data-tab="' + tab.key + '" data-nav="' + tab.href + '" aria-label="' + tab.label + '"' + (r.tab === tab.key ? ' aria-current="page"' : '') + '>' +
          icon(tab.icon) + '<span>' + tab.label + '</span></button>';
      }).join('') + '</div>';
      tabbar.dataset.ready = '1';
      return;
    }
    tabbar.querySelectorAll('.tab-button').forEach(function (button) {
      const active = button.getAttribute('data-tab') === r.tab;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function documentTitle(r) {
    let title = 'LRStudy · 智能错题整理';
    if (r.page === 'notebook') {
      const notebook = LR.db.notebook(r.notebookId);
      if (notebook) title = notebook.name + ' · LRStudy';
    } else if (r.page === 'review') title = '复习 · LRStudy';
    else if (r.page === 'session') title = '复习练习 · LRStudy';
    else if (r.page === 'settings') title = '设置 · LRStudy';
    document.title = title;
  }

  function render() {
    if (!LR.db || !LR.db.state) return;
    const r = parseHash();
    ui.route = r;
    const firstView = !ui.hasRenderedView;
    renderHeader(r);
    renderTabbar(r);
    documentTitle(r);
    const view = document.getElementById('view');
    if (!view) return;
    const renderer = pages[r.page];
    if (!renderer) {
      view.innerHTML = '<div class="view-inner' + (firstView ? ' is-intro' : '') + '">' + emptyState('页面不存在', '这个页面可能已经移动。', 'info', '<button type="button" class="btn btn--primary" data-nav="#/notebooks">回到错题本</button>') + '</div>';
      ui.hasRenderedView = true;
      return;
    }
    try {
      view.innerHTML = '<div class="view-inner' + (firstView ? ' is-intro' : '') + '">' + renderer(r) + '</div>';
    } catch (err) {
      console.error(err);
      view.innerHTML = '<div class="view-inner">' + emptyState('页面加载失败', err.message || '未知错误', 'warning', '<button type="button" class="btn" data-nav="#/notebooks">重新开始</button>') + '</div>';
      ui.hasRenderedView = true;
      return;
    }
    ui.hasRenderedView = true;
    hydrateImages(view);
    if (App.afterRender) {
      try { App.afterRender(view, r); } catch (err) { console.error(err); }
    }
  }
  App.render = render;

  function hydrateImages(root) {
    if (!root) return;
    const images = Array.prototype.slice.call(root.querySelectorAll('img[data-image-id]'));
    images.forEach(function (img) {
      const id = img.getAttribute('data-image-id');
      if (!id) return;
      LR.db.imageURL(id).then(function (url) {
        if (!img.isConnected) return;
        if (url) {
          img.src = url;
          img.classList.add('is-loaded');
        } else {
          img.dataset.missing = '1';
        }
      }).catch(function () {
        img.dataset.missing = '1';
      });
    });
  }
  App.hydrateImages = hydrateImages;

  /* ---------------------------- helpers ---------------------------------- */

  function emptyState(title, copy, iconName, actionHTML) {
    return '<div class="empty-state">' +
      '<div class="empty-icon">' + icon(iconName || 'book') + '</div>' +
      '<h3>' + e(title) + '</h3>' +
      '<p>' + e(copy) + '</p>' +
      (actionHTML || '') +
    '</div>';
  }
  App.emptyState = emptyState;

  function questionCountLabel(count) {
    return String(count) + ' 道错题';
  }
  App.questionCountLabel = questionCountLabel;

  function notebookCard(nb, index, total) {
    const stats = LR.db.notebookStats(nb.id);
    const kps = stats.knowledge.slice(0, 2);
    const totalCount = stats.total;
    const mastered = totalCount ? Math.round((stats.mastered / totalCount) * 100) : 0;
    const href = '#/notebooks/' + encodeURIComponent(nb.id);
    return '<article class="notebook-card" data-nav="' + attr(href) + '" role="link" tabindex="0" aria-label="打开错题本 ' + attr(nb.name) + '">' +
      '<div class="notebook-card-top">' +
        '<span class="notebook-index">' + String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + '</span>' +
        '<span class="notebook-arrow">' + icon('arrowUpRight') + '</span>' +
      '</div>' +
      '<h3 class="notebook-name">' + e(nb.name) + '</h3>' +
      '<div class="notebook-meta">' +
        '<span>' + questionCountLabel(totalCount) + '</span>' +
        '<span>待复习 ' + stats.unmastered + '</span>' +
        '<span>' + (totalCount ? LR.relativeDate(nb.updatedAt) : '还没有内容') + '</span>' +
      '</div>' +
      '<div class="notebook-kps">' +
        (kps.length ? kps.map(function (k) { return '<span class="chip">' + e(k.name) + '</span>'; }).join('') :
          '<span class="chip chip--dashed">待整理知识点</span>') +
      '</div>' +
      '<div class="notebook-bottom">' +
        '<span class="progress-track"><span class="progress-fill" style="width:' + mastered + '%"></span></span>' +
        '<span class="progress-label">' + (totalCount ? mastered + '% 已掌握' : '尚未开始') + '</span>' +
      '</div>' +
    '</article>';
  }

  function renderNotebooksPage() {
    const state = LR.db.state;
    const notebooks = state.notebooks.slice().sort(function (a, b) {
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
    const totalQuestions = state.questions.length;
    const unmastered = state.questions.filter(function (q) { return !q.mastered; }).length;
    const allStats = notebooks.map(function (nb) { return LR.db.notebookStats(nb.id); });
    const masteredTotal = allStats.reduce(function (sum, s) { return sum + s.mastered; }, 0);
    const masteredPercent = totalQuestions ? Math.round((masteredTotal / totalQuestions) * 100) : 0;
    return '' +
      '<section class="page-head">' +
        '<div class="eyebrow">COLLECTION / 错题研究</div>' +
        '<div class="page-head-row">' +
          '<h1 class="page-title">错题本<em>.</em></h1>' +
          '<button type="button" class="round-add" data-action="new-notebook" aria-label="新建错题本">' + icon('plus') + '</button>' +
        '</div>' +
        '<p class="page-sub">把不会的题拍下来，交给 AI 拆解知识点。每一次错误，都可以成为下一次练习的起点。</p>' +
      '</section>' +
      '<div class="stat-row">' +
        '<div class="stat-cell"><div class="stat-value">' + totalQuestions + '<small>道</small></div><div class="stat-label">收录错题</div></div>' +
        '<div class="stat-cell"><div class="stat-value">' + unmastered + '<small>道</small></div><div class="stat-label">等待掌握</div></div>' +
        '<div class="stat-cell"><div class="stat-value">' + masteredPercent + '<small>%</small></div><div class="stat-label">已掌握</div></div>' +
      '</div>' +
      '<div class="section-head">' +
        '<h2 class="section-title"><span class="index">01</span>我的错题本</h2>' +
        '<span class="section-note">' + String(notebooks.length).padStart(2, '0') + ' BOOKS</span>' +
      '</div>' +
      (notebooks.length
        ? '<div class="notebook-grid">' + notebooks.map(function (nb, i) { return notebookCard(nb, i, notebooks.length); }).join('') +
            '<button type="button" class="notebook-card notebook-card--add" data-action="new-notebook">' +
              '<span class="add-circle">' + icon('plus') + '</span>' +
              '<strong>新建错题本</strong>' +
              '<span class="section-note">按学科或考试分组</span>' +
            '</button>' +
          '</div>'
        : emptyState('从第一道错题开始', '新建一个错题本，拍照收录题目。之后可以按知识点复习，也可以导出 PDF 打印。', 'bookOpen',
            '<button type="button" class="btn btn--primary" data-action="new-notebook">' + icon('plus') + '新建错题本</button>') +
          '<p class="sr-note text-center mt-16">本地优先 · 图片与数据保存在当前设备</p>'
      ) +
      '<div class="section-head mt-24">' +
        '<h2 class="section-title"><span class="index">02</span>使用流程</h2>' +
        '<span class="section-note">HOW IT WORKS</span>' +
      '</div>' +
      '<div class="notice notice--solid">' + icon('info') +
        '<span><strong>拍照框题 → AI 解析 → 复习出题 → 拍照批改。</strong> 在设置中填入 API Key 后，软件无法完成的识图、归纳与命题工作会交给 AI。所有错题图片默认只保存在本机。</span>' +
      '</div>';
  }
  pages.notebooks = renderNotebooksPage;

  function filterQuestions(questions, filter) {
    if (filter === 'unmastered') return questions.filter(function (q) { return !q.mastered; });
    if (filter === 'mastered') return questions.filter(function (q) { return q.mastered; });
    return questions;
  }

  function questionCardHTML(q, index) {
    const hasImage = !!q.imageId;
    const analysis = q.analysis;
    const analysisPoints = analysis && Array.isArray(analysis.knowledgePoints) ? analysis.knowledgePoints : [];
    const kps = analysisPoints.length ? analysisPoints : (q.tags || []);
    const meta = [];
    meta.push(analysis && analysis.subject ? analysis.subject : (q.contentText ? '文字题' : '拍照题'));
    meta.push(LR.formatDate(q.createdAt));
    if (q.reviewCount) meta.push('已练 ' + q.reviewCount + ' 次');
    const preview = q.contentText || (analysis && analysis.summary) || '';
    const selecting = !!ui.questionSelectMode;
    const selected = selecting && (ui.questionSelected || []).indexOf(q.id) >= 0;
    return '<button type="button" class="question-card ' + (!hasImage ? 'question-card--text' : '') + (selecting ? ' is-selectable' : '') + (selected ? ' is-selected' : '') + '" ' + (selecting ? 'data-action="toggle-question-pick"' : 'data-action="open-question"') + ' data-id="' + attr(q.id) + '">' +
      (selecting ? '<span class="question-select-box" aria-hidden="true">' + (selected ? icon('check') : '') + '</span>' : '') +
      (hasImage
        ? '<span class="question-thumb-wrap">' +
            '<img class="question-thumb" data-image-id="' + attr(q.imageId) + '" alt="错题图片" loading="lazy">' +
            '<span class="question-index-pill">' + String(index).padStart(2, '0') + '</span>' +
          '</span>'
        : '') +
      '<span class="question-body">' +
        '<span class="question-meta-row">' +
          '<span>' + (hasImage ? '#' + String(index).padStart(2, '0') : 'TEXT / ' + String(index).padStart(2, '0')) + '</span>' +
          '<span>·</span>' +
          '<span>' + e(meta.join(' · ')) + '</span>' +
          (q.mastered ? '<span class="badge badge--filled">已掌握</span>' : '') +
        '</span>' +
        (preview ? '<span class="question-text-preview">' + LR.textToHTML(preview) + '</span>' : '<span class="question-text-preview muted">这道题还没有解析，点开补充知识点。</span>') +
        '<span class="question-kps">' +
          (kps.length
            ? kps.slice(0, 3).map(function (k) { return '<span class="chip">' + e(k) + '</span>'; }).join('') +
              (kps.length > 3 ? '<span class="chip chip--dashed">+' + (kps.length - 3) + '</span>' : '')
            : '<span class="question-kps-empty">待 AI 解析</span>') +
        '</span>' +
      '</span>' +
    '</button>';
  }

  function renderNotebookPage(r) {
    const notebook = LR.db.notebook(r.notebookId);
    if (!notebook) {
      setTimeout(function () { toast('这个错题本不存在或已被删除', 'error'); navigate('#/notebooks', { replace: true }); }, 0);
      return emptyState('错题本不存在', '返回列表重新选择。', 'warning', '<button type="button" class="btn" data-nav="#/notebooks">返回</button>');
    }
    const allQuestions = LR.db.questionsOf(notebook.id).slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const stats = LR.db.notebookStats(notebook.id);
    const filter = ui.notebookFilter;
    const filtered = filterQuestions(allQuestions, filter);
    const counts = {
      all: allQuestions.length,
      unmastered: allQuestions.filter(function (q) { return !q.mastered; }).length,
      mastered: allQuestions.filter(function (q) { return q.mastered; }).length
    };
    let listHTML = '';
    if (!allQuestions.length) {
      listHTML = emptyState('还没有错题', '拍一张试卷或练习册照片，自动框选出不同题目，选中后上传到这个错题本。', 'scan',
        '<button type="button" class="btn btn--primary" data-action="capture" data-notebook="' + attr(notebook.id) + '">' + icon('camera') + '拍照添加</button>');
    } else if (!filtered.length) {
      listHTML = '<div class="empty-inline">这个筛选下还没有错题。</div>';
    } else {
      listHTML = '<div class="question-list">' + filtered.map(function (q) {
        const originalIndex = allQuestions.findIndex(function (item) { return item.id === q.id; }) + 1;
        return questionCardHTML(q, originalIndex);
      }).join('') + '</div>';
    }

    return '' +
      '<section class="subpage-head">' +
        '<div class="subpage-kicker">' +
          '<div class="eyebrow">NOTEBOOK / ERROR ARCHIVE</div>' +
          '<button type="button" class="text-link muted" data-action="notebook-menu" data-id="' + attr(notebook.id) + '">管理</button>' +
        '</div>' +
        '<h1 class="subpage-title">' + e(notebook.name) + '</h1>' +
        '<div class="subpage-meta">' +
          '<span>' + questionCountLabel(allQuestions.length) + '</span>' +
          '<span>·</span>' +
          '<span>创建于 ' + LR.formatDate(notebook.createdAt) + '</span>' +
          '<span>·</span>' +
          '<span>掌握 ' + stats.mastered + ' / ' + stats.total + '</span>' +
        '</div>' +
      '</section>' +
      '<button type="button" class="capture-card" data-action="capture" data-notebook="' + attr(notebook.id) + '">' +
        '<span class="capture-icon">' + icon('camera') + '</span>' +
        '<span><strong>拍照 / 上传错题</strong><span>自动框选题目 · 可选择消除彩色笔迹</span></span>' +
        '<span class="capture-arrow">＋</span>' +
      '</button>' +
      (stats.knowledge.length
        ? '<div class="row-between mb-16"><span class="section-note">常错知识点</span><span class="chip-row">' +
            stats.knowledge.slice(0, 4).map(function (k) { return '<span class="chip chip--strong">' + e(k.name) + '</span>'; }).join('') +
          '</span></div>'
        : '') +
      '<div class="notebook-toolbar">' +
        '<div class="filter-row" role="group" aria-label="筛选错题">' +
          '<button type="button" class="filter-button ' + (filter === 'all' ? 'is-active' : '') + '" data-filter="all">全部 ' + counts.all + '</button>' +
          '<button type="button" class="filter-button ' + (filter === 'unmastered' ? 'is-active' : '') + '" data-filter="unmastered">待复习 ' + counts.unmastered + '</button>' +
          '<button type="button" class="filter-button ' + (filter === 'mastered' ? 'is-active' : '') + '" data-filter="mastered">已掌握 ' + counts.mastered + '</button>' +
        '</div>' +
        '<div class="notebook-toolbar-end">' +
          '<span class="section-note">' + (filtered.length || 0) + ' 道</span>' +
          '<button type="button" class="text-link muted" data-action="toggle-question-select">' + (ui.questionSelectMode ? '完成' : '多选') + '</button>' +
        '</div>' +
      '</div>' +
      listHTML +
      (ui.questionSelectMode && allQuestions.length
        ? '<div class="batch-bar" id="questionBatchBar">' +
            '<span>已选 <strong id="questionSelectCount">' + (ui.questionSelected || []).length + '</strong> 道</span>' +
            '<div class="batch-bar-actions">' +
              '<button type="button" class="btn btn--small btn--ghost" data-action="select-all-questions">全选</button>' +
              '<button type="button" class="btn btn--small btn--danger" data-action="delete-selected-questions">删除</button>' +
            '</div>' +
          '</div>'
        : '') +
      (allQuestions.length
        ? '<div class="notice mt-24">' + icon('sparkle') +
            '<span>打开任意错题，可选择 <strong>AI 解析</strong> 或 <strong>去笔迹</strong>。解析后的知识点会自动用于复习出题。</span>' +
          '</div>'
        : '');
  }
  pages.notebook = renderNotebookPage;

  function selectedQuestionIds() {
    return new Set(ui.questionSelected || []);
  }

  function syncQuestionBatchCount() {
    const el = document.getElementById('questionSelectCount');
    if (el) el.textContent = String(selectedQuestionIds().size);
  }

  actions['toggle-question-select'] = function () {
    ui.questionSelectMode = !ui.questionSelectMode;
    ui.questionSelected = [];
    App.render();
  };

  actions['toggle-question-pick'] = function (el) {
    const id = el.getAttribute('data-id');
    if (!id) return;
    const selected = selectedQuestionIds();
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    ui.questionSelected = Array.from(selected);
    el.classList.toggle('is-selected', selected.has(id));
    const box = el.querySelector('.question-select-box');
    if (box) box.innerHTML = selected.has(id) ? icon('check') : '';
    syncQuestionBatchCount();
  };

  actions['select-all-questions'] = function () {
    const r = parseHash();
    if (r.page !== 'notebook' || !r.notebookId) return;
    ui.questionSelected = LR.db.questionsOf(r.notebookId).map(function (q) { return q.id; });
    App.render();
  };

  actions['delete-selected-questions'] = async function () {
    const ids = Array.from(selectedQuestionIds());
    if (!ids.length) {
      App.toast('请先选择错题', 'error');
      return;
    }
    const ok = await App.confirm({
      title: '删除所选的 ' + ids.length + ' 道错题？',
      message: '题目图片、解析和知识点会一起删除，且无法撤销。',
      confirmLabel: '删除错题',
      danger: true
    });
    if (!ok) return;
    const hide = App.showBusy('正在删除错题', '');
    try {
      for (const id of ids) await LR.db.deleteQuestion(id);
      hide();
      ui.questionSelectMode = false;
      ui.questionSelected = [];
      App.render();
      App.toast('已删除 ' + ids.length + ' 道错题', 'success');
    } catch (err) {
      hide();
      App.toast('删除失败：' + err.message, 'error');
    }
  };

  /* ------------------------- create notebook ----------------------------- */

  function openCreateNotebookModal() {
    openBasicModal({
      title: '新建错题本',
      eyebrow: 'NEW NOTEBOOK',
      center: true,
      body:
        '<form id="createNotebookForm" novalidate>' +
          '<div class="field">' +
            '<label for="notebookName">错题本名称 <span class="field-label-note">必填</span></label>' +
            '<input class="input" id="notebookName" name="name" type="text" maxlength="40" placeholder="例如：高一数学 · 函数" autocomplete="off" autofocus>' +
            '<p class="hint">用学科、章节或考试名称分类，之后随时可以重命名。</p>' +
          '</div>' +
          '<p class="form-message form-message--err hidden" id="notebookFormError"></p>' +
        '</form>',
      footer: '<button type="button" class="btn btn--ghost" data-action="close-modal">取消</button>' +
        '<button type="submit" class="btn btn--primary" form="createNotebookForm">创建</button>',
      onMount: function (root) {
        const form = root.querySelector('#createNotebookForm');
        const input = root.querySelector('#notebookName');
        const error = root.querySelector('#notebookFormError');
        setTimeout(function () { input.focus(); }, 60);
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          error.classList.add('hidden');
          try {
            const notebook = LR.db.createNotebook(input.value);
            closeModal();
            toast('已创建「' + notebook.name + '」', 'success');
            ui.notebookFilter = 'all';
            navigate('#/notebooks/' + encodeURIComponent(notebook.id));
          } catch (err) {
            error.textContent = err.message;
            error.classList.remove('hidden');
          }
        });
      }
    });
  }

  actions['new-notebook'] = openCreateNotebookModal;
  actions['close-modal'] = closeModal;
  actions['open-notebook-menu-placeholder'] = function () {};

  /* ------------------------------ events --------------------------------- */

  function handleClick(event) {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      event.preventDefault();
      const path = nav.getAttribute('data-nav');
      if (path) navigate(path);
      return;
    }
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const name = actionEl.getAttribute('data-action');
      if (name && actions[name]) {
        event.preventDefault();
        actions[name](actionEl, event);
        return;
      }
    }
    const filterBtn = event.target.closest('[data-filter]');
    if (filterBtn) {
      event.preventDefault();
      ui.notebookFilter = filterBtn.getAttribute('data-filter') || 'all';
      render();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (ui.modal) {
        event.preventDefault();
        closeModal();
      }
      return;
    }
    if (event.key === 'Tab' && ui.modal) {
      const focusables = Array.prototype.slice.call(ui.modal.root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.classList && event.target.classList.contains('notebook-card')) {
      const href = event.target.getAttribute('data-nav');
      if (href) {
        event.preventDefault();
        navigate(href);
      }
    }
  }

  /* ------------------------------- theme --------------------------------- */

  const mediaTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function systemPrefersDark() {
    // Android WebView can report a stale prefers-color-scheme when the host
    // Activity or WebView theme differs from the system. Prefer the native
    // configuration value when the APK bridge is available.
    try {
      if (window.LRNative && typeof window.LRNative.getSystemDark === 'function') {
        const native = window.LRNative.getSystemDark();
        if (typeof native === 'boolean') return native;
        if (typeof native === 'string') return native === 'true';
      }
    } catch (_) {}
    return !!(mediaTheme && mediaTheme.matches);
  }
  App.systemPrefersDark = systemPrefersDark;

  function resolvedTheme(preference) {
    const pref = preference || (LR.db.state ? LR.db.state.settings.theme : 'system');
    if (pref === 'light' || pref === 'dark') return pref;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  App.resolvedTheme = resolvedTheme;

  function updateSystemThemeHint() {
    const subtitle = document.querySelector('[data-settings-toggle="appearance"] .settings-module-sub');
    if (subtitle && LR.db && LR.db.state && LR.db.state.settings.theme === 'system') {
      subtitle.textContent = '当前：跟随系统 · ' + (systemPrefersDark() ? '暗色' : '亮色');
    }
  }

  function applyTheme() {
    if (!LR.db || !LR.db.state) return;
    const preference = LR.db.state.settings.theme;
    const theme = resolvedTheme(preference);
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    try { localStorage.setItem('lrstudy-theme', preference); } catch (_) {}
    try { if (window.LRNative && window.LRNative.setTheme) window.LRNative.setTheme(theme); } catch (_) {}
    updateSystemThemeHint();
  }
  App.applyTheme = applyTheme;

  if (mediaTheme) {
    const listener = function () {
      if (LR.db && LR.db.state && LR.db.state.settings.theme === 'system') {
        applyTheme();
      }
    };
    if (mediaTheme.addEventListener) mediaTheme.addEventListener('change', listener);
    else if (mediaTheme.addListener) mediaTheme.addListener(listener);
  }

  // The Android host calls this from onConfigurationChanged/onResume because
  // WebView does not always emit a prefers-color-scheme change event.
  window.__onSystemThemeChanged = function () {
    if (!LR.db || !LR.db.state) return;
    if (LR.db.state.settings.theme !== 'system') return;
    applyTheme();
  };

  /* -------------------------------- init --------------------------------- */

  async function init() {
    // Apply a sensible theme before the database is ready.
    if (mediaTheme && mediaTheme.matches) document.documentElement.setAttribute('data-theme', 'dark');
    try {
      await LR.db.init();
    } catch (err) {
      console.error(err);
      const view = document.getElementById('view');
      if (view) {
        view.innerHTML = '<div class="view-inner">' +
          '<div class="empty-state">' +
            '<div class="empty-icon">' + icon('warning') + '</div>' +
            '<h3>本地存储不可用</h3>' +
            '<p>LRStudy 需要浏览器的 IndexedDB 来保存错题。请关闭无痕模式，或换用 Chrome / Safari 打开。</p>' +
            '<p class="sr-note mt-12">' + e(err.message || String(err)) + '</p>' +
          '</div></div>';
      }
      document.getElementById('tabbar').innerHTML = '';
      return;
    }
    applyTheme();
    if (!location.hash || location.hash === '#' || parseHash().page === 'notebooks' && !/^#\//.test(location.hash)) {
      history.replaceState(null, '', '#/notebooks');
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('hashchange', function () {
      window.scrollTo(0, 0);
      render();
    });
    render();
  }

  /* Export public helpers used by feature modules. */
  App.startView = function (html) { return '<div class="view-inner">' + html + '</div>'; };
  App.getState = function () { return LR.db.state; };

  // Called by the Android wrapper before it consumes the system back action.
  // Returns "modal" when an in-app modal was closed, otherwise "none".
  window.__lrHandleBack = function () {
    try {
      if (ui.modal) {
        closeModal();
        return 'modal';
      }
    } catch (_) {}
    return 'none';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
