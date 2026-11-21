/* LRStudy v1.7 — AI practice paper generation, PDF printing, photo grading */
(function () {
  'use strict';

  const LR = window.LR;
  const App = window.App;
  const e = App.e;
  const attr = LR.escapeAttr;
  const icon = App.icon;
  const actions = App.actions;
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  const pages = App.pages;
  let generating = false;

  /* ------------------------------ review home ---------------------------- */

  function selectedNotebook() {
    const state = LR.db.state;
    if (!state.notebooks.length) return null;
    const fromUi = App.ui.reviewNotebookId;
    const fromSettings = state.settings.review.lastNotebookId;
    const id = fromUi || fromSettings;
    let notebook = id ? LR.db.notebook(id) : null;
    if (!notebook) notebook = state.notebooks.slice().sort(function (a, b) {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    })[0];
    if (notebook) App.ui.reviewNotebookId = notebook.id;
    return notebook || null;
  }

  function knowledgeFor(notebook) {
    if (!notebook) return [];
    return LR.ai.weightedKnowledge(notebook.id).slice(0, 8);
  }

  const REVIEW_MODES = [
    { id: 'ai', label: 'AI 薄弱点组卷', short: 'AI 组卷', icon: 'sparkle', desc: '从常错知识点生成新题，可附备注和学年段限制' },
    { id: 'custom', label: '自定义题目', short: '自定义', icon: 'edit', desc: '不读取错题本，直接描述想练的题型、范围和难度' },
    { id: 'print', label: '打印错题', short: '打印错题', icon: 'printer', desc: '跨错题本选择未掌握题，生成含答案的打印卷' }
  ];

  function reviewMode() {
    const value = App.ui.reviewMode;
    return value === 'custom' || value === 'print' ? value : 'ai';
  }

  function reviewModeMeta(id) {
    return REVIEW_MODES.find(function (m) { return m.id === id; }) || REVIEW_MODES[0];
  }

  function reviewModeSwitchHTML(active) {
    const current = reviewModeMeta(active);
    const open = !!App.ui.reviewModeDrawer;
    return '<div class="review-mode-card">' +
      '<button type="button" class="review-mode-head" data-action="review-mode-toggle" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="review-mode-head-copy"><span class="panel-index">PRACTICE MODE</span><strong>出题方式</strong></span>' +
        '<span class="review-mode-current">' + e(current.label) + icon('chevronDown') + '</span>' +
      '</button>' +
      '<div class="review-mode-drawer' + (open ? '' : ' hidden') + '">' +
        REVIEW_MODES.map(function (mode) {
          return '<button type="button" class="review-mode-option' + (mode.id === active ? ' is-active' : '') + '" data-action="review-mode-select" data-mode="' + mode.id + '">' +
            '<span class="review-mode-icon">' + icon(mode.icon) + '</span>' +
            '<span class="review-mode-copy"><strong>' + e(mode.label) + '</strong><span>' + e(mode.desc) + '</span></span>' +
            '<span class="review-mode-radio" aria-hidden="true"></span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function countControlHTML(value) {
    const count = LR.clamp(Number(value) || 5, 1, 100);
    return '<div class="review-controls">' +
      '<div class="review-control-row review-count-row">' +
        '<div><div class="control-label">题量</div><div class="control-sub">1–100 道，按薄弱点覆盖</div></div>' +
        '<div class="count-control">' +
          '<div class="stepper">' +
            '<button type="button" data-action="review-step" data-step="-1" aria-label="减少一题">−</button>' +
            '<input type="number" id="reviewCount" min="1" max="100" value="' + count + '" inputmode="numeric" aria-label="题目数量">' +
            '<button type="button" data-action="review-step" data-step="1" aria-label="增加一题">+</button>' +
          '</div>' +
          '<div class="count-presets" aria-label="快捷题量">' +
            [5, 10, 20, 50, 100].map(function (n) {
              return '<button type="button" class="count-preset" data-action="review-count-preset" data-count="' + n + '">' + n + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="review-control-row">' +
        '<div><div class="control-label">输出</div><div class="control-sub">可打印 PDF，也可拍照批改</div></div>' +
        '<span class="badge badge--muted">A4 · 黑白</span>' +
      '</div>' +
    '</div>';
  }

  function gradeLineHTML() {
    const state = LR.db.state;
    const gradeLabel = LR.gradeLabel(state.profile && state.profile.grade);
    return '<div class="review-grade-line">' + icon('info') +
      '<span>' + (gradeLabel ? '出题上限：' + e(gradeLabel) + ' · AI 不会出超过该年级的题目' : '未设置学年段，AI 不会限制题目难度') + '</span>' +
      '<button type="button" class="text-link" data-action="open-profile">' + (gradeLabel ? '修改' : '设置') + '</button>' +
    '</div>';
  }

  function reviewAiPanelHTML() {
    const state = LR.db.state;
    const notebook = selectedNotebook();
    const count = state.settings.review.count || 5;
    const aiReady = LR.ai.isConfigured();
    if (!notebook) {
      return App.emptyState('先创建一个错题本', 'AI 薄弱点组卷需要从错题本中提炼常错知识点；也可以切换到「自定义题目」。', 'bookOpen',
        '<button type="button" class="btn btn--primary" data-nav="#/notebooks">去创建错题本</button>');
    }
    const kp = knowledgeFor(notebook);
    const options = state.notebooks.map(function (nb) {
      return '<option value="' + attr(nb.id) + '"' + (nb.id === notebook.id ? ' selected' : '') + '>' + e(nb.name) + '</option>';
    }).join('');
    return '' +
      '<div class="review-panel">' +
        '<div class="review-panel-head">' +
          '<div>' +
            '<div class="panel-index">AI PAPER GENERATOR</div>' +
            '<h2 class="panel-title">AI 薄弱点组卷</h2>' +
            '<p class="panel-sub">从常错知识点出发，生成新的题目，而不是重复原题。</p>' +
          '</div>' +
          '<span class="badge ' + (aiReady ? 'badge--filled' : 'badge--muted') + '">' + (aiReady ? 'AI 已就绪' : 'AI 未配置') + '</span>' +
        '</div>' +
        '<div class="field">' +
          '<label for="reviewNotebookSelect">选择错题本</label>' +
          '<select class="select" id="reviewNotebookSelect">' + options + '</select>' +
        '</div>' +
        '<div class="field">' +
          '<div class="field-label"><span>当前常错知识点</span><span class="field-label-note">按薄弱程度排序</span></div>' +
          '<div class="kp-cloud" id="reviewKpCloud">' +
            (kp.length
              ? kp.map(function (k) { return '<span class="chip">' + e(k.name) + '<span class="field-label-note">×' + k.count + '</span></span>'; }).join('')
              : '<span class="chip is-empty">还没有知识点</span>') +
          '</div>' +
          (!kp.length
            ? '<p class="hint mt-8">先给错题生成 AI 解析以提炼知识点；如果配置了识图模型，AI 也可以直接读错题图片组卷。</p>'
            : '') +
        '</div>' +
        countControlHTML(count) +
        gradeLineHTML() +
        '<div class="field">' +
          '<label for="reviewNote">出题备注 <span class="field-label-note">可选 · 只用于本次 AI 出题</span></label>' +
          '<textarea class="textarea textarea--short" id="reviewNote" maxlength="600" placeholder="例如：多练一次函数图像题，少出证明题"></textarea>' +
          '<p class="hint">只影响本次生成，不会显示在试卷或 PDF 上；也不能突破个人资料里的学年段上限。</p>' +
        '</div>' +
        '<button type="button" class="btn btn--primary btn--large btn--block review-generate" data-action="generate-paper">' + icon('sparkle') + '生成练习卷</button>' +
        (!aiReady
          ? '<div class="review-note">' + icon('info') + '<span>生成练习卷需要 AI。请先在「设置 → AI 能力」填入 API Key、接口地址和模型。' +
              '<button type="button" class="text-link" data-action="open-ai-settings" style="margin-left:4px">去设置</button></span></div>'
          : '<div class="review-note">' + icon('info') + '<span>AI 会根据当前错题本的知识点原创题目。生成后先导出 PDF 作答，再拍照批改，系统会自动打分。</span></div>') +
      '</div>';
  }

  function reviewCustomPanelHTML() {
    const count = LR.db.state.settings.review.count || 5;
    const aiReady = LR.ai.isConfigured();
    return '<div class="review-panel review-panel--custom">' +
      '<div class="review-panel-head">' +
        '<div>' +
          '<div class="panel-index">CUSTOM PRACTICE</div>' +
          '<h2 class="panel-title">描述你想练的题</h2>' +
          '<p class="panel-sub">不读取错题本的知识点，只按你的描述生成一张新练习卷。</p>' +
        '</div>' +
        '<span class="badge ' + (aiReady ? 'badge--filled' : 'badge--muted') + '">' + (aiReady ? 'AI 已就绪' : 'AI 未配置') + '</span>' +
      '</div>' +
      '<div class="field">' +
        '<label for="customBrief">练习目标</label>' +
        '<textarea class="textarea" id="customBrief" maxlength="1200" rows="3" placeholder="例如：初三二次函数图像与最值，10 道，基础到中等难度；多练应用题，不要证明题"></textarea>' +
        '<p class="hint">写清楚知识点、题型、难度或想避免的内容，AI 会据此原创题目。</p>' +
      '</div>' +
      '<details class="review-fold">' +
        '<summary>补充要求 <span class="field-label-note">可选</span></summary>' +
        '<textarea class="textarea textarea--short" id="customExtra" maxlength="800" placeholder="例如：计算量小一点；选择题和解答题各一半"></textarea>' +
      '</details>' +
      countControlHTML(count) +
      gradeLineHTML() +
      '<button type="button" class="btn btn--primary btn--large btn--block review-generate" data-action="generate-custom-paper">' + icon('sparkle') + '生成自定义练习卷</button>' +
      (!aiReady
        ? '<div class="review-note">' + icon('info') + '<span>自定义题目需要 AI。请先在「设置 → AI 能力」配置接口和模型。</span></div>'
        : '<div class="review-note">' + icon('info') + '<span>生成后会进入练习卷页面，可在线作答、导出 PDF 或打印；不会影响错题本。</span></div>') +
    '</div>';
  }

  function unmasteredQuestions() {
    return LR.db.state.questions.filter(function (q) { return !q.mastered; });
  }

  function printSelectedQuestions() {
    const ids = new Set(App.ui.reviewPrintSelection || []);
    return unmasteredQuestions().filter(function (q) { return ids.has(q.id); });
  }

  function reviewPrintPanelHTML() {
    const all = unmasteredQuestions();
    const selected = printSelectedQuestions();
    const notebooks = new Set(selected.map(function (q) { return q.notebookId; }));
    return '<div class="review-panel review-panel--print">' +
      '<div class="review-panel-head">' +
        '<div>' +
          '<div class="panel-index">PRINT WRONG QUESTIONS</div>' +
          '<h2 class="panel-title">打印错题</h2>' +
          '<p class="panel-sub">跨错题本选择未掌握题，自动排除已掌握，生成含答案和解析的打印卷。</p>' +
        '</div>' +
        '<span class="badge badge--muted">PRINT ONLY</span>' +
      '</div>' +
      '<div class="print-pick-summary">' +
        '<div><strong>' + selected.length + '</strong><span>道已选</span></div>' +
        '<div><strong>' + all.length + '</strong><span>道未掌握</span></div>' +
        '<div><strong>' + notebooks.size + '</strong><span>个错题本</span></div>' +
      '</div>' +
      '<div class="inline-actions">' +
        '<button type="button" class="btn btn--ghost" data-action="open-print-picker">' + icon('check') + '选择错题</button>' +
        '<button type="button" class="btn btn--primary" data-action="print-wrong-questions"' + (selected.length ? '' : ' disabled') + '>' + icon('printer') + '生成打印卷</button>' +
      '</div>' +
      '<p class="hint mt-12">打印卷包含原题图片、作答区和答案解析，不保存练习记录。' + (all.length ? '' : ' 当前没有未掌握错题。') + '</p>' +
    '</div>';
  }

  function historySelectedSet() {
    if (!App.ui.reviewHistorySelected) App.ui.reviewHistorySelected = [];
    return new Set(App.ui.reviewHistorySelected);
  }

  function renderReviewHome() {
    const state = LR.db.state;
    const mode = reviewMode();
    const sessions = state.sessions.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const graded = sessions.filter(function (s) { return s.grading; });
    const average = graded.length
      ? Math.round(graded.reduce(function (sum, s) { return sum + (Number(s.grading.percent) || 0); }, 0) / graded.length)
      : null;
    const selecting = !!App.ui.reviewHistorySelectMode;
    const selected = historySelectedSet();
    const panel = mode === 'custom' ? reviewCustomPanelHTML() : mode === 'print' ? reviewPrintPanelHTML() : reviewAiPanelHTML();
    const historyCards = sessions.map(function (s) {
      const nb = LR.db.notebook(s.notebookId);
      const isSelected = selecting && selected.has(s.id);
      const action = selecting
        ? 'data-action="toggle-history-pick" data-id="' + attr(s.id) + '"'
        : 'data-nav="#/review/' + encodeURIComponent(s.id) + '"';
      return '<button type="button" class="history-card' + (selecting ? ' is-selectable' : '') + (isSelected ? ' is-selected' : '') + '" ' + action + '>' +
        (selecting ? '<span class="select-check" aria-hidden="true">' + icon('check') + '</span>' : '') +
        '<span class="history-icon">' + String(s.questions.length).padStart(2, '0').slice(-2) + '</span>' +
        '<span class="history-main">' +
          '<span class="history-title">' + e(s.title || '复习练习') + '</span>' +
          '<span class="history-meta">' +
            '<span>' + e(nb ? nb.name : s.notebookName || '错题本') + '</span>' +
            '<span>·</span>' +
            '<span>' + LR.formatDate(s.createdAt) + '</span>' +
            '<span>·</span>' +
            '<span>' + s.questions.length + ' 题</span>' +
          '</span>' +
        '</span>' +
        '<span class="history-score">' +
          (s.grading ? '<strong>' + Math.round(Number(s.grading.percent) || 0) + '</strong><span>得分率 %</span>' : '<strong style="font-size:13px;font-family:var(--font-ui);letter-spacing:0">待批改</strong><span>OPEN</span>') +
        '</span>' +
      '</button>';
    }).join('');
    return '' +
      '<section class="review-hero">' +
        '<div class="eyebrow">REVIEW / 常错专练</div>' +
        '<div class="page-head-row" style="margin-top:10px">' +
          '<h1 class="page-title">复习<em>.</em></h1>' +
          '<span class="badge">' + e(reviewModeMeta(mode).short) + '</span>' +
        '</div>' +
        '<p class="page-sub">三种出题方式：从薄弱点生成、自己描述题目，或直接打印未掌握错题。</p>' +
      '</section>' +
      '<div class="stat-row">' +
        '<div class="stat-cell"><div class="stat-value">' + sessions.length + '<small>份</small></div><div class="stat-label">练习记录</div></div>' +
        '<div class="stat-cell"><div class="stat-value">' + (average == null ? '—' : average) + (average == null ? '' : '<small>%</small>') + '</div><div class="stat-label">平均得分率</div></div>' +
        '<div class="stat-cell"><div class="stat-value">' + state.notebooks.length + '<small>本</small></div><div class="stat-label">错题本</div></div>' +
      '</div>' +
      reviewModeSwitchHTML(mode) +
      panel +
      '<div class="section-head">' +
        '<h2 class="section-title"><span class="index">01</span>练习记录</h2>' +
        '<div class="section-head-actions">' +
          (sessions.length ? '<button type="button" class="text-link" data-action="toggle-history-select">' + (selecting ? '完成' : '管理') + '</button>' : '') +
          '<span class="section-note">' + String(sessions.length).padStart(2, '0') + ' PAPERS</span>' +
        '</div>' +
      '</div>' +
      (sessions.length
        ? '<div class="history-list">' + historyCards + '</div>'
        : '<div class="empty-inline">还没有练习记录。生成第一张练习卷，开始针对薄弱点复习。</div>') +
      (selecting && sessions.length
        ? '<div class="batch-bar" id="historyBatchBar">' +
            '<span>已选 <strong id="historySelectCount">' + selected.size + '</strong> 份</span>' +
            '<div class="batch-bar-actions">' +
              '<button type="button" class="btn btn--small btn--ghost" data-action="select-all-history">全选</button>' +
              '<button type="button" class="btn btn--small btn--danger" data-action="delete-selected-sessions">删除</button>' +
            '</div>' +
          '</div>'
        : '') +
      '<div class="notice mt-24">' + icon('printer') + '<span><strong>打印建议：</strong>用 A4 纸单面打印，先独立作答再拍照批改。练习卷可直接下载为 PDF，也可以调用系统打印。</span></div>';
  }
  pages.review = renderReviewHome;

  function updateReviewCountUI(value) {
    const next = LR.clamp(Number(value) || 5, 1, 100);
    const input = document.getElementById('reviewCount');
    if (input) input.value = String(next);
    LR.db.state.settings.review.count = next;
    LR.db.save().catch(function () {});
  }

  actions['review-step'] = function (el) {
    const delta = Number(el.getAttribute('data-step')) || 0;
    const current = Number(LR.db.state.settings.review.count) || 5;
    updateReviewCountUI(current + delta);
  };

  actions['review-count-preset'] = function (el) {
    updateReviewCountUI(Number(el.getAttribute('data-count')) || 5);
  };

  actions['review-mode-toggle'] = function () {
    App.ui.reviewModeDrawer = !App.ui.reviewModeDrawer;
    App.render();
  };

  actions['review-mode-select'] = function (el) {
    const mode = el.getAttribute('data-mode');
    if (mode !== 'ai' && mode !== 'custom' && mode !== 'print') return;
    App.ui.reviewMode = mode;
    App.ui.reviewModeDrawer = false;
    App.render();
  };

  function selectedHistoryIds() {
    return new Set(App.ui.reviewHistorySelected || []);
  }

  function syncHistoryBatchCount() {
    const el = document.getElementById('historySelectCount');
    if (el) el.textContent = String(selectedHistoryIds().size);
  }

  actions['toggle-history-select'] = function () {
    App.ui.reviewHistorySelectMode = !App.ui.reviewHistorySelectMode;
    App.ui.reviewHistorySelected = [];
    App.render();
  };

  actions['toggle-history-pick'] = function (el) {
    const id = el.getAttribute('data-id');
    if (!id) return;
    const selected = selectedHistoryIds();
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    App.ui.reviewHistorySelected = Array.from(selected);
    el.classList.toggle('is-selected', selected.has(id));
    syncHistoryBatchCount();
  };

  actions['select-all-history'] = function () {
    App.ui.reviewHistorySelected = LR.db.state.sessions.map(function (s) { return s.id; });
    App.render();
  };

  actions['delete-selected-sessions'] = async function () {
    const ids = Array.from(selectedHistoryIds());
    if (!ids.length) {
      App.toast('请先选择练习记录', 'error');
      return;
    }
    const ok = await App.confirm({
      title: '删除所选的 ' + ids.length + ' 份练习记录？',
      message: '题目、批改结果和答题照片会一并删除；已经归纳进错题本的错题会保留。',
      confirmLabel: '删除记录',
      danger: true
    });
    if (!ok) return;
    const hide = App.showBusy('正在删除练习记录', '');
    try {
      for (const id of ids) await LR.db.deleteSession(id);
      hide();
      App.ui.reviewHistorySelectMode = false;
      App.ui.reviewHistorySelected = [];
      App.render();
      App.toast('已删除 ' + ids.length + ' 份练习记录', 'success');
    } catch (err) {
      hide();
      App.toast('删除失败：' + err.message, 'error');
    }
  };

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!target) return;
    if (target.id === 'reviewNotebookSelect') {
      const id = target.value;
      App.ui.reviewNotebookId = id;
      LR.db.state.settings.review.lastNotebookId = id;
      LR.db.save().catch(function () {});
      App.render();
    } else if (target.id === 'reviewCount') {
      const value = LR.clamp(Number(target.value) || 5, 1, 100);
      updateReviewCountUI(value);
    }
  });

  document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'reviewCount') {
      const raw = Number(event.target.value);
      if (raw >= 1 && raw <= 100) {
        LR.db.state.settings.review.count = raw;
        LR.db.save().catch(function () {});
      }
    }
  });

  function openAIErrorDialog(title, message, retry) {
    App.openBasicModal({
      title: title || 'AI 操作失败',
      eyebrow: 'AI / ERROR',
      center: true,
      body: '<div class="form-error" style="margin-bottom:0">' + LR.textToHTML(message || '未知错误') + '</div>' +
        '<p class="modal-note">可以检查 API 地址、Key、模型名称和网络连接。若使用 DeepSeek 等文本模型进行识图，请另外填写支持视觉的识图模型。</p>',
      footer: '<button type="button" class="btn btn--ghost" data-action="close-modal">关闭</button>' +
        (retry ? '<button type="button" class="btn btn--primary" id="aiRetryBtn">重试</button>' : '') +
        '<button type="button" class="btn btn--ghost" data-action="open-ai-settings">去设置</button>',
      onMount: function (root) {
        const retryBtn = root.querySelector('#aiRetryBtn');
        if (retryBtn) {
          retryBtn.addEventListener('click', function () {
            App.closeModal();
            retry();
          });
        }
      }
    });
  }
  App.openAIErrorDialog = openAIErrorDialog;

  actions['generate-paper'] = async function () {
    if (generating) return;
    const notebook = selectedNotebook();
    if (!notebook) {
      App.toast('请先创建一个错题本', 'error');
      return;
    }
    const questions = LR.db.questionsOf(notebook.id);
    if (!questions.length) {
      App.toast('这个错题本还没有错题', 'error');
      return;
    }
    if (!LR.ai.isConfigured()) {
      if (App.openAIConfigPrompt) App.openAIConfigPrompt('生成练习卷需要 AI。填入 API Key 后，AI 会根据常错知识点原创题目。');
      return;
    }
    const count = LR.clamp(Number(LR.db.state.settings.review.count) || 5, 1, 100);
    const noteEl = document.getElementById('reviewNote');
    const note = noteEl ? String(noteEl.value || '').trim().slice(0, 600) : '';
    const grade = (LR.db.state.profile && LR.db.state.profile.grade) || '';
    generating = true;
    const hide = App.showBusy('AI 正在组卷', '阅读常错知识点 → 原创题目 → 编写参考答案…');
    try {
      const paper = await LR.ai.generatePaper({ notebookId: notebook.id, count: count, note: note, grade: grade });
      const questionsWithIndex = paper.questions.map(function (q, i) {
        return Object.assign({}, q, { index: i + 1 });
      });
      const session = await LR.db.addSession({
        notebookId: notebook.id,
        notebookName: notebook.name,
        title: paper.title,
        knowledgePoints: paper.knowledgePoints || [],
        questions: questionsWithIndex,
        requestedCount: count,
        model: paper.model,
        generatedAt: paper.generatedAt,
        status: 'ready',
        grading: null,
        answerImageIds: [],
        addedQuestionIds: [],
        addDismissed: false
      });
      hide();
      LR.db.state.settings.review.lastNotebookId = notebook.id;
      LR.db.save().catch(function () {});
      generating = false;
      App.toast('练习卷已生成，共 ' + questionsWithIndex.length + ' 题', 'success');
      App.navigate('#/review/' + encodeURIComponent(session.id));
    } catch (err) {
      generating = false;
      hide();
      console.error(err);
      if (String(err.message || '').indexOf('API Key') >= 0 || String(err.message || '').indexOf('配置') >= 0) {
        openAIErrorDialog('无法生成练习卷', err.message, null);
      } else {
        openAIErrorDialog('无法生成练习卷', err.message || '请重试', function () {
          actions['generate-paper']();
        });
      }
    }
  };

  actions['generate-custom-paper'] = async function () {
    if (generating) return;
    if (!LR.ai.isConfigured()) {
      if (App.openAIConfigPrompt) App.openAIConfigPrompt('自定义题目需要 AI。填入 API Key、接口地址和模型后即可按描述出题。');
      return;
    }
    const briefEl = document.getElementById('customBrief');
    const extraEl = document.getElementById('customExtra');
    const brief = briefEl ? String(briefEl.value || '').trim().slice(0, 1200) : '';
    const extra = extraEl ? String(extraEl.value || '').trim().slice(0, 800) : '';
    if (!brief) {
      App.toast('请先描述你想练习的题目', 'error');
      if (briefEl) briefEl.focus();
      return;
    }
    const count = LR.clamp(Number(LR.db.state.settings.review.count) || 5, 1, 100);
    const grade = (LR.db.state.profile && LR.db.state.profile.grade) || '';
    generating = true;
    const hide = App.showBusy('AI 正在生成自定义练习', '按你的描述原创题目 → 编写参考答案…');
    try {
      const paper = await LR.ai.generateCustomPaper({ description: brief, extra: extra, count: count, grade: grade });
      const questionsWithIndex = paper.questions.map(function (q, i) {
        return Object.assign({}, q, { index: i + 1 });
      });
      const session = await LR.db.addSession({
        notebookId: null,
        notebookName: '自定义练习',
        title: paper.title || '自定义练习',
        knowledgePoints: paper.knowledgePoints || [],
        questions: questionsWithIndex,
        requestedCount: count,
        model: paper.model,
        generatedAt: paper.generatedAt,
        status: 'ready',
        grading: null,
        answerImageIds: [],
        addedQuestionIds: [],
        addDismissed: false
      });
      hide();
      generating = false;
      App.toast('自定义练习卷已生成，共 ' + questionsWithIndex.length + ' 题', 'success');
      App.navigate('#/review/' + encodeURIComponent(session.id));
    } catch (err) {
      generating = false;
      hide();
      console.error(err);
      openAIErrorDialog('无法生成自定义练习', err.message || '请重试', function () {
        actions['generate-custom-paper']();
      });
    }
  };

  function groupUnmasteredByNotebook() {
    return LR.db.state.notebooks.map(function (nb) {
      return {
        notebook: nb,
        questions: LR.db.questionsOf(nb.id).filter(function (q) { return !q.mastered; })
      };
    }).filter(function (group) { return group.questions.length; });
  }

  function openPrintPicker() {
    const groups = groupUnmasteredByNotebook();
    const allIds = groups.reduce(function (ids, group) {
      group.questions.forEach(function (q) { ids.push(q.id); });
      return ids;
    }, []);
    if (!allIds.length) {
      App.toast('没有未掌握的错题可打印', 'info');
      return;
    }
    const selected = new Set((App.ui.reviewPrintSelection || []).filter(function (id) { return allIds.indexOf(id) >= 0; }));
    function updateCount(root) {
      const count = root.querySelector('#printPickerCount');
      const confirm = root.querySelector('#printPickerConfirm');
      if (count) count.textContent = String(selected.size);
      if (confirm) confirm.disabled = !selected.size;
    }
    const body =
      '<div class="print-picker-toolbar">' +
        '<span>已选 <strong id="printPickerCount">' + selected.size + '</strong> / ' + allIds.length + ' 道</span>' +
        '<div class="inline-actions">' +
          '<button type="button" class="btn btn--small btn--ghost" id="printPickerAll">全选</button>' +
          '<button type="button" class="btn btn--small btn--ghost" id="printPickerNone">清空</button>' +
        '</div>' +
      '</div>' +
      '<p class="hint">只列出未掌握的错题，已掌握题自动排除。</p>' +
      groups.map(function (group) {
        return '<section class="print-pick-group" data-print-group="' + attr(group.notebook.id) + '">' +
          '<div class="print-pick-group-head">' +
            '<span><strong>' + e(group.notebook.name) + '</strong><span class="section-note">' + group.questions.length + ' 道未掌握</span></span>' +
            '<button type="button" class="text-link" data-print-group-toggle="' + attr(group.notebook.id) + '">全选本本</button>' +
          '</div>' +
          group.questions.map(function (q, i) {
            const kps = q.analysis && q.analysis.knowledgePoints ? q.analysis.knowledgePoints : (q.tags || []);
            const preview = q.contentText || (q.analysis && q.analysis.summary) || '图片题';
            const checked = selected.has(q.id);
            return '<label class="print-pick-row' + (checked ? ' is-selected' : '') + '">' +
              '<input type="checkbox" data-print-q="' + attr(q.id) + '" data-group="' + attr(group.notebook.id) + '"' + (checked ? ' checked' : '') + '>' +
              (q.imageId
                ? '<span class="print-pick-thumb"><img data-image-id="' + attr(q.imageId) + '" alt="错题缩略图"></span>'
                : '<span class="print-pick-thumb print-pick-thumb--text">TEXT</span>') +
              '<span class="print-pick-copy"><strong>#' + String(i + 1).padStart(2, '0') + (kps.length ? ' · ' + e(kps.slice(0, 2).join(' / ')) : '') + '</strong><span>' + LR.textToHTML(preview).slice(0, 180) + '</span></span>' +
            '</label>';
          }).join('') +
        '</section>';
      }).join('');
    App.openBasicModal({
      title: '选择要打印的错题',
      eyebrow: 'PRINT / SELECT',
      size: 'full',
      body: body,
      footer: '<button type="button" class="btn btn--ghost btn--grow" data-action="close-modal">取消</button>' +
        '<button type="button" class="btn btn--primary btn--grow" id="printPickerConfirm"' + (selected.size ? '' : ' disabled') + '>确定选择</button>',
      onMount: function (root) {
        App.hydrateImages(root);
        function sync() {
          root.querySelectorAll('input[data-print-q]').forEach(function (input) {
            const row = input.closest('.print-pick-row');
            if (row) row.classList.toggle('is-selected', input.checked);
          });
          updateCount(root);
        }
        root.querySelectorAll('input[data-print-q]').forEach(function (input) {
          input.addEventListener('change', function () {
            if (input.checked) selected.add(input.getAttribute('data-print-q'));
            else selected.delete(input.getAttribute('data-print-q'));
            sync();
          });
        });
        root.querySelector('#printPickerAll').addEventListener('click', function () {
          selected.clear(); allIds.forEach(function (id) { selected.add(id); });
          root.querySelectorAll('input[data-print-q]').forEach(function (input) { input.checked = true; });
          sync();
        });
        root.querySelector('#printPickerNone').addEventListener('click', function () {
          selected.clear();
          root.querySelectorAll('input[data-print-q]').forEach(function (input) { input.checked = false; });
          sync();
        });
        root.querySelectorAll('[data-print-group-toggle]').forEach(function (button) {
          button.addEventListener('click', function () {
            const groupId = button.getAttribute('data-print-group-toggle');
            const inputs = root.querySelectorAll('input[data-print-q][data-group="' + groupId + '"]');
            const shouldCheck = Array.prototype.some.call(inputs, function (input) { return !input.checked; });
            inputs.forEach(function (input) {
              input.checked = shouldCheck;
              if (shouldCheck) selected.add(input.getAttribute('data-print-q'));
              else selected.delete(input.getAttribute('data-print-q'));
            });
            sync();
          });
        });
        root.querySelector('#printPickerConfirm').addEventListener('click', function () {
          App.ui.reviewPrintSelection = Array.from(selected);
          App.ui.reviewMode = 'print';
          App.ui.reviewModeDrawer = false;
          App.closeModal();
          App.render();
        });
      }
    });
  }
  App.openPrintPicker = openPrintPicker;

  actions['open-print-picker'] = function () { openPrintPicker(); };

  function answerForQuestion(q) {
    const a = q.analysis;
    if (!a) return q.answerText || '（暂无答案解析）';
    const parts = [];
    if (a.summary) parts.push(a.summary);
    if (Array.isArray(a.solutionSteps) && a.solutionSteps.length) {
      parts.push(a.solutionSteps.map(function (step, i) { return (i + 1) + '. ' + step; }).join('\n'));
    }
    if (a.tips) parts.push('提醒：' + a.tips);
    return parts.join('\n\n') || q.answerText || '（暂无答案解析）';
  }

  actions['print-wrong-questions'] = async function () {
    const selected = printSelectedQuestions();
    if (!selected.length) {
      App.toast('请先选择要打印的错题', 'error');
      return;
    }
    const iosWindow = isIOS() && !window.LRNative ? window.open('', '_blank') : null;
    if (iosWindow) {
      try { iosWindow.document.write('<p style="font-family:-apple-system,sans-serif;padding:24px">正在生成 LRStudy 错题打印卷…</p>'); } catch (_) {}
    }
    const hide = App.showBusy('正在准备错题打印卷', '读取原题图片 → 整理答案解析 → 排版 A4…');
    try {
      const items = [];
      for (const q of selected) {
        let imageDataURL = '';
        if (q.imageId) {
          const blob = await LR.db.getImageBlob(q.imageId);
          if (blob) imageDataURL = await LR.ai.imageToDataURL(blob, 1400);
        }
        const points = q.analysis && Array.isArray(q.analysis.knowledgePoints) ? q.analysis.knowledgePoints : (q.tags || []);
        items.push({
          question: q.contentText || '',
          answer: answerForQuestion(q),
          knowledgePoint: points.slice(0, 3).join('、') || '错题',
          imageDataURL: imageDataURL
        });
      }
      const notebookIds = Array.from(new Set(selected.map(function (q) { return q.notebookId; })));
      const names = notebookIds.map(function (id) {
        const nb = LR.db.notebook(id);
        return nb ? nb.name : '错题本';
      });
      const points = [];
      selected.forEach(function (q) {
        const list = q.analysis && Array.isArray(q.analysis.knowledgePoints) ? q.analysis.knowledgePoints : (q.tags || []);
        list.forEach(function (point) { if (point && points.indexOf(point) < 0) points.push(point); });
      });
      const session = {
        id: 'print-' + Date.now(),
        notebookId: null,
        notebookName: names.length === 1 ? names[0] : names.length + ' 个错题本',
        title: '错题打印 · ' + (names.length === 1 ? names[0] : names.length + ' 个错题本'),
        knowledgePoints: points.slice(0, 12),
        questions: items,
        createdAt: new Date().toISOString(),
        kind: 'wrong-print'
      };
      hide();
      await App.printPaper(session, true, { iosWindow: iosWindow });
    } catch (err) {
      hide();
      console.error(err);
      App.toast('无法生成打印卷：' + (err.message || '请重试'), 'error');
    }
  };

  /* ------------------------------ session page --------------------------- */

  function verdictLabel(verdict) {
    if (verdict === 'correct') return '正确';
    if (verdict === 'partial') return '部分正确';
    return '错误';
  }

  function gradingResultsHTML(session) {
    const grading = session.grading;
    if (!grading) return '';
    const results = grading.results || [];
    const wrong = results.filter(function (r) { return r.verdict !== 'correct'; });
    const percent = Math.round(Number(grading.percent) || 0);
    const addedCount = (session.addedQuestionIds || []).length;
    let wrongAddHTML = '';
    if (!session.notebookId) {
      wrongAddHTML = '';
    } else if (!wrong.length) {
      wrongAddHTML = '<div class="grading-footer"><div class="row-between"><span class="section-note">全部答对，未发现需要归纳的错题。</span><span class="badge badge--filled">ALL CLEAR</span></div></div>';
    } else if (addedCount) {
      wrongAddHTML =
        '<div class="grading-footer">' +
          '<div class="row-between">' +
            '<span><strong style="display:block;font-size:12px">已把 ' + addedCount + ' 道错题加入错题本</strong><span class="hint">批改意见与知识点已一并归档。</span></span>' +
            '<button type="button" class="btn btn--small btn--ghost" data-nav="#/notebooks/' + encodeURIComponent(session.notebookId) + '">查看</button>' +
          '</div>' +
        '</div>';
    } else if (session.addDismissed) {
      wrongAddHTML =
        '<div class="grading-footer"><div class="row-between">' +
          '<span class="hint">本次错题未加入错题本。</span>' +
          '<button type="button" class="btn btn--small btn--ghost" data-action="show-wrong-add" data-id="' + attr(session.id) + '">仍要归纳</button>' +
        '</div></div>';
    } else {
      wrongAddHTML =
        '<div class="grading-footer">' +
          '<div class="panel-index">ARCHIVE / 错题归纳</div>' +
          '<h3 class="panel-title">要把错题收进错题本吗？</h3>' +
          '<p class="hint mt-8">勾选需要归纳的题。题目、参考答案和 AI 批改意见会一起保存，错误知识点会用于下一次出题。</p>' +
          '<div class="wrong-add-list">' +
            wrong.map(function (result) {
              const idx = result.index - 1;
              const q = session.questions[idx] || {};
              return '<label class="check-row">' +
                '<input type="checkbox" data-wrong-index="' + idx + '" checked>' +
                '<span class="check-copy"><strong>第 ' + result.index + ' 题 · ' + e(q.knowledgePoint || '未标注知识点') + '</strong>' +
                  '<span>' + e(result.feedback || '').slice(0, 140) + '</span></span>' +
              '</label>';
            }).join('') +
          '</div>' +
          '<div class="inline-actions">' +
            '<button type="button" class="btn btn--primary btn--small" data-action="add-wrongs" data-id="' + attr(session.id) + '">' + icon('check') + '加入选中的错题</button>' +
            '<button type="button" class="btn btn--ghost btn--small" data-action="dismiss-wrong-add" data-id="' + attr(session.id) + '">暂不加入</button>' +
          '</div>' +
        '</div>';
    }

    return '<section class="grading-panel">' +
      '<div class="grading-head"><div class="grading-head-inner">' +
        '<div class="score-block">' +
          '<div class="score-number">' + percent + '</div>' +
          '<div class="score-denom">%</div>' +
          '<div class="score-copy">' +
            '<div class="score-label">AI 自动批改' + (grading.source === 'ai-text' ? ' · 在线作答' : '') + ' · ' + e(LR.formatDate(grading.gradedAt || session.createdAt, true)) + '</div>' +
            '<div class="score-summary">' + (grading.summary ? LR.textToHTML(grading.summary) : '已按参考答案完成逐题批改。你可以修正判定，分数会自动更新。') + '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="grading-list">' +
        results.map(function (result, i) {
          const q = session.questions[i] || {};
          return '<div class="grading-item verdict--' + (result.verdict || 'wrong') + '">' +
            '<span class="verdict-mark">' + (result.verdict === 'correct' ? '✓' : result.verdict === 'partial' ? '−' : '×') + '</span>' +
            '<div>' +
              '<div class="row-between">' +
                '<div class="grading-title">第 ' + (result.index || i + 1) + ' 题 · ' + e(q.knowledgePoint || '本题') + '</div>' +
                '<button type="button" class="text-link muted" data-action="cycle-verdict" data-id="' + attr(session.id) + '" data-index="' + i + '">修改判定</button>' +
              '</div>' +
              '<div class="row-between" style="margin-top:3px"><span class="section-note">' + verdictLabel(result.verdict) + '</span><span class="section-note">1 分</span></div>' +
              '<div class="grading-feedback">' + LR.textToHTML(result.feedback || '') + '</div>' +
              (result.studentAnswer ? '<div class="grading-student-answer">识别答案：' + LR.textToHTML(result.studentAnswer) + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      wrongAddHTML +
    '</section>';
  }

  function answerCount(session) {
    return (session.answers || []).filter(function (answer) {
      return String(answer == null ? '' : answer).trim();
    }).length;
  }

  function sessionActionsHTML(session) {
    const graded = !!session.grading;
    const answered = answerCount(session);
    const onlineLabel = answered ? (graded ? '修改在线作答' : '继续在线答题') : '在线答题';
    return '<div class="session-actions">' +
      '<button type="button" class="btn btn--primary" data-action="answer-session" data-id="' + attr(session.id) + '">' + icon('pen') + onlineLabel + '</button>' +
      '<button type="button" class="btn btn--ghost" data-action="print-session" data-id="' + attr(session.id) + '">' + icon('printer') + '导出 PDF / 打印</button>' +
      '<button type="button" class="btn btn--ghost" data-action="grade-session" data-id="' + attr(session.id) + '">' + icon('camera') + (graded ? '重新拍照批改' : '拍照批改') + '</button>' +
      (graded && (session.answerImageIds || []).length
        ? '<button type="button" class="btn btn--ghost" data-action="view-answer-images" data-id="' + attr(session.id) + '">' + icon('eye') + '答题照片</button>'
        : '') +
    '</div>';
  }

  function openAnswerSheet(sessionId) {
    const session = LR.db.session(sessionId);
    if (!session) return;
    const questions = session.questions || [];
    if (!questions.length) {
      App.toast('这份试卷没有题目', 'error');
      return;
    }
    const answers = questions.map(function (_, i) {
      return String((session.answers || [])[i] || '');
    });
    let dirty = false;
    let saveTimer = null;
    let incompleteAcknowledged = false;
    const initialAnswered = answers.filter(function (a) { return a.trim(); }).length;

    function progressText() {
      const count = answers.filter(function (a) { return a.trim(); }).length;
      return '已填写 ' + count + ' / ' + questions.length;
    }

    function saveDraftNow() {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (!dirty) return Promise.resolve(session);
      dirty = false;
      return LR.db.updateSession(sessionId, {
        answers: answers.slice(),
        answerMode: 'inline'
      }).catch(function (err) {
        console.warn('保存在线答案失败', err);
      });
    }

    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { saveDraftNow(); }, 450);
    }

    const modal = App.openBasicModal({
      title: '在线答题',
      eyebrow: 'ANSWER SHEET / 设备作答',
      size: 'full',
      body:
        '<div class="answer-sheet-head">' +
          '<div><strong>' + e(session.title || '复习练习') + '</strong><span class="answer-sheet-sub">答案保存在本机，可随时退出后继续</span></div>' +
          '<span class="answer-progress" id="answerProgress">' + progressText() + '</span>' +
        '</div>' +
        '<div class="answer-sheet">' +
          questions.map(function (q, i) {
            return '<section class="answer-item">' +
              '<div class="answer-item-top">' +
                '<span class="answer-item-index">' + String(i + 1).padStart(2, '0') + '</span>' +
                '<span class="chip">' + e(q.knowledgePoint || '综合') + '</span>' +
                (q.difficulty ? '<span class="chip chip--dashed">' + e(q.difficulty) + '</span>' : '') +
              '</div>' +
              '<div class="answer-item-question">' + LR.textToHTML(q.question || '') + '</div>' +
              '<textarea class="textarea answer-input" data-answer-index="' + i + '" rows="4" placeholder="在设备上写下你的答案，保留关键步骤…">' + e(answers[i]) + '</textarea>' +
            '</section>';
          }).join('') +
        '</div>' +
        '<p class="form-error hidden" id="answerSubmitError" style="margin-top:14px"></p>' +
        '<p class="modal-note">提交后会把你输入的答案交给 AI 逐题对照参考答案批改。未作答的题会按错误计分；也可以保存后退出，稍后继续。</p>',
      footer: '<button type="button" class="btn btn--ghost btn--grow" id="saveAnswerBtn">保存并退出</button>' +
        '<button type="button" class="btn btn--primary btn--grow" id="submitAnswerBtn">' + icon('check') + '提交 AI 批改</button>',
      onMount: function (root) {
        const progress = root.querySelector('#answerProgress');
        const error = root.querySelector('#answerSubmitError');
        const saveBtn = root.querySelector('#saveAnswerBtn');
        const submitBtn = root.querySelector('#submitAnswerBtn');
        root.querySelectorAll('[data-answer-index]').forEach(function (textarea) {
          textarea.addEventListener('input', function () {
            const index = Number(textarea.getAttribute('data-answer-index'));
            answers[index] = textarea.value;
            dirty = true;
            incompleteAcknowledged = false;
            if (progress) progress.textContent = progressText();
            if (error) { error.textContent = ''; error.classList.add('hidden'); }
            scheduleSave();
          });
        });

        saveBtn.addEventListener('click', async function () {
          if (saveBtn.disabled) return;
          saveBtn.disabled = true;
          await saveDraftNow();
          App.closeModal();
          App.toast('答案已保存，可稍后继续作答', 'success');
          App.render();
        });

        submitBtn.addEventListener('click', async function () {
          if (submitBtn.disabled) return;
          const filled = answers.filter(function (a) { return a.trim(); }).length;
          if (!filled) {
            error.textContent = '请先在设备上填写至少一道题的答案。';
            error.classList.remove('hidden');
            return;
          }
          if (filled < questions.length && !incompleteAcknowledged) {
            incompleteAcknowledged = true;
            error.textContent = '还有 ' + (questions.length - filled) + ' 题未作答，未作答会按 0 分处理。确认提交请再点一次。';
            error.classList.remove('hidden');
            return;
          }
          if (!LR.ai.isConfigured()) {
            error.textContent = '尚未配置 AI。请先保存答案并退出，到「设置 → AI 能力」填写 API Key 后再回来提交。';
            error.classList.remove('hidden');
            return;
          }
          error.classList.add('hidden');
          saveDraftNow();
          submitBtn.disabled = true;
          saveBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner"></span> AI 批改中';
          const hide = App.showBusy('AI 正在批改在线答案', '对照参考答案 → 逐题判定 → 计算得分…');
          try {
            const grading = await LR.ai.gradePaper({
              session: session,
              textAnswers: answers.slice()
            });
            await LR.db.updateSession(session.id, {
              answers: answers.slice(),
              answerMode: 'inline',
              grading: grading,
              answeredAt: new Date().toISOString(),
              status: 'graded',
              addDismissed: false
            });
            dirty = false;
            clearTimeout(saveTimer);
            hide();
            App.closeModal();
            App.toast('在线答题批改完成，得分率 ' + (grading.percent || 0) + '%', 'success');
            App.render();
          } catch (err) {
            console.error(err);
            hide();
            submitBtn.disabled = false;
            saveBtn.disabled = false;
            submitBtn.innerHTML = icon('check') + '提交 AI 批改';
            error.textContent = 'AI 批改失败：' + (err.message || '请重试');
            error.classList.remove('hidden');
          }
        });

        if (initialAnswered) {
          const firstEmpty = answers.findIndex(function (a) { return !a.trim(); });
          if (firstEmpty >= 0) {
            const target = root.querySelector('[data-answer-index="' + firstEmpty + '"]');
            if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 220);
          }
        }
      },
      onClose: function () {
        clearTimeout(saveTimer);
        if (dirty) {
          LR.db.updateSession(sessionId, {
            answers: answers.slice(),
            answerMode: 'inline'
          }).catch(function (err) { console.warn('关闭时保存在线答案失败', err); });
        }
      }
    });
    void modal;
  }

  actions['answer-session'] = function (el) {
    openAnswerSheet(el.getAttribute('data-id'));
  };

  function renderSessionPage(r) {
    const session = LR.db.session(r.sessionId);
    if (!session) {
      setTimeout(function () {
        App.toast('这份练习记录不存在或已被删除', 'error');
        App.navigate('#/review', { replace: true });
      }, 0);
      return App.emptyState('练习记录不存在', '返回复习页重新选择。', 'warning', '<button type="button" class="btn" data-nav="#/review">返回复习</button>');
    }
    const notebook = LR.db.notebook(session.notebookId);
    const kps = session.knowledgePoints || [];
    const answered = answerCount(session);
    const answerStatus = session.grading ? '已批改' : (answered ? '已作答 ' + answered + '/' + (session.questions || []).length : '待作答');
    return '' +
      '<section class="session-head">' +
        '<div class="eyebrow">PAPER / 复习卷</div>' +
        '<h1 class="session-title">' + e(session.title || '复习练习') + '</h1>' +
        '<div class="session-meta">' +
          '<span>' + e(notebook ? notebook.name : session.notebookName || '错题本') + '</span><span>·</span>' +
          '<span>' + (session.questions || []).length + ' 题</span><span>·</span>' +
          '<span>' + LR.formatDate(session.createdAt, true) + '</span><span>·</span>' +
          '<span>' + answerStatus + '</span>' +
        '</div>' +
        (kps.length ? '<div class="chip-row">' + kps.slice(0, 10).map(function (k) { return '<span class="chip">' + e(k) + '</span>'; }).join('') + '</div>' : '') +
        sessionActionsHTML(session) +
      '</section>' +
      (!session.grading
        ? '<div class="notice mb-16">' + icon('pen') +
            '<span><strong>可以直接在设备上答题：</strong>点「在线答题」填写答案，提交后 AI 逐题批改；也可以导出 PDF 打印，或纸上作答后用「拍照批改」上传答题页。' +
            (answered ? '<br>已保存 ' + answered + ' 题答案，可继续作答。' : '') + '</span>' +
          '</div>'
        : '') +
      '<div class="paper-card-list">' +
        (session.questions || []).map(function (q, i) {
          return '<article class="paper-card">' +
            '<div class="paper-card-index">' + String(i + 1).padStart(2, '0') + '</div>' +
            '<div class="paper-card-content">' +
              '<div class="paper-card-kp"><span class="chip">' + e(q.knowledgePoint || '综合') + '</span> ' +
                (q.difficulty ? '<span class="chip chip--dashed">' + e(q.difficulty) + '</span>' : '') +
              '</div>' +
              '<div class="paper-question-text">' + LR.textToHTML(q.question || '') + '</div>' +
              '<details class="answer-collapse"><summary>对照参考答案</summary><div class="paper-answer"><strong>参考答案</strong><br>' + LR.textToHTML(q.answer || '') + '</div></details>' +
            '</div>' +
          '</article>';
        }).join('') +
      '</div>' +
      (session.grading ? gradingResultsHTML(session) : '') +
      '<div class="settings-foot" style="margin-top:28px">' +
        '<span>LRStudy ' + 'v1.7' + ' · 本卷由 AI 根据常错知识点生成，仅供个人复习。</span>' +
        '<button type="button" class="text-link muted" data-action="delete-session" data-id="' + attr(session.id) + '">删除记录</button>' +
      '</div>';
  }
  pages.session = renderSessionPage;

  /* ---------------------------- print / PDF ------------------------------ */

  function printStyles() {
    return [
      '@page{size:A4;margin:16mm 15mm 18mm}',
      '*{box-sizing:border-box}',
      'html,body{margin:0;padding:0;background:#fff;color:#000}',
      'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;font-size:10.5pt;line-height:1.65;font-weight:400}',
      '.print-sheet{width:100%;max-width:180mm;margin:0 auto}',
      '.print-head{border-bottom:1.5pt solid #000;padding-bottom:4mm;margin-bottom:5mm}',
      '.print-eyebrow{font-family:"Courier New",monospace;font-size:7.5pt;letter-spacing:1.5pt;text-transform:uppercase}',
      '.print-title{font-family:"Times New Roman","Songti SC",serif;font-size:23pt;line-height:1.1;font-weight:700;margin:2mm 0 2mm;letter-spacing:-0.4pt}',
      '.print-meta{font-size:8pt;display:flex;gap:5mm;flex-wrap:wrap}',
      '.print-note{border:0.8pt dashed #000;padding:2.5mm 3mm;margin-bottom:5mm;font-size:8.5pt}',
      '.print-kps{font-size:8pt;margin-bottom:5mm}',
      '.print-q{border-bottom:0.5pt solid #000;padding:3.5mm 0 4.5mm;break-inside:avoid;page-break-inside:avoid}',
      '.print-q-head{display:flex;gap:3mm;align-items:flex-start}',
      '.print-q-index{font-family:"Times New Roman",serif;font-size:16pt;line-height:1;font-weight:700;min-width:8mm}',
      '.print-q-body{flex:1;min-width:0}',
      '.print-q-kp{font-family:"Courier New",monospace;font-size:7pt;margin-bottom:1.5mm;letter-spacing:.5px}',
      '.print-question{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10pt}',
      '.print-q-image{display:block;width:100%;max-height:150mm;object-fit:contain;object-position:left top;margin:0 0 2.5mm}',
      '.answer-space{border-bottom:0.4pt dashed #000;height:15mm;margin-top:2.5mm;font-size:7.5pt;color:#000}',
      '.print-foot{font-family:"Courier New",monospace;font-size:7pt;margin-top:5mm;display:flex;justify-content:space-between;gap:4mm}',
      '.print-key{break-before:page;page-break-before:always}',
      '.print-key h2{font-family:"Times New Roman","Songti SC",serif;font-size:19pt;margin:0 0 4mm;border-bottom:1.5pt solid #000;padding-bottom:2mm}',
      '.print-answer{padding:2.5mm 0;border-bottom:0.4pt solid #000;break-inside:avoid;page-break-inside:avoid;font-size:9pt}',
      '.print-answer h3{font-size:10pt;margin:0 0 1mm}',
      '.print-answer .ans{white-space:pre-wrap;overflow-wrap:anywhere}',
      '@media print{.print-sheet{max-width:none}}'
    ].join('\n');
  }

  function buildPrintHTML(session, includeAnswers) {
    const state = LR.db.state;
    const notebook = LR.db.notebook(session.notebookId);
    const questions = session.questions || [];
    const kps = session.knowledgePoints || [];
    const title = session.title || '复习练习';
    const date = LR.formatDate(session.createdAt);
    const wrongPrint = session.kind === 'wrong-print';
    const qHTML = questions.map(function (q, i) {
      return '<section class="print-q">' +
        '<div class="print-q-head">' +
          '<div class="print-q-index">' + String(i + 1).padStart(2, '0') + '</div>' +
          '<div class="print-q-body">' +
            '<div class="print-q-kp">' + e(q.knowledgePoint || '综合') + (q.difficulty ? ' / ' + e(q.difficulty) : '') + '</div>' +
            (q.imageDataURL ? '<img class="print-q-image" src="' + attr(q.imageDataURL) + '" alt="错题原图">' : '') +
            (q.question ? '<div class="print-question">' + LR.textToHTML(q.question) + '</div>' : '') +
            '<div class="answer-space">答：</div>' +
          '</div>' +
        '</div>' +
      '</section>';
    }).join('');
    const keyHTML = includeAnswers
      ? '<section class="print-key"><h2>参考答案</h2>' + questions.map(function (q, i) {
          return '<article class="print-answer"><h3>第 ' + (i + 1) + ' 题 · ' + e(q.knowledgePoint || '综合') + '</h3><div class="ans">' + LR.textToHTML(q.answer || '') + '</div></article>';
        }).join('') + '</section>'
      : '';
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + e(LR.safeFilename('LRStudy-' + title)) + '</title>' +
      '<style>' + printStyles() + '</style></head><body>' +
      '<div class="print-sheet">' +
        '<header class="print-head">' +
          '<div class="print-eyebrow">' + (wrongPrint ? 'LRSTUDY / WRONG QUESTION PRINT' : 'LRSTUDY / AI PRACTICE PAPER') + '</div>' +
          '<div class="print-title">' + e(title) + '</div>' +
          '<div class="print-meta"><span>错题本：' + e(notebook ? notebook.name : session.notebookName || '—') + '</span><span>生成：' + date + '</span><span>共 ' + questions.length + ' 题</span><span>姓名：____________</span><span>得分：________</span></div>' +
        '</header>' +
        (kps.length ? '<div class="print-kps">常错知识点：' + kps.slice(0, 12).map(function (k) { return e(k); }).join(' / ') + '</div>' : '') +
        '<div class="print-note">' + (wrongPrint ? '请独立完成并保留过程。本卷由选中的未掌握错题组成，最后一页附参考答案与解析。' : '请独立完成并保留过程。完成后，可用 LRStudy 的「拍照批改」上传答题页，AI 会自动打分并给出错题反馈。') + '</div>' +
        qHTML +
        '<footer class="print-foot"><span>LRStudy v1.7 · ' + e(state.profile.nickname || '学习者') + '</span><span>' + (wrongPrint ? '错题打印' : 'AI 生成练习') + ' · 仅供个人复习使用</span><span>' + questions.length + ' 题</span></footer>' +
        keyHTML +
      '</div>' +
    '</body></html>';
  }

  async function printPaper(session, includeAnswers, options) {
    const opts = options || {};
    if (window.LRNative && typeof window.LRNative.printPdf === 'function') {
      const hide = App.showBusy('正在准备打印', '正在生成 A4 PDF，然后打开系统打印窗口…');
      try {
        if (!LR.pdf || !LR.pdf.buildPracticePDF) throw new Error('PDF 模块未加载');
        const result = await LR.pdf.buildPracticePDF(session, { includeAnswers: includeAnswers });
        const dataUrl = await LR.readBlobAsDataURL(result.blob);
        window.LRNative.printPdf(result.filename, String(dataUrl).slice(String(dataUrl).indexOf(',') + 1));
        hide();
        App.toast('已打开系统打印窗口，请选择打印机或“另存为 PDF”', 'success', 5000);
      } catch (err) {
        hide();
        App.toast('无法打开打印窗口：' + (err.message || '请重试'), 'error', 6000);
      }
      return;
    }

    if (isIOS()) {
      const hide = App.showBusy('正在生成 PDF', '正在排版 A4 练习卷…');
      try {
        if (!LR.pdf || !LR.pdf.buildPracticePDF) throw new Error('PDF 模块未加载');
        const result = await LR.pdf.buildPracticePDF(session, { includeAnswers: includeAnswers });
        const url = URL.createObjectURL(result.blob);
        hide();
        if (opts.iosWindow && !opts.iosWindow.closed) {
          opts.iosWindow.location.href = url;
          App.toast('PDF 已打开，请点分享按钮选择“打印”或保存到文件', 'info', 6000);
          return;
        }
        App.openBasicModal({
          title: '打印 / 分享 PDF',
          eyebrow: 'PRINT / A4',
          center: true,
          body: '<div class="notice">' + icon('printer') + '<span>PDF 已生成。iOS 不允许网页直接打开 AirPrint 对话框，请点下面的按钮打开 PDF，再通过系统分享选择“打印”。</span></div>',
          footer: '<button type="button" class="btn btn--ghost" data-action="close-modal">关闭</button>' +
            '<a class="btn btn--primary" href="' + attr(url) + '" target="_blank" rel="noopener">' + icon('file') + '打开 PDF</a>'
        });
      } catch (err) {
        hide();
        App.toast('无法生成 PDF：' + (err.message || '请重试'), 'error', 6000);
      }
      return;
    }

    const html = buildPrintHTML(session, includeAnswers);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('title', '打印预览');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(frame);
    await new Promise(function (resolve) {
      let done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      frame.onload = finish;
      frame.srcdoc = html;
      setTimeout(finish, 700);
    });
    await LR.sleep(180);
    App.toast('已打开打印窗口，请选择「另存为 PDF」或打印机', 'info', 5000);
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (err) {
      App.toast('无法打开打印窗口：' + err.message, 'error');
    }
    const cleanup = function () {
      setTimeout(function () {
        try { frame.remove(); } catch (_) {}
      }, 900);
    };
    try {
      frame.contentWindow.addEventListener('afterprint', cleanup, { once: true });
    } catch (_) {}
    setTimeout(function () {
      try { frame.remove(); } catch (_) {}
    }, 120000);
  }
  App.printPaper = printPaper;
  App.buildPrintHTML = buildPrintHTML;

  actions['print-session'] = function (el) {
    const session = LR.db.session(el.getAttribute('data-id'));
    if (!session) return;
    App.openBasicModal({
      title: '导出 PDF / 打印',
      eyebrow: 'PRINT / A4',
      center: true,
      body:
        '<div class="notice">' + icon('file') + '<span><strong>下载 PDF</strong> 会直接生成 A4 版练习卷；<strong>打印</strong> 会打开系统打印窗口。下载后可以传到电脑或打印店直接打印。</span></div>' +
        '<label class="check-row mt-16"><input type="checkbox" id="printIncludeAnswers"><span class="check-copy"><strong>附上答案解析</strong><span>答案解析会另起一页，方便批改；独立作答时建议不勾选。</span></span></label>' +
        '<p class="modal-note">纸张：A4 · 黑白 · 已预留作答空间。PDF 为图片型文件，任何设备都能保持相同排版。</p>',
      footer: '<button type="button" class="btn btn--ghost" data-action="close-modal">取消</button>' +
        '<button type="button" class="btn btn--ghost" id="doPrintBtn">' + icon('printer') + '打印</button>' +
        '<button type="button" class="btn btn--primary" id="downloadPdfBtn">' + icon('download') + '下载 PDF</button>',
      onMount: function (root) {
        root.querySelector('#doPrintBtn').addEventListener('click', function () {
          const includeAnswers = !!root.querySelector('#printIncludeAnswers').checked;
          // iOS PWA needs a user-gesture window for the PDF fallback/share flow.
          const iosWindow = isIOS() && !window.LRNative ? window.open('', '_blank') : null;
          if (iosWindow) {
            try { iosWindow.document.write('<p style="font-family:-apple-system,sans-serif;padding:24px">正在生成 LRStudy 练习卷…</p>'); } catch (_) {}
          }
          App.closeModal();
          printPaper(session, includeAnswers, { iosWindow: iosWindow });
        });
        root.querySelector('#downloadPdfBtn').addEventListener('click', async function () {
          const btn = root.querySelector('#downloadPdfBtn');
          if (btn.disabled) return;
          const includeAnswers = !!root.querySelector('#printIncludeAnswers').checked;
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> 生成中';
          const hide = App.showBusy('正在生成 PDF', '正在排版 A4 页面并嵌入练习卷…');
          try {
            if (!LR.pdf || !LR.pdf.buildPracticePDF) throw new Error('PDF 模块未加载');
            const result = await LR.pdf.buildPracticePDF(session, { includeAnswers: includeAnswers });
            hide();
            await LR.downloadBlob(result.blob, result.filename);
            App.closeModal();
            App.toast('PDF 已生成：' + result.filename + '（' + result.pages + ' 页）', 'success', 4200);
          } catch (err) {
            hide();
            btn.disabled = false;
            btn.innerHTML = icon('download') + '下载 PDF';
            App.toast('PDF 生成失败：' + (err.message || '请重试'), 'error');
          }
        });
      }
    });
  };

  /* ----------------------------- photo grading --------------------------- */

  function openGradingModal(sessionId) {
    const session = LR.db.session(sessionId);
    if (!session) return;
    let photos = [];
    const objectURLs = [];
    function cleanupURLs() {
      objectURLs.forEach(function (url) { try { URL.revokeObjectURL(url); } catch (_) {} });
      objectURLs.length = 0;
    }
    const modal = App.openBasicModal({
      title: '拍照批改',
      eyebrow: 'GRADE / PHOTO',
      size: 'full',
      body:
        '<div class="notice">' + icon('camera') + '<span>上传学生作答后的整页照片（最多 4 张）。AI 会识别手写答案、对照参考答案逐题判分，并给出简短反馈。请确保光线均匀、字迹清晰。</span></div>' +
        '<div class="scan-source-grid mt-16">' +
          '<button type="button" class="scan-source" id="gradeCamera"><span class="scan-source-icon">' + icon('camera') + '</span><span class="scan-source-copy"><strong>拍摄答题页</strong><span>一张一张拍</span></span></button>' +
          '<button type="button" class="scan-source" id="gradeGallery"><span class="scan-source-icon">' + icon('image') + '</span><span class="scan-source-copy"><strong>从相册选择</strong><span>可一次选多张</span></span></button>' +
        '</div>' +
        '<div class="grading-photo-grid mt-16" id="gradingPhotoGrid"></div>' +
        '<p class="hint mt-8" id="gradingPhotoHint">还没有添加照片。最多 4 张。</p>' +
        '<p class="form-error hidden mt-12" id="gradingError"></p>' +
        '<div class="notice mt-16">' + icon('info') + '<span>拍照批改需要支持图片输入的模型。若主模型不支持视觉，请到「设置 → AI 能力」填写「识图模型」。批改分数仅供复习参考，支持手动修正判定。</span></div>',
      footer: '<button type="button" class="btn btn--ghost btn--grow" data-action="close-modal">取消</button>' +
        '<button type="button" class="btn btn--primary btn--grow" id="startGradeBtn" disabled>' + icon('check') + '开始 AI 批改</button>',
      onClose: cleanupURLs,
      onMount: function (root) {
        const grid = root.querySelector('#gradingPhotoGrid');
        const hint = root.querySelector('#gradingPhotoHint');
        const errorBox = root.querySelector('#gradingError');
        const startBtn = root.querySelector('#startGradeBtn');

        function renderPhotos() {
          grid.innerHTML = photos.map(function (photo, index) {
            return '<figure class="grading-photo">' +
              '<img src="' + attr(photo.url) + '" alt="答题照片 ' + (index + 1) + '">' +
              '<button type="button" class="grading-photo-remove" data-remove-photo="' + index + '" aria-label="移除照片">' + icon('close') + '</button>' +
              '<figcaption>PAGE ' + String(index + 1).padStart(2, '0') + '</figcaption>' +
            '</figure>';
          }).join('');
          grid.querySelectorAll('[data-remove-photo]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              const idx = Number(btn.getAttribute('data-remove-photo'));
              const removed = photos.splice(idx, 1)[0];
              if (removed) {
                URL.revokeObjectURL(removed.url);
                const urlIdx = objectURLs.indexOf(removed.url);
                if (urlIdx >= 0) objectURLs.splice(urlIdx, 1);
              }
              renderPhotos();
            });
          });
          hint.textContent = photos.length ? '已添加 ' + photos.length + ' 张答题照片。最多 4 张。' : '还没有添加照片。最多 4 张。';
          startBtn.disabled = photos.length === 0;
          startBtn.innerHTML = icon('check') + (photos.length ? '开始 AI 批改' : '请先添加照片');
        }

        async function addFiles(files) {
          errorBox.classList.add('hidden');
          const remaining = 4 - photos.length;
          if (remaining <= 0) {
            App.toast('最多上传 4 张照片', 'error');
            return;
          }
          const list = files.slice(0, remaining).filter(function (f) { return f.type && /^image\//.test(f.type); });
          if (!list.length) {
            if (files.length) App.toast('请选择图片文件', 'error');
            return;
          }
          startBtn.disabled = true;
          startBtn.innerHTML = '<span class="spinner"></span> 正在压缩照片';
          for (const file of list) {
            try {
              const canvas = await LR.imageFileToCanvas(file, 1800);
              const blob = await LR.canvasToBlob(canvas, 'image/jpeg', 0.82);
              const url = URL.createObjectURL(blob);
              objectURLs.push(url);
              photos.push({ blob: blob, url: url, width: canvas.width, height: canvas.height });
            } catch (err) {
              errorBox.textContent = '照片处理失败：' + err.message;
              errorBox.classList.remove('hidden');
            }
          }
          renderPhotos();
        }

        root.querySelector('#gradeCamera').addEventListener('click', function () {
          App.pickFiles({ accept: 'image/*', capture: 'environment' }).then(function (files) {
            if (files.length) addFiles(files);
          });
        });
        root.querySelector('#gradeGallery').addEventListener('click', function () {
          App.pickFiles({ accept: 'image/*', multiple: true }).then(function (files) {
            if (files.length) addFiles(files);
          });
        });

        startBtn.addEventListener('click', async function () {
          if (!photos.length || startBtn.disabled) return;
          if (!LR.ai.isConfigured()) {
            errorBox.textContent = '请先在「设置 → AI 能力」中填写 API Key 和模型，再回来批改。已选择的照片会保留在此弹窗中。';
            errorBox.classList.remove('hidden');
            return;
          }
          errorBox.classList.add('hidden');
          startBtn.disabled = true;
          startBtn.innerHTML = '<span class="spinner"></span> AI 批改中';
          const hide = App.showBusy('AI 正在批改', '识别手写答案 → 对照参考答案 → 自动评分…');
          try {
            const dataURLs = [];
            for (const photo of photos) {
              dataURLs.push(await LR.ai.imageToDataURL(photo.blob, 1500));
            }
            const grading = await LR.ai.gradePaper({ session: session, images: dataURLs });
            const newIds = [];
            for (const photo of photos) {
              const record = await LR.db.saveImage(photo.blob);
              newIds.push(record.id);
            }
            const oldIds = (session.answerImageIds || []).slice();
            const updated = await LR.db.updateSession(session.id, {
              grading: grading,
              answerImageIds: newIds,
              answeredAt: new Date().toISOString(),
              status: 'graded',
              addDismissed: false
            });
            for (const oldId of oldIds) {
              if (!newIds.includes(oldId)) {
                const used = LR.db.state.questions.some(function (q) { return q.imageId === oldId; });
                if (!used) {
                  try { await LR.db.deleteImage(oldId); } catch (_) {}
                }
              }
            }
            hide();
            cleanupURLs();
            App.closeModal();
            App.toast('批改完成，得分率 ' + (updated.grading.percent || 0) + '%', 'success');
            App.render();
          } catch (err) {
            console.error(err);
            hide();
            errorBox.textContent = 'AI 批改失败：' + (err.message || '请重试');
            errorBox.classList.remove('hidden');
            startBtn.disabled = false;
            startBtn.innerHTML = icon('check') + '重试批改';
          }
        });

        renderPhotos();
      }
    });
    void modal;
  }

  actions['grade-session'] = function (el) {
    openGradingModal(el.getAttribute('data-id'));
  };

  async function openAnswerImages(sessionId) {
    const session = LR.db.session(sessionId);
    if (!session) return;
    const ids = session.answerImageIds || [];
    if (!ids.length) {
      App.toast('没有保存答题照片', 'info');
      return;
    }
    const urls = [];
    for (const id of ids) {
      const url = await LR.db.imageURL(id);
      if (url) urls.push(url);
    }
    if (!urls.length) {
      App.toast('答题照片不存在', 'error');
      return;
    }
    App.openModal({
      size: 'viewer',
      ariaLabel: '答题照片',
      html:
        '<div class="modal-head"><div class="modal-head-copy"><div class="modal-eyebrow">ANSWER SHEET</div><div class="modal-title">答题照片 · ' + urls.length + ' 张</div></div>' +
          '<button type="button" class="icon-button" data-action="close-modal" aria-label="关闭">' + icon('close') + '</button></div>' +
        '<div class="viewer-stage" style="display:block"><div class="answer-photo-stack">' +
          urls.map(function (url, i) { return '<figure class="answer-photo"><img src="' + attr(url) + '" alt="答题照片 ' + (i + 1) + '"><figcaption>PAGE ' + String(i + 1).padStart(2, '0') + '</figcaption></figure>'; }).join('') +
        '</div></div>'
    });
  }
  actions['view-answer-images'] = function (el) { openAnswerImages(el.getAttribute('data-id')); };

  /* ----------------------------- grading edits --------------------------- */

  function recomputeScore(grading) {
    const results = grading.results || [];
    const correctScore = results.reduce(function (sum, item) {
      return sum + (item.verdict === 'correct' ? 1 : item.verdict === 'partial' ? 0.5 : 0);
    }, 0);
    grading.score = Math.round(correctScore * 2) / 2;
    grading.total = results.length;
    grading.percent = results.length ? Math.round((correctScore / results.length) * 100) : 0;
  }

  actions['cycle-verdict'] = async function (el) {
    const sessionId = el.getAttribute('data-id');
    const index = Number(el.getAttribute('data-index'));
    const session = LR.db.session(sessionId);
    if (!session || !session.grading || !session.grading.results[index]) return;
    const current = session.grading.results[index].verdict;
    const order = ['correct', 'partial', 'wrong'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    session.grading.results[index].verdict = next;
    recomputeScore(session.grading);
    await LR.db.updateSession(sessionId, { grading: session.grading });
    App.toast('判定已改为「' + verdictLabel(next) + '」，分数已更新', 'success');
    App.render();
  };

  /* ------------------------------ wrong archive -------------------------- */

  actions['dismiss-wrong-add'] = async function (el) {
    const sessionId = el.getAttribute('data-id');
    await LR.db.updateSession(sessionId, { addDismissed: true });
    App.render();
    App.toast('本次错题未归纳。你仍可以在本页重新加入。', 'info');
  };

  actions['show-wrong-add'] = async function (el) {
    const sessionId = el.getAttribute('data-id');
    await LR.db.updateSession(sessionId, { addDismissed: false });
    App.render();
  };

  actions['add-wrongs'] = async function (el) {
    const sessionId = el.getAttribute('data-id');
    const session = LR.db.session(sessionId);
    if (!session || !session.grading) return;
    if (!session.notebookId) {
      App.toast('自定义练习没有关联错题本，不能直接归纳', 'info');
      return;
    }
    const checked = Array.prototype.slice.call(document.querySelectorAll('[data-wrong-index]:checked'))
      .map(function (input) { return Number(input.getAttribute('data-wrong-index')); })
      .filter(function (idx) { return Number.isInteger(idx) && !isNaN(idx); });
    if (!checked.length) {
      App.toast('请勾选至少一道需要归纳的错题', 'error');
      return;
    }
    const hide = App.showBusy('正在归纳错题', '保存题目、参考答案与 AI 批改意见…');
    const addedIds = (session.addedQuestionIds || []).slice();
    try {
      for (const idx of checked) {
        const q = session.questions[idx];
        const result = session.grading.results[idx] || {};
        if (!q) continue;
        const kp = q.knowledgePoint || result.knowledgePoint || '';
        const answerText = q.answer || '';
        const solutionSteps = String(answerText).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 10);
        const wrongQuestion = await LR.db.addQuestion(session.notebookId, {
          contentText: q.question || '',
          answerText: answerText,
          source: 'review',
          sessionId: session.id,
          title: '复习错题 · ' + (kp || '综合'),
          analysis: {
            subject: '',
            summary: '来自复习卷「' + (session.title || '复习练习') + '」。' + (result.feedback || '本次作答需要重新巩固。'),
            knowledgePoints: kp ? [kp] : [],
            errorCause: result.verdict === 'partial' ? '关键步骤不完整，部分得分。' : '本题作答未正确掌握，需要重新理解。',
            solutionSteps: solutionSteps,
            tips: '重新独立完成这道题，并对照参考答案检查关键步骤。',
            generatedAt: new Date().toISOString(),
            model: (session.grading && session.grading.model) || session.model || ''
          }
        });
        addedIds.push(wrongQuestion.id);
      }
      await LR.db.updateSession(sessionId, {
        addedQuestionIds: addedIds,
        addDismissed: false
      });
      hide();
      App.toast('已将 ' + checked.length + ' 道错题加入「' + (LR.db.notebook(session.notebookId) || { name: '错题本' }).name + '」', 'success');
      App.render();
    } catch (err) {
      hide();
      console.error(err);
      App.toast('归纳失败：' + (err.message || '请重试'), 'error');
    }
  };

  actions['delete-session'] = async function (el) {
    const sessionId = el.getAttribute('data-id');
    const ok = await App.confirm({
      title: '删除这份练习记录？',
      message: '题目、批改结果和答题照片会一并删除。已经归纳进错题本的错题会保留。',
      confirmLabel: '删除记录',
      danger: true
    });
    if (!ok) return;
    const hide = App.showBusy('正在删除练习记录', '');
    try {
      await LR.db.deleteSession(sessionId);
      hide();
      App.toast('练习记录已删除', 'success');
      App.navigate('#/review');
    } catch (err) {
      hide();
      App.toast('删除失败：' + err.message, 'error');
    }
  };
})();
