# armory-zh · 战舰世界(海服)军械库汉化油猴脚本

对 **Lesta《战舰世界》(Korabli)** 俄区军械库网站 `armory.korabli.su` 进行简体中文汉化。

## 效果

- 界面全部中文（菜单、拍卖、钱包、优惠券、补给箱、分类、提示语等）
- 游戏术语（货币、国家、舰船类型等）中文化
- 依赖站点官方简体中文语言包，翻译质量高且随官方同步更新

## 原理（两段式）

1. **官方语言包直载（主，覆盖全部 UI）**

   站点服务端会把语言强制锁成 `ru`（`set_language` 接口也会写回 `ru`），但其静态 CDN 上
   其实已存在完整的官方简体中文包：

   - `scripts/i18n/zh-sg.js`（~402 条 UI 翻译）
   - `assets/locales/vendor-zh-sg.js`（~144 条供应商组件翻译）

   这两份文件与页面默认加载的 `ru.js` / `vendor-ru.js` 写入**同一个** `window.i18n.catalog`
   对象、键同为俄语源串。脚本在 `document-start` 阶段用 `appendChild/insertBefore` 钩子把
   这两处脚本的 `src` 从 `ru.js` 改写为 `zh-sg.js`，让中文包天然覆盖俄语包 —— 零词典、全 UI
   汉化、随官方同步。

2. **在线词典热更新（补充游戏数据术语）**

   游戏数据接口返回的俄语术语（货币/国家/舰船类型/道具名等）不在 i18n 目录内，由仓库里的
   `dict.json` 提供映射。脚本每次打开页面都会拉取最新 `dict.json` 并即时替换页面文本 ——
   **改一行 JSON 推送到仓库，所有用户下次打开页面自动生效，无需重装脚本**。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（油猴）
2. 打开 `armory-zh.user.js` 的 GitHub raw 地址，或复制脚本内容新建脚本粘贴
3. 访问 `https://armory.korabli.su/` 即可

## 仓库结构

```
├── armory-zh.user.js   # 油猴脚本主文件
├── dict.json           # 游戏术语词典（可热更新的部分）
└── README.md
```

## 后期维护 / 热更新

### 词典热更新（推荐，最常用）

直接编辑 `dict.json` 增加/修改映射（`"俄语原词": "中文"`），推送到仓库即可。用户端每次打开
页面自动拉取最新词典，**无需重新安装脚本**。

### 脚本本体更新

把 `armory-zh.user.js` 顶部的元数据改成你的实际仓库地址：

```
@updateURL    https://raw.githubusercontent.com/<用户名>/<仓库>/main/armory-zh.user.js
@downloadURL  https://raw.githubusercontent.com/<用户名>/<仓库>/main/armory-zh.user.js
```

并把脚本内的 `DICT_URL` 也指向你的 `dict.json`：

```js
var DICT_URL = 'https://raw.githubusercontent.com/<用户名>/<仓库>/main/dict.json';
```

发布后用户端油猴会按 `@version` 检测并自动更新脚本本体。

### 官方语言包失效时

若官方调整 CDN 目录导致 `zh-sg.js` 路径变化，只需同步更新 `armory-zh.user.js` 中的
`ruPatterns` 改写规则并发布新版本（词典仍可继续热更新）。

## 自定义词典映射

`dict.json` 采用「整段文本精确匹配」替换（先 trim 再查表），命中后整词替换，避免破坏动态内容。
如需翻译更长的俄语句子/道具名，直接加键值对即可。注意键必须是页面文本节点的完整内容。

## License

MIT
