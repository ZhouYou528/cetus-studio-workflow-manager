// 应用全局类型 — 给 Phase 6b 抽出的组件 props 用。
// 数据形状与后端 D1 + lib/api.ts 中已有的同名类型保持一致。
// lib/api.ts 里那批 type 是为 fetch 响应而写;这里多了几个 UI 派生类型(Daily/Project/Album/Marketing 任务的运行时形状)。

export type Role = {
  id: string;
  name: string;
  icon: string | null;
  duties: string | null;
  color: string | null;
  isAssistant: boolean;
  supportsProjects: boolean;
  displayOrder: number;
};

export type Frequency = '每日' | '每周' | '每月' | '临时' | '项目联动';

export type Task = {
  id: string;
  roleId: string;
  name: string;
  frequency: Frequency;
  // 后端是 INTEGER,前端某些老代码当 string 用;UI 只是显示。
  duration: number | string | null;
  description: string | null;
  dueDate: string | null;
  isWeekly: boolean;
  createdAt: number;
  // 部分老代码读 ?? 1,DB 里没有这两列;保留可选以兼容
  weekday?: number;
  monthday?: number;
};

export type Project = {
  id: string;
  clientName: string;
  shootType: string;
  shootDate: string;
  location: string | null;
  notes: string | null;
  createdAt: number;
};

export type Album = {
  id: string;
  clientName: string;
  albumType: string | null;
  startDate: string;
  notes: string | null;
  createdAt: number;
};

// UI 运行时拼出来的"项目子任务"。getProjectTasks() / getAlbumTasks() 返回这种形状。
export type ProjectTask = {
  id: string;            // 模板 id,例如 'pt1_3'
  name: string;
  description: string;
  duration: number | string;
  roleId: string;
  projectId?: string;
  albumId?: string;
  daysBeforeShoot?: number;
  daysAfterStart?: number;
  dueDate: string;
  completionKey: string; // 'projectId|roleId|templateId' 或 'album|albumId|templateId'
  isAlbum?: boolean;     // TodayView 用来区分项目/相册任务
};

// Marketing 联动任务 — 由 getMarketingTasksForProject() 生成
export type MarketingTask = {
  id: string;
  templateId: 'mk_blog' | 'mk_ig' | 'mk_xhs';
  roleId: 'r7';
  name: string;
  description: string;
  duration: string;
  frequency: '项目联动';
  linkedProjectId: string;
  completionKey: string; // 'linked|templateId|projectId'
};

export type TrashType = 'task' | 'project' | 'album' | 'role';

export type TrashItem = {
  id: string;
  type: TrashType;
  // 经 normalizeTrashItem 转换后的形状(对齐原 Artifact 命名)
  item: unknown;
  relatedCompletions: Record<string, number>;
  deletedAt: number;
  _local?: boolean;
};

export type CompletionDict = Record<string, number | boolean>;

// Confirm 对话框 payload
export type ConfirmPayload = {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
};

// SplitModal AI 拆分结果
export type SplitStep = { name: string; duration: number; note: string };
export type SplitResult = { steps: SplitStep[] };
