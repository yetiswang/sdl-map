// Shared country name lookup
import countries from '../i18n/countries.json';
import chinaNames from '../i18n/china-names.json';

export function countryName(country: string, lang: string): string {
  // Map zh→zh-Hans for key lookup
  const lookupLang = lang === 'zh' ? 'zh-Hans' : lang;
  const map = (countries as any)[lookupLang];
  if (!map) return country;
  return map[country] || country;
}

// Chinese-entity name override. Applies only on /zh/* pages and only for
// entries that ARE Chinese (listed in china-names.json). Falls back to the
// data file's `name` / `org` for everything else.
export function entityName(id: string, fallback: string, lang: string): string {
  if (lang !== 'zh') return fallback;
  const c = (chinaNames as any)[id];
  return c?.['zh-Hans']?.name ?? fallback;
}
export function entityOrg(id: string, fallback: string, lang: string): string {
  if (lang !== 'zh') return fallback;
  const c = (chinaNames as any)[id];
  return c?.['zh-Hans']?.org ?? fallback;
}

// Map of UI strings for zh-Hans → zh-Hant conversion (used by client-side toggle)
export const zhHantMap: Record<string, string> = {
  "荷兰国家材料发现实验室 · 实时追踪": "荷蘭國家材料發現實驗室 · 實時追蹤",
  "全球自驱动实验室": "全球自驅動實驗室",
  "版图": "版圖",
  "项目": "項目",
  "筛选": "篩選",
  "国家": "國家",
  "运营中": "營運中",
  "地图": "地圖",
  "列表": "列表",
  "时间轴": "時間軸",
  "荷兰王国材料发现国家实验室（计划申请）": "荷蘭王國材料發現國家實驗室（計畫申請）",
  "自驱动实验室版图": "自驅動實驗室版圖",
  "隶属": "隸屬",
  "埃因霍温理工大学先进材料旗舰计划": "埃因霍溫理工大學先進材料旗艦計畫",
  "作者": "作者",
  "返回": "返回",
  "地点": "地點",
  "领域": "領域",
  "成熟度": "成熟度",
  "投资额": "投資額",
  "数据来源": "資料來源",
  "搜索实验室...": "搜尋實驗室...",
  "国家级 / 联盟": "國家級 / 聯盟",
  "学术 / 单一机构": "學術 / 單一機構",
  "商业与工业": "商業與工業",
  "实验室操作系统 / 基础设施": "實驗室作業系統 / 基礎設施",
  "运营中": "營運中",
  "原型 / 试点": "原型 / 試點",
  "概念 / 规划中": "概念 / 規劃中",
};
