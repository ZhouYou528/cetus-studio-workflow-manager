// @ts-nocheck — Artifact 原始 UI 代码。Phase 5 已把数据层从 window.storage 切到 API,
// 但组件代码仍保持 JS 风格;Phase 6 拆组件 + 加类型时移除此 pragma。
import React, { useState, useEffect } from 'react';
import { api, ApiError } from './lib/api';
import { Camera, Users, ListTodo, Bell, BarChart3, Plus, Edit2, Trash2, Check, X, ChevronDown, ChevronRight, Clock, AlertCircle, CheckCircle2, Calendar, Briefcase, Sparkles, Loader2, FolderOpen, MapPin, User, CalendarDays, Archive } from 'lucide-react';

const DEFAULT_ROLES = [
  { id: 'r1', name: '主摄影师', icon: '📸', isAssistant: false, supportsProjects: true, duties: '负责拍摄方案制定、现场拍摄主导、把控整体画面质量、与客户沟通拍摄需求', color: 'bg-blue-500' },
  { id: 'r2', name: '二摄', icon: '📷', isAssistant: false, supportsProjects: true, duties: '协助主摄完成拍摄、补充多角度素材、协助布光与器材准备、记录花絮(婚礼项目自动联动)', color: 'bg-cyan-500' },
  { id: 'r3', name: '修图师', icon: '🎨', isAssistant: false, supportsProjects: true, duties: '负责照片精修、调色、瑕疵处理、批量初修、风格统一把控', color: 'bg-purple-500' },
  { id: 'r4', name: '广告设计', icon: '🎯', isAssistant: true, supportsProjects: false, duties: '负责工作室宣传物料设计、海报、社交媒体视觉、活动banner等', color: 'bg-pink-500' },
  { id: 'r5', name: '相册设计', icon: '📔', isAssistant: false, supportsProjects: false, duties: '负责客户成品相册排版、装帧设计、印刷对接、成品质检', color: 'bg-amber-500' },
  { id: 'r6', name: '客服', icon: '💬', isAssistant: false, supportsProjects: false, duties: '咨询接待、订单沟通、客户回访、售后处理、合同签订', color: 'bg-green-500' },
  { id: 'r7', name: 'Marketing运营', icon: '📱', isAssistant: true, supportsProjects: false, duties: '社交媒体运营、内容发布、活动策划、引流推广、数据分析', color: 'bg-rose-500' },
  { id: 'r8', name: '道具采购与管理', icon: '🎭', isAssistant: false, supportsProjects: false, duties: '拍摄道具采购、库存管理、道具维护清洁、新品调研', color: 'bg-indigo-500' },
  { id: 'r9', name: '客户推广', icon: '📢', isAssistant: false, supportsProjects: false, duties: '寻找潜在客户、购买各平台广告、为广告设置预算、后期客户跟踪、转化率分析', color: 'bg-teal-500' },
  { id: 'r10', name: '财务管理', icon: '💰', isAssistant: true, supportsProjects: false, duties: '负责工作室收支记账、月度营收核算、成本预算管理、利润与ROI分析、现金流监控、税务对接、财务数据驱动经营决策', color: 'bg-emerald-500' },
];

const STORAGE_KEY = 'studio_workflow_data_v1';

const PROJECT_TASK_TEMPLATES = {
  r1: [
    { id: 'pt1_1', name: '客户前期沟通', daysBeforeShoot: 7, duration: 60, description: '与客户沟通拍摄风格、时间、地点、着装等关键事项' },
    { id: 'pt1_2', name: '制定拍摄计划', daysBeforeShoot: 5, duration: 90, description: '构思拍摄方案,包括场景、构图、流程' },
    { id: 'pt1_3', name: '器材整理与检查', daysBeforeShoot: 2, duration: 60, description: '整理器材,检查相机、镜头、电池、存储卡等是否完好' },
    { id: 'pt1_4', name: '拍摄前最后确认', daysBeforeShoot: 1, duration: 30, description: '与客户最后确认时间、地点、注意事项;查看天气' },
    { id: 'pt1_5', name: '现场拍摄执行', daysBeforeShoot: 0, duration: 480, description: '当天到场跟拍,完成所有计划镜头' },
    { id: 'pt1_6', name: '照片三重备份', daysBeforeShoot: -1, duration: 60, description: '拍摄当天或次日完成照片3组备份(本地+硬盘+云端)' },
  ],
  r2: [
    { id: 'pt2_1', name: '与主摄核对拍摄细节', daysBeforeShoot: 2, duration: 30, description: '核对地址、拍摄风格、新人姓名、拍摄时间、整体流程' },
    { id: 'pt2_2', name: '现场跟拍配合', daysBeforeShoot: 0, duration: 480, description: '按流程跟拍,补充多角度素材,协助主摄' },
    { id: 'pt2_3', name: '照片三份备份', daysBeforeShoot: -1, duration: 30, description: '保存三份备份(本地+硬盘+云端)' },
  ],
  r3: [
    { id: 'pt3_1', name: '照片导入选图软件', daysBeforeShoot: -1, duration: 30, description: '将原始素材导入选图软件,准备客户初选' },
    { id: 'pt3_2', name: '照片导入修图软件', daysBeforeShoot: -2, duration: 30, description: '将素材导入修图软件,建立工程文件' },
    { id: 'pt3_3', name: '整理照片顺序并归档', daysBeforeShoot: -2, duration: 60, description: '按拍摄顺序整理照片,放入指定客户文件夹' },
    { id: 'pt3_4', name: '照片调色', daysBeforeShoot: -3, duration: 180, description: '统一色调风格,完成基础调色' },
    { id: 'pt3_5', name: '照片预览修图', daysBeforeShoot: -4, duration: 240, description: '完成预览图修图,供客户初选参考' },
    { id: 'pt3_6', name: '上传到Pixieset', daysBeforeShoot: -5, duration: 30, description: '将预览图上传到Pixieset,发送链接给客户选图' },
    { id: 'pt3_7', name: '客户选图后精修', daysBeforeShoot: -10, duration: 480, description: '根据客户选图清单进行精修,交付最终成品' },
  ],
  r5: [
    { id: 'pt5_1', name: '沟通设计logo和封面', daysAfterStart: 0, duration: 60, description: '与客户沟通相册定制细节,包括logo设计、封面风格、色彩搭配' },
    { id: 'pt5_2', name: '整理照片', daysAfterStart: 3, duration: 90, description: '整理客户提供的照片素材,按故事线/时间线分类' },
    { id: 'pt5_3', name: '下载照片', daysAfterStart: 5, duration: 30, description: '从指定渠道(Pixieset/网盘等)下载所有所需精修照片' },
    { id: 'pt5_4', name: '上传照片并设计相册', daysAfterStart: 7, duration: 300, description: '将照片导入相册软件,完成所有页面的排版设计' },
    { id: 'pt5_5', name: '下订单', daysAfterStart: 14, duration: 30, description: '客户确认设计稿后,提交印刷订单' },
    { id: 'pt5_6', name: '送达相册', daysAfterStart: 30, duration: 60, description: '相册印刷完成后,跟进物流,确认客户收到成品' },
  ],
};

const SHOOT_TYPES = ['婚纱', '婚礼', '儿童写真', '家庭写真', '商业产品', '形象写真', '活动跟拍', '其他'];

const DEFAULT_TASKS = [
  { id: 't_lead_1', roleId: 'r1', name: '查看Google Calendar拍摄安排', frequency: '每日', duration: '10', description: '每天早上查看Google Calendar中新增或临近的拍摄任务,提前规划工作日程' },
  { id: 't_cs_1', roleId: 'r6', name: '回复邮件咨询', frequency: '每日', duration: '30', description: '回复客户邮件咨询,发送对应价格单。后续可在此添加邮件回复模板和价格链接。' },
  { id: 't_cs_2', roleId: 'r6', name: '回复Instagram私信/评论', frequency: '每日', duration: '20', description: '回复Instagram上的私信和评论咨询,语言风格偏国际化。后续可在此添加IG回复模板和价格链接。' },
  { id: 't_cs_3', roleId: 'r6', name: '回复小红书私信/评论', frequency: '每日', duration: '20', description: '回复小红书上的私信和评论咨询,语言风格本地化。后续可在此添加小红书回复模板和价格链接。' },
  { id: 't_cs_4', roleId: 'r6', name: '回复WhatsApp咨询', frequency: '每日', duration: '20', description: '回复WhatsApp上的客户咨询。后续可在此添加WhatsApp回复模板和价格链接。' },
  { id: 't_cs_5', roleId: 'r6', name: '价格单更新反馈', frequency: '临时', duration: '15', description: '若发现价格单需要更新,及时和设计/运营反馈,确保各平台价格统一' },
  { id: 't_mk_1', roleId: 'r7', name: '更新工作室网站及blog', frequency: '每周', duration: '120', description: '更新网站内容(作品案例、活动信息),撰写并发布blog文章' },
  { id: 't_mk_2', roleId: 'r7', name: '更新Instagram', frequency: '每周', duration: '60', description: '每周更新Instagram内容,保持账号活跃度' },
  { id: 't_mk_3', roleId: 'r7', name: '更新主账号小红书(2篇)', frequency: '每周', duration: '90', description: '每周发布2篇主账号小红书内容,内容覆盖工作室综合业务' },
  { id: 't_mk_4', roleId: 'r7', name: '更新婚礼小红书(2篇)', frequency: '每周', duration: '90', description: '每周发布2篇婚礼专项小红书,垂直运营婚礼客户' },
  { id: 't_promo_1', roleId: 'r9', name: '寻找潜在客户线索', frequency: '每日', duration: '60', description: '通过社交媒体、平台搜索、行业群组等渠道寻找潜在客户,记录线索信息' },
  { id: 't_promo_2', roleId: 'r9', name: '检查广告投放数据', frequency: '每日', duration: '30', description: '查看各平台广告(小红书/Instagram/抖音/微信等)的投放效果、点击率、转化数据' },
  { id: 't_promo_3', roleId: 'r9', name: '调整广告预算分配', frequency: '每周', duration: '60', description: '根据上周广告数据,调整各平台预算分配,优化投放效果' },
  { id: 't_promo_4', roleId: 'r9', name: '客户跟踪与回访', frequency: '每周', duration: '90', description: '跟进未成单客户、已成单客户回访,维护客户关系,挖掘复购和转介绍机会' },
  { id: 't_promo_5', roleId: 'r9', name: '广告创意素材制作', frequency: '每周', duration: '120', description: '为各平台广告制作/筛选投放素材(图文、短视频),配合广告设计完成创意' },
  { id: 't_promo_6', roleId: 'r9', name: '月度推广复盘', frequency: '每月', duration: '120', description: '复盘当月获客成本、ROI、客户来源渠道,优化下月推广策略' },
  { id: 't_fin_1', roleId: 'r10', name: '每日收支记账', frequency: '每日', duration: '30', description: '记录当日营业收入(订单金额、定金、尾款)和成本支出(器材、广告、杂费、外包费用),分类归入对应账目' },
  { id: 't_fin_2', roleId: 'r10', name: '应收应付跟踪', frequency: '每日', duration: '20', description: '跟进客户未收款项(尾款、相册余款),核对供应商应付账款,维护资金周转健康' },
  { id: 't_fin_3', roleId: 'r10', name: '周度营收对账', frequency: '每周', duration: '60', description: '对账银行流水、微信/支付宝/Stripe等收款渠道,核对本周所有订单收入与系统记录,确保账实一致' },
  { id: 't_fin_4', roleId: 'r10', name: '广告/营销支出复核', frequency: '每周', duration: '30', description: '与客户推广岗对接,核对各平台广告投放金额,记入营销成本,验证支出合理性' },
  { id: 't_fin_5', roleId: 'r10', name: '月度营业额结算', frequency: '每月', duration: '120', description: '汇总当月所有订单收入,生成营收报表(按拍摄类型/获客渠道/产品类别分类),输出月度营业额数据' },
  { id: 't_fin_6', roleId: 'r10', name: '月度成本与利润分析', frequency: '每月', duration: '120', description: '核算固定成本(场地租金、人工、器材折旧)、变动成本(每单耗材、外包修图费、道具消耗)、计算净利润和毛利率,识别成本优化空间' },
  { id: 't_fin_7', roleId: 'r10', name: '下月预算制定', frequency: '每月', duration: '90', description: '基于营收趋势和营销ROI数据,制定下月各部门预算分配(广告费、采购预算、人力支出、运营杂费),输出预算表给各岗位执行' },
  { id: 't_fin_8', roleId: 'r10', name: '季度财务报表与税务对接', frequency: '每月', duration: '90', description: '整理资产负债表/利润表,完成税务申报材料(增值税、所得税),对接外部会计师/税务师,确保税务合规' },
  
  // ── 本周待办(5/8 - 5/21) ──
  // 主摄影师任务
  { id: 't_week_1', roleId: 'r1', name: '【品牌】审查网站首页高端调性,更新主视觉与定位句', frequency: '临时', duration: '120', description: '【截止:5月8日】【优先级:高】审查工作室网站首页的高端调性,更新主视觉图片和品牌定位句,确保整体形象与目标客户群匹配', dueDate: '2026-05-08', isWeekly: true },
  { id: 't_week_4', roleId: 'r1', name: '【定价】审查套餐结构', frequency: '临时', duration: '90', description: '【截止:5月12日】【优先级:高】确认副摄配置、48h抢先预览、30天交付、实体相册选项是否到位,优化套餐组合', dueDate: '2026-05-12', isWeekly: true },
  { id: 't_week_8', roleId: 'r1', name: '【合作】主动联系温哥华高端场地或婚礼策划师', frequency: '临时', duration: '60', description: '【截止:5月13日】【优先级:中】主动联系1-2个温哥华高端场地或婚礼策划师,建立互相推荐关系', dueDate: '2026-05-13', isWeekly: true },
  { id: 't_week_12', roleId: 'r1', name: '【客户体验】梳理客户旅程全流程', frequency: '临时', duration: '120', description: '【截止:5月19日】【优先级:高】梳理客户旅程全流程:inquiry邮件 → 拍摄 → 48h预览 → 相册交付,每个环节检查品牌感', dueDate: '2026-05-19', isWeekly: true },
  { id: 't_week_15', roleId: 'r1', name: '【运营】两周复盘', frequency: '临时', duration: '90', description: '【截止:5月21日】【优先级:中】统计 inquiry 变化、Google 搜索展示次数、最高互动内容,制定下月目标', dueDate: '2026-05-21', isWeekly: true },
  
  // Marketing 运营任务
  { id: 't_week_2', roleId: 'r7', name: '【SEO】优化 Google Business Profile', frequency: '临时', duration: '60', description: '【截止:5月12日】【优先级:高】类别改为 Wedding Photographer、上传5张新照片、加入中英双语服务描述', dueDate: '2026-05-12', isWeekly: true },
  { id: 't_week_5', roleId: 'r7', name: '【SEO】新建或优化 FAQ 页面', frequency: '临时', duration: '120', description: '【截止:5月13日】【优先级:高】每题答案前两句必须直接给结论,中英双语各一版', dueDate: '2026-05-13', isWeekly: true },
  { id: 't_week_6', roleId: 'r7', name: '【社媒】Instagram 发布纪实幕后轮播', frequency: '临时', duration: '90', description: '【截止:5月12日】【优先级:高】5-8张情绪帧 + 叙事英文 caption,带温哥华地名,提及秋季档期', dueDate: '2026-05-12', isWeekly: true },
  { id: 't_week_7', roleId: 'r7', name: '【社媒】小红书发布图文笔记《温哥华婚礼纪实摄影是什么感觉?》', frequency: '临时', duration: '90', description: '【截止:5月13日】【优先级:高】真实案例攻略感结构,提升用户共鸣和转化', dueDate: '2026-05-13', isWeekly: true },
  { id: 't_week_9', roleId: 'r7', name: '【运营】15分钟周复盘对齐(与主理人对接)', frequency: '临时', duration: '15', description: '【截止:5月14日】【优先级:中】与 Marketing 助理15分钟周复盘,对齐第二周计划', dueDate: '2026-05-14', isWeekly: true },
  { id: 't_week_11', roleId: 'r7', name: '【内容】撰写长青 SEO 文章《温哥华婚礼摄影完整指南 2026》', frequency: '临时', duration: '240', description: '【截止:5月16日】【优先级:高】中英双版,开头直接给答案,作为长期获客内容', dueDate: '2026-05-16', isWeekly: true },
  
  // 客户推广任务
  { id: 't_week_3', roleId: 'r9', name: '【内容】整理 2-3 个完整婚礼叙事案例', frequency: '临时', duration: '180', description: '【截止:5月12日】【优先级:高】整理故事线案例(非精选集),用于品牌展示和客户教育', dueDate: '2026-05-12', isWeekly: true },
];

export default function StudioWorkflowManager() {
  const [activeTab, setActiveTab] = useState('today');
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [completions, setCompletions] = useState({});
  const [reminders, setReminders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectCompletions, setProjectCompletions] = useState({});
  const [albumDesigns, setAlbumDesigns] = useState([]);
  const [albumCompletions, setAlbumCompletions] = useState({});
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);
  const [splittingTask, setSplittingTask] = useState(null);
  const [splitResult, setSplitResult] = useState(null);
  const [splitting, setSplitting] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [showAddAlbum, setShowAddAlbum] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [expandedAlbum, setExpandedAlbum] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // {title, message, onConfirm}

  // ── 数据装载 ───────────────────────────────────────────
  // 启动时 GET /api/bootstrap 一次拿全部应用状态。后续状态改动由 updateXxx 增量同步。
  useEffect(() => {
    let cancelled = false;
    api.bootstrap().then((data) => {
      if (cancelled) return;
      setRoles(data.roles);
      setTasks(data.tasks);
      setProjects(data.projects);
      setAlbumDesigns(data.albumDesigns);
      setCompletions(data.completions);
      setProjectCompletions(data.projectCompletions);
      setAlbumCompletions(data.albumCompletions);
      setTrash(data.trash.map(normalizeTrashItem));
      setLoading(false);
    }).catch((e) => {
      console.error('Bootstrap error:', e);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── diff 助手 + 错误吞噬 ───────────────────────────────
  // 9 个 updateXxx 保持原签名(整数组/整对象传入),内部 diff 当前 state 与新值,
  // 触发增/删/改 API。组件代码 1 行不动。
  const diffArrays = (oldArr, newArr) => {
    const oldMap = new Map(oldArr.map(x => [x.id, x]));
    const newMap = new Map(newArr.map(x => [x.id, x]));
    return {
      added: newArr.filter(x => !oldMap.has(x.id)),
      removed: oldArr.filter(x => !newMap.has(x.id)),
      updated: newArr.filter(x => {
        const old = oldMap.get(x.id);
        return old && JSON.stringify(old) !== JSON.stringify(x);
      }),
    };
  };
  const diffObjects = (oldObj, newObj) => {
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    const added = [], removed = [];
    for (const k of allKeys) {
      const o = !!(oldObj || {})[k];
      const n = !!(newObj || {})[k];
      if (n && !o) added.push(k);
      else if (o && !n) removed.push(k);
    }
    return { added, removed };
  };
  // 404 在级联删除场景里是预期(任务被删后,其完成记录也被清,客户端可能滞后再 fire uncomplete)。
  // Phase 6 重构后可以更精准,Phase 5 先吞噬。
  const swallow = (p) => p.catch(e => {
    if (!(e instanceof ApiError) || e.status !== 404) console.error(e);
  });

  // ── 8 个标准 updateXxx ────────────────────────────────
  const updateRoles = (newRoles) => {
    const d = diffArrays(roles, newRoles);
    setRoles(newRoles);
    d.added.forEach(r => swallow(api.createRole(r)));
    d.removed.forEach(r => swallow(api.deleteRole(r.id)));
    d.updated.forEach(r => swallow(api.updateRole(r.id, r)));
  };
  const updateTasks = (newTasks) => {
    const d = diffArrays(tasks, newTasks);
    setTasks(newTasks);
    d.added.forEach(t => swallow(api.createTask(t)));
    d.removed.forEach(t => swallow(api.deleteTask(t.id)));
    d.updated.forEach(t => swallow(api.updateTask(t.id, t)));
  };
  const updateProjects = (newP) => {
    const d = diffArrays(projects, newP);
    setProjects(newP);
    d.added.forEach(p => swallow(api.createProject(p)));
    d.removed.forEach(p => swallow(api.deleteProject(p.id)));
    d.updated.forEach(p => swallow(api.updateProject(p.id, p)));
  };
  const updateAlbumDesigns = (newA) => {
    const d = diffArrays(albumDesigns, newA);
    setAlbumDesigns(newA);
    d.added.forEach(a => swallow(api.createAlbum(a)));
    d.removed.forEach(a => swallow(api.deleteAlbum(a.id)));
    d.updated.forEach(a => swallow(api.updateAlbum(a.id, a)));
  };

  // ── 3 个 completion 字典 updateXxx ────────────────────
  const updateCompletions = (newC) => {
    const { added, removed } = diffObjects(completions, newC);
    setCompletions(newC);
    const today = new Date().toISOString().slice(0, 10);
    const handle = (key, complete) => {
      if (key.startsWith('linked|')) {
        const [, tplId, pid] = key.split('|');
        swallow(complete ? api.completeProjectTask(pid, tplId, 'r7') : api.uncompleteProjectTask(pid, tplId, 'r7'));
      } else {
        const idx = key.indexOf('|');
        const taskId = idx >= 0 ? key.slice(0, idx) : key;
        const date = idx >= 0 ? key.slice(idx + 1) : today;
        swallow(complete ? api.completeTask(taskId, date) : api.uncompleteTask(taskId, date));
      }
    };
    added.forEach(k => handle(k, true));
    removed.forEach(k => handle(k, false));
  };
  const updateProjectCompletions = (newPC) => {
    const { added, removed } = diffObjects(projectCompletions, newPC);
    setProjectCompletions(newPC);
    for (const k of added) {
      const [pid, rid, tid] = k.split('|');
      swallow(api.completeProjectTask(pid, tid, rid));
    }
    for (const k of removed) {
      const [pid, rid, tid] = k.split('|');
      swallow(api.uncompleteProjectTask(pid, tid, rid));
    }
  };
  const updateAlbumCompletions = (newAC) => {
    const { added, removed } = diffObjects(albumCompletions, newAC);
    setAlbumCompletions(newAC);
    for (const k of added) {
      const [, aid, tid] = k.split('|');
      swallow(api.completeAlbumTask(aid, tid));
    }
    for (const k of removed) {
      const [, aid, tid] = k.split('|');
      swallow(api.uncompleteAlbumTask(aid, tid));
    }
  };

  // ── trash 状态 + reminders 占位 ───────────────────────
  // trash 的 API 调用走专门的 4 个处理函数(下面),updateTrash 仅负责本地 state。
  const updateTrash = (newT) => setTrash(newT);
  // reminders 当前未持久化(原 Artifact 也很少用);Phase 6+ 决定是否上服务器
  const updateReminders = (newR) => setReminders(newR);

  // ── 回收站操作 ─────────────────────────────────────────
  // 后台 trash 项目由 api.deleteX 在服务器端创建;本地 moveToTrash 先乐观追加一条
  // _local 占位,然后 1 秒后刷新 trash 拿真实 id。
  const refreshTrash = async () => {
    try {
      const { items } = await api.listTrash();
      setTrash(items.map(normalizeTrashItem));
    } catch (e) {
      console.error('refresh trash:', e);
    }
  };
  const moveToTrash = (type, item, relatedCompletions = {}) => {
    const optimistic = {
      id: `trash_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type, item,
      relatedCompletions: relatedCompletions || {},
      deletedAt: Date.now(),
      _local: true,
    };
    setTrash([optimistic, ...trash]);
    setTimeout(refreshTrash, 1000);
  };

  const restoreFromTrash = async (trashId) => {
    const trashItem = trash.find(t => t.id === trashId);
    if (!trashItem) return;
    if (trashItem._local) {
      // 本会话刚删除的项目还没拿到真实 trash id,等刷新
      await refreshTrash();
      alert('正在与服务器同步,请稍后再试');
      return;
    }
    try {
      await api.restoreTrash(trashId);
    } catch (e) {
      console.error('Restore error:', e);
      alert('恢复失败,请重试');
      return;
    }
    // 服务器已 INSERT 回原表 + 完成记录,这里只更新本地 state(不调 API)
    setTrash(trash.filter(t => t.id !== trashId));
    if (trashItem.type === 'task') {
      if (!tasks.some(t => t.id === trashItem.item.id)) setTasks([...tasks, trashItem.item]);
      if (trashItem.relatedCompletions) setCompletions({ ...completions, ...trashItem.relatedCompletions });
    } else if (trashItem.type === 'project') {
      if (!projects.some(p => p.id === trashItem.item.id)) setProjects([...projects, trashItem.item]);
      if (trashItem.relatedCompletions) setProjectCompletions({ ...projectCompletions, ...trashItem.relatedCompletions });
    } else if (trashItem.type === 'album') {
      if (!albumDesigns.some(a => a.id === trashItem.item.id)) setAlbumDesigns([...albumDesigns, trashItem.item]);
      if (trashItem.relatedCompletions) setAlbumCompletions({ ...albumCompletions, ...trashItem.relatedCompletions });
    } else if (trashItem.type === 'role') {
      const role = trashItem.item.role;
      if (role && !roles.some(r => r.id === role.id)) setRoles([...roles, role]);
      if (trashItem.item.tasks?.length) {
        const newTasks = trashItem.item.tasks.filter(t => !tasks.some(x => x.id === t.id));
        if (newTasks.length) setTasks([...tasks, ...newTasks]);
      }
    }
  };

  const permanentlyDelete = async (trashId) => {
    const trashItem = trash.find(t => t.id === trashId);
    if (!trashItem) return;
    if (!trashItem._local) {
      try { await api.deleteTrash(trashId); } catch (e) { console.error(e); }
    }
    setTrash(trash.filter(t => t.id !== trashId));
  };

  const emptyTrash = async () => {
    try { await api.emptyTrash(); } catch (e) { console.error(e); }
    setTrash([]);
  };

  // 把后端 trash item 形状映射回原 Artifact 字段命名,让 TrashView 不用改
  function normalizeTrashItem(t) {
    const related = t.relatedData || null;
    const relatedCompletions = {};
    if (t.type === 'task' && related?.task_completions) {
      for (const r of related.task_completions) {
        relatedCompletions[`${r.taskId}|${r.completionDate}`] = r.completedAt;
      }
    } else if (t.type === 'project' && related?.project_completions) {
      for (const r of related.project_completions) {
        if (r.roleId === 'r7') {
          // Marketing 联动恢复时进 completions(原前端约定),不是 projectCompletions
          relatedCompletions[`linked|${r.taskTemplateId}|${r.projectId}`] = r.completedAt;
        } else {
          relatedCompletions[`${r.projectId}|${r.roleId}|${r.taskTemplateId}`] = r.completedAt;
        }
      }
    } else if (t.type === 'album' && related?.album_completions) {
      for (const r of related.album_completions) {
        relatedCompletions[`album|${r.albumId}|${r.taskTemplateId}`] = r.completedAt;
      }
    }
    return {
      id: t.id,
      type: t.type,
      item: t.itemData,
      relatedCompletions,
      deletedAt: t.deletedAt,
    };
  }

  const getProjectTasks = (project, roleId) => {
    const targetRoleId = roleId || project.roleId || 'r1';
    const template = PROJECT_TASK_TEMPLATES[targetRoleId] || [];
    const shootDate = new Date(project.shootDate + 'T00:00:00');
    return template.map(t => {
      const dueDate = new Date(shootDate);
      dueDate.setDate(dueDate.getDate() - t.daysBeforeShoot);
      return {
        ...t,
        roleId: targetRoleId,
        dueDate: dueDate.toISOString().split('T')[0],
        projectId: project.id,
        completionKey: `${project.id}|${targetRoleId}|${t.id}`,
      };
    });
  };

  const getAlbumTasks = (album) => {
    const template = PROJECT_TASK_TEMPLATES.r5 || [];
    const startDate = new Date(album.startDate + 'T00:00:00');
    return template.map(t => {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + t.daysAfterStart);
      return {
        ...t,
        roleId: 'r5',
        dueDate: dueDate.toISOString().split('T')[0],
        albumId: album.id,
        completionKey: `album|${album.id}|${t.id}`,
      };
    });
  };

  const isShootingCompleted = (project) => {
    const mainPhotographerTasks = getProjectTasks(project, 'r1');
    return mainPhotographerTasks.every(t => projectCompletions[t.completionKey]);
  };

  const getMarketingTasksForProject = (project) => {
    if (project.shootType !== '婚礼' && project.shootType !== '婚纱') return [];
    const mk = (tplId, name, duration, description) => ({
      id: `${tplId}_${project.id}`,
      templateId: tplId,
      roleId: 'r7',
      name, frequency: '项目联动', duration, description,
      linkedProjectId: project.id,
      completionKey: `linked|${tplId}|${project.id}`,
    });
    return [
      mk('mk_blog', `撰写【${project.clientName}${project.shootType}】博客文章`, '90', `为客户【${project.clientName}】的${project.shootType}拍摄撰写博客内容,发布到工作室网站blog`),
      mk('mk_ig',   `在Instagram发布【${project.clientName}${project.shootType}】拼图`, '60', `挑选精修图制作Instagram拼图,发布到工作室Instagram账号`),
      mk('mk_xhs',  `在小红书婚礼账号发布【${project.clientName}${project.shootType}】成片`, '60', `挑选精修成片,撰写文案,发布到小红书婚礼账号`),
    ];
  };

  const getVisibleProjectsForRole = (roleId) => {
    if (roleId === 'r1') return projects;
    if (roleId === 'r2') return projects.filter(p => p.shootType === '婚礼');
    if (roleId === 'r3') return projects.filter(p => isShootingCompleted(p));
    return [];
  };

  const getLinkedTasksForRole = (roleId) => {
    if (roleId !== 'r7') return [];
    const linkedTasks = [];
    projects.forEach(p => {
      if (isShootingCompleted(p)) {
        linkedTasks.push(...getMarketingTasksForProject(p));
      }
    });
    return linkedTasks;
  };

  const splitTask = async (task) => {
    setSplitting(true);
    setSplitResult(null);
    setSplittingTask(task);
    try {
      const role = roles.find(r => r.id === task.roleId);
      const prompt = `你是一个专业的摄影工作室管理顾问。请将以下任务拆分成具体可执行的步骤(5-10步),每步包含:步骤名称、预计耗时(分钟)、注意事项。

职位:${role?.name || '未指定'}
任务名称:${task.name}
任务描述:${task.description || '无'}
任务频率:${task.frequency || '项目制'}

请只返回JSON格式,不要任何其他内容,格式如下:
{
  "steps": [
    {"name": "步骤名称", "duration": 30, "note": "注意事项"}
  ],
  "totalTime": 总耗时分钟数,
  "tips": "整体执行建议"
}`;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await response.json();
      const text = data.content.map(i => i.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setSplitResult(parsed);
    } catch (err) {
      console.error('Split failed:', err);
      setSplitResult({ error: '拆分失败,请重试' });
    }
    setSplitting(false);
  };

  const todayKey = new Date().toISOString().split('T')[0];
  
  const allLinkedTasks = [];
  roles.forEach(r => {
    if (r.id === 'r7') {
      allLinkedTasks.push(...getLinkedTasksForRole(r.id));
    }
  });
  
  const todayTasks = [
    ...tasks.filter(t => {
      if (t.frequency === '每日') return true;
      if (t.frequency === '每周' && new Date().getDay() === (t.weekday ?? 1)) return true;
      if (t.frequency === '每月' && new Date().getDate() === (t.monthday ?? 1)) return true;
      return false;
    }),
    ...allLinkedTasks,
  ];
  const completedToday = todayTasks.filter(t => {
    const key = t.frequency === '项目联动' ? t.completionKey : `${t.id}|${todayKey}`;
    return completions[key];
  }).length;

  const getTodayProjectTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    const result = [];
    projects.forEach(project => {
      ['r1', 'r3'].forEach(roleId => {
        if (roleId === 'r3' && !isShootingCompleted(project)) return;
        const projectTasks = getProjectTasks(project, roleId);
        projectTasks.forEach(t => {
          if (t.dueDate <= today && !projectCompletions[t.completionKey]) {
            result.push({ ...t, project });
          }
        });
      });
      if (project.shootType === '婚礼') {
        const r2Tasks = getProjectTasks(project, 'r2');
        r2Tasks.forEach(t => {
          if (t.dueDate <= today && !projectCompletions[t.completionKey]) {
            result.push({ ...t, project });
          }
        });
      }
    });
    albumDesigns.forEach(album => {
      const albumTasks = getAlbumTasks(album);
      albumTasks.forEach(t => {
        if (t.dueDate <= today && !albumCompletions[t.completionKey]) {
          result.push({ ...t, album, isAlbum: true });
        }
      });
    });
    return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-600 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">摄影工作室管理台</h1>
                <p className="text-xs text-slate-500">全流程任务管理 · {roles.length}个职位 · {projects.length}个项目</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <div className="text-slate-500 text-xs">今日进度</div>
                <div className="font-semibold text-slate-900">{completedToday}/{todayTasks.length}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center relative">
                <svg className="w-12 h-12 transform -rotate-90 absolute">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="text-slate-200" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" 
                    strokeDasharray={`${todayTasks.length > 0 ? (completedToday/todayTasks.length) * 125.6 : 0} 125.6`}
                    className="text-emerald-500 transition-all" />
                </svg>
                <span className="text-xs font-bold text-slate-700">
                  {todayTasks.length > 0 ? Math.round((completedToday/todayTasks.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-1 -mb-4 overflow-x-auto">
            {[
              { id: 'today', label: '今日待办', icon: Calendar },
              { id: 'weekly', label: '本周待办', icon: CalendarDays },
              { id: 'roles', label: '职位职责', icon: Users },
              { id: 'stats', label: '进度统计', icon: BarChart3 },
              { id: 'trash', label: '回收站', icon: Archive, badge: trash.length },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full">{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'today' && (
          <TodayView 
            todayTasks={todayTasks} roles={roles} completions={completions} todayKey={todayKey}
            updateCompletions={updateCompletions} splitTask={splitTask}
            projectTasks={getTodayProjectTasks()} projectCompletions={projectCompletions}
            updateProjectCompletions={updateProjectCompletions}
            albumCompletions={albumCompletions} updateAlbumCompletions={updateAlbumCompletions}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyView
            tasks={tasks} roles={roles} completions={completions} todayKey={todayKey}
            updateCompletions={updateCompletions} splitTask={splitTask}
            onEdit={setEditingTask}
            onDelete={(t) => {
              setConfirmDialog({
                title: `删除任务"${t.name}"?`,
                message: `该任务将移至回收站,你可以在回收站中恢复或永久删除。`,
                onConfirm: () => {
                  const relatedC = {};
                  Object.keys(completions).forEach(key => {
                    if (key.startsWith(`${t.id}_`)) relatedC[key] = completions[key];
                  });
                  moveToTrash('task', t, relatedC);
                  updateTasks(tasks.filter(x => x.id !== t.id));
                  const cleaned = { ...completions };
                  Object.keys(cleaned).forEach(key => {
                    if (key.startsWith(`${t.id}_`)) delete cleaned[key];
                  });
                  updateCompletions(cleaned);
                  setConfirmDialog(null);
                }
              });
            }}
          />
        )}

        {activeTab === 'trash' && (
          <TrashView trash={trash} roles={roles}
            onRestore={restoreFromTrash} onPermanentDelete={permanentlyDelete} onEmptyTrash={emptyTrash}
            setConfirmDialog={setConfirmDialog} />
        )}

        {activeTab === 'roles' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">核心职位</h2>
                <p className="text-sm text-slate-500 mt-0.5">点击职位查看拍摄项目和日常任务 · 共{roles.length}个职位</p>
              </div>
              <button onClick={() => setShowAddRole(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition">
                <Plus className="w-4 h-4" />添加职位
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map(role => {
                const linkedTasks = getLinkedTasksForRole(role.id);
                const roleTasks = [...tasks.filter(t => t.roleId === role.id), ...linkedTasks];
                const roleProjects = role.supportsProjects ? getVisibleProjectsForRole(role.id) : [];
                
                const uncompletedDaily = roleTasks.filter(t => {
                  const isLinked = t.frequency === '项目联动';
                  if (isLinked) return !completions[t.completionKey];
                  const isToday = (t.frequency === '每日') || 
                    (t.frequency === '每周' && new Date().getDay() === (t.weekday ?? 1)) ||
                    (t.frequency === '每月' && new Date().getDate() === (t.monthday ?? 1));
                  return isToday && !completions[`${t.id}|${todayKey}`];
                }).length;
                
                const uncompletedProjectTasks = roleProjects.reduce((sum, p) => {
                  const pTasks = getProjectTasks(p, role.id);
                  return sum + pTasks.filter(t => !projectCompletions[t.completionKey] && t.dueDate <= todayKey).length;
                }, 0);
                
                const totalUncompleted = uncompletedDaily + uncompletedProjectTasks;
                const isExpanded = expandedRole === role.id;
                
                return (
                  <div key={role.id} className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${isExpanded ? 'md:col-span-2 border-slate-300' : 'border-slate-200'}`}>
                    <div className="p-4 cursor-pointer" onClick={() => setExpandedRole(isExpanded ? null : role.id)}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center text-lg shrink-0`}>
                          {role.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{role.name}</h3>
                            {role.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">助理</span>}
                            {totalUncompleted > 0 && <span className="ml-auto text-xs px-2 py-0.5 bg-rose-500 text-white rounded-full font-medium">{totalUncompleted} 待办</span>}
                            {totalUncompleted === 0 && (roleTasks.length > 0 || roleProjects.length > 0) && (
                              <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />全部完成
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{role.duties}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span>{roleTasks.length} 日常任务</span>
                            {role.supportsProjects && <span>· {roleProjects.length} 拍摄项目</span>}
                            {role.id === 'r5' && <span>· {albumDesigns.length} 相册设计</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isExpanded && (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setConfirmDialog({
                                  title: `删除职位"${role.name}"?`,
                                  message: `该职位下的相关任务也会一并放入回收站,你可以稍后在回收站中恢复。`,
                                  onConfirm: () => {
                                    const roleRelatedTasks = tasks.filter(t => t.roleId === role.id);
                                    moveToTrash('role', { role, tasks: roleRelatedTasks });
                                    updateRoles(roles.filter(r => r.id !== role.id));
                                    updateTasks(tasks.filter(t => t.roleId !== role.id));
                                    setExpandedRole(null);
                                    setConfirmDialog(null);
                                  }
                                });
                              }}
                              className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
                              title="删除整个职位"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50">
                        <div className="p-4 border-b border-slate-200 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">职责详情</span>
                            <button onClick={(e) => { e.stopPropagation(); setEditingRole(role); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="编辑">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-sm text-slate-700">{role.duties}</p>
                        </div>

                        {role.supportsProjects && (
                          <div className="p-4 border-b border-slate-200 bg-blue-50/30">
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-semibold text-slate-800">拍摄项目</span>
                                {role.id === 'r2' && <span className="text-xs px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded">🔗 婚礼联动</span>}
                                {role.id === 'r3' && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">🔗 自动联动</span>}
                                {uncompletedProjectTasks > 0 && <span className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded">{uncompletedProjectTasks} 待办</span>}
                              </div>
                              {role.id !== 'r3' && role.id !== 'r2' && (
                                <button onClick={(e) => { e.stopPropagation(); setShowAddProject(role.id); }}
                                  className="text-xs text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium">
                                  <Plus className="w-3.5 h-3.5" />新增拍摄
                                </button>
                              )}
                            </div>
                            {roleProjects.length === 0 ? (
                              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-6 text-center">
                                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">
                                  {role.id === 'r3' ? '暂无可修图项目' : role.id === 'r2' ? '暂无婚礼项目' : '暂无拍摄项目'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {role.id === 'r3' ? '主摄完成所有拍摄任务后,项目会自动出现在这里' : role.id === 'r2' ? '主摄添加婚礼类型拍摄后,项目会自动出现在这里' : '点击"新增拍摄"添加客户项目'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {[...roleProjects].sort((a, b) => a.shootDate.localeCompare(b.shootDate)).map(p => (
                                  <ProjectCard key={`${p.id}_${role.id}`} project={p}
                                    tasks={getProjectTasks(p, role.id)} completions={projectCompletions} updateCompletions={updateProjectCompletions}
                                    expanded={expandedProject === `${p.id}_${role.id}`}
                                    onToggle={() => setExpandedProject(expandedProject === `${p.id}_${role.id}` ? null : `${p.id}_${role.id}`)}
                                    onEdit={() => setEditingProject(p)}
                                    onDelete={() => {
                                      setConfirmDialog({
                                        title: `删除项目"${p.clientName} - ${p.shootType}"?`,
                                        message: `该项目将移至回收站,你可以在回收站中恢复或永久删除。`,
                                        onConfirm: () => {
                                          const relatedC = {};
                                          Object.keys(projectCompletions).forEach(key => {
                                            if (key.startsWith(`${p.id}_`)) relatedC[key] = projectCompletions[key];
                                          });
                                          moveToTrash('project', p, relatedC);
                                          updateProjects(projects.filter(x => x.id !== p.id));
                                          const cleanedCompletions = { ...projectCompletions };
                                          Object.keys(cleanedCompletions).forEach(key => {
                                            if (key.startsWith(`${p.id}_`)) delete cleanedCompletions[key];
                                          });
                                          updateProjectCompletions(cleanedCompletions);
                                          setConfirmDialog(null);
                                        }
                                      });
                                    }}
                                    isPast={p.shootDate < todayKey} onSplit={splitTask} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {role.id === 'r5' && (
                          <div className="p-4 border-b border-slate-200 bg-amber-50/30">
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-semibold text-slate-800">相册设计</span>
                                {(() => {
                                  const todoCount = albumDesigns.reduce((sum, a) => {
                                    const aTasks = getAlbumTasks(a);
                                    return sum + aTasks.filter(t => !albumCompletions[t.completionKey] && t.dueDate <= todayKey).length;
                                  }, 0);
                                  return todoCount > 0 ? <span className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded">{todoCount} 待办</span> : null;
                                })()}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setShowAddAlbum(true); }}
                                className="text-xs text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium">
                                <Plus className="w-3.5 h-3.5" />新增设计
                              </button>
                            </div>
                            {albumDesigns.length === 0 ? (
                              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-6 text-center">
                                <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">暂无相册设计</p>
                                <p className="text-xs text-slate-400 mt-1">点击"新增设计"添加相册定制项目</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {[...albumDesigns].sort((a, b) => b.startDate.localeCompare(a.startDate)).map(album => (
                                  <AlbumCard key={album.id} album={album} tasks={getAlbumTasks(album)}
                                    completions={albumCompletions} updateCompletions={updateAlbumCompletions}
                                    expanded={expandedAlbum === album.id}
                                    onToggle={() => setExpandedAlbum(expandedAlbum === album.id ? null : album.id)}
                                    onEdit={() => setEditingAlbum(album)}
                                    onDelete={() => {
                                      setConfirmDialog({
                                        title: `删除相册设计"${album.clientName}"?`,
                                        message: `该相册设计将移至回收站,你可以在回收站中恢复或永久删除。`,
                                        onConfirm: () => {
                                          const relatedC = {};
                                          Object.keys(albumCompletions).forEach(key => {
                                            if (key.startsWith(`album|${album.id}|`)) relatedC[key] = albumCompletions[key];
                                          });
                                          moveToTrash('album', album, relatedC);
                                          updateAlbumDesigns(albumDesigns.filter(x => x.id !== album.id));
                                          const cleaned = { ...albumCompletions };
                                          Object.keys(cleaned).forEach(key => {
                                            if (key.startsWith(`album|${album.id}|`)) delete cleaned[key];
                                          });
                                          updateAlbumCompletions(cleaned);
                                          setConfirmDialog(null);
                                        }
                                      });
                                    }} onSplit={splitTask} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <ListTodo className="w-4 h-4 text-slate-600" />
                              <span className="text-sm font-semibold text-slate-700">日常任务清单</span>
                              {role.id === 'r7' && linkedTasks.length > 0 && <span className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded">🔗 含项目联动</span>}
                              {uncompletedDaily > 0 && <span className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded">{uncompletedDaily} 待办</span>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setShowAddTask(role.id); }}
                              className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 py-1 hover:bg-white rounded">
                              <Plus className="w-3 h-3" />添加任务
                            </button>
                          </div>
                          {roleTasks.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">暂无日常任务,点击添加</p>
                          ) : (
                            <div className="space-y-1.5">
                              {roleTasks.map(t => {
                                const isLinked = t.frequency === '项目联动';
                                const completionKey = isLinked ? t.completionKey : `${t.id}|${todayKey}`;
                                const isCompleted = completions[completionKey];
                                const isToday = isLinked || (t.frequency === '每日') || 
                                  (t.frequency === '每周' && new Date().getDay() === (t.weekday ?? 1)) ||
                                  (t.frequency === '每月' && new Date().getDate() === (t.monthday ?? 1));
                                
                                return (
                                  <div key={t.id} className={`bg-white rounded-lg p-2.5 flex items-center gap-2.5 ${isLinked ? 'border border-rose-200 bg-rose-50/30' : (isToday && !isCompleted ? 'border border-blue-200' : '')}`}>
                                    {(isToday || isLinked) && (
                                      <button onClick={(e) => { e.stopPropagation(); updateCompletions({ ...completions, [completionKey]: !isCompleted }); }}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                        {isCompleted && <Check className="w-3 h-3 text-white" />}
                                      </button>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'} truncate`}>{t.name}</div>
                                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                        {isLinked ? (
                                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium">🔗 项目联动</span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 bg-slate-100 rounded">{t.frequency}</span>
                                        )}
                                        {t.duration && <span>{t.duration}分钟</span>}
                                        {!isLinked && isToday && !isCompleted && <span className="text-blue-600 font-medium">· 今日</span>}
                                      </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); splitTask(t); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="AI拆分">
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                    {!isLinked && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingTask(t); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="编辑">
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { 
                                          e.stopPropagation();
                                          setConfirmDialog({
                                            title: `删除任务"${t.name}"?`,
                                            message: `该任务将移至回收站,你可以在回收站中恢复或永久删除。`,
                                            onConfirm: () => {
                                              const relatedC = {};
                                              Object.keys(completions).forEach(key => {
                                                if (key.startsWith(`${t.id}_`)) relatedC[key] = completions[key];
                                              });
                                              moveToTrash('task', t, relatedC);
                                              updateTasks(tasks.filter(x => x.id !== t.id));
                                              const cleaned = { ...completions };
                                              Object.keys(cleaned).forEach(key => {
                                                if (key.startsWith(`${t.id}_`)) delete cleaned[key];
                                              });
                                              updateCompletions(cleaned);
                                              setConfirmDialog(null);
                                            }
                                          });
                                        }} className="p-1.5 hover:bg-rose-50 rounded text-rose-500" title="删除">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-5">进度统计</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">职位总数</div>
                <div className="text-2xl font-bold text-slate-900">{roles.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">任务总数</div>
                <div className="text-2xl font-bold text-slate-900">{tasks.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">拍摄项目</div>
                <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 mb-1">今日完成率</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {todayTasks.length > 0 ? Math.round((completedToday/todayTasks.length) * 100) : 0}%
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">各职位任务分布</h3>
              <div className="space-y-3">
                {roles.map(role => {
                  const count = tasks.filter(t => t.roleId === role.id).length;
                  const max = Math.max(...roles.map(r => tasks.filter(t => t.roleId === r.id).length), 1);
                  return (
                    <div key={role.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <span>{role.icon}</span>
                          <span className="text-slate-700">{role.name}</span>
                          {role.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">助理</span>}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${role.color} transition-all`} style={{ width: `${(count/max)*100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {(showAddRole || editingRole) && (
        <RoleModal role={editingRole}
          onClose={() => { setShowAddRole(false); setEditingRole(null); }}
          onSave={(roleData) => {
            if (editingRole) updateRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...roleData } : r));
            else updateRoles([...roles, { id: `r${Date.now()}`, ...roleData }]);
            setShowAddRole(false); setEditingRole(null);
          }} />
      )}

      {(showAddTask || editingTask) && (
        <TaskModal task={editingTask} roles={roles}
          defaultRoleId={typeof showAddTask === 'string' ? showAddTask : null}
          onClose={() => { setShowAddTask(false); setEditingTask(null); }}
          onSave={(taskData) => {
            if (editingTask) updateTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
            else updateTasks([...tasks, { id: `t${Date.now()}`, ...taskData }]);
            setShowAddTask(false); setEditingTask(null);
          }} />
      )}

      {splittingTask && (
        <SplitModal task={splittingTask} result={splitResult} loading={splitting}
          onClose={() => { setSplittingTask(null); setSplitResult(null); }} />
      )}

      {(showAddProject || editingProject) && (
        <ProjectModal project={editingProject}
          defaultRoleId={typeof showAddProject === 'string' ? showAddProject : 'r1'}
          onClose={() => { setShowAddProject(false); setEditingProject(null); }}
          onSave={(projectData) => {
            if (editingProject) updateProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...projectData } : p));
            else updateProjects([...projects, { id: `p${Date.now()}`, ...projectData }]);
            setShowAddProject(false); setEditingProject(null);
          }} />
      )}

      {(showAddAlbum || editingAlbum) && (
        <AlbumModal album={editingAlbum}
          onClose={() => { setShowAddAlbum(false); setEditingAlbum(null); }}
          onSave={(albumData) => {
            if (editingAlbum) updateAlbumDesigns(albumDesigns.map(a => a.id === editingAlbum.id ? { ...a, ...albumData } : a));
            else updateAlbumDesigns([...albumDesigns, { id: `album${Date.now()}`, ...albumData }]);
            setShowAddAlbum(false); setEditingAlbum(null);
          }} />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, message, danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
            <AlertCircle className={`w-5 h-5 ${danger ? 'text-rose-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
            {message && <p className="text-sm text-slate-600 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {danger ? '永久删除' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleModal({ role, onClose, onSave }) {
  const [name, setName] = useState(role?.name || '');
  const [icon, setIcon] = useState(role?.icon || '👤');
  const [duties, setDuties] = useState(role?.duties || '');
  const [isAssistant, setIsAssistant] = useState(role?.isAssistant || false);
  const [color, setColor] = useState(role?.color || 'bg-slate-500');
  const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-green-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500'];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{role ? '编辑职位' : '添加职位'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">职位名称</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">图标(emoji)</label>
            <input value={icon} onChange={e => setIcon(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" maxLength={2} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">颜色</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg ${c} ${color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">基本职责</label>
            <textarea value={duties} onChange={e => setDuties(e.target.value)} rows={3}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAssistant} onChange={e => setIsAssistant(e.target.checked)} className="rounded" />
            <span>由助理负责</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => name.trim() && onSave({ name, icon, duties, isAssistant, color })}
            disabled={!name.trim()} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, roles, defaultRoleId, onClose, onSave }) {
  const [name, setName] = useState(task?.name || '');
  const [roleId, setRoleId] = useState(task?.roleId || defaultRoleId || roles[0]?.id);
  const [frequency, setFrequency] = useState(task?.frequency || '每日');
  const [duration, setDuration] = useState(task?.duration || '');
  const [description, setDescription] = useState(task?.description || '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{task ? '编辑任务' : '添加任务'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">任务名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">所属职位</label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
              {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">频率</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option>每日</option><option>每周</option><option>每月</option><option>临时</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">耗时(分钟)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <p className="text-xs text-slate-500">💡 项目制任务请在「拍摄项目」中管理</p>
          <div>
            <label className="text-sm font-medium text-slate-700">任务描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => name.trim() && roleId && onSave({ name, roleId, frequency, duration, description })}
            disabled={!name.trim() || !roleId} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}

function SplitModal({ task, result, loading, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /><h3 className="text-lg font-semibold">任务拆分</h3></div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 mb-1">任务名称</div>
          <div className="font-medium text-slate-900">{task.name}</div>
        </div>
        {loading && (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">AI正在分析并拆分任务...</p>
          </div>
        )}
        {!loading && result?.error && (
          <div className="py-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">{result.error}</p>
          </div>
        )}
        {!loading && result?.steps && (
          <div>
            <div className="flex items-center gap-3 mb-3 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4" /><span>预计总耗时:<strong className="text-slate-900">{result.totalTime}分钟</strong></span>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {result.steps.map((step, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-slate-900 text-sm">{step.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{step.duration}分钟</div>
                      </div>
                      {step.note && <div className="text-xs text-slate-600 mt-1">💡 {step.note}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {result.tips && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-medium text-amber-900 mb-1">执行建议</div>
                <div className="text-sm text-amber-800">{result.tips}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TodayView({ todayTasks, roles, completions, todayKey, updateCompletions, splitTask, projectTasks, projectCompletions, updateProjectCompletions, albumCompletions, updateAlbumCompletions }) {
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = projectTasks.filter(t => t.dueDate < today);
  const todayDueTasks = projectTasks.filter(t => t.dueDate === today);

  const toggleProjectOrAlbum = (t) => {
    if (t.isAlbum) updateAlbumCompletions({ ...albumCompletions, [t.completionKey]: !albumCompletions[t.completionKey] });
    else updateProjectCompletions({ ...projectCompletions, [t.completionKey]: !projectCompletions[t.completionKey] });
  };

  const isTaskCompleted = (t) => t.isAlbum ? albumCompletions[t.completionKey] : projectCompletions[t.completionKey];

  // 时间段定义 - 按职位分配
  const TIME_SLOTS = [
    { 
      id: 'morning', 
      label: '早上 8:00 - 9:00', 
      icon: '🌅',
      desc: '邮件 & 客服回复',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100',
      roleIds: ['r6'], // 客服
    },
    { 
      id: 'late_morning', 
      label: '上午 10:00 - 12:00', 
      icon: '☕',
      desc: '修图工作',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100',
      roleIds: ['r3'], // 修图师
    },
    { 
      id: 'afternoon', 
      label: '下午 12:00 - 14:00', 
      icon: '🌞',
      desc: '广告设计 & 相册设计',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100',
      roleIds: ['r4', 'r5'], // 广告设计 + 相册设计
    },
    { 
      id: 'late_afternoon', 
      label: '下午 15:00 - 16:00', 
      icon: '🍵',
      desc: 'Marketing 运营对接(与助理)',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      iconBg: 'bg-rose-100',
      roleIds: ['r7'], // Marketing运营
    },
  ];

  // 把日常任务按时间段分组
  const otherDailyTasks = []; // 不属于上述时间段的任务
  const slotDailyTasks = {}; // { slotId: [tasks] }
  TIME_SLOTS.forEach(slot => slotDailyTasks[slot.id] = []);
  
  todayTasks.forEach(task => {
    const slot = TIME_SLOTS.find(s => s.roleIds.includes(task.roleId));
    if (slot) {
      slotDailyTasks[slot.id].push(task);
    } else {
      otherDailyTasks.push(task);
    }
  });

  // 把项目任务按时间段分组
  const slotProjectTasks = {};
  const otherProjectTasks = [];
  TIME_SLOTS.forEach(slot => slotProjectTasks[slot.id] = []);
  
  todayDueTasks.forEach(task => {
    const slot = TIME_SLOTS.find(s => s.roleIds.includes(task.roleId));
    if (slot) {
      slotProjectTasks[slot.id].push(task);
    } else {
      otherProjectTasks.push(task);
    }
  });

  // 渲染单条日常任务
  const renderDailyTask = (task) => {
    const role = roles.find(r => r.id === task.roleId);
    const isLinked = task.frequency === '项目联动';
    const completionKey = isLinked ? task.completionKey : `${task.id}|${todayKey}`;
    const isCompleted = completions[completionKey];
    return (
      <div key={task.id} className={`bg-white rounded-xl border p-3 flex items-center gap-3 transition ${
        isCompleted ? 'border-emerald-200 bg-emerald-50/30' : isLinked ? 'border-rose-200' : 'border-slate-200'
      }`}>
        <button onClick={() => updateCompletions({ ...completions, [completionKey]: !isCompleted })}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-500'}`}>
          {isCompleted && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className={`w-7 h-7 rounded-lg ${role?.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0`}>{role?.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'} truncate`}>{task.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{role?.name}</span>
            {isLinked ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium text-xs">🔗 项目联动</span> : <span>· {task.frequency}</span>}
            {task.duration && <span>· {task.duration}分钟</span>}
          </div>
        </div>
        <button onClick={() => splitTask(task)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="AI拆分">
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // 渲染单条项目任务
  const renderProjectTask = (t) => (
    <ProjectTaskCard key={t.completionKey} task={t} roles={roles}
      isCompleted={isTaskCompleted(t)} onToggle={() => toggleProjectOrAlbum(t)} onSplit={splitTask} />
  );

  const totalSlotTasks = TIME_SLOTS.reduce((sum, s) => sum + slotDailyTasks[s.id].length + slotProjectTasks[s.id].length, 0);
  const hasAnyTasks = todayTasks.length > 0 || projectTasks.length > 0;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">今日待办</h2>
        <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      {/* 逾期任务 - 始终显示在最顶部 */}
      {overdueTasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-rose-600">⚠️ 逾期任务 ({overdueTasks.length})</h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.map(t => (
              <ProjectTaskCard key={t.completionKey} task={t} roles={roles} isOverdue
                isCompleted={isTaskCompleted(t)} onToggle={() => toggleProjectOrAlbum(t)} onSplit={splitTask} />
            ))}
          </div>
        </div>
      )}

      {/* 时间段安排 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">今日工作时间表</h3>
        </div>
        <div className="space-y-3">
          {TIME_SLOTS.map(slot => {
            const dailyInSlot = slotDailyTasks[slot.id] || [];
            const projectsInSlot = slotProjectTasks[slot.id] || [];
            const totalInSlot = dailyInSlot.length + projectsInSlot.length;
            const completedInSlot = 
              dailyInSlot.filter(t => completions[t.frequency === '项目联动' ? t.completionKey : `${t.id}|${todayKey}`]).length +
              projectsInSlot.filter(t => isTaskCompleted(t)).length;
            
            return (
              <div key={slot.id} className={`rounded-xl border-2 ${slot.borderColor} ${slot.bgColor} overflow-hidden`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${slot.iconBg} flex items-center justify-center text-xl shrink-0`}>
                    {slot.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 text-sm">{slot.label}</h4>
                      {totalInSlot > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-white/80 text-slate-700 rounded-full font-medium">
                          {completedInSlot}/{totalInSlot}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{slot.desc}</p>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  {totalInSlot === 0 ? (
                    <div className="bg-white/60 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">此时段暂无待办</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectsInSlot.map(t => renderProjectTask(t))}
                      {dailyInSlot.map(t => renderDailyTask(t))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 其他时间任务(不属于固定时间段的) */}
      {(otherDailyTasks.length > 0 || otherProjectTasks.length > 0) && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <ListTodo className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">📋 灵活时间任务({otherDailyTasks.length + otherProjectTasks.length})</h3>
            <span className="text-xs text-slate-400">— 可在空闲时间完成</span>
          </div>
          <div className="space-y-2">
            {otherProjectTasks.map(t => renderProjectTask(t))}
            {otherDailyTasks.map(t => renderDailyTask(t))}
          </div>
        </div>
      )}

      {!hasAnyTasks && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">今日没有待办任务</p>
        </div>
      )}
    </div>
  );
}

function WeeklyView({ tasks, roles, completions, todayKey, updateCompletions, splitTask, onEdit, onDelete }) {
  // 筛选标记为本周的任务
  const weeklyTasks = tasks.filter(t => t.isWeekly);
  
  // 按职位分组
  const tasksByRole = {};
  weeklyTasks.forEach(t => {
    if (!tasksByRole[t.roleId]) tasksByRole[t.roleId] = [];
    tasksByRole[t.roleId].push(t);
  });
  
  // 按截止日期排序每组内的任务
  Object.keys(tasksByRole).forEach(roleId => {
    tasksByRole[roleId].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  });
  
  // 进度统计
  const completedCount = weeklyTasks.filter(t => completions[`${t.id}|${todayKey}`]).length;
  const totalCount = weeklyTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // 按截止日期分类:逾期 / 今日 / 本周内 / 之后
  const today = new Date(todayKey);
  const overdueTasks = weeklyTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && !completions[`${t.id}|${todayKey}`]);
  
  const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天截止';
    if (diff === 1) return '明天截止';
    if (diff < 0) return `逾期${Math.abs(diff)}天`;
    if (diff <= 7) return `还有${diff}天`;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日截止`;
  };
  
  const getDueDateColor = (dateStr, isCompleted) => {
    if (isCompleted) return 'text-emerald-600';
    if (!dateStr) return 'text-slate-500';
    const date = new Date(dateStr);
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'text-rose-600 font-semibold';
    if (diff === 0) return 'text-rose-600 font-semibold';
    if (diff === 1) return 'text-amber-600 font-medium';
    if (diff <= 3) return 'text-amber-600';
    return 'text-slate-500';
  };
  
  const getPriorityFromDescription = (description) => {
    if (!description) return null;
    if (description.includes('优先级:高')) return { label: '高', color: 'bg-rose-100 text-rose-700' };
    if (description.includes('优先级:中')) return { label: '中', color: 'bg-amber-100 text-amber-700' };
    if (description.includes('优先级:低')) return { label: '低', color: 'bg-slate-100 text-slate-600' };
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">本周待办</h2>
          <p className="text-sm text-slate-500 mt-0.5">按职位分类的本周重点任务 · 共 {totalCount} 项 · 已完成 {completedCount} 项</p>
        </div>
      </div>

      {/* 整体进度条 */}
      {totalCount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">本周整体进度</span>
            <span className="text-sm font-semibold text-slate-900">{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>已完成 {completedCount}</span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 font-medium">逾期 {overdueTasks.length}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span>待办 {totalCount - completedCount - overdueTasks.length}</span>
            </div>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">本周暂无安排</p>
          <p className="text-sm text-slate-400 mt-1">需要添加本周任务,可以在 Claude 对话里告诉我</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(tasksByRole).map(roleId => {
            const role = roles.find(r => r.id === roleId);
            if (!role) return null;
            const roleTasks = tasksByRole[roleId];
            const roleCompleted = roleTasks.filter(t => completions[`${t.id}|${todayKey}`]).length;
            
            return (
              <div key={roleId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${role.color} flex items-center justify-center text-base shrink-0`}>
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm">{role.name}</h3>
                      {role.isAssistant && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">助理</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{roleCompleted}/{roleTasks.length} 已完成</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {Math.round((roleCompleted / roleTasks.length) * 100)}%
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {roleTasks.map(t => {
                    const completionKey = `${t.id}|${todayKey}`;
                    const isCompleted = completions[completionKey];
                    const priority = getPriorityFromDescription(t.description);
                    
                    return (
                      <div key={t.id} className={`p-3 flex items-start gap-3 transition ${isCompleted ? 'bg-emerald-50/40' : ''}`}>
                        <button
                          onClick={() => updateCompletions({ ...completions, [completionKey]: !isCompleted })}
                          className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {isCompleted && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {t.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                            {priority && (
                              <span className={`px-1.5 py-0.5 rounded font-medium ${priority.color}`}>
                                优先级 {priority.label}
                              </span>
                            )}
                            <span className={getDueDateColor(t.dueDate, isCompleted)}>
                              📅 {formatDueDate(t.dueDate)}
                            </span>
                            {t.duration && <span className="text-slate-500">⏱ {t.duration}分钟</span>}
                          </div>
                          {t.description && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{t.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => splitTask(t)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="AI拆分">
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="编辑">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onDelete(t)} className="p-1.5 hover:bg-rose-50 rounded text-rose-500" title="删除">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrashView({ trash, roles, onRestore, onPermanentDelete, onEmptyTrash, setConfirmDialog }) {
  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (days > 0) return `${days}天前删除`;
    if (hours > 0) return `${hours}小时前删除`;
    if (minutes > 0) return `${minutes}分钟前删除`;
    return '刚刚删除';
  };

  const getDaysUntilExpiry = (timestamp) => {
    const expiryTime = timestamp + 30 * 24 * 60 * 60 * 1000;
    return Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getItemDescription = (trashItem) => {
    if (!trashItem || !trashItem.item) {
      return { icon: '?', title: '损坏的数据', subtitle: '该回收项数据异常,建议永久删除', color: 'bg-slate-100 text-slate-700' };
    }
    if (trashItem.type === 'task') {
      const role = (roles || []).find(r => r.id === trashItem.item.roleId);
      return { icon: '📝', title: trashItem.item.name || '未命名任务', subtitle: `日常任务 · ${role?.name || '未知职位'} · ${trashItem.item.frequency || ''}`, color: 'bg-slate-100 text-slate-700' };
    }
    if (trashItem.type === 'project') {
      return { icon: '📸', title: `${trashItem.item.clientName || '未命名'} - ${trashItem.item.shootType || ''}`, subtitle: `拍摄项目 · ${trashItem.item.shootDate || ''}${trashItem.item.location ? ` · ${trashItem.item.location}` : ''}`, color: 'bg-blue-100 text-blue-700' };
    }
    if (trashItem.type === 'album') {
      return { icon: '📔', title: trashItem.item.clientName || '未命名', subtitle: `相册设计 · ${trashItem.item.albumType || '相册'} · 开始 ${trashItem.item.startDate || ''}`, color: 'bg-amber-100 text-amber-700' };
    }
    if (trashItem.type === 'role') {
      const role = trashItem.item.role || {};
      return { icon: role.icon || '👤', title: role.name || '未知职位', subtitle: `职位 · 含 ${trashItem.item.tasks?.length || 0} 个相关任务`, color: 'bg-purple-100 text-purple-700' };
    }
    return { icon: '?', title: '未知项目', subtitle: '', color: 'bg-slate-100 text-slate-700' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-slate-600" />回收站
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">删除的项目会保留30天,之后自动永久清除</p>
        </div>
        {trash.length > 0 && (
          <button onClick={() => {
            setConfirmDialog({
              title: `清空回收站?`,
              message: `这将永久删除全部 ${trash.length} 个项目,无法恢复。`,
              onConfirm: () => { onEmptyTrash(); setConfirmDialog(null); },
              danger: true,
            });
          }} className="text-sm text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />清空回收站
          </button>
        )}
      </div>

      {trash.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">回收站是空的</p>
          <p className="text-sm text-slate-400 mt-1">删除的任务、项目和相册会出现在这里</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...trash].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)).map(trashItem => {
            const desc = getItemDescription(trashItem);
            const daysLeft = getDaysUntilExpiry(trashItem.deletedAt || Date.now());
            return (
              <div key={trashItem.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg shrink-0">{desc.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{desc.title}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${desc.color}`}>
                      {trashItem.type === 'task' ? '任务' : trashItem.type === 'project' ? '拍摄项目' : trashItem.type === 'album' ? '相册' : '职位'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{desc.subtitle}</p>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{formatTime(trashItem.deletedAt || Date.now())}</span>
                    <span>·</span>
                    <span className={daysLeft <= 7 ? 'text-amber-600 font-medium' : ''}>{daysLeft <= 0 ? '即将清除' : `${daysLeft}天后自动清除`}</span>
                  </div>
                </div>
                <button onClick={() => onRestore(trashItem.id)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium flex items-center gap-1 shrink-0">
                  <Check className="w-3.5 h-3.5" />恢复
                </button>
                <button onClick={() => {
                  setConfirmDialog({
                    title: `永久删除"${desc.title}"?`,
                    message: `此操作无法撤销,该项目将被彻底清除。`,
                    onConfirm: () => { onPermanentDelete(trashItem.id); setConfirmDialog(null); },
                    danger: true,
                  });
                }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectTaskCard({ task, roles, isOverdue, isCompleted, onToggle, onSplit }) {
  const role = roles.find(r => r.id === task.roleId);
  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = isOverdue ? Math.floor((new Date(today) - new Date(task.dueDate)) / 86400000) : 0;
  const isAlbum = task.isAlbum;
  
  let timingLabel = '';
  if (isAlbum) {
    timingLabel = task.daysAfterStart === 0 ? '设计开始日' : `开始后${task.daysAfterStart}天`;
  } else {
    if (task.daysBeforeShoot > 0) timingLabel = `拍摄前${task.daysBeforeShoot}天`;
    else if (task.daysBeforeShoot === 0) timingLabel = '拍摄当天';
    else timingLabel = `拍摄后${Math.abs(task.daysBeforeShoot)}天`;
  }
  const contextLabel = isAlbum ? `📔 ${task.album.clientName} 相册设计` : `📸 ${task.project.clientName} · ${task.project.shootType}`;
  const dateLabel = isAlbum ? `开始日 ${task.album.startDate}` : `拍摄日 ${task.project.shootDate}`;

  return (
    <div className={`bg-white rounded-xl border p-4 transition ${
      isCompleted ? 'border-emerald-200 bg-emerald-50/30' :
      isOverdue ? 'border-rose-200 bg-rose-50/30' :
      isAlbum ? 'border-amber-200 bg-amber-50/20' : 'border-blue-200 bg-blue-50/20'
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
          {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
        <div className={`w-8 h-8 rounded-lg ${role?.color || 'bg-slate-400'} flex items-center justify-center text-sm shrink-0`}>{role?.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`font-medium text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.name}</div>
            {isOverdue && !isCompleted && <span className="text-xs px-1.5 py-0.5 bg-rose-500 text-white rounded font-medium">逾期{daysOverdue}天</span>}
          </div>
          <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-700">{contextLabel}</span><span>·</span><span>{timingLabel}</span><span>·</span><span>{dateLabel}</span>
          </div>
        </div>
        <button onClick={() => onSplit({ ...task, name: task.name + ` (${isAlbum ? task.album.clientName : task.project.clientName})` })}
          className="p-2 hover:bg-white rounded-lg text-slate-600">
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ project, tasks, completions, updateCompletions, expanded, onToggle, onEdit, onDelete, isPast, onSplit }) {
  const completedCount = tasks.filter(t => completions[t.completionKey]).length;
  const today = new Date().toISOString().split('T')[0];
  const shootDate = new Date(project.shootDate + 'T00:00:00');
  const daysUntil = Math.ceil((shootDate - new Date(today + 'T00:00:00')) / 86400000);
  
  let urgencyLabel = '', urgencyColor = 'bg-slate-100 text-slate-600';
  if (daysUntil < 0) { urgencyLabel = '已结束'; urgencyColor = 'bg-slate-100 text-slate-500'; }
  else if (daysUntil === 0) { urgencyLabel = '今天拍摄'; urgencyColor = 'bg-rose-100 text-rose-700'; }
  else if (daysUntil === 1) { urgencyLabel = '明天拍摄'; urgencyColor = 'bg-amber-100 text-amber-700'; }
  else if (daysUntil <= 3) { urgencyLabel = `还有${daysUntil}天`; urgencyColor = 'bg-amber-100 text-amber-700'; }
  else if (daysUntil <= 7) { urgencyLabel = `还有${daysUntil}天`; urgencyColor = 'bg-blue-100 text-blue-700'; }
  else { urgencyLabel = `还有${daysUntil}天`; }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition ${isPast ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:shadow-md'}`}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900">{project.clientName}</h3>
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">{project.shootType}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${urgencyColor}`}>{urgencyLabel}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{project.shootDate}</span>
              {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
              <span>· {completedCount}/{tasks.length} 任务完成</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="编辑"><Edit2 className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500" title="删除"><Trash2 className="w-4 h-4" /></button>
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(completedCount/tasks.length)*100}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">任务时间表</div>
          {project.notes && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-sm text-amber-900">💡 {project.notes}</div>}
          <div className="space-y-2">
            {tasks.map(t => {
              const isCompleted = completions[t.completionKey];
              const isOverdue = !isCompleted && t.dueDate < today;
              const isToday = t.dueDate === today;
              let timingLabel = '';
              if (t.daysBeforeShoot > 0) timingLabel = `拍摄前${t.daysBeforeShoot}天`;
              else if (t.daysBeforeShoot === 0) timingLabel = '拍摄当天';
              else timingLabel = `拍摄后${Math.abs(t.daysBeforeShoot)}天`;
              return (
                <div key={t.id} className={`bg-white rounded-lg p-2.5 flex items-center gap-2.5 ${isOverdue ? 'border border-rose-200' : isToday ? 'border border-blue-200' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); updateCompletions({ ...completions, [t.completionKey]: !isCompleted }); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{timingLabel}</span><span>·</span><span>{t.dueDate}</span>
                      {isOverdue && <span className="text-rose-600 font-medium">· 逾期</span>}
                      {isToday && !isCompleted && <span className="text-blue-600 font-medium">· 今日</span>}
                    </div>
                  </div>
                  {onSplit && (
                    <button onClick={(e) => { e.stopPropagation(); onSplit({ ...t, name: `${t.name} - ${project.clientName}${project.shootType}` }); }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Sparkles className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectModal({ project, defaultRoleId, onClose, onSave }) {
  const [clientName, setClientName] = useState(project?.clientName || '');
  const [shootType, setShootType] = useState(project?.shootType || SHOOT_TYPES[0]);
  const [shootDate, setShootDate] = useState(project?.shootDate || '');
  const [location, setLocation] = useState(project?.location || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const roleId = project?.roleId || defaultRoleId || 'r1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{project ? '编辑拍摄项目' : '新增拍摄项目'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">客户姓名</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="如:王女士" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">拍摄类型</label>
            <select value={shootType} onChange={e => setShootType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
              {SHOOT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">拍摄日期</label>
            <input type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">拍摄地点</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">备注</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => clientName.trim() && shootDate && onSave({ clientName, shootType, shootDate, location, notes, roleId })}
            disabled={!clientName.trim() || !shootDate} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}

function AlbumCard({ album, tasks, completions, updateCompletions, expanded, onToggle, onEdit, onDelete, onSplit }) {
  const completedCount = tasks.filter(t => completions[t.completionKey]).length;
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(album.startDate + 'T00:00:00');
  const daysSinceStart = Math.floor((new Date(today + 'T00:00:00') - startDate) / 86400000);
  
  let statusLabel = '', statusColor = 'bg-slate-100 text-slate-600';
  if (completedCount === tasks.length) { statusLabel = '✓ 全部完成'; statusColor = 'bg-emerald-100 text-emerald-700'; }
  else if (daysSinceStart < 0) { statusLabel = `${Math.abs(daysSinceStart)}天后开始`; statusColor = 'bg-blue-100 text-blue-700'; }
  else { statusLabel = `进行中(第${daysSinceStart + 1}天)`; statusColor = 'bg-amber-100 text-amber-700'; }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900">{album.clientName}</h3>
              {album.albumType && <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">{album.albumType}</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor}`}>{statusLabel}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />开始 {album.startDate}</span>
              <span>· {completedCount}/{tasks.length} 任务完成</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Edit2 className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(completedCount/tasks.length)*100}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">设计任务时间表</div>
          {album.notes && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-sm text-amber-900">💡 {album.notes}</div>}
          <div className="space-y-2">
            {tasks.map(t => {
              const isCompleted = completions[t.completionKey];
              const isOverdue = !isCompleted && t.dueDate < today;
              const isToday = t.dueDate === today;
              const timingLabel = t.daysAfterStart === 0 ? '设计开始日' : `开始后${t.daysAfterStart}天`;
              return (
                <div key={t.id} className={`bg-white rounded-lg p-2.5 flex items-center gap-2.5 ${isOverdue ? 'border border-rose-200' : isToday ? 'border border-blue-200' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); updateCompletions({ ...completions, [t.completionKey]: !isCompleted }); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{timingLabel}</span><span>·</span><span>{t.dueDate}</span>
                      {isOverdue && <span className="text-rose-600 font-medium">· 逾期</span>}
                      {isToday && !isCompleted && <span className="text-blue-600 font-medium">· 今日</span>}
                    </div>
                  </div>
                  {onSplit && (
                    <button onClick={(e) => { e.stopPropagation(); onSplit({ ...t, name: `${t.name} - ${album.clientName}` }); }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Sparkles className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumModal({ album, onClose, onSave }) {
  const [clientName, setClientName] = useState(album?.clientName || '');
  const [albumType, setAlbumType] = useState(album?.albumType || '婚礼相册');
  const [startDate, setStartDate] = useState(album?.startDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(album?.notes || '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{album ? '编辑相册设计' : '新增相册设计'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">客户姓名</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">相册类型</label>
            <select value={albumType} onChange={e => setAlbumType(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option>婚礼相册</option><option>婚纱相册</option><option>儿童相册</option><option>家庭相册</option><option>个人写真相册</option><option>其他</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">设计开始日期</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">备注</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">取消</button>
          <button onClick={() => clientName.trim() && startDate && onSave({ clientName, albumType, startDate, notes })}
            disabled={!clientName.trim() || !startDate} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
