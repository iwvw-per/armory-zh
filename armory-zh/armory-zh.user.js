// ==UserScript==
// @name         战舰世界(莱斯塔服)军械库 汉化 · Korabli Armory zh-CN
// @name:zh-CN   战舰世界(莱斯塔服)军械库 汉化
// @name:ru      Коробли Армори перевод на китайский
// @namespace    https://github.com/iwvw-per/armory-zh
// @version      1.1.0
// @description  Lesta 战舰世界(Korabli)军械库 armory.korabli.su 完整汉化。加载站点自带官方简体中文语言包，并把该语言包当作词典，配合可热更新的 dict.json 翻译服务端分类/礼包等俄语文本。
// @author       you
// @match        *://armory.korabli.su/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      github.com
// @noframes
// @updateURL    https://raw.githubusercontent.com/iwvw-per/armory-zh/master/armory-zh/armory-zh.user.js
// @downloadURL  https://raw.githubusercontent.com/iwvw-per/armory-zh/master/armory-zh/armory-zh.user.js
// ==/UserScript==

/**
 * 汉化原理（三层，互为补充）
 * ------------------------------------------------------------------
 * 1) 语言包直载（覆盖 gettext 渲染的 UI）
 *    站点服务端强制 languageCode=ru，但静态 CDN 上已存在官方简体中文包：
 *      scripts/i18n/zh-sg.js / assets/locales/vendor-zh-sg.js
 *    它们与默认的 ru.js / vendor-ru.js 写入同一个 window.i18n.catalog（键为俄语源串）。
 *    脚本在 document-start 把这两处脚本 src 从 ru.js 改写为 zh-sg.js，中文包覆盖俄语包，
 *    于是所有走 gettext(N(...)) 的界面文案自动变中文。
 *
 * 2) 目录当词典（覆盖绕过 gettext 的硬编码串）
 *    替换后 window.i18n.catalog 本身就是一张「俄语 → 中文」映射表（含供应商包）。
 *    用它翻译 DOM 文本节点/属性，可命中像搜索框占位符这类硬编码/服务端串。
 *
 * 3) 手工词典 + 在线 dict.json（覆盖服务端分类/礼包名等游戏数据）
 *    左栏分类、礼包名等来自服务端接口数据，不在语言包里，由内置词典 + 仓库 dict.json
 *    提供映射；dict.json 可在线热更新：改一行 JSON 推送到仓库，用户下次打开页面即生效。
 */

(function () {
  'use strict';

  /* ============ 1. 语言包脚本改写 (document-start) ============ */

  var ruPatterns = [
    [/\/scripts\/i18n\/ru\.js/g, '/scripts/i18n/zh-sg.js'],
    [/\/assets\/locales\/vendor-ru\.js/g, '/assets/locales/vendor-zh-sg.js'],
  ];

  function toZh(url) {
    if (!url) return url;
    var out = url;
    ruPatterns.forEach(function (p) { out = out.replace(p[0], p[1]); });
    return out;
  }

  function looksRus(url) {
    return /\/scripts\/i18n\/ru\.js|\/assets\/locales\/vendor-ru\.js/.test(url || '');
  }

  function fixNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'SCRIPT') {
      var s = node.getAttribute('src');
      if (looksRus(s)) node.setAttribute('src', toZh(s));
    } else if (node.tagName === 'LINK') {
      var h = node.getAttribute('href');
      if (looksRus(h)) node.setAttribute('href', toZh(h));
    }
  }

  var _appendChild = Element.prototype.appendChild;
  var _insertBefore = Element.prototype.insertBefore;
  var _replaceChild = Element.prototype.replaceChild;

  Element.prototype.appendChild = function (n) { fixNode(n); return _appendChild.call(this, n); };
  Element.prototype.insertBefore = function (n, r) { fixNode(n); return _insertBefore.call(this, n, r); };
  Element.prototype.replaceChild = function (n, o) { fixNode(n); return _replaceChild.call(this, n, o); };

  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (m) { m.addedNodes.forEach(fixNode); });
  });
  if (document.documentElement) obs.observe(document.documentElement, { childList: true, subtree: true });

  /* ============ 2. 页面元信息 ============ */

  if (document.documentElement) document.documentElement.setAttribute('lang', 'zh-CN');
  var initialTitle = '兵工厂 · 战舰世界军械库';
  var titleTimer = setInterval(function () {
    if (document.title && /[а-яА-ЯёЁ]/.test(document.title)) document.title = initialTitle;
    else if (document.title) clearInterval(titleTimer);
  }, 500);
  setTimeout(function () { clearInterval(titleTimer); }, 15000);

  /* ============ 3. 词典与 DOM 替换 ============ */

  // 3.1 手工词典：服务端分类/菜单/常见术语（语言包覆盖不到的部分）
  var DEFAULT_DICT = {
    // —— 左栏分类 / 菜单（服务端数据）——
    'Главное': '精选',
    'Кощеева сила': '科谢伊之力',
    'Богатырская удаль': '勇士之勇',
    'Княжье величие': '王公之威',
    'Белый линкор «ГДР»': '白色战列舰「GDR」',
    'Оборона Лукоморья': '卢科莫里耶保卫战',
    'Missouri. Свет победы': '密苏里号：胜利之光',
    'Премиум контейнеры': '高级补给箱',
    'События': '活动',
    'Золотая лихорадка': '黄金热',
    'Только для вас': '专属优惠',
    'Корабли': '战舰',
    'Контейнеры': '补给箱',
    'Экономические бонусы': '经济加成',
    'Сигналы': '信号旗',
    'Модернизации': '升级品',
    'Камуфляжи': '涂装',
    'Слоты в Порту': '港口船位',
    'Командиры': '指挥官',
    'Корабельный премиум аккаунт': '战舰高级账号',
    'Разное': '其他',
    'Морское единство': '海军团结',
    'Боевой пропуск': '战斗通行证',
    'Золото и серебро': '金币与银币',
    // —— 登录 / 账户 ——
    'Войти': '登录',
    'Войти или создать аккаунт': '登录或创建账号',
    'Выйти': '退出',
    'Создать аккаунт': '创建账号',
    // —— 货币 / 资源 ——
    'Золото': '达布隆',
    'Дублоны': '达布隆',
    'Сталь': '钢铁',
    'Уголь': '煤炭',
    'Кредиты': '银币',
    'Опыт': '经验',
    'Свободный опыт': '全局经验',
    'Элитный опыт': '精英经验',
    // —— 国家 ——
    'США': '美国',
    'СССР': '苏联',
    'Японии': '日本',
    'Германии': '德国',
    'Великобритании': '英国',
    'Франции': '法国',
    'Италии': '意大利',
    'Нидерландов': '荷兰',
    'Испании': '西班牙',
    'Пан-Азии': '泛亚',
    'Пан-Америки': '泛美',
    // —— 舰种 ——
    'Линкор': '战列舰',
    'Крейсер': '巡洋舰',
    'Эсминец': '驱逐舰',
    'Авианосец': '航空母舰',
    'Подводная лодка': '潜艇',
    // —— 常见术语 ——
    'Премиум магазин': '高级商店',
    'Премиум аккаунт': '高级账号',
    'Купоны': '优惠券',
    'Контейнер': '补给箱',
    'Награда': '奖励',
    'Скидка': '折扣',
    'Новый год круглый год': '新年全年',
    // —— 常见礼包/宝箱名 ——
    'Пять золотых ларцов': '五个黄金宝箱',
    'Шесть серебряных ларцов': '六个白银宝箱'
  };

  // 3.2 目录词典（由 window.i18n.catalog 构建：俄语源串 → 中文）
  var CATALOG_DICT = {};
  var REMOTE_DICT = {};
  var DICT = {};
  var DICT_LOWER = {};

  function rebuildDict() {
    DICT = Object.assign({}, CATALOG_DICT, DEFAULT_DICT, REMOTE_DICT);
    DICT_LOWER = {};
    for (var k in DICT) {
      if (Object.prototype.hasOwnProperty.call(DICT, k) && typeof DICT[k] === 'string' && DICT[k]) {
        DICT_LOWER[k.trim().toLowerCase()] = DICT[k];
      }
    }
  }

  function refreshCatalogDict() {
    var c = window.i18n && window.i18n.catalog;
    if (!c) return 0;
    var n = 0;
    for (var k in c) {
      if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
      var v = c[k];
      if (typeof v !== 'string') v = v && v[0];
      if (typeof v === 'string' && v && v !== k) { CATALOG_DICT[k] = v; n++; }
    }
    return n;
  }

  // 3.3 动态格式规则（时长等）
  var PATTERNS = [
    [/(\d+)\s*д\.?\s*(\d+)\s*ч\.?\s*(\d+)\s*мин\.?/g, '$1天$2小时$3分'],
    [/(\d+)\s*д\.?\s*(\d+)\s*ч\.?/g, '$1天$2小时'],
    [/(\d+)\s*ч\.?\s*(\d+)\s*мин\.?/g, '$1小时$2分'],
    [/(\d+)\s*мин\.?/g, '$1分'],
    [/(\d+)\s*сек\.?/g, '$1秒']
  ];

  function applyPatterns(t) {
    for (var i = 0; i < PATTERNS.length; i++) t = t.replace(PATTERNS[i][0], PATTERNS[i][1]);
    return t;
  }

  function hasCyr(t) { return t && /[а-яА-ЯёЁ]/.test(t); }

  // 翻译一段文本（保留首尾空白），命中即返回中文，否则原样返回
  function translateValue(text) {
    if (!hasCyr(text)) return text;
    var m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var lead = m[1], core = m[2], trail = m[3];
    if (!core) return text;
    if (DICT[core]) return lead + DICT[core] + trail;
    var low = core.toLowerCase();
    if (DICT_LOWER[low]) return lead + DICT_LOWER[low] + trail;
    var p = applyPatterns(core);
    if (p !== core) return lead + p + trail;
    return text;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    var nv = node.nodeValue;
    if (!hasCyr(nv)) return;
    var out = translateValue(nv);
    if (out !== nv) node.nodeValue = out;
  }

  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  function translateAttrs(el) {
    if (!el.getAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (hasCyr(v)) {
        var nv = translateValue(v);
        if (nv !== v) el.setAttribute(ATTRS[i], nv);
      }
    }
  }

  function walk(root) {
    if (!root || root.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(root.tagName)) return;
    translateAttrs(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (p && /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) translateTextNode(n);
  }

  function applyDict() { walk(document.body || document.documentElement); }

  var domObs = new MutationObserver(function (muts) {
    var pending = false;
    muts.forEach(function (m) {
      if (m.type === 'attributes') { translateAttrs(m.target); return; }
      m.addedNodes.forEach(function (n) {
        if (n.nodeType === 3) translateTextNode(n);
        else if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) pending = true;
      });
    });
    if (pending) requestAnimationFrame(applyDict);
  });

  function startObserving() {
    if (domObs.__started) return;
    domObs.__started = true;
    if (!document.body) { document.addEventListener('DOMContentLoaded', startObserving); return; }
    domObs.observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ATTRS
    });
    applyDict();
  }

  // 3.4 拉取仓库最新词典（热更新，失败用内置）
  var DICT_URL = 'https://raw.githubusercontent.com/iwvw-per/armory-zh/master/armory-zh/dict.json';
  function loadRemoteDict() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: DICT_URL + '?_=' + Date.now(),
      timeout: 15000,
      onload: function (res) {
        try {
          var remote = JSON.parse(res.responseText);
          if (remote && typeof remote === 'object') { REMOTE_DICT = remote; rebuildDict(); applyDict(); }
        } catch (e) { /* 保持内置词典 */ }
      },
      onerror: function () { /* 保持内置词典 */ }
    });
  }

  // 3.5 等语言包（替换后的中文目录）就绪后并入词典
  var catTries = 0;
  var catTimer = setInterval(function () {
    if (refreshCatalogDict() > 50) {
      rebuildDict(); applyDict(); clearInterval(catTimer);
    } else if (++catTries > 150) {
      rebuildDict(); clearInterval(catTimer);
    }
  }, 100);

  rebuildDict();
  startObserving();
  loadRemoteDict();

})();
