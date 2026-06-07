<div align="center">
  <img src="sdl_favicon.png" alt="SDL 版图" width="120">

  <h1>全球自驱动实验室版图</h1>

  <p align="center">
    一张手工策展的地图，呈现全球自驱动实验室工作的分布：国家计划、学术团队、商业供应商，以及实验室操作系统平台。
  </p>

  <p align="center">
    <a href="https://sdl-map.discoverylabs.nl/"><b>🌐 打开交互式地图 →</b></a>
  </p>

  <p align="center">
    <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
    <a href="https://yetiswang.github.io/sdl-map/"><img src="https://img.shields.io/badge/site-live-brightgreen" alt="Live"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  </p>

  <p align="center">
    <a href="README.md">English</a> ·
    <b>简体中文</b> ·
    <a href="README.zh-Hant.md">繁體中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.ko.md">한국어</a>
  </p>
</div>

> 自驱动实验室（SDL）把 AI 驱动的假设生成、自动化合成与在线表征闭合成一个回路。这份清单记录正在做这件事的人、计划和平台。它呈现的是我读到的版图，不是搜索引擎索引出来的结果。条目反映截至 2026 年 6 月的公开信息，通过 [交互式地图](https://sdl-map.discoverylabs.nl/) 持续修订。

## 📚 目录

- [🌍 国家计划与联盟](#-国家计划与联盟)
- [🎓 学术团队](#-学术团队)
- [🏭 商业与工业](#-商业与工业)
- [🛰 实验室操作系统与编排](#-实验室操作系统与编排)
- [📐 数据结构](#-数据结构)
- [🛠 本地开发](#-本地开发)
- [🤝 贡献](#-贡献)
- [📜 许可证](#-许可证)

> **关于翻译：** 条目名称、机构名、链接以及一句话描述保留英文（多数研究项目以英文为通行语言）。本文档翻译的是标题、章节说明与流程指引。完整条目列表请参考 [English README](README.md)。

---

## 🌍 国家计划与联盟

由公共部门主导、跨机构合作的 SDL 国家级或区域级计划。完整 11 个条目（包括 Acceleration Consortium、BIG-MAP / FULL-MAP、PEPR DIADEM、DiscoveryLabNL 等）见 [English README → National Programmes & Consortia](README.md#-national-programmes--consortia)。

## 🎓 学术团队

由单一机构或 PI 主导，正在运行 SDL 的研究组。完整 27 个条目（包括 A-Lab、Cooper Group、Jensen Lab、江俊团队 / ChemAgents + Robot Chemist、嘉庚创新实验室等）见 [English README → Academic Groups](README.md#-academic-groups)。

## 🏭 商业与工业

营利型 SDL 公司、药企内部计划，以及与 SDL 相关的硬件 / 仪器供应商。完整 26 个条目（包括 Lila Sciences、晶泰科技、Cusp AI、深势科技 / Bohrium 等）见 [English README → Commercial & Industrial](README.md#-commercial--industrial)。

## 🛰 实验室操作系统与编排

让 SDL 跑起来的软件平台、调度层与仪器互联标准。完整 10 个条目（包括 Automata LINQ、Benchling、Artificial、Atinary 等）见 [English README → Lab OS & Orchestration](README.md#-lab-os--orchestration)。

---

## 📐 数据结构

条目数据内联在 [`index.html`](./index.html) 中（查找 `window.SDL_DATA = [...]`）。每个条目字段说明：

```js
{
  id: "aria",                    // 短 ID
  name: "UK ARIA AI Scientists", // 显示名称
  org: "ARIA",                   // 所属机构
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
  invest: 8,                     // 估计投资额（百万美元，影响地图标记权重）
  investLabel: "£6M",
  url: "https://aria.org.uk/",
  sources: ["..."]
}
```

## 🛠 本地开发

```bash
git clone https://github.com/yetiswang/sdl-map.git
cd sdl-map
python3 -m http.server 8000
```

打开 `http://localhost:8000/`（载入 `index.html`）。直接修改、提交、推送即可通过 GitHub Pages 部署。

## 🤝 贡献

欢迎纠错、新增和报告项目更名 / 关闭。请提 issue 或 PR。每个新条目请包含：

- **名称 + 机构 + 地点**（含经纬度）。
- **主 URL**（必须可访问，不能跳转到域名停放页）。
- **类型**（national / academic / commercial / labos）、**领域**、**成熟度**、**回路中的表征**、**AI**。
- **信源**（2 至 3 个权威链接：机构新闻稿、同行评议论文、官方资助公告）。

通常会被回审的情况：链接失效、品牌更名未跟进、并购、范围漂移、计划已结束无后续。

## 📜 许可证

源代码开放（[MIT](./LICENSE)）。内容（条目数据、描述）反映编译时刻的公开信息。
