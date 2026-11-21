/* LRStudy v1.7 — local IndexedDB store */
(function () {
  'use strict';

  const LR = window.LR;
  const DB_NAME = 'LRStudyDB';
  const DB_VERSION = 2;

  const DEFAULT_STATE = {
    schemaVersion: 2,
    appVersion: 'v1.7',
    profile: {
      nickname: '学习者',
      avatar: '',
      grade: ''
    },
    settings: {
      theme: 'system',
      ai: {
        baseUrl: '',
        apiKey: '',
        model: '',
        visionModel: '',
        autoAnalyze: false
      },
      webdav: {
        url: 'https://dav.jianguoyun.com/dav/',
        username: '',
        password: '',
        lastBackupAt: null,
        lastBackupTarget: ''
      },
      review: {
        lastNotebookId: null,
        count: 5
      },
      backupIncludeSecrets: true,
      ocr: {
        models: {
          rapidocr: { enabled: false },
          onnx: { enabled: false }
        }
      },
      online: {
        publicBaseUrl: ''
      }
    },
    notebooks: [],
    questions: [],
    sessions: []
  };

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return extra === undefined ? base : extra;
    if (!base || typeof base !== 'object' || Array.isArray(base)) return LR.clone(extra);
    const out = LR.clone(base);
    Object.keys(extra).forEach(function (key) {
      if (extra[key] && typeof extra[key] === 'object' && !Array.isArray(extra[key])) {
        out[key] = deepMerge(out[key] || {}, extra[key]);
      } else if (extra[key] !== undefined) {
        out[key] = extra[key];
      }
    });
    return out;
  }

  function normalizeState(raw) {
    const sourceVersion = Number(raw && raw.schemaVersion) || 1;
    const state = deepMerge(LR.clone(DEFAULT_STATE), raw && typeof raw === 'object' ? raw : {});
    state.appVersion = 'v1.7';
    state.schemaVersion = 2;
    if (!state.profile || typeof state.profile !== 'object') state.profile = { nickname: '学习者', avatar: '', grade: '' };
    state.profile.nickname = String(state.profile.nickname || '学习者').slice(0, 24) || '学习者';
    state.profile.avatar = typeof state.profile.avatar === 'string' ? state.profile.avatar : '';
    const validGrades = LR.GRADE_LEVELS.map(function (g) { return g.value; });
    state.profile.grade = validGrades.includes(state.profile.grade) ? state.profile.grade : '';
    if (!['light', 'dark', 'system'].includes(state.settings.theme)) state.settings.theme = 'system';
    // v1.1 shipped with DeepSeek fields pre-filled. v1.7 starts empty so the
    // first-run UI does not imply a provider. Only migrate the untouched old
    // defaults; user-entered APIs and keys are preserved.
    if (sourceVersion < 2) {
      const ai = state.settings.ai || {};
      const noKey = !String(ai.apiKey || '').trim();
      const oldDeepSeek = String(ai.baseUrl || '').replace(/\/+$/, '') === 'https://api.deepseek.com/v1'
        && String(ai.model || '') === 'deepseek-chat'
        && !String(ai.visionModel || '').trim();
      if (noKey && oldDeepSeek) {
        ai.baseUrl = '';
        ai.model = '';
        ai.visionModel = '';
      }
      state.settings.ai = ai;
    }
    if (!Array.isArray(state.notebooks)) state.notebooks = [];
    if (!Array.isArray(state.questions)) state.questions = [];
    if (!Array.isArray(state.sessions)) state.sessions = [];
    state.notebooks = state.notebooks.filter(function (n) { return n && n.id && n.name; }).map(function (n) {
      return {
        id: String(n.id),
        name: String(n.name).slice(0, 40),
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt || n.createdAt || new Date().toISOString()
      };
    });
    const notebookIds = new Set(state.notebooks.map(function (n) { return n.id; }));
    state.questions = state.questions.filter(function (q) {
      return q && q.id && q.notebookId && notebookIds.has(String(q.notebookId));
    }).map(function (q) {
      const question = LR.clone(q);
      question.id = String(question.id);
      question.notebookId = String(question.notebookId);
      question.wrongCount = Number(question.wrongCount) || 1;
      question.reviewCount = Number(question.reviewCount) || 0;
      question.mastered = !!question.mastered;
      question.createdAt = question.createdAt || new Date().toISOString();
      question.updatedAt = question.updatedAt || question.createdAt;
      if (question.analysis) {
        if (!Array.isArray(question.analysis.knowledgePoints)) question.analysis.knowledgePoints = [];
        question.analysis.knowledgePoints = question.analysis.knowledgePoints
          .map(function (k) { return String(k || '').trim(); })
          .filter(Boolean);
      }
      return question;
    });
    state.sessions = state.sessions.filter(function (s) { return s && s.id; }).map(function (s) {
      const session = LR.clone(s);
      if (!Array.isArray(session.questions)) session.questions = [];
      if (!Array.isArray(session.answerImageIds)) session.answerImageIds = [];
      if (!Array.isArray(session.addedQuestionIds)) session.addedQuestionIds = [];
      if (!Array.isArray(session.answers)) session.answers = [];
      session.answers = session.answers.map(function (answer) { return String(answer == null ? '' : answer); });
      return session;
    });
    const review = state.settings.review || {};
    state.settings.review = {
      count: LR.clamp(Number(review.count) || 5, 1, 100),
      lastNotebookId: review.lastNotebookId || null
    };
    state.settings.backupIncludeSecrets = state.settings.backupIncludeSecrets !== false;
    if (!state.settings.online || typeof state.settings.online !== 'object') state.settings.online = {};
    let onlineBase = String(state.settings.online.publicBaseUrl || '').trim();
    // The old default repository was removed by the user; do not keep a dead URL.
    if (onlineBase.replace(/\/+$/, '') === 'https://lightrainx.github.io/LRS99') onlineBase = '';
    state.settings.online.publicBaseUrl = onlineBase;
    if (!state.settings.ocr || typeof state.settings.ocr !== 'object') state.settings.ocr = { models: {} };
    if (!state.settings.ocr.models || typeof state.settings.ocr.models !== 'object') state.settings.ocr.models = {};
    ['rapidocr', 'onnx'].forEach(function (id) {
      state.settings.ocr.models[id] = Object.assign(
        { enabled: false },
        state.settings.ocr.models[id] && typeof state.settings.ocr.models[id] === 'object'
          ? state.settings.ocr.models[id] : {}
      );
      state.settings.ocr.models[id].enabled = !!state.settings.ocr.models[id].enabled;
    });
    return state;
  }

  let dbPromise = null;
  let state = null;
  let writeChain = Promise.resolve();
  let lastSaveError = null;
  const urlCache = new Map();

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (err) { reject(err); return; }
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('ocrModels')) {
          db.createObjectStore('ocrModels', { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('本地数据库打开失败')); };
      req.onblocked = function () { reject(new Error('数据库被其他标签页占用，请关闭其他 LRStudy 页面后重试')); };
    });
    return dbPromise;
  }

  function withStore(storeName, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;
        try { result = fn(store); }
        catch (err) { reject(err); return; }
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error || new Error('本地数据操作失败')); };
        tx.onabort = function () { reject(tx.error || new Error('本地数据操作已取消')); };
      });
    });
  }

  function requestResult(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  async function loadState() {
    const record = await withStore('meta', 'readonly', function (store) {
      return requestResult(store.get('app-state'));
    });
    if (record && record.value) return normalizeState(record.value);
    return normalizeState(null);
  }

  function queueWrite() {
    const snapshot = LR.clone(state);
    writeChain = writeChain.catch(function () {}).then(function () {
      return withStore('meta', 'readwrite', function (store) {
        return store.put({ key: 'app-state', value: snapshot, updatedAt: new Date().toISOString() });
      });
    }).catch(function (err) {
      lastSaveError = err;
      console.error('LRStudy 保存失败', err);
      throw err;
    });
    return writeChain;
  }

  const api = {
    DEFAULT_STATE: DEFAULT_STATE,

    async init() {
      state = await loadState();
      // Ask the browser to keep our data around when storage is under pressure.
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (_) {}
      if (!(await withStore('meta', 'readonly', function (store) { return requestResult(store.get('app-state')); }))) {
        await queueWrite();
      }
      return state;
    },

    get state() { return state; },
    get lastSaveError() { return lastSaveError; },

    save() { return queueWrite(); },
    async flush() { await writeChain.catch(function () {}); return true; },

    replaceState(next) {
      state = normalizeState(next);
      return queueWrite();
    },

    reset() {
      state = normalizeState(null);
      return api.clearAllData();
    },

    /* ------------------------- notebooks ------------------------- */
    createNotebook(name) {
      const clean = String(name || '').trim().slice(0, 40);
      if (!clean) throw new Error('请输入错题本名称');
      if (state.notebooks.some(function (n) { return n.name === clean; })) {
        throw new Error('已经有同名错题本了');
      }
      const notebook = {
        id: LR.uid('nb'),
        name: clean,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.notebooks.unshift(notebook);
      api.save().catch(function () {});
      return notebook;
    },

    updateNotebook(id, patch) {
      const notebook = state.notebooks.find(function (n) { return n.id === id; });
      if (!notebook) throw new Error('错题本不存在');
      if (patch.name != null) {
        const clean = String(patch.name).trim().slice(0, 40);
        if (!clean) throw new Error('名称不能为空');
        if (state.notebooks.some(function (n) { return n.id !== id && n.name === clean; })) {
          throw new Error('已经有同名错题本了');
        }
        notebook.name = clean;
      }
      notebook.updatedAt = new Date().toISOString();
      api.save().catch(function () {});
      return notebook;
    },

    async deleteNotebook(id) {
      const questions = state.questions.filter(function (q) { return q.notebookId === id; });
      const sessions = state.sessions.filter(function (s) { return s.notebookId === id; });
      const imageIds = new Set();
      questions.forEach(function (q) { if (q.imageId) imageIds.add(q.imageId); });
      sessions.forEach(function (s) {
        (s.answerImageIds || []).forEach(function (imgId) { imageIds.add(imgId); });
      });
      state.notebooks = state.notebooks.filter(function (n) { return n.id !== id; });
      state.questions = state.questions.filter(function (q) { return q.notebookId !== id; });
      state.sessions = state.sessions.filter(function (s) { return s.notebookId !== id; });
      if (state.settings.review.lastNotebookId === id) state.settings.review.lastNotebookId = null;
      await api.save();
      await Promise.all(Array.from(imageIds).map(function (imgId) { return api.deleteImage(imgId); }));
    },

    notebook(id) { return state.notebooks.find(function (n) { return n.id === id; }) || null; },
    questionsOf(notebookId) {
      return state.questions.filter(function (q) { return q.notebookId === notebookId; });
    },
    question(id) { return state.questions.find(function (q) { return q.id === id; }) || null; },

    async addQuestion(notebookId, data) {
      const notebook = api.notebook(notebookId);
      if (!notebook) throw new Error('错题本不存在');
      const now = new Date().toISOString();
      const question = Object.assign({
        id: LR.uid('q'),
        notebookId: notebookId,
        createdAt: now,
        updatedAt: now,
        imageId: null,
        imageWidth: 0,
        imageHeight: 0,
        title: '',
        contentText: '',
        answerText: '',
        note: '',
        tags: [],
        wrongCount: 1,
        reviewCount: 0,
        mastered: false,
        analysis: null,
        source: 'photo',
        sessionId: null
      }, data || {});
      state.questions.push(question);
      notebook.updatedAt = now;
      await api.save();
      return question;
    },

    async updateQuestion(id, patch, opts) {
      const question = api.question(id);
      if (!question) throw new Error('错题不存在');
      Object.assign(question, patch || {});
      question.updatedAt = new Date().toISOString();
      const notebook = api.notebook(question.notebookId);
      if (notebook) notebook.updatedAt = question.updatedAt;
      await api.save();
      if (opts && opts.silent) return question;
      return question;
    },

    async deleteQuestion(id) {
      const question = api.question(id);
      if (!question) return;
      state.questions = state.questions.filter(function (q) { return q.id !== id; });
      const stillUsed = state.questions.some(function (q) { return q.imageId && q.imageId === question.imageId; });
      await api.save();
      if (question.imageId && !stillUsed) await api.deleteImage(question.imageId);
    },

    notebookStats(notebookId) {
      const questions = api.questionsOf(notebookId);
      const kp = new Map();
      questions.forEach(function (q) {
        const analysisPoints = (q.analysis && Array.isArray(q.analysis.knowledgePoints)) ? q.analysis.knowledgePoints : [];
        const points = analysisPoints.length ? analysisPoints : (q.tags || []);
        points.forEach(function (point) {
          const key = String(point || '').trim();
          if (!key) return;
          const current = kp.get(key) || { name: key, count: 0, unmastered: 0 };
          current.count += 1;
          if (!q.mastered) current.unmastered += 1;
          kp.set(key, current);
        });
      });
      return {
        total: questions.length,
        unmastered: questions.filter(function (q) { return !q.mastered; }).length,
        mastered: questions.filter(function (q) { return q.mastered; }).length,
        knowledge: Array.from(kp.values()).sort(function (a, b) {
          return (b.unmastered - a.unmastered) || (b.count - a.count);
        })
      };
    },

    /* --------------------------- sessions ------------------------- */
    async addSession(session) {
      const now = new Date().toISOString();
      const item = Object.assign({
        id: LR.uid('paper'),
        createdAt: now,
        title: '复习练习',
        questions: [],
        grading: null,
        answers: [],
        answerMode: '',
        answerImageIds: [],
        addedQuestionIds: []
      }, session || {});
      state.sessions.unshift(item);
      await api.save();
      return item;
    },
    session(id) { return state.sessions.find(function (s) { return s.id === id; }) || null; },
    updateSession(id, patch) {
      const session = api.session(id);
      if (!session) throw new Error('练习记录不存在');
      Object.assign(session, patch || {});
      return api.save().then(function () { return session; });
    },
    async deleteSession(id) {
      const session = api.session(id);
      if (!session) return;
      state.sessions = state.sessions.filter(function (s) { return s.id !== id; });
      await api.save();
      await Promise.all((session.answerImageIds || []).map(function (imgId) {
        const used = state.questions.some(function (q) { return q.imageId === imgId; });
        if (!used) return api.deleteImage(imgId);
        return null;
      }));
    },

    /* ---------------------------- images -------------------------- */
    async saveImage(blob, meta) {
      if (!(blob instanceof Blob)) throw new Error('图片格式无效');
      const id = (meta && meta.id) || LR.uid('img');
      let mime = blob.type || 'image/jpeg';
      const record = {
        id: id,
        blob: blob,
        mime: mime,
        createdAt: new Date().toISOString(),
        size: blob.size
      };
      await withStore('images', 'readwrite', function (store) { return store.put(record); });
      api.revokeImageURL(id);
      return record;
    },

    async getImageRecord(id) {
      if (!id) return null;
      return withStore('images', 'readonly', function (store) { return requestResult(store.get(id)); });
    },

    async getImageBlob(id) {
      const record = await api.getImageRecord(id);
      return record ? record.blob : null;
    },

    async imageURL(id) {
      if (!id) return '';
      if (urlCache.has(id)) return urlCache.get(id);
      const blob = await api.getImageBlob(id);
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      return url;
    },

    revokeImageURL(id) {
      if (!id) return;
      const url = urlCache.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        urlCache.delete(id);
      }
    },

    async deleteImage(id) {
      if (!id) return;
      api.revokeImageURL(id);
      await withStore('images', 'readwrite', function (store) { return store.delete(id); });
    },

    async getAllImages() {
      return withStore('images', 'readonly', function (store) { return requestResult(store.getAll()); });
    },

    async replaceImages(records) {
      const cachedIds = Array.from(urlCache.keys());
      cachedIds.forEach(api.revokeImageURL);
      await withStore('images', 'readwrite', function (store) { store.clear(); });
      await withStore('images', 'readwrite', function (store) {
        (records || []).forEach(function (record) {
          if (record && record.id && record.blob instanceof Blob) store.put(record);
        });
      });
    },

    /* --------------------------- OCR cache ------------------------- */
    async saveOcrPackage(id, blob, meta) {
      if (!id) throw new Error('OCR 模型标识无效');
      if (!(blob instanceof Blob)) throw new Error('OCR 模型下载内容无效');
      const record = {
        id: String(id),
        blob: blob,
        size: blob.size,
        name: (meta && meta.name) || id,
        version: (meta && meta.version) || '',
        source: (meta && meta.source) || '',
        downloadedAt: new Date().toISOString()
      };
      await withStore('ocrModels', 'readwrite', function (store) { return store.put(record); });
      return record;
    },

    async saveOcrBundle(id, files, meta) {
      if (!id) throw new Error('OCR 模型标识无效');
      const list = (files || []).filter(function (file) {
        return file && file.key && file.blob instanceof Blob && file.blob.size > 0;
      }).map(function (file) {
        return {
          key: String(file.key),
          name: String(file.name || file.key),
          blob: file.blob,
          size: file.blob.size
        };
      });
      if (!list.length) throw new Error('OCR 组件下载内容为空');
      const record = {
        id: String(id),
        files: list,
        size: list.reduce(function (sum, file) { return sum + file.size; }, 0),
        name: (meta && meta.name) || id,
        version: (meta && meta.version) || '',
        source: (meta && meta.source) || '',
        downloadedAt: new Date().toISOString()
      };
      await withStore('ocrModels', 'readwrite', function (store) { return store.put(record); });
      return record;
    },

    async getOcrPackage(id) {
      if (!id) return null;
      return withStore('ocrModels', 'readonly', function (store) { return requestResult(store.get(id)); });
    },

    async getAllOcrPackages() {
      return withStore('ocrModels', 'readonly', function (store) { return requestResult(store.getAll()); });
    },

    async deleteOcrPackage(id) {
      if (!id) return;
      await withStore('ocrModels', 'readwrite', function (store) { return store.delete(id); });
    },

    async clearOcrPackages() {
      await withStore('ocrModels', 'readwrite', function (store) { store.clear(); });
    },

    async clearAllData() {
      const cachedIds = Array.from(urlCache.keys());
      cachedIds.forEach(api.revokeImageURL);
      await withStore('images', 'readwrite', function (store) { store.clear(); });
      await withStore('ocrModels', 'readwrite', function (store) { store.clear(); });
      state = normalizeState(null);
      await api.save();
    },

    async clear() {
      await withStore('meta', 'readwrite', function (store) { store.clear(); });
      await withStore('images', 'readwrite', function (store) { store.clear(); });
      await withStore('ocrModels', 'readwrite', function (store) { store.clear(); });
    }
  };

  LR.db = api;
  LR.DEFAULT_STATE = DEFAULT_STATE;
  LR.normalizeState = normalizeState;
})();
