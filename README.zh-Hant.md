<div align="center">
  <img src="sdl_favicon.png" alt="SDL 版圖" width="120">

  <h1>全球自驅動實驗室版圖</h1>

  <p align="center">
    一張手工策展的地圖，呈現全球自驅動實驗室工作的分佈：國家計畫、學術團隊、商業供應商，以及實驗室作業系統平台。
  </p>

  <p align="center">
    <a href="https://sdl-map.discoverylabs.nl/"><b>🌐 開啟互動地圖 →</b></a>
  </p>

  <p align="center">
    <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
    <a href="https://yetiswang.github.io/sdl-map/"><img src="https://img.shields.io/badge/site-live-brightgreen" alt="Live"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  </p>

  <p align="center">
    <a href="README.md">English</a> ·
    <a href="README.zh-Hans.md">简体中文</a> ·
    <b>繁體中文</b> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.ko.md">한국어</a>
  </p>
</div>

> 自驅動實驗室（SDL）把 AI 驅動的假設生成、自動化合成與線上表徵閉合成一個迴路。這份清單記錄正在做這件事的人、計畫與平台。它呈現的是我讀到的版圖，不是搜尋引擎索引出來的結果。條目反映截至 2026 年 6 月的公開資訊，透過 [互動式地圖](https://sdl-map.discoverylabs.nl/) 持續修訂。

## 📚 目錄

- [🌍 國家計畫與聯盟](#-國家計畫與聯盟)
- [🎓 學術團隊](#-學術團隊)
- [🏭 商業與工業](#-商業與工業)
- [🛰 實驗室作業系統與編排](#-實驗室作業系統與編排)
- [📐 資料結構](#-資料結構)
- [🛠 本機開發](#-本機開發)
- [🤝 貢獻](#-貢獻)
- [📜 授權](#-授權)

> **關於翻譯：** 條目名稱、機構名稱、連結以及一句話描述保留英文（多數研究計畫以英文為通行語言）。本文件翻譯的是標題、章節說明與流程指引。完整條目列表請參考 [English README](README.md)。

---

## 🌍 國家計畫與聯盟

由公共部門主導、跨機構合作的 SDL 國家級或區域級計畫。完整 11 個條目（包括 Acceleration Consortium、BIG-MAP / FULL-MAP、PEPR DIADEM、DiscoveryLabNL 等）見 [English README → National Programmes & Consortia](README.md#-national-programmes--consortia)。

## 🎓 學術團隊

由單一機構或 PI 主導，正在運行 SDL 的研究組。完整 27 個條目（包括 A-Lab、Cooper Group、Jensen Lab、江俊團隊 / ChemAgents + Robot Chemist、嘉庚創新實驗室等）見 [English README → Academic Groups](README.md#-academic-groups)。

## 🏭 商業與工業

營利型 SDL 公司、藥廠內部計畫，以及與 SDL 相關的硬體 / 儀器供應商。完整 26 個條目（包括 Lila Sciences、晶泰科技、Cusp AI、深勢科技 / Bohrium 等）見 [English README → Commercial & Industrial](README.md#-commercial--industrial)。

## 🛰 實驗室作業系統與編排

讓 SDL 運作起來的軟體平台、調度層與儀器互連標準。完整 10 個條目（包括 Automata LINQ、Benchling、Artificial、Atinary 等）見 [English README → Lab OS & Orchestration](README.md#-lab-os--orchestration)。

---

## 📐 資料結構

條目資料內嵌在 [`index.html`](./index.html) 中（搜尋 `window.SDL_DATA = [...]`）。每個條目欄位說明：

```js
{
  id: "aria",                    // 短 ID
  name: "UK ARIA AI Scientists", // 顯示名稱
  org: "ARIA",                   // 所屬機構
  city: "London",
  country: "UK",
  flag: "🇬🇧",
  lat: 51.51, lon: -0.13,
  tier: "national",              // national | academic | commercial | labos
  domain: "cross-domain",        // chemistry | materials | energy | biology | batteries | drug-discovery | orchestration | cross-domain
  maturity: "prototype",         // concept | prototype | operational | industrial
  charact: "single-technique",   // synthesis-only | single-technique | multi-technique | advanced-multimodal
  ai: "strong",                  // strong | partial | planned | none
  scale: "national",
  invest: 8,                     // 估計投資額（百萬美元，影響地圖標記權重）
  investLabel: "£6M",
  url: "https://aria.org.uk/",
  sources: ["..."]
}
```

## 🛠 本機開發

```bash
git clone https://github.com/yetiswang/sdl-map.git
cd sdl-map
python3 -m http.server 8000
```

開啟 `http://localhost:8000/`（載入 `index.html`）。直接修改、commit、push 即可透過 GitHub Pages 部署。

## 🤝 貢獻

歡迎指正、新增與回報計畫更名 / 結束。請開 issue 或 PR。每個新條目請包含：

- **名稱 + 機構 + 地點**（含經緯度）。
- **主要 URL**（必須可連線，不能跳到網域停泊頁）。
- **類型**（national / academic / commercial / labos）、**領域**、**成熟度**、**迴路中的表徵**、**AI**。
- **資料來源**（2 至 3 個權威連結：機構新聞稿、同儕審查論文、官方資助公告）。

通常會被回審的情況：連結失效、品牌更名未跟進、合併 / 收購、範圍漂移、計畫已結束無後續。

## 📜 授權

原始碼開放（[MIT](./LICENSE)）。內容（條目資料、描述）反映編譯時刻的公開資訊。
