import { useSyncExternalStore } from 'react';

// 7 个主题,按 ISO 周数自动轮换(每周一换,无需后端、纯前端确定性计算)。
// 主题只改:强调色(checkbox/进度环/泛光)、顶栏 logo、加载图标、庆祝彩带。
// 全部原创致敬:emoji + 纯 CSS 精灵球,不打包任何官方素材。
//
// 应用方式:把强调色写进 :root 的 CSS 变量,index.css 里 .task-done 等用 var() 取。

export type Theme = {
  id: string;
  primary: string;        // 强调色(checkbox 填充 / 进度环 / 泛光)
  primaryRgb: string;     // "r,g,b" 给 rgba() 用
  logo: string;           // 顶栏 logo emoji;'' = 用纯 CSS 精灵球
  pokeball?: boolean;     // true 时 logo/加载用 .pkmn-ball
  confettiColors: string[]; // 庆祝彩带颗粒配色(普通颗粒,不用 emoji)
};

// 顺序即轮换顺序(用户指定):古典艺术→食物→捏捏玩具→宝可梦→金钱→水果→动物
export const THEMES: Theme[] = [
  {
    id: 'classical',
    primary: '#9b2335', primaryRgb: '155,35,53',
    logo: '🎨',
    confettiColors: ['#9b2335', '#c9a227', '#6b4226', '#d9c2a0', '#3b3024'],
  },
  {
    id: 'food',
    primary: '#e8552d', primaryRgb: '232,85,45',
    logo: '🍔',
    confettiColors: ['#e8552d', '#f4a300', '#c9302c', '#8b5a2b', '#ffd166'],
  },
  {
    id: 'squishy',
    primary: '#ff6fa5', primaryRgb: '255,111,165',
    logo: '🧸',
    confettiColors: ['#ff85a1', '#a0e7e5', '#fbe7c6', '#b4f8c8', '#ffaebc'],
  },
  {
    id: 'pokemon',
    primary: '#ee1515', primaryRgb: '238,21,21',
    logo: '', pokeball: true,
    confettiColors: ['#ee1515', '#f7f7f7', '#ffcb05', '#1b1b1b', '#3b4cca'],
  },
  {
    id: 'money',
    primary: '#1e7d3c', primaryRgb: '30,125,60',
    logo: '💰',
    confettiColors: ['#1e7d3c', '#ffcb05', '#2e8b57', '#d4af37', '#145a32'],
  },
  {
    id: 'fruit',
    primary: '#e63946', primaryRgb: '230,57,70',
    logo: '🍓',
    confettiColors: ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#d62828'],
  },
  {
    id: 'animal',
    primary: '#8d6e63', primaryRgb: '141,110,99',
    logo: '🐾',
    confettiColors: ['#8d6e63', '#f4a261', '#6d4c41', '#ffcc80', '#4e342e'],
  },
];

// ISO 8601 周数(周一为一周起点)
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;            // 周日=7
  t.setUTCDate(t.getUTCDate() + 4 - day);    // 移到本周周四
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// 当周主题(无手动覆盖时)
export function weeklyTheme(date = new Date()): Theme {
  return THEMES[isoWeek(date) % THEMES.length];
}

// ── 手动覆盖(localStorage 持久化 + 订阅器,改了能让组件重渲染)──
// 值为主题 id;'auto' = 跟随每周轮换。
const OVERRIDE_KEY = 'swm:themeOverride';

function readOverride(): string {
  if (typeof window === 'undefined') return 'auto';
  return localStorage.getItem(OVERRIDE_KEY) || 'auto';
}

type Listener = () => void;
let override = readOverride();
const listeners = new Set<Listener>();

// 解析最终生效主题:有合法覆盖用覆盖,否则跟随每周
export function activeTheme(date = new Date()): Theme {
  if (override !== 'auto') {
    const hit = THEMES.find((t) => t.id === override);
    if (hit) return hit;
  }
  return weeklyTheme(date);
}

// 把当前主题强调色写进 :root，index.css 用 var() 取。
export function applyTheme(t: Theme = activeTheme()): void {
  const r = document.documentElement.style;
  r.setProperty('--th-primary', t.primary);
  r.setProperty('--th-primary-rgb', t.primaryRgb);
}

// 当前覆盖值('auto' 或某主题 id),给下拉框回显
export function getThemeOverride(): string {
  return override;
}

// 设置覆盖:持久化 + 立即换色 + 通知订阅者重渲染
export function setThemeOverride(value: string): void {
  override = value;
  if (typeof window !== 'undefined') {
    if (value === 'auto') localStorage.removeItem(OVERRIDE_KEY);
    else localStorage.setItem(OVERRIDE_KEY, value);
  }
  applyTheme();
  listeners.forEach((l) => l());
}

export function subscribeTheme(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

// 组件用:订阅覆盖变化,返回当前生效主题(改主题时自动重渲染)
export function useActiveTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, () => activeTheme(), () => activeTheme());
}
