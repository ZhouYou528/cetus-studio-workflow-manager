// 任务完成态 key 的唯一构造点。各视图勾选/统计/逾期判定都必须走这里,
// 否则临时任务跨天会"复活"(完成记录 key 与读取 key 对不上)。
//
// 规则:
//  - 项目联动任务:自带 completionKey('linked|tpl|proj' 等),原样用
//  - 临时任务:一次性完成,用固定哨兵 'once' 代替日期 → 完成一次永久完成
//  - 每日/每周/每月:按当天日期,每天独立
export function taskCompletionKey(
  task: { id: string; frequency?: string | null; completionKey?: string | null },
  todayKey: string,
): string {
  if (task.completionKey) return task.completionKey;
  if (task.frequency === '临时') return `${task.id}|once`;
  return `${task.id}|${todayKey}`;
}
