// ==UserScript==
// @name         战舰世界(海服)军械库 汉化 · Korabli Armory zh-CN
// @name:zh-CN   战舰世界(海服)军械库 汉化
// @name:ru      Коробли Армори перевод на китайский
// @namespace    https://github.com/iwvw-per/armory-zh
// @version      1.0.0
// @description  Lesta 战舰世界(Korabli)军械库 armory.korabli.su 完整汉化。直接加载站点自带的官方简体中文语言包，并支持通过在线词典热更新剩余游戏术语（货币/国家/舰船类型等）。
// @description:zh-CN  Lesta 战舰世界(Korabli)军械库 armory.korabli.su 完整汉化。直接加载站点自带的官方简体中文语言包，并支持通过在线词典热更新剩余游戏术语（货币/国家/舰船类型等）。
// @author       you
// @match        *://armory.korabli.su/*
// @match        *://armory.korabli.su/ru/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      github.com
// @noframes
// @updateURL    https://raw.githubusercontent.com/iwvw-per/armory-zh/master/armory-zh.user.js
// @downloadURL  https://raw.githubusercontent.com/iwvw-per/armory-zh/master/armory-zh.user.js
// ==/UserScript==

/**
 * 汉化原理
 * ----------
 * 站点(armory.korabli.su / 俄区)服务端强制 languageCode=ru，set_language 接口也会把语言
 * 强制写回 ru。但站点的静态 CDN 上其实已经存在一套完整的官方简体中文语言包：
 *   - scripts/i18n/zh-sg.js            (UI 界面全量翻译, ~402 条)
 *   - assets/locales/vendor-zh-sg.js   (供应商组件翻译, ~144 条)
 * 这两份文件与页面默认加载的 ru.js / vendor-ru.js 写入的是【同一个】 window.i18n.catalog
 * 对象，键都是俄语源串。因此本脚本在 document-start 阶段把这两处脚本的 src 从 ru.js 改写
 * 为 zh-sg.js（vendor-ru.js -> vendor-zh-sg.js），让官方中文包覆盖俄语包，从而获得完整、
 * 专业、随官方同步更新的界面汉化，无需自己维护大词典。
 *
 * 补充：游戏数据接口返回的俄语术语(货币、国家、舰船类型、部分道具名等)不在 i18n 目录内，
 * 由下方【在线词典】机制处理——从仓库里可编辑的 dict.json 拉取(带本地兜底)，命中即替换文本，
 * 实现“热更新”：改一行 JSON 推送到仓库，所有用户下次打开页面自动生效，无需重装脚本。
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

  // 在元素真正挂到文档前改写 src，确保浏览器加载的是中文语言包。
  var _appendChild = Element.prototype.appendChild;
  var _insertBefore = Element.prototype.insertBefore;
  var _replaceChild = Element.prototype.replaceChild;

  Element.prototype.appendChild = function (n) { fixNode(n); return _appendChild.call(this, n); };
  Element.prototype.insertBefore = function (n, r) { fixNode(n); return _insertBefore.call(this, n, r); };
  Element.prototype.replaceChild = function (n, o) { fixNode(n); return _replaceChild.call(this, n, o); };

  // 兜底：某些动态插入的 script/link 可能绕过上面的钩子
  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(fixNode);
    });
  });
  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ============ 2. 页面元信息 ============ */

  if (document.documentElement) {
    document.documentElement.setAttribute('lang', 'zh-CN');
  }
  var initialTitle = '兵工厂 · 战舰世界军械库';
  var titleTimer = setInterval(function () {
    if (document.title && /[а-яА-ЯёЁ]/.test(document.title)) {
      document.title = initialTitle;
    } else if (document.title) {
      clearInterval(titleTimer);
    }
  }, 500);
  setTimeout(function () { clearInterval(titleTimer); }, 15000);

  /* ============ 3. 游戏术语在线词典 (热更新) ============ */

  // 默认词典：界面目录之外的俄语游戏术语。
  // 在线更新地址改为仓库里的 dict.json；改文件推送到仓库即可全量热更新。
  var DEFAULT_DICT = {
    'Золото': '达布隆',
    'Дублоны': '达布隆',
    'Сталь': '钢铁',
    'Уголь': '煤炭',
    'Опыт': '经验',
    'Свободный опыт': '全局经验',
    'Элитный опыт': '精英经验',
    'Корабли': '战舰',
    'Корабль': '战舰',
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
    'Линкор': '战列舰',
    'Крейсер': '巡洋舰',
    'Эсминец': '驱逐舰',
    'Авианосец': '航空母舰',
    'Подводная лодка': '潜艇',
    'Премиум магазин': '高级商店',
    'Премиум аккаунт': '高级账号',
    'Купоны': '优惠券',
    'Контейнер': '补给箱',
    'Награда': '奖励',
    'Скидка': '折扣'
  };

  var DICT = DEFAULT_DICT;
  var DICT_URL = 'https://raw.githubusercontent.com/iwvw-per/armory-zh/master/dict.json'; // ← 改成你的仓库地址

  var processed = new WeakSet();

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3 || processed.has(node)) return;
    var text = node.nodeValue;
    if (!text || !/[а-яА-ЯёЁ]/.test(text)) return;
    var trimmed = text.trim();
    if (DICT[trimmed]) {
      node.nodeValue = text.replace(trimmed, DICT[trimmed]);
      processed.add(node);
    }
  }

  function walk(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'SCRIPT' || root.tagName === 'STYLE' || root.tagName === 'TEXTAREA') return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (p && /SCRIPT|STYLE|TEXTAREA/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) translateTextNode(n);
  }

  function applyDict() {
    walk(document.body || document.documentElement);
  }

  var domObs = new MutationObserver(function (muts) {
    var pending = false;
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType === 3) { translateTextNode(n); }
        else if (n.nodeType === 1) {
          if (!/SCRIPT|STYLE/.test(n.tagName)) pending = true;
        }
      });
    });
    if (pending) requestAnimationFrame(applyDict);
  });

  function startDict() {
    if (domObs.__started) return;
    domObs.__started = true;
    applyDict();
    if (document.body) {
      domObs.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        domObs.observe(document.body, { childList: true, subtree: true });
        applyDict();
      });
    }
  }

  // 热更新：拉取仓库最新词典（带缓存破坏），失败则用本地默认词典
  function loadRemoteDict() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: DICT_URL + '?_=' + Date.now(),
      timeout: 15000,
      onload: function (res) {
        try {
          var remote = JSON.parse(res.responseText);
          if (remote && typeof remote === 'object') {
            DICT = Object.assign({}, DEFAULT_DICT, remote);
            applyDict();
          }
        } catch (e) { /* 保持默认词典 */ }
      },
      onerror: function () { /* 保持默认词典 */ }
    });
  }
  loadRemoteDict();
  startDict();

})();
