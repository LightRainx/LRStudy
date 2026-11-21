/* LRStudy v1.7 — profile, themes, AI API key, ZIP/WebDAV backup */
(function () {
  'use strict';

  const LR = window.LR;
  const App = window.App;
  const e = App.e;
  const attr = LR.escapeAttr;
  const icon = App.icon;
  const actions = App.actions;
  const pages = App.pages;
  let pendingAvatar = null;

  const AI_PRESETS = {
    openai: {
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      visionModel: 'gpt-4o-mini',
      note: '已填入 OpenAI 模板，请填写你的 API Key。'
    },
    qwen: {
      label: '通义千问 / DashScope',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
      visionModel: 'qwen-vl-max',
      note: '已填入通义千问模板，识图使用 qwen-vl-max。仍可手动修改模型名。'
    },
    deepseek: {
      label: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      visionModel: '',
      note: '已填入 DeepSeek 模板。DeepSeek 文本模型不能读图，拍照解析/批改请另填识图模型。'
    },
    zhipu: {
      label: '智谱 GLM',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
      visionModel: 'glm-4v-plus',
      note: '已填入智谱模板，识图使用 glm-4v-plus。'
    },
    moonshot: {
      label: 'Kimi / Moonshot',
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      visionModel: 'moonshot-v1-8k-vision-preview',
      note: '已填入 Kimi 模板，识图使用视觉模型。'
    },
    siliconflow: {
      label: '硅基流动 SiliconFlow',
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen2.5-7B-Instruct',
      visionModel: 'Qwen/Qwen2.5-VL-72B-Instruct',
      note: '已填入硅基流动模板，模型名可在控制台替换为其他可用模型。'
    },
    openrouter: {
      label: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'google/gemini-2.0-flash-001',
      visionModel: 'google/gemini-2.0-flash-001',
      note: '已填入 OpenRouter 模板。模型名请以 OpenRouter 当前可用列表为准。'
    },
    gemini: {
      label: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: 'gemini-2.0-flash',
      visionModel: 'gemini-2.0-flash',
      note: '已填入 Gemini OpenAI 兼容接口模板。'
    }
  };
  const AI_PRESET_ORDER = ['openai', 'qwen', 'deepseek', 'zhipu', 'moonshot', 'siliconflow', 'openrouter', 'gemini'];

  const OCR_MODELS = [
    {
      id: 'rapidocr',
      name: 'RapidOCR',
      role: '模型',
      detail: 'PP-OCRv4 · 检测 + 识别 + 中文字典',
      description: '本地印刷文字识别模型，适合题目、笔记等清晰照片。',
      bytes: 15594089,
      version: '1.4.2',
      action: '下载模型',
      files: [
        { key: 'det', name: 'ch_PP-OCRv4_det_infer.onnx', url: 'https://unpkg.com/@gutenye/ocr-models@1.4.2/assets/ch_PP-OCRv4_det_infer.onnx', bytes: 4745517 },
        { key: 'rec', name: 'ch_PP-OCRv4_rec_infer.onnx', url: 'https://unpkg.com/@gutenye/ocr-models@1.4.2/assets/ch_PP-OCRv4_rec_infer.onnx', bytes: 10822323 },
        { key: 'dict', name: 'ppocr_keys_v1.txt', url: 'https://unpkg.com/@gutenye/ocr-models@1.4.2/assets/ppocr_keys_v1.txt', bytes: 26249 }
      ]
    },
    {
      id: 'onnx',
      name: 'ONNX Runtime',
      role: '引擎',
      detail: 'WASM · 单线程推理',
      description: 'ONNX 推理运行时。JS 加载器已内置，这里按需下载 WASM 执行文件。',
      bytes: 11241642,
      version: '1.20.0',
      action: '下载引擎',
      files: [
        { key: 'wasm', name: 'ort-wasm-simd-threaded.wasm', url: 'https://unpkg.com/onnxruntime-web@1.20.0/dist/ort-wasm-simd-threaded.wasm', bytes: 11241642 }
      ]
    }
  ];
  let ocrDownloadInFlight = null;

  /* ------------------------------ helpers -------------------------------- */

  function refreshSettingsKeepScroll() {
    const y = window.scrollY;
    App.applyTheme();
    App.render();
    requestAnimationFrame(function () {
      window.scrollTo(0, y);
    });
  }

  function setFormMessage(id, message, ok) {
    const el = document.getElementById(id);
    if (!el) {
      App.toast(message, ok ? 'success' : 'error');
      return;
    }
    el.textContent = message;
    el.className = 'form-message ' + (ok ? 'form-message--ok' : 'form-message--err');
    el.classList.remove('hidden');
  }

  function clearFormMessage(id) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.className = 'form-message hidden';
    }
  }

  function setButtonLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> ' + e(label || '处理中');
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
  }

  function currentAIConfigFromForm() {
    const get = function (id) {
      const el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };
    const auto = document.getElementById('aiAutoAnalyze');
    return {
      baseUrl: get('aiBaseUrl'),
      apiKey: get('aiApiKey'),
      model: get('aiModel'),
      visionModel: get('aiVisionModel'),
      autoAnalyze: auto ? auto.getAttribute('aria-checked') === 'true' : false
    };
  }

  function validateAI(cfg) {
    if (!cfg.baseUrl) throw new Error('请填写 API 地址');
    if (!/^https?:\/\//i.test(cfg.baseUrl)) throw new Error('API 地址需要以 http:// 或 https:// 开头');
    if (!cfg.apiKey) throw new Error('请填写 API Key');
    if (!cfg.model) throw new Error('请填写主模型名称');
  }

  async function saveAISettings(options) {
    const opts = options || {};
    const cfg = currentAIConfigFromForm();
    validateAI(cfg);
    LR.db.state.settings.ai = Object.assign({}, LR.db.state.settings.ai, cfg);
    await LR.db.save();
    updateAIStatusMark();
    if (!opts.silent) App.toast('AI 配置已保存', 'success');
    return cfg;
  }

  function updateAIStatusMark() {
    const mark = document.getElementById('aiStatusMark');
    if (!mark) return;
    const ready = LR.ai.isConfigured();
    mark.className = 'status-mark ' + (ready ? 'is-on' : '');
    mark.textContent = ready ? 'AI READY' : 'NOT CONFIGURED';
  }

  function profileAvatarInner(avatar, nickname) {
    if (avatar) return '<img src="' + attr(avatar) + '" alt="头像">';
    return e(String(nickname || '学').trim().charAt(0) || '学');
  }

  function lastBackupText() {
    const parts = [];
    const state = LR.db.state;
    if (state.settings.lastLocalBackupAt) parts.push('本地 ' + LR.formatDate(state.settings.lastLocalBackupAt, true));
    if (state.settings.webdav.lastBackupAt) parts.push('云端 ' + LR.formatDate(state.settings.webdav.lastBackupAt, true));
    return parts.length ? '上次备份：' + parts.join(' · ') : '还没有备份记录';
  }

  /* ----------------------------- open profile ---------------------------- */

  function openProfileModal() {
    const state = LR.db.state;
    pendingAvatar = state.profile.avatar || '';
    App.openBasicModal({
      title: '个人资料',
      eyebrow: 'PROFILE',
      center: true,
      body:
        '<div class="profile-edit-preview text-center">' +
          '<div class="avatar avatar--large" id="profileAvatarPreview">' + profileAvatarInner(pendingAvatar, state.profile.nickname) + '</div>' +
          '<div class="inline-actions" style="justify-content:center;margin-top:10px">' +
            '<button type="button" class="btn btn--small btn--ghost" id="pickAvatarBtn">' + icon('image') + '更换头像</button>' +
            '<button type="button" class="text-link muted" id="removeAvatarBtn"' + (pendingAvatar ? '' : ' disabled style="opacity:.35"') + '>移除</button>' +
          '</div>' +
          '<p class="hint mt-8">头像会保存在本机，并随 ZIP 备份一起导出。</p>' +
        '</div>' +
        '<form id="profileForm" class="mt-16">' +
          '<div class="field"><label for="profileNickname">昵称 <span class="field-label-note">最多 20 字</span></label><input class="input" id="profileNickname" maxlength="20" value="' + attr(state.profile.nickname) + '" autofocus><p class="hint">昵称会显示在设置页和打印的练习卷页脚。</p></div>' +
          '<div class="field"><label for="profileGrade">学年段 <span class="field-label-note">用于限制出题难度</span></label>' +
            '<select class="select" id="profileGrade">' +
              '<option value=""' + (!state.profile.grade ? ' selected' : '') + '>未设置（不限制）</option>' +
              LR.GRADE_LEVELS.map(function (grade) {
                return '<option value="' + attr(grade.value) + '"' + (state.profile.grade === grade.value ? ' selected' : '') + '>' + e(grade.label) + '</option>';
              }).join('') +
            '</select>' +
            '<p class="hint">设置后，AI 组卷不会出超过该年级课标和年龄的题目；留空则不限制。</p>' +
          '</div>' +
        '</form>',
      footer: '<button type="button" class="btn btn--ghost" data-action="close-modal">取消</button>' +
        '<button type="submit" class="btn btn--primary" form="profileForm">保存资料</button>',
      onMount: function (root) {
        const preview = root.querySelector('#profileAvatarPreview');
        const removeBtn = root.querySelector('#removeAvatarBtn');
        root.querySelector('#pickAvatarBtn').addEventListener('click', function () {
          App.pickFiles({ accept: 'image/*' }).then(async function (files) {
            if (!files.length) return;
            const canvas = await LR.imageFileToCanvas(files[0], 900);
            const side = Math.min(canvas.width, canvas.height);
            const out = document.createElement('canvas');
            out.width = 320;
            out.height = 320;
            const ctx = out.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, 320, 320);
            ctx.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, 320, 320);
            pendingAvatar = out.toDataURL('image/jpeg', 0.88);
            preview.innerHTML = profileAvatarInner(pendingAvatar, root.querySelector('#profileNickname').value);
            removeBtn.disabled = false;
            removeBtn.style.opacity = '';
          }).catch(function (err) {
            App.toast('头像处理失败：' + err.message, 'error');
          });
        });
        removeBtn.addEventListener('click', function () {
          if (removeBtn.disabled) return;
          pendingAvatar = '';
          preview.innerHTML = profileAvatarInner('', root.querySelector('#profileNickname').value);
          removeBtn.disabled = true;
          removeBtn.style.opacity = '0.35';
        });
        root.querySelector('#profileForm').addEventListener('submit', async function (event) {
          event.preventDefault();
          const nickname = String(root.querySelector('#profileNickname').value || '').trim().slice(0, 20);
          if (!nickname) {
            App.toast('昵称不能为空', 'error');
            return;
          }
          LR.db.state.profile.nickname = nickname;
          LR.db.state.profile.avatar = pendingAvatar || '';
          LR.db.state.profile.grade = String(root.querySelector('#profileGrade').value || '');
          await LR.db.save();
          pendingAvatar = null;
          App.closeModal();
          App.render();
          App.toast('个人资料已更新', 'success');
        });
      },
      onClose: function () { pendingAvatar = null; }
    });
  }
  actions['open-profile'] = openProfileModal;

  /* ------------------------------ AI setup ------------------------------- */

  function openAIConfigPrompt(message) {
    App.openBasicModal({
      title: '配置 AI 能力',
      eyebrow: 'AI / SETUP',
      center: true,
      body:
        '<div class="notice">' + icon('sparkle') + '<span>' + e(message || '此功能需要 AI。请先填写 API Key，软件无法完成的识图、解析和命题工作会交给 AI。') + '</span></div>' +
        '<div class="analysis-text mt-16">设置中支持任意 OpenAI 兼容接口。填写 <strong>API 地址、API Key 和主模型</strong> 后即可使用错题解析与组卷。拍照批改和识图解析还需要一个支持图片输入的「识图模型」。</div>' +
        '<div class="notice mt-16">' + icon('lock') + '<span>API Key 只保存在你的设备上，不会上传到 LRStudy 以外的服务。AI 请求会直接发送到你自己填写的接口。</span></div>',
      footer: '<button type="button" class="btn btn--ghost" data-action="close-modal">稍后</button>' +
        '<button type="button" class="btn btn--primary" id="goAISettings">去设置</button>',
      onMount: function (root) {
        root.querySelector('#goAISettings').addEventListener('click', function () {
          App.closeModal();
          App.ui.settingsOpenModule = 'ai';
          App.navigate('#/settings');
          setTimeout(function () {
            const target = document.getElementById('settingsModule-ai');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
        });
      }
    });
  }
  App.openAIConfigPrompt = openAIConfigPrompt;
  actions['open-ai-settings'] = function () {
    App.ui.settingsOpenModule = 'ai';
    App.navigate('#/settings');
    setTimeout(function () {
      const target = document.getElementById('settingsModule-ai');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  /* ------------------------------- page ---------------------------------- */

  function settingsModule(options) {
    const open = !!options.open;
    return '<section class="settings-module ' + (open ? 'is-open' : '') + '" id="settingsModule-' + options.id + '">' +
      '<button type="button" class="settings-module-head" data-settings-toggle="' + options.id + '" aria-expanded="' + open + '" aria-controls="settingsBody-' + options.id + '">' +
        '<span class="settings-module-icon">' + icon(options.icon) + '</span>' +
        '<span class="settings-module-copy">' +
          '<span class="settings-module-title">' + e(options.title) + '</span>' +
          '<span class="settings-module-sub">' + e(options.subtitle) + '</span>' +
        '</span>' +
        '<span class="settings-module-chevron">' + icon('chevronDown') + '</span>' +
      '</button>' +
      '<div class="settings-module-body" id="settingsBody-' + options.id + '"' + (open ? '' : ' hidden') + '>' + options.body + '</div>' +
    '</section>';
  }

  function renderSettingsPage() {
    const state = LR.db.state;
    const theme = state.settings.theme;
    const ai = state.settings.ai;
    const webdav = state.settings.webdav;
    const aiReady = LR.ai.isConfigured();
    const openModule = App.ui.settingsOpenModule || null;
    const pendingSyncInvite = LR.sync ? LR.sync.consumeInvite() : null;
    const onlineBase = (state.settings.online && state.settings.online.publicBaseUrl) || (LR.sync ? LR.sync.DEFAULT_PUBLIC_BASE : '');
    const themeLabels = { light: '亮色', dark: '暗色', system: '跟随系统' };
    const resolved = App.resolvedTheme(theme);
    const appearanceSubtitle = theme === 'system'
      ? '当前：跟随系统 · ' + (resolved === 'dark' ? '暗色' : '亮色')
      : '当前：' + (themeLabels[theme] || '跟随系统');
    const themeOptions = [
      { value: 'light', label: '亮色', sub: 'WHITE' },
      { value: 'dark', label: '暗色', sub: 'BLACK' },
      { value: 'system', label: '跟随系统', sub: 'AUTO' }
    ];
    setTimeout(bindSettingsPage, 0);
    setTimeout(refreshBackupStats, 30);
    setTimeout(refreshOcrModels, 40);

    const appearanceBody =
      '<p class="hint" style="margin-bottom:14px">亮色与暗色都只让界面保持黑白；上传的题目和答题照片仍保留原始颜色。选择「跟随系统」时，会随设备深浅色自动切换。</p>' +
      '<div class="theme-grid">' +
        themeOptions.map(function (option) {
          return '<button type="button" class="theme-option ' + (theme === option.value ? 'is-active' : '') + '" data-theme-choice="' + option.value + '" aria-pressed="' + (theme === option.value) + '">' +
            '<span class="theme-swatch theme-swatch--' + option.value + '"><span></span></span>' +
            '<span class="theme-label">' + option.label + '<span class="check">' + (theme === option.value ? '●' : '') + '</span></span>' +
            '<span class="section-note">' + option.sub + '</span>' +
          '</button>';
        }).join('') +
      '</div>';

    const presetOptions = '<option value="">选择模板（可选）</option>' + AI_PRESET_ORDER.map(function (key) {
      const preset = AI_PRESETS[key];
      return '<option value="' + key + '">' + e(preset.label) + '</option>';
    }).join('');
    const aiBody =
      '<form class="settings-form" id="aiSettingsForm">' +
        '<div class="field">' +
          '<label for="aiProviderPreset">服务商模板 <span class="field-label-note">可选</span></label>' +
          '<select class="select" id="aiProviderPreset">' + presetOptions + '</select>' +
          '<p class="hint">模板只会填入接口地址和模型名，仍需填写自己的 API Key；也可以完全手动填写。</p>' +
        '</div>' +
        '<div class="field">' +
          '<label for="aiBaseUrl">API 地址 <span class="field-label-note">Base URL</span></label>' +
          '<input class="input" id="aiBaseUrl" type="url" spellcheck="false" placeholder="https://api.example.com/v1" value="' + attr(ai.baseUrl || '') + '">' +
          '<p class="hint">填写兼容 OpenAI Chat Completions 的接口根地址，也可以填写以 <code>/chat/completions</code> 结尾的完整地址。</p>' +
        '</div>' +
        '<div class="field">' +
          '<label for="aiApiKey">API Key <span class="field-label-note">仅保存在本机</span></label>' +
          '<div class="input-with-action">' +
            '<input class="input" id="aiApiKey" type="password" spellcheck="false" autocomplete="new-password" placeholder="sk-…" value="' + attr(ai.apiKey || '') + '">' +
            '<button type="button" class="input-side-action" id="toggleApiKey">显示</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-grid form-grid--two">' +
          '<div class="field">' +
            '<label for="aiModel">主模型</label>' +
            '<input class="input" id="aiModel" spellcheck="false" placeholder="填写文本模型名称" value="' + attr(ai.model || '') + '">' +
            '<p class="hint">用于文字任务，如组卷。</p>' +
          '</div>' +
          '<div class="field">' +
            '<label for="aiVisionModel">识图模型 <span class="field-label-note">可选</span></label>' +
            '<input class="input" id="aiVisionModel" spellcheck="false" placeholder="填写支持图片的模型" value="' + attr(ai.visionModel || '') + '">' +
            '<p class="hint">用于错题解析和拍照批改；留空则使用主模型。</p>' +
          '</div>' +
        '</div>' +
        '<div class="switch-row">' +
          '<div class="switch-copy"><strong>上传后自动解析</strong><span>拍照上传后自动生成解析与知识点。</span></div>' +
          '<button type="button" class="switch" id="aiAutoAnalyze" role="switch" aria-checked="' + (ai.autoAnalyze ? 'true' : 'false') + '" aria-label="上传后自动解析"></button>' +
        '</div>' +
        '<div class="inline-actions mt-16">' +
          '<button type="submit" class="btn btn--primary" id="saveAIBtn">保存 AI 配置</button>' +
          '<button type="button" class="btn btn--ghost" id="testAIBtn">测试连接</button>' +
        '</div>' +
        '<p class="form-message hidden" id="aiFormMessage"></p>' +
        '<div class="settings-about-line"><span class="status-mark ' + (aiReady ? 'is-on' : '') + '" id="aiStatusMark">' + (aiReady ? 'AI READY' : 'NOT CONFIGURED') + '</span><span>OPENAI COMPATIBLE</span></div>' +
        '<p class="hint mt-12">' + icon('lock') + ' API Key 会随 ZIP 备份导出（可在备份设置中关闭）。题图会发送给你填写的 AI 服务。DeepSeek 等纯文本模型无法直接读图，请另填识图模型。</p>' +
      '</form>';

    const ocrState = state.settings.ocr.models || {};
    const ocrEnabledCount = OCR_MODELS.filter(function (m) { return ocrState[m.id] && ocrState[m.id].enabled; }).length;
    const ocrCards = OCR_MODELS.map(function (model) {
      const enabled = !!(ocrState[model.id] && ocrState[model.id].enabled);
      return '<div class="ocr-model-card" id="ocrCard-' + model.id + '" data-ocr-model="' + model.id + '">' +
        '<div class="ocr-model-head">' +
          '<div class="ocr-model-identity">' +
            '<span class="ocr-model-kicker">' + model.role + ' / ' + e(model.detail) + '</span>' +
            '<strong>' + e(model.name) + '</strong>' +
          '</div>' +
          '<button type="button" class="switch" id="ocrSwitch-' + model.id + '" role="switch" aria-checked="' + (enabled ? 'true' : 'false') + '" aria-label="启用 ' + e(model.name) + '" disabled></button>' +
        '</div>' +
        '<p class="ocr-model-desc">' + e(model.description) + '</p>' +
        '<div class="ocr-model-meta">' +
          '<span class="ocr-state" id="ocrState-' + model.id + '">未下载</span>' +
          '<span>' + LR.fileSize(model.bytes) + ' · v' + e(model.version) + '</span>' +
        '</div>' +
        '<div class="ocr-progress hidden" id="ocrProgressWrap-' + model.id + '">' +
          '<div class="ocr-progress-track"><span id="ocrProgress-' + model.id + '"></span></div>' +
          '<em id="ocrProgressText-' + model.id + '">0%</em>' +
        '</div>' +
        '<div class="ocr-model-actions">' +
          '<button type="button" class="btn btn--small btn--primary" id="ocrDownload-' + model.id + '">' + icon('download') + model.action + '</button>' +
          '<button type="button" class="btn btn--small btn--ghost hidden" id="ocrDelete-' + model.id + '">清除</button>' +
        '</div>' +
      '</div>';
    }).join('');
    const ocrBody =
      '<p class="hint" style="margin-bottom:12px">RapidOCR 是识别模型，ONNX Runtime 是运行它的引擎；下载后缓存在本机并真正用于拍照识别。建议在 Wi-Fi 下下载，两个组件合计约 ' + LR.fileSize(OCR_MODELS.reduce(function (sum, m) { return sum + m.bytes; }, 0)) + '。</p>' +
      '<div class="ocr-summary">' +
        '<div><span>本地 OCR 组件</span><strong id="ocrReadyCount">' + ocrEnabledCount + ' / 2 已启用</strong></div>' +
        '<div><span>缓存占用</span><strong id="ocrCacheSize">计算中…</strong></div>' +
      '</div>' +
      '<div class="ocr-model-list">' + ocrCards + '</div>' +
      '<div class="inline-actions mt-16">' +
        '<button type="button" class="btn btn--ghost btn--small" id="clearOcrCacheBtn">' + icon('trash') + '清除全部 OCR 缓存</button>' +
      '</div>' +
      '<p class="form-message hidden" id="ocrFormMessage"></p>' +
      '<p class="hint mt-12">' + icon('lock') + ' 模型缓存只保存在当前设备，不进入错题本 ZIP；在 HTML 与 APK 中均可清除。下载并启用后，拍照扫描会优先用 OCR 识别文字与题目边界；未就绪或识别失败时自动回退现有分割。</p>';

    const localBody =
      '<p class="hint">ZIP 备份包含错题本、图片、解析、复习记录、个人资料和设置，文件名为 <code>LRStudy.zip</code>。</p>' +
      '<div class="backup-summary">' +
        '<div class="backup-metric"><strong>' + state.notebooks.length + '</strong><span>个错题本</span></div>' +
        '<div class="backup-metric"><strong>' + state.questions.length + '</strong><span>道错题</span></div>' +
        '<div class="backup-metric"><strong id="backupImageCount">—</strong><span id="backupImageSize">图片</span></div>' +
      '</div>' +
      '<div class="switch-row">' +
        '<div class="switch-copy"><strong>包含密钥等敏感信息</strong><span>开启时，备份会包含 API Key 和 WebDAV 密码。文件请妥善保管。</span></div>' +
        '<button type="button" class="switch" id="backupSecrets" role="switch" aria-checked="' + (state.settings.backupIncludeSecrets ? 'true' : 'false') + '" aria-label="备份包含敏感信息"></button>' +
      '</div>' +
      '<div class="inline-actions mt-16 backup-actions">' +
        '<button type="button" class="btn btn--primary" id="exportZipBtn">' + icon('download') + '导出 ZIP</button>' +
        '<button type="button" class="btn btn--ghost" id="importZipBtn">' + icon('upload') + '导入 ZIP</button>' +
      '</div>' +
      '<div class="last-backup" id="lastBackupText">' + e(lastBackupText()) + '</div>';

    const webdavBody =
      '<p class="hint">上传文件名为 <code>LRStudy.zip</code>。应用会在填写的地址下自动使用 <code>LRStudy/</code> 子目录，覆盖云端同名文件；也会兼容旧版保存在根目录的备份。坚果云用户请使用应用密码，而不是登录密码。</p>' +
      '<div class="inline-actions mt-12">' +
        '<button type="button" class="btn btn--small btn--ghost" id="nutstorePreset">' + icon('cloud') + '填入坚果云地址</button>' +
      '</div>' +
      '<form id="webdavForm" class="mt-12">' +
        '<div class="field">' +
          '<label for="webdavUrl">WebDAV 地址</label>' +
          '<input class="input" id="webdavUrl" type="url" spellcheck="false" placeholder="https://dav.jianguoyun.com/dav/" value="' + attr(webdav.url || '') + '">' +
        '</div>' +
        '<div class="form-grid form-grid--two">' +
          '<div class="field">' +
            '<label for="webdavUsername">用户名 / 邮箱</label>' +
            '<input class="input" id="webdavUsername" autocomplete="username" spellcheck="false" value="' + attr(webdav.username || '') + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="webdavPassword">密码</label>' +
            '<div class="input-with-action">' +
              '<input class="input" id="webdavPassword" type="password" autocomplete="new-password" value="' + attr(webdav.password || '') + '">' +
              '<button type="button" class="input-side-action" id="toggleDavPassword">显示</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="inline-actions">' +
          '<button type="submit" class="btn btn--primary" id="saveWebdavBtn">保存配置</button>' +
          '<button type="button" class="btn btn--ghost" id="testWebdavBtn">测试连接</button>' +
        '</div>' +
        '<p class="form-message hidden" id="webdavFormMessage"></p>' +
      '</form>' +
      '<div class="inline-actions mt-12 backup-actions">' +
        '<button type="button" class="btn btn--primary" id="uploadWebdavBtn">' + icon('cloud') + '上传备份</button>' +
        '<button type="button" class="btn btn--ghost" id="restoreWebdavBtn">' + icon('downloadCloud') + '云端恢复</button>' +
      '</div>' +
      '<p class="hint mt-12">Android 安装包通过原生网络通道连接 WebDAV，不受浏览器 CORS 限制；网页版仍受服务器跨域策略限制，失败时可先导出本地 ZIP。</p>';

    const syncBody =
      '<div class="sync-section-title"><span>LOCAL NETWORK / 内网同步</span><span class="sync-pill">ANDROID 主机</span></div>' +
      '<p class="hint">主机开启后生成 5 分钟有效的内网地址和 6 位配对码。接收端在同一个 Wi-Fi 下接收，确认后会覆盖本机数据。</p>' +
      '<div class="sync-card" id="lanHostCard">' +
        '<div class="sync-card-head">' +
          '<div class="sync-card-copy"><strong>作为主机</strong><span id="lanHostState">未开启</span></div>' +
          '<button type="button" class="btn btn--small btn--primary" id="lanHostBtn">开启内网同步</button>' +
        '</div>' +
        '<div class="sync-live hidden" id="lanHostInfo">' +
          '<div class="field"><label for="lanHostUrl">内网地址</label><div class="value-row"><input class="copy-input" id="lanHostUrl" readonly><button type="button" class="copy-btn" data-copy-input="lanHostUrl">复制</button></div></div>' +
          '<div class="sync-code-line"><span>配对码</span><strong id="lanHostCode">------</strong><button type="button" class="copy-btn" data-copy-text="lanHostCode">复制</button></div>' +
          '<div class="sync-live-foot"><span class="sync-timer" id="lanHostTimer">—</span><button type="button" class="btn btn--small btn--ghost" id="lanHostStop">关闭</button></div>' +
        '</div>' +
      '</div>' +
      '<p class="form-message hidden" id="lanHostMessage"></p>' +
      '<form id="lanJoinForm" class="sync-join-card">' +
        '<div class="sync-join-title">接收内网同步</div>' +
        '<div class="form-grid form-grid--two">' +
          '<div class="field"><label for="lanJoinAddress">主机地址</label><input class="input" id="lanJoinAddress" spellcheck="false" placeholder="192.168.1.20:8765"></div>' +
          '<div class="field"><label for="lanJoinCode">6 位配对码</label><input class="input" id="lanJoinCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456"></div>' +
        '</div>' +
        '<button type="submit" class="btn btn--ghost btn--block">接收并覆盖本机数据</button>' +
        '<p class="form-message hidden" id="lanJoinMessage"></p>' +
      '</form>' +
      '<p class="hint">iOS PWA 通过 HTTPS 打开时，可能被混合内容策略拦住，无法访问 http 内网地址；iOS 请使用下面的公网同步。</p>' +
      '<div class="sync-section-title"><span>PUBLIC / 公网同步</span><span class="sync-pill">WebRTC · AES-GCM</span></div>' +
      '<p class="hint">一次性链接最长 5 分钟；数据在发送前用 AES-GCM 加密，密钥只放在链接的 # 片段里，不会发给 PeerJS 信令服务器。依赖公共 PeerJS 信令，网络不稳时可能连不上。</p>' +
      '<div class="field"><label for="publicBaseInput">公网同步入口（PWA 地址）</label><input class="input" id="publicBaseInput" spellcheck="false" value="' + attr(onlineBase) + '" placeholder="https://你的-pwa-地址/"><p class="hint">主机生成的公网链接会指向这个地址；需要先把 PWA 部署到 HTTPS。</p></div>' +
      '<div class="sync-card" id="publicHostCard">' +
        '<div class="sync-card-head">' +
          '<div class="sync-card-copy"><strong>作为公网主机</strong><span id="publicHostState">未开启 · 仅 Android APK 可发起</span></div>' +
          '<button type="button" class="btn btn--small btn--primary" id="publicHostBtn">生成公网链接</button>' +
        '</div>' +
        '<div class="sync-live hidden" id="publicHostInfo">' +
          '<div class="field"><label for="publicHostLink">一次性同步链接</label><div class="value-row"><input class="copy-input" id="publicHostLink" readonly><button type="button" class="copy-btn" data-copy-input="publicHostLink">复制</button></div></div>' +
          '<div class="sync-code-line"><span>配对码</span><strong id="publicHostCode">------</strong><button type="button" class="copy-btn" data-copy-text="publicHostCode">复制</button></div>' +
          '<div class="sync-live-foot"><span class="sync-timer" id="publicHostTimer">—</span><button type="button" class="btn btn--small btn--ghost" id="publicHostStop">关闭</button></div>' +
        '</div>' +
      '</div>' +
      '<p class="form-message hidden" id="publicHostMessage"></p>' +
      '<form id="publicJoinForm" class="sync-join-card">' +
        '<div class="sync-join-title">接收公网同步</div>' +
        (pendingSyncInvite ? '<div class="sync-incoming">检测到同步链接，确认后会覆盖本机数据。</div>' : '') +
        '<div class="field"><label for="publicJoinLink">同步链接</label><textarea class="textarea textarea--short" id="publicJoinLink" spellcheck="false" placeholder="粘贴主机发来的公网同步链接">' + (pendingSyncInvite ? e(pendingSyncInvite.link) : '') + '</textarea></div>' +
        '<button type="submit" class="btn btn--ghost btn--block">接收并覆盖本机数据</button>' +
        '<p class="form-message hidden" id="publicJoinMessage"></p>' +
      '</form>' +
      '<p class="hint">' + icon('lock') + ' 同步快照不包含 API Key 和 WebDAV 密码；公网链接本身带有解密密钥，请只发给接收方，接收完成后立即失效。</p>';

    const onlineBody =
      '<p class="hint">按需展开，不用的同步方式不会占用页面。</p>' +
      '<details class="sync-disclosure">' +
        '<summary><span><strong>WebDAV 云同步</strong><span class="sync-pill">CLOUD</span></span>' + icon('chevronDown') + '</summary>' +
        webdavBody +
      '</details>' +
      '<details class="sync-disclosure"' + (pendingSyncInvite ? ' open' : '') + '>' +
        '<summary><span><strong>设备间同步</strong><span class="sync-pill">内网 / 公网</span></span>' + icon('chevronDown') + '</summary>' +
        syncBody +
      '</details>';

    const dataBody =
      '<div class="setting-row">' +
        '<div class="setting-copy"><div class="setting-title">所有数据保存在当前设备</div><div class="setting-desc">LRStudy 不使用云端账户，请定期导出 ZIP 备份。</div></div>' +
        '<span class="status-mark is-on">LOCAL</span>' +
      '</div>' +
      '<div class="setting-row">' +
        '<div class="setting-copy"><div class="setting-title">清空全部数据</div><div class="setting-desc">删除所有错题本、图片、解析、练习记录和设置，无法恢复。</div></div>' +
        '<button type="button" class="btn btn--small btn--ghost" id="clearDataBtn">清空</button>' +
      '</div>' +
      '<div class="setting-row">' +
        '<div class="setting-copy"><div class="setting-title">作者主页</div><div class="setting-desc">GitHub · LightRainx</div></div>' +
        '<a class="btn btn--small btn--ghost" href="https://github.com/LightRainx" target="_blank" rel="noopener">' + icon('arrowUpRight') + '打开</a>' +
      '</div>' +
      '<div class="settings-about-line"><span>版本</span><strong>v1.7</strong></div>';

    const webdavReady = !!(webdav.url && webdav.username && webdav.password);
    const onlineOpen = openModule === 'webdav' || !!pendingSyncInvite;
    return '' +
      '<div class="profile-card" id="profileCard">' +
        '<button type="button" class="avatar avatar--button" data-action="open-profile" aria-label="编辑头像和昵称">' + profileAvatarInner(state.profile.avatar, state.profile.nickname) + '</button>' +
        '<div class="profile-copy">' +
          '<div class="profile-label">PROFILE / 个人资料' + (LR.gradeLabel(state.profile.grade) ? ' · ' + e(LR.gradeLabel(state.profile.grade)) : '') + '</div>' +
          '<h1 class="profile-name">' + e(state.profile.nickname) + '</h1>' +
          '<p class="profile-sub">' + (aiReady ? 'AI 已连接 · 解析与组卷可用' : '配置 API Key 后解锁 AI 解析') + '</p>' +
        '</div>' +
        '<button type="button" class="btn btn--small btn--ghost profile-edit" data-action="open-profile">编辑</button>' +
      '</div>' +
      '<div class="settings-intro-row">' +
        '<span class="settings-intro-title">设置</span>' +
        '<span class="section-note">点击展开</span>' +
      '</div>' +
      settingsModule({ id: 'appearance', icon: 'settings', title: '外观', subtitle: appearanceSubtitle, open: openModule === 'appearance', body: appearanceBody }) +
      settingsModule({ id: 'ai', icon: 'sparkle', title: 'AI 能力', subtitle: aiReady ? '已连接 · ' + (ai.model || '模型已配置') : '未配置 API Key', open: openModule === 'ai', body: aiBody }) +
      settingsModule({ id: 'ocr', icon: 'scan', title: 'OCR Models', subtitle: 'RapidOCR + ONNX · ' + ocrEnabledCount + '/2 已启用', open: openModule === 'ocr', body: ocrBody }) +
      settingsModule({ id: 'local', icon: 'download', title: '本地备份', subtitle: '导出或导入 LRStudy.zip', open: openModule === 'local', body: localBody }) +
      settingsModule({ id: 'webdav', icon: 'cloud', title: '在线同步', subtitle: 'WebDAV · 内网 · 公网', open: onlineOpen, body: onlineBody }) +
      settingsModule({ id: 'data', icon: 'info', title: '数据与关于', subtitle: '本地存储 · 版本 v1.7', open: openModule === 'data', body: dataBody }) +
      '<p class="settings-page-note">模块默认收起，点击标题展开 · 所有数据仅保存在本机</p>' +
      '<div class="settings-foot">' +
        '<span>LRStudy 智能错题整理工具<br>本地优先 · AI 可选 · 黑白界面</span>' +
        '<span class="version-stamp">v1.7</span>' +
      '</div>';
  }
  pages.settings = renderSettingsPage;

  /* ---------------------------- theme binding ---------------------------- */

  async function chooseTheme(theme) {
    if (!['light', 'dark', 'system'].includes(theme)) return;
    LR.db.state.settings.theme = theme;
    LR.db.save().catch(function () {});
    App.applyTheme();
    document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      const active = btn.getAttribute('data-theme-choice') === theme;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      const check = btn.querySelector('.check');
      if (check) check.textContent = active ? '●' : '';
    });
    const subtitle = document.querySelector('#settingsModule-appearance .settings-module-sub');
    if (subtitle) {
      if (theme === 'system') {
        subtitle.textContent = '当前：跟随系统 · ' + (App.resolvedTheme(theme) === 'dark' ? '暗色' : '亮色');
      } else {
        subtitle.textContent = '当前：' + (theme === 'dark' ? '暗色' : '亮色');
      }
    }
    App.toast(theme === 'light' ? '已切换到亮色模式' : theme === 'dark' ? '已切换到暗色模式' : '已跟随系统主题', 'success');
  }

  /* ------------------------------ OCR cache ------------------------------ */

  function ocrFormMessage(message, ok) {
    const el = document.getElementById('ocrFormMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'form-message ' + (message ? (ok ? 'form-message--ok' : 'form-message--err') : 'hidden');
  }

  function setOcrDownloadProgress(modelId, received, total, active) {
    const wrap = document.getElementById('ocrProgressWrap-' + modelId);
    const bar = document.getElementById('ocrProgress-' + modelId);
    const text = document.getElementById('ocrProgressText-' + modelId);
    if (!wrap || !bar || !text) return;
    if (!active) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    const percent = total > 0 ? Math.min(100, Math.round(received / total * 100)) : 0;
    bar.style.width = percent + '%';
    text.textContent = percent + '% · ' + LR.fileSize(received) + ' / ' + LR.fileSize(total);
  }

  async function refreshOcrModels() {
    const module = document.getElementById('settingsModule-ocr');
    if (!module) return;
    let packages = [];
    try { packages = await LR.db.getAllOcrPackages(); } catch (err) { console.warn(err); }
    const records = new Map();
    packages.forEach(function (item) {
      if (item && item.id && Array.isArray(item.files) && item.files.length) records.set(item.id, item);
    });
    let totalBytes = 0;
    let enabledCount = 0;
    let installedCount = 0;
    let needsSave = false;
    OCR_MODELS.forEach(function (model) {
      const record = records.get(model.id);
      const config = LR.db.state.settings.ocr.models[model.id];
      if (!record && config.enabled) {
        config.enabled = false;
        needsSave = true;
      }
      const enabled = !!(record && config.enabled);
      if (enabled) enabledCount++;
      if (record) {
        installedCount++;
        totalBytes += Number(record.size) || 0;
      }
      const card = document.getElementById('ocrCard-' + model.id);
      const switchEl = document.getElementById('ocrSwitch-' + model.id);
      const stateEl = document.getElementById('ocrState-' + model.id);
      const downloadBtn = document.getElementById('ocrDownload-' + model.id);
      const deleteBtn = document.getElementById('ocrDelete-' + model.id);
      if (!card || !switchEl || !stateEl || !downloadBtn || !deleteBtn) return;
      card.classList.toggle('is-installed', !!record);
      switchEl.disabled = !record;
      switchEl.setAttribute('aria-checked', enabled ? 'true' : 'false');
      if (stateEl) {
        stateEl.textContent = record
          ? (enabled ? '已缓存 · 已启用' : '已缓存 · 未启用')
          : '未下载';
        stateEl.classList.toggle('is-ready', !!record);
      }
      if (ocrDownloadInFlight === model.id) {
        stateEl.textContent = '下载中…';
        switchEl.disabled = true;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<span class="spinner"></span> 下载中';
      } else {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = icon('download') + (record ? '重新下载' : model.action);
      }
      deleteBtn.classList.toggle('hidden', !record);
    });
    const readyEl = document.getElementById('ocrReadyCount');
    if (readyEl) readyEl.textContent = installedCount + ' / 2 已缓存 · ' + enabledCount + ' 已启用';
    const cacheEl = document.getElementById('ocrCacheSize');
    if (cacheEl) cacheEl.textContent = totalBytes ? LR.fileSize(totalBytes) : '0 B';
    const subtitle = document.querySelector('#settingsModule-ocr .settings-module-sub');
    if (subtitle) subtitle.textContent = 'RapidOCR + ONNX · ' + enabledCount + '/2 已启用';
    if (needsSave) await LR.db.save().catch(function () {});
  }

  async function downloadOcrModel(modelId) {
    const model = OCR_MODELS.find(function (item) { return item.id === modelId; });
    if (!model) return;
    if (ocrDownloadInFlight) {
      App.toast('正在下载其他 OCR 组件，请稍候', 'info');
      return;
    }
    const downloadBtn = document.getElementById('ocrDownload-' + modelId);
    const deleteBtn = document.getElementById('ocrDelete-' + modelId);
    const switchEl = document.getElementById('ocrSwitch-' + modelId);
    if (!downloadBtn) return;
    ocrDownloadInFlight = modelId;
    ocrFormMessage('');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="spinner"></span> 下载中';
    if (deleteBtn) deleteBtn.classList.add('hidden');
    if (switchEl) switchEl.disabled = true;
    setOcrDownloadProgress(modelId, 0, model.bytes, true);
    try {
      const downloaded = [];
      let doneBytes = 0;
      for (let i = 0; i < model.files.length; i++) {
        const file = model.files[i];
        const response = await fetch(file.url, { cache: 'no-store' });
        if (!response.ok) throw new Error(file.name + ' HTTP ' + response.status);
        const fileTotal = Number(response.headers.get('content-length')) || file.bytes;
        let blob;
        if (response.body && typeof response.body.getReader === 'function') {
          const reader = response.body.getReader();
          const chunks = [];
          let received = 0;
          while (true) {
            const step = await reader.read();
            if (step.done) break;
            if (step.value && step.value.length) {
              chunks.push(step.value);
              received += step.value.length;
              setOcrDownloadProgress(modelId, doneBytes + received, model.bytes, true);
            }
          }
          blob = new Blob(chunks, { type: 'application/octet-stream' });
        } else {
          blob = await response.blob();
        }
        if (!blob.size) throw new Error(file.name + ' 下载内容为空');
        downloaded.push({ key: file.key, name: file.name, blob: blob });
        doneBytes += blob.size;
        setOcrDownloadProgress(modelId, doneBytes, model.bytes, true);
      }
      await LR.db.saveOcrBundle(model.id, downloaded, {
        name: model.name,
        version: model.version,
        source: 'unpkg'
      });
      if (LR.ocr && LR.ocr.reset) LR.ocr.reset();
      setOcrDownloadProgress(modelId, doneBytes, doneBytes, false);
      ocrDownloadInFlight = null;
      await refreshOcrModels();
      ocrFormMessage(model.name + ' 已缓存 ' + LR.fileSize(doneBytes) + '，请打开右侧开关启用。', true);
      App.toast(model.name + ' 下载完成', 'success');
    } catch (err) {
      console.error(err);
      setOcrDownloadProgress(modelId, 0, model.bytes, false);
      ocrDownloadInFlight = null;
      await refreshOcrModels();
      ocrFormMessage('下载失败：' + (err.message || '网络异常') + '。请检查网络后重试。', false);
      App.toast('OCR 组件下载失败', 'error');
    } finally {
      ocrDownloadInFlight = null;
      if (downloadBtn.isConnected) downloadBtn.disabled = false;
    }
  }

  async function toggleOcrModel(modelId, switchEl) {
    const record = await LR.db.getOcrPackage(modelId);
    if (!record || !Array.isArray(record.files) || !record.files.length) {
      App.toast('请先下载 OCR 组件', 'info');
      await refreshOcrModels();
      return;
    }
    const next = switchEl.getAttribute('aria-checked') !== 'true';
    LR.db.state.settings.ocr.models[modelId].enabled = next;
    switchEl.setAttribute('aria-checked', next ? 'true' : 'false');
    await LR.db.save();
    await refreshOcrModels();
    const model = OCR_MODELS.find(function (item) { return item.id === modelId; });
    ocrFormMessage((model ? model.name : 'OCR 组件') + (next ? ' 已启用' : ' 已关闭'), true);
  }

  async function deleteOcrModel(modelId) {
    if (ocrDownloadInFlight) {
      App.toast('请等下载完成后再清除', 'info');
      return;
    }
    const model = OCR_MODELS.find(function (item) { return item.id === modelId; });
    const ok = await App.confirm({
      title: '清除 ' + (model ? model.name : 'OCR') + ' 缓存？',
      message: '删除本机缓存的模型文件；如需再次使用需要重新下载。',
      confirmLabel: '清除缓存',
      danger: true
    });
    if (!ok) return;
    await LR.db.deleteOcrPackage(modelId);
    if (LR.ocr && LR.ocr.reset) LR.ocr.reset();
    LR.db.state.settings.ocr.models[modelId].enabled = false;
    await LR.db.save();
    await refreshOcrModels();
    ocrFormMessage((model ? model.name : 'OCR 组件') + ' 缓存已清除', true);
    App.toast('OCR 缓存已清除', 'success');
  }

  async function clearOcrCache() {
    if (ocrDownloadInFlight) {
      App.toast('请等下载完成后再清除', 'info');
      return;
    }
    const ok = await App.confirm({
      title: '清除全部 OCR 缓存？',
      message: '将删除 RapidOCR 模型与 ONNX 引擎的本机缓存，并关闭两个开关。如需再次使用需要重新下载。',
      confirmLabel: '全部清除',
      danger: true
    });
    if (!ok) return;
    await LR.db.clearOcrPackages();
    if (LR.ocr && LR.ocr.reset) LR.ocr.reset();
    OCR_MODELS.forEach(function (model) {
      LR.db.state.settings.ocr.models[model.id].enabled = false;
    });
    await LR.db.save();
    await refreshOcrModels();
    ocrFormMessage('OCR 模型缓存已全部清除', true);
    App.toast('OCR 缓存已全部清除', 'success');
  }

  /* ----------------------------- page bind ------------------------------- */

  /* ---------------------------- online sync ----------------------------- */

  let syncUiTicker = null;

  function syncMessage(id, message, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || '';
    el.className = 'form-message ' + (message ? (ok ? 'form-message--ok' : 'form-message--err') : 'hidden');
  }

  function remainingText(expiresAt) {
    const left = Math.max(0, Number(expiresAt) - Date.now());
    const sec = Math.ceil(left / 1000);
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }

  function refreshSyncUI() {
    if (!LR.sync || !document.getElementById('lanHostCard')) return;
    const native = LR.sync.isNativeHost();
    const lan = LR.sync.getLanState();
    const pub = LR.sync.getPublicState();
    const lanBtn = document.getElementById('lanHostBtn');
    const publicBtn = document.getElementById('publicHostBtn');
    if (lan && Date.now() >= lan.expiresAt) { LR.sync.stopLanHost(); }
    if (pub && Date.now() >= pub.expiresAt) { LR.sync.stopPublicHost(); }
    const currentLan = LR.sync.getLanState();
    const currentPub = LR.sync.getPublicState();
    if (lanBtn) {
      lanBtn.disabled = !native || !!currentLan;
      lanBtn.textContent = currentLan ? '内网同步已开启' : '开启内网同步';
    }
    if (publicBtn) {
      publicBtn.disabled = !native || !!currentPub;
      publicBtn.textContent = currentPub ? '公网同步已开启' : '生成公网链接';
    }
    const lanState = document.getElementById('lanHostState');
    if (lanState) {
      lanState.textContent = !native ? '仅 Android APK 可作为主机' : (currentLan ? '已开启 · 最多 5 分钟' : '未开启');
    }
    const publicState = document.getElementById('publicHostState');
    if (publicState) {
      publicState.textContent = !native ? '仅 Android APK 可作为主机' : (currentPub ? '已开启 · 最多 5 分钟' : '未开启 · 仅 Android APK 可发起');
    }
    const lanInfo = document.getElementById('lanHostInfo');
    if (lanInfo) {
      lanInfo.classList.toggle('hidden', !currentLan);
      if (currentLan) {
        const url = document.getElementById('lanHostUrl');
        const code = document.getElementById('lanHostCode');
        const timer = document.getElementById('lanHostTimer');
        if (url) url.value = currentLan.url || '';
        if (code) code.textContent = currentLan.code || '------';
        if (timer) timer.textContent = '剩余 ' + remainingText(currentLan.expiresAt);
      }
    }
    const publicInfo = document.getElementById('publicHostInfo');
    if (publicInfo) {
      publicInfo.classList.toggle('hidden', !currentPub);
      if (currentPub) {
        const link = document.getElementById('publicHostLink');
        const code = document.getElementById('publicHostCode');
        const timer = document.getElementById('publicHostTimer');
        if (link) link.value = currentPub.link || '';
        if (code) code.textContent = currentPub.code || '------';
        if (timer) timer.textContent = '剩余 ' + remainingText(currentPub.expiresAt);
      }
    }
    const lanMsg = document.getElementById('lanJoinMessage');
    if (lanMsg && lanMsg.classList.contains('hidden')) {
      const address = document.getElementById('lanJoinAddress');
      // no-op: keep form messages as user feedback only
    }
  }

  function startSyncTicker() {
    if (syncUiTicker) return;
    syncUiTicker = setInterval(refreshSyncUI, 1000);
  }

  async function handleLanHost() {
    if (!LR.sync || !LR.sync.isNativeHost()) {
      App.toast('内网同步主机仅支持 Android APK', 'error');
      return;
    }
    if (LR.sync.getLanState()) {
      LR.sync.stopLanHost();
      refreshSyncUI();
      App.toast('已关闭内网同步', 'success');
      return;
    }
    const hide = App.showBusy('正在准备内网同步', '打包数据并启动本机临时服务…');
    try {
      const session = await LR.sync.startLanHost();
      hide();
      refreshSyncUI();
      App.toast('内网同步已开启，5 分钟后自动关闭', 'success');
      syncMessage('lanHostMessage', '主机地址：' + session.url + ' · 配对码：' + session.code, true);
    } catch (err) {
      hide();
      syncMessage('lanHostMessage', err.message || '启动失败', false);
      App.toast('内网同步启动失败', 'error');
    }
  }

  async function handleLanJoin(event) {
    event.preventDefault();
    if (!LR.sync) return;
    const address = String(document.getElementById('lanJoinAddress').value || '').trim();
    const code = String(document.getElementById('lanJoinCode').value || '').trim();
    syncMessage('lanJoinMessage', '');
    const ok = await App.confirm({
      title: '接收内网同步？',
      message: '这会用主机数据覆盖本机全部错题、图片、解析、练习记录和设置。API Key 和 WebDAV 密码不会同步。',
      hint: '仅在同一个 Wi-Fi、主机已开启内网同步时使用。',
      confirmLabel: '接收并覆盖',
      danger: true
    });
    if (!ok) return;
    const hide = App.showBusy('正在接收内网同步', '连接主机 → 下载数据 → 覆盖本机…');
    try {
      const blob = await LR.sync.joinLan(address, code);
      await LR.backup.restoreBackup(blob);
      hide();
      App.applyTheme();
      App.ui.notebookFilter = 'all';
      App.render();
      App.toast('内网同步完成', 'success', 4200);
    } catch (err) {
      hide();
      syncMessage('lanJoinMessage', '接收失败：' + (err.message || '请检查地址和配对码'), false);
      App.toast('内网同步失败', 'error');
    }
  }

  async function handlePublicHost() {
    if (!LR.sync || !LR.sync.isNativeHost()) {
      App.toast('公网同步主机仅支持 Android APK', 'error');
      return;
    }
    if (LR.sync.getPublicState()) {
      LR.sync.stopPublicHost();
      refreshSyncUI();
      App.toast('已关闭公网同步', 'success');
      return;
    }
    const baseInput = document.getElementById('publicBaseInput');
    const base = baseInput ? String(baseInput.value || '').trim() : '';
    if (!base) {
      syncMessage('publicHostMessage', '请先填写已部署 v1.7 的公网同步入口地址，再生成链接。', false);
      if (baseInput) baseInput.focus();
      return;
    }
    LR.db.state.settings.online.publicBaseUrl = base;
    LR.db.save().catch(function () {});
    const hide = App.showBusy('正在生成公网同步链接', '打包数据 → AES-GCM 加密 → 连接 WebRTC 信令…');
    try {
      const session = await LR.sync.startPublicHost(base);
      hide();
      refreshSyncUI();
      syncMessage('publicHostMessage', '公网同步已开启，链接最长有效 5 分钟。', true);
      App.toast('公网同步已开启，5 分钟后自动关闭', 'success', 4200);
    } catch (err) {
      hide();
      syncMessage('publicHostMessage', '启动失败：' + (err.message || 'PeerJS 连接失败'), false);
      App.toast('公网同步启动失败', 'error');
    }
  }

  async function handlePublicJoin(event) {
    event.preventDefault();
    if (!LR.sync) return;
    const link = String(document.getElementById('publicJoinLink').value || '').trim();
    if (!link) {
      syncMessage('publicJoinMessage', '请粘贴公网同步链接', false);
      return;
    }
    const hide = App.showBusy('正在接收公网同步', '连接 WebRTC → 校验加密数据 → 覆盖本机…');
    try {
      const result = await LR.sync.joinPublic(link, function (progress) {
        if (progress && progress.phase === 'restoring') {
          App.toast('数据已下载，正在解密并写入本机…', 'info');
        }
      });
      hide();
      App.applyTheme();
      App.ui.notebookFilter = 'all';
      App.render();
      App.toast('公网同步完成', 'success', 4200);
    } catch (err) {
      hide();
      syncMessage('publicJoinMessage', '接收失败：' + (err.message || '链接无效或已过期'), false);
      App.toast('公网同步失败', 'error');
    }
  }

  function bindCopyButtons() {
    document.querySelectorAll('.sync-card [data-copy-input], .sync-card [data-copy-text]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async function () {
        let text = '';
        const inputId = btn.getAttribute('data-copy-input');
        const textId = btn.getAttribute('data-copy-text');
        if (inputId) {
          const input = document.getElementById(inputId);
          text = input ? input.value : '';
          if (input) { input.select(); try { document.execCommand('copy'); } catch (_) {} }
        } else if (textId) {
          const el = document.getElementById(textId);
          text = el ? el.textContent.trim() : '';
        }
        if (!text) return;
        try {
          if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
        } catch (_) {}
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = '复制'; }, 1200);
      });
    });
  }

  function bindOnlineSync() {
    const lanBtn = document.getElementById('lanHostBtn');
    const lanStop = document.getElementById('lanHostStop');
    const publicBtn = document.getElementById('publicHostBtn');
    const publicStop = document.getElementById('publicHostStop');
    const lanForm = document.getElementById('lanJoinForm');
    const publicForm = document.getElementById('publicJoinForm');
    const baseInput = document.getElementById('publicBaseInput');
    if (lanBtn && !lanBtn.dataset.bound) {
      lanBtn.dataset.bound = '1';
      lanBtn.addEventListener('click', handleLanHost);
    }
    if (lanStop && !lanStop.dataset.bound) {
      lanStop.dataset.bound = '1';
      lanStop.addEventListener('click', function () {
        LR.sync.stopLanHost();
        refreshSyncUI();
        App.toast('已关闭内网同步', 'success');
      });
    }
    if (publicBtn && !publicBtn.dataset.bound) {
      publicBtn.dataset.bound = '1';
      publicBtn.addEventListener('click', handlePublicHost);
    }
    if (publicStop && !publicStop.dataset.bound) {
      publicStop.dataset.bound = '1';
      publicStop.addEventListener('click', function () {
        LR.sync.stopPublicHost();
        refreshSyncUI();
        App.toast('已关闭公网同步', 'success');
      });
    }
    if (lanForm && !lanForm.dataset.bound) {
      lanForm.dataset.bound = '1';
      lanForm.addEventListener('submit', handleLanJoin);
    }
    if (publicForm && !publicForm.dataset.bound) {
      publicForm.dataset.bound = '1';
      publicForm.addEventListener('submit', handlePublicJoin);
    }
    if (baseInput && !baseInput.dataset.bound) {
      baseInput.dataset.bound = '1';
      baseInput.addEventListener('change', function () {
        LR.db.state.settings.online.publicBaseUrl = String(baseInput.value || '').trim();
        LR.db.save().catch(function () {});
      });
    }
    bindCopyButtons();
    refreshSyncUI();
    startSyncTicker();
  }

  function bindSettingsPage() {
    bindOnlineSync();
    document.querySelectorAll('[data-settings-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const moduleId = btn.getAttribute('data-settings-toggle');
        const next = App.ui.settingsOpenModule === moduleId ? null : moduleId;
        App.ui.settingsOpenModule = next;
        document.querySelectorAll('.settings-module').forEach(function (section) {
          const head = section.querySelector('[data-settings-toggle]');
          if (!head) return;
          const key = head.getAttribute('data-settings-toggle');
          const open = key === next;
          section.classList.toggle('is-open', open);
          head.setAttribute('aria-expanded', open ? 'true' : 'false');
          const body = section.querySelector('.settings-module-body');
          if (body) {
            if (open) body.removeAttribute('hidden');
            else body.setAttribute('hidden', '');
          }
        });
      });
    });

    document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () { chooseTheme(btn.getAttribute('data-theme-choice')); });
    });

    /* OCR models */
    OCR_MODELS.forEach(function (model) {
      const downloadBtn = document.getElementById('ocrDownload-' + model.id);
      const switchEl = document.getElementById('ocrSwitch-' + model.id);
      const deleteBtn = document.getElementById('ocrDelete-' + model.id);
      if (downloadBtn) downloadBtn.addEventListener('click', function () { downloadOcrModel(model.id); });
      if (switchEl) switchEl.addEventListener('click', function () { toggleOcrModel(model.id, switchEl); });
      if (deleteBtn) deleteBtn.addEventListener('click', function () { deleteOcrModel(model.id); });
    });
    const clearOcrBtn = document.getElementById('clearOcrCacheBtn');
    if (clearOcrBtn) clearOcrBtn.addEventListener('click', clearOcrCache);

    /* AI form */
    const aiForm = document.getElementById('aiSettingsForm');
    const aiAuto = document.getElementById('aiAutoAnalyze');
    if (aiAuto) {
      aiAuto.addEventListener('click', function () {
        const next = aiAuto.getAttribute('aria-checked') !== 'true';
        aiAuto.setAttribute('aria-checked', next ? 'true' : 'false');
      });
    }
    const toggleKey = document.getElementById('toggleApiKey');
    if (toggleKey) {
      toggleKey.addEventListener('click', function () {
        const input = document.getElementById('aiApiKey');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggleKey.textContent = show ? '隐藏' : '显示';
      });
    }
    const presetSelect = document.getElementById('aiProviderPreset');
    if (presetSelect) {
      presetSelect.addEventListener('change', function () {
        const preset = AI_PRESETS[presetSelect.value];
        if (!preset) return;
        const base = document.getElementById('aiBaseUrl');
        const model = document.getElementById('aiModel');
        const vision = document.getElementById('aiVisionModel');
        if (base) base.value = preset.baseUrl;
        if (model) model.value = preset.model;
        if (vision) vision.value = preset.visionModel;
        setFormMessage('aiFormMessage', preset.note || ('已填入 ' + preset.label + ' 模板，请填写 API Key。'), true);
      });
    }
    if (aiForm) {
      aiForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearFormMessage('aiFormMessage');
        const saveBtn = document.getElementById('saveAIBtn');
        setButtonLoading(saveBtn, true, '保存中');
        try {
          await saveAISettings({ silent: true });
          setFormMessage('aiFormMessage', 'AI 配置已保存到本机', true);
        } catch (err) {
          setFormMessage('aiFormMessage', err.message, false);
        } finally {
          setButtonLoading(saveBtn, false);
        }
      });
    }
    const testBtn = document.getElementById('testAIBtn');
    if (testBtn) {
      testBtn.addEventListener('click', async function () {
        clearFormMessage('aiFormMessage');
        setButtonLoading(testBtn, true, '连接中');
        try {
          await saveAISettings({ silent: true });
          const result = await LR.ai.testConnection();
          setFormMessage('aiFormMessage', '连接成功 · ' + result.latency + ' ms · ' + (result.model || '模型已响应'), true);
        } catch (err) {
          setFormMessage('aiFormMessage', '连接失败：' + (err.message || '请检查配置'), false);
        } finally {
          setButtonLoading(testBtn, false);
        }
      });
    }

    /* Backup options */
    const backupSecrets = document.getElementById('backupSecrets');
    if (backupSecrets) {
      backupSecrets.addEventListener('click', function () {
        const next = backupSecrets.getAttribute('aria-checked') !== 'true';
        backupSecrets.setAttribute('aria-checked', next ? 'true' : 'false');
        LR.db.state.settings.backupIncludeSecrets = next;
        LR.db.save().catch(function () {});
        App.toast(next ? '备份将包含敏感设置' : '备份将排除 API Key 与 WebDAV 密码', 'info');
      });
    }
    const exportZipBtn = document.getElementById('exportZipBtn');
    if (exportZipBtn) {
      exportZipBtn.addEventListener('click', async function () {
        if (exportZipBtn.disabled) return;
        setButtonLoading(exportZipBtn, true, '打包中');
        const hide = App.showBusy('正在导出 ZIP', '收集错题、图片、解析和练习记录…');
        try {
          await LR.db.flush();
          const result = await LR.backup.buildBackup({ includeSecrets: LR.db.state.settings.backupIncludeSecrets });
          await LR.downloadBlob(result.blob, result.filename);
          const now = new Date().toISOString();
          LR.db.state.settings.lastLocalBackupAt = now;
          await LR.db.save();
          hide();
          setButtonLoading(exportZipBtn, false);
          refreshLastBackupText();
          App.toast('已生成 ' + result.filename + '（' + LR.fileSize(result.blob.size) + '）', 'success', 4200);
        } catch (err) {
          hide();
          setButtonLoading(exportZipBtn, false);
          App.toast('导出失败：' + (err.message || '请重试'), 'error');
        }
      });
    }
    const importZipBtn = document.getElementById('importZipBtn');
    if (importZipBtn) {
      importZipBtn.addEventListener('click', async function () {
        const files = await App.pickFiles({ accept: '.zip,application/zip' });
        if (!files.length) return;
        const file = files[0];
        const ok = await App.confirm({
          title: '导入备份并覆盖？',
          message: '即将用「' + file.name + '」覆盖当前设备上的全部 LRStudy 数据。当前数据不会自动保留。',
          hint: '建议先导出当前数据作为备份。',
          confirmLabel: '覆盖并导入',
          danger: true
        });
        if (!ok) return;
        const hide = App.showBusy('正在恢复备份', '写入错题本、图片与练习记录…');
        try {
          const result = await LR.backup.restoreBackup(file);
          hide();
          App.applyTheme();
          App.toast('恢复完成：' + result.notebooks + ' 个错题本，' + result.questions + ' 道错题', 'success', 4200);
          App.ui.notebookFilter = 'all';
          App.render();
        } catch (err) {
          hide();
          App.toast('恢复失败：' + (err.message || '备份文件无效'), 'error', 6000);
        }
      });
    }

    /* WebDAV */
    const toggleDav = document.getElementById('toggleDavPassword');
    if (toggleDav) {
      toggleDav.addEventListener('click', function () {
        const input = document.getElementById('webdavPassword');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggleDav.textContent = show ? '隐藏' : '显示';
      });
    }
    const nutstore = document.getElementById('nutstorePreset');
    if (nutstore) {
      nutstore.addEventListener('click', function () {
        const url = document.getElementById('webdavUrl');
        url.value = 'https://dav.jianguoyun.com/dav/';
        url.focus();
        setFormMessage('webdavFormMessage', '已填入坚果云地址。用户名填坚果云账号，密码填在坚果云「安全选项」中生成的应用密码。', true);
      });
    }
    function webdavFromForm() {
      return {
        url: String(document.getElementById('webdavUrl').value || '').trim(),
        username: String(document.getElementById('webdavUsername').value || '').trim(),
        password: String(document.getElementById('webdavPassword').value || '')
      };
    }
    async function saveWebDAV(options) {
      const opts = options || {};
      const values = webdavFromForm();
      if (!values.url) throw new Error('请填写 WebDAV 地址');
      if (!/^https?:\/\//i.test(values.url)) throw new Error('WebDAV 地址需要以 http:// 或 https:// 开头');
      LR.db.state.settings.webdav = Object.assign({}, LR.db.state.settings.webdav, values);
      await LR.db.save();
      if (!opts.silent) {
        setFormMessage('webdavFormMessage', 'WebDAV 配置已保存', true);
        App.toast('WebDAV 配置已保存', 'success');
      }
      return values;
    }
    const webdavForm = document.getElementById('webdavForm');
    if (webdavForm) {
      webdavForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearFormMessage('webdavFormMessage');
        const btn = document.getElementById('saveWebdavBtn');
        setButtonLoading(btn, true, '保存中');
        try { await saveWebDAV({ silent: true }); setFormMessage('webdavFormMessage', 'WebDAV 配置已保存', true); }
        catch (err) { setFormMessage('webdavFormMessage', err.message, false); }
        finally { setButtonLoading(btn, false); }
      });
    }
    const testDav = document.getElementById('testWebdavBtn');
    if (testDav) {
      testDav.addEventListener('click', async function () {
        clearFormMessage('webdavFormMessage');
        setButtonLoading(testDav, true, '连接中');
        try {
          await saveWebDAV({ silent: true });
          const result = await LR.backup.testWebDAV();
          setFormMessage('webdavFormMessage', 'WebDAV 连接成功（HTTP ' + result.status + '）· 云端目录已准备', true);
        } catch (err) {
          setFormMessage('webdavFormMessage', err.message, false);
        } finally {
          setButtonLoading(testDav, false);
        }
      });
    }
    const uploadDav = document.getElementById('uploadWebdavBtn');
    if (uploadDav) {
      uploadDav.addEventListener('click', async function () {
        if (uploadDav.disabled) return;
        clearFormMessage('webdavFormMessage');
        setButtonLoading(uploadDav, true, '上传中');
        const hide = App.showBusy('正在上传到 WebDAV', '生成 LRStudy.zip → 上传到云端…');
        try {
          await saveWebDAV({ silent: true });
          await LR.db.flush();
          const result = await LR.backup.buildBackup({ includeSecrets: LR.db.state.settings.backupIncludeSecrets });
          const upload = await LR.backup.uploadToWebDAV(result.blob);
          const now = new Date().toISOString();
          LR.db.state.settings.webdav.lastBackupAt = now;
          LR.db.state.settings.webdav.lastBackupTarget = upload.url;
          await LR.db.save();
          hide();
          setButtonLoading(uploadDav, false);
          setFormMessage('webdavFormMessage', '已上传 LRStudy.zip（' + LR.fileSize(result.blob.size) + '）到 WebDAV 的 LRStudy/ 目录', true);
          refreshLastBackupText();
          App.toast('WebDAV 备份完成', 'success');
        } catch (err) {
          hide();
          setButtonLoading(uploadDav, false);
          setFormMessage('webdavFormMessage', '上传失败：' + (err.message || '请检查配置与网络'), false);
        }
      });
    }
    const restoreDav = document.getElementById('restoreWebdavBtn');
    if (restoreDav) {
      restoreDav.addEventListener('click', async function () {
        clearFormMessage('webdavFormMessage');
        try { await saveWebDAV({ silent: true }); } catch (err) {
          setFormMessage('webdavFormMessage', err.message, false);
          return;
        }
        const ok = await App.confirm({
          title: '从 WebDAV 恢复？',
          message: '这会下载云端 LRStudy.zip 并覆盖当前设备上的全部数据。当前数据不会自动保留。',
          hint: '建议先导出本地备份。',
          confirmLabel: '下载并覆盖',
          danger: true
        });
        if (!ok) return;
        const hide = App.showBusy('正在从 WebDAV 恢复', '下载 LRStudy.zip 并写入本地…');
        try {
          const blob = await LR.backup.downloadFromWebDAV();
          const result = await LR.backup.restoreBackup(blob);
          hide();
          App.applyTheme();
          App.toast('恢复完成：' + result.questions + ' 道错题，' + result.images + ' 张图片', 'success', 4200);
          App.ui.notebookFilter = 'all';
          App.render();
        } catch (err) {
          hide();
          setFormMessage('webdavFormMessage', '恢复失败：' + (err.message || '无法读取云端备份'), false);
        }
      });
    }

    /* clear all data */
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async function () {
        const ok = await App.confirm({
          title: '清空全部数据？',
          message: '所有错题本、错题图片、AI 解析、练习记录、个人资料与设置都会被删除，且无法恢复。',
          hint: '如果还需要这些内容，请先到上方导出 ZIP 备份。',
          confirmLabel: '永久清空',
          danger: true
        });
        if (!ok) return;
        const hide = App.showBusy('正在清空数据', '');
        try {
          await LR.db.clearAllData();
          hide();
          App.ui.settingsOpenModule = null;
          App.applyTheme();
          App.toast('所有数据已清空', 'success');
          App.navigate('#/notebooks');
        } catch (err) {
          hide();
          App.toast('清空失败：' + (err.message || '请重试'), 'error');
        }
      });
    }
  }

  function refreshLastBackupText() {
    const el = document.getElementById('lastBackupText');
    if (el) el.textContent = lastBackupText();
  }

  async function refreshBackupStats() {
    const countEl = document.getElementById('backupImageCount');
    const sizeEl = document.getElementById('backupImageSize');
    if (!countEl) return;
    try {
      const records = await LR.db.getAllImages();
      const totalBytes = records.reduce(function (sum, rec) { return sum + (rec.size || (rec.blob ? rec.blob.size : 0)); }, 0);
      countEl.textContent = String(records.length);
      if (sizeEl) sizeEl.textContent = '图片 · ' + LR.fileSize(totalBytes);
    } catch (_) {
      countEl.textContent = '—';
    }
  }

  void refreshLastBackupText;
})();
