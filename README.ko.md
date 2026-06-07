<div align="center">
  <img src="public/sdl_favicon.png" alt="SDL 랜드스케이프" width="120">

  <h1>전 세계 자율실험실 지도</h1>

  <p align="center">
    전 세계의 자율실험실(Self-Driving Lab) 활동을 직접 손으로 정리한 지도. 국가 프로젝트, 학술 그룹, 상업 벤더, 오픈 랩 OS까지 모두 포함합니다.
  </p>

  <p align="center">
    <a href="https://sdl-map.discoverylabs.nl/"><b>🌐 인터랙티브 지도 열기 →</b></a>
  </p>

  <p align="center">
    <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
    <a href="https://yetiswang.github.io/sdl-map/"><img src="https://img.shields.io/badge/site-live-brightgreen" alt="Live"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  </p>

  <p align="center">
    <a href="README.md">English</a> ·
    <a href="README.zh-Hans.md">简体中文</a> ·
    <a href="README.zh-Hant.md">繁體中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <b>한국어</b>
  </p>
</div>

> 자율실험실(Self-Driving Lab, SDL)은 AI 기반 가설 생성, 자동화 합성, 온라인 분석을 하나의 루프로 닫는 시스템입니다. 이 목록은 그 일을 실제로 하고 있는 사람과 프로젝트, 플랫폼을 기록한 것입니다. 검색엔진이 만든 목록이 아니라 제가 본 그대로의 분포입니다. 2026년 6월 시점의 공개 정보를 기반으로 [인터랙티브 지도](https://sdl-map.discoverylabs.nl/)와 함께 지속적으로 갱신됩니다.

## 📚 목차

- [🌍 국가 프로젝트 / 컨소시엄](#-국가-프로젝트--컨소시엄)
- [🎓 학술 그룹](#-학술-그룹)
- [🏭 상업 및 산업](#-상업-및-산업)
- [🛰 랩 OS / 오케스트레이션](#-랩-os--오케스트레이션)
- [📐 데이터 스키마](#-데이터-스키마)
- [🛠 로컬 개발](#-로컬-개발)
- [🤝 기여](#-기여)
- [📜 라이선스](#-라이선스)

> **번역에 대해:** 항목명, 기관명, 링크, 한 줄 설명은 영문 그대로 두었습니다(대부분의 연구 프로젝트가 영어를 공통 언어로 사용합니다). 본 문서에서는 제목, 섹션 설명, 운영 가이드를 번역했습니다. 전체 항목 목록은 [English README](README.md)를 참조하세요.

---

## 🌍 국가 프로젝트 / 컨소시엄

공공 부문이 주도하거나 여러 기관에 걸친 국가/지역 규모의 SDL 프로젝트. Acceleration Consortium, BIG-MAP / FULL-MAP, PEPR DIADEM, DiscoveryLabNL 등 11개 전체 항목은 [English README → National Programmes & Consortia](README.md#-national-programmes--consortia)를 참고하세요.

## 🎓 학술 그룹

단일 기관 또는 PI가 주도해 실제로 SDL을 운영하는 연구 그룹. A-Lab, Cooper Group, Jensen Lab, Jun Jiang 그룹 / ChemAgents + Robot Chemist, 嘉庚创新실험실 등 27개 전체 항목은 [English README → Academic Groups](README.md#-academic-groups)를 참고하세요.

## 🏭 상업 및 산업

영리 SDL 회사, 제약사 사내 프로그램, SDL과 관련된 하드웨어 / 기기 벤더. Lila Sciences, XtalPi, Cusp AI, DP Technology / Bohrium 등 26개 전체 항목은 [English README → Commercial & Industrial](README.md#-commercial--industrial)를 참고하세요.

## 🛰 랩 OS / 오케스트레이션

SDL을 돌리기 위한 소프트웨어 플랫폼, 스케줄링 계층, 장비 연결 표준. Automata LINQ, Benchling, Artificial, Atinary 등 10개 전체 항목은 [English README → Lab OS & Orchestration](README.md#-lab-os--orchestration)를 참고하세요.

---

## 📐 데이터 스키마

항목 데이터는 [`index.html`](./index.html)에 인라인으로 들어 있습니다(`window.SDL_DATA = [...]` 검색). 각 항목 구조:

```js
{
  id: "aria",                    // 짧은 ID
  name: "UK ARIA AI Scientists", // 표시 이름
  org: "ARIA",                   // 소속 기관
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
  invest: 8,                     // 추정 투자액(백만 미국달러 단위, 지도 마커 비중에 사용)
  investLabel: "£6M",
  url: "https://aria.org.uk/",
  sources: ["..."]
}
```

## 🛠 로컬 개발

```bash
git clone https://github.com/yetiswang/sdl-map.git
cd sdl-map
python3 -m http.server 8000
```

`http://localhost:8000/`를 여세요(`index.html`을 로드합니다). 그대로 편집해서 commit + push 하면 GitHub Pages를 통해 배포됩니다.

## 🤝 기여

정정, 추가, 이름 변경 / 종료 보고를 환영합니다. Issue나 PR을 보내주세요. 신규 항목에는 다음을 포함해 주세요:

- **이름 + 소속 + 위치**(위경도 포함).
- **기본 URL**(실제로 동작해야 하며, 도메인 파킹으로 리다이렉트되면 안 됩니다).
- **유형**(national / academic / commercial / labos), **분야**, **성숙도**, **루프 내 캐릭터라이제이션**, **AI**.
- **출처**(2~3개의 신뢰할 수 있는 링크: 기관 보도자료, 동료 평가 논문, 공식 펀딩 발표 등).

검토 대상이 되기 쉬운 경우: 끊긴 링크, 리브랜딩 미반영, 인수합병, 범위 변경, 후속 없이 종료된 프로젝트.

## 📜 라이선스

소스는 [MIT](./LICENSE)로 공개됩니다. 콘텐츠(항목 데이터, 설명)는 컴파일 시점의 공개 정보를 반영합니다.
