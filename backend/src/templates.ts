// 项目 / 相册任务模板,与前端 PROJECT_TASK_TEMPLATES 一一对应。
// 拍摄项目用 daysBeforeShoot(正数 = 拍摄前 N 天,0 = 拍摄当天,负数 = 拍摄后 N 天)。
// 相册用 daysAfterStart(从设计开始正向推进)。
//
// 这里是单一事实源(SST):后端按 shoot_date / start_date 算出 due_date 后返给前端,
// 前端不再保留这份常量(Phase 5 删掉)。

export type ProjectTemplate = {
  id: string;
  name: string;
  daysBeforeShoot: number;
  duration: number;
  description: string;
};

export type AlbumTemplate = {
  id: string;
  name: string;
  daysAfterStart: number;
  duration: number;
  description: string;
};

// 主摄影师 r1 — 6 步
export const PROJECT_TEMPLATES_R1: ProjectTemplate[] = [
  { id: 'pt1_1', name: '客户前期沟通',       daysBeforeShoot: 7,  duration: 60,  description: '与客户沟通拍摄风格、时间、地点、着装等关键事项' },
  { id: 'pt1_2', name: '制定拍摄计划',       daysBeforeShoot: 5,  duration: 90,  description: '构思拍摄方案,包括场景、构图、流程' },
  { id: 'pt1_3', name: '器材整理与检查',     daysBeforeShoot: 2,  duration: 60,  description: '整理器材,检查相机、镜头、电池、存储卡等是否完好' },
  { id: 'pt1_4', name: '拍摄前最后确认',     daysBeforeShoot: 1,  duration: 30,  description: '与客户最后确认时间、地点、注意事项;查看天气' },
  { id: 'pt1_5', name: '现场拍摄执行',       daysBeforeShoot: 0,  duration: 480, description: '当天到场跟拍,完成所有计划镜头' },
  { id: 'pt1_6', name: '照片三重备份',       daysBeforeShoot: -1, duration: 60,  description: '拍摄当天或次日完成照片3组备份(本地+硬盘+云端)' },
];

// 二摄 r2 — 仅婚礼项目自动联动,3 步
export const PROJECT_TEMPLATES_R2: ProjectTemplate[] = [
  { id: 'pt2_1', name: '与主摄核对拍摄细节', daysBeforeShoot: 2,  duration: 30,  description: '核对地址、拍摄风格、新人姓名、拍摄时间、整体流程' },
  { id: 'pt2_2', name: '现场跟拍配合',       daysBeforeShoot: 0,  duration: 480, description: '按流程跟拍,补充多角度素材,协助主摄' },
  { id: 'pt2_3', name: '照片三份备份',       daysBeforeShoot: -1, duration: 30,  description: '保存三份备份(本地+硬盘+云端)' },
];

// 修图师 r3 — 主摄全部完成后才显示项目,7 步
export const PROJECT_TEMPLATES_R3: ProjectTemplate[] = [
  { id: 'pt3_1', name: '照片导入选图软件',   daysBeforeShoot: -1,  duration: 30,  description: '将原始素材导入选图软件,准备客户初选' },
  { id: 'pt3_2', name: '照片导入修图软件',   daysBeforeShoot: -2,  duration: 30,  description: '将素材导入修图软件,建立工程文件' },
  { id: 'pt3_3', name: '整理照片顺序并归档', daysBeforeShoot: -2,  duration: 60,  description: '按拍摄顺序整理照片,放入指定客户文件夹' },
  { id: 'pt3_4', name: '照片调色',           daysBeforeShoot: -3,  duration: 180, description: '统一色调风格,完成基础调色' },
  { id: 'pt3_5', name: '照片预览修图',       daysBeforeShoot: -4,  duration: 240, description: '完成预览图修图,供客户初选参考' },
  { id: 'pt3_6', name: '上传到Pixieset',     daysBeforeShoot: -5,  duration: 30,  description: '将预览图上传到Pixieset,发送链接给客户选图' },
  { id: 'pt3_7', name: '客户选图后精修',     daysBeforeShoot: -10, duration: 480, description: '根据客户选图清单进行精修,交付最终成品' },
];

// 相册 r5 — 6 步,正向推进
export const ALBUM_TEMPLATES_R5: AlbumTemplate[] = [
  { id: 'pt5_1', name: '沟通设计logo和封面',  daysAfterStart: 0,  duration: 60,  description: '与客户沟通相册定制细节,包括logo设计、封面风格、色彩搭配' },
  { id: 'pt5_2', name: '整理照片',            daysAfterStart: 3,  duration: 90,  description: '整理客户提供的照片素材,按故事线/时间线分类' },
  { id: 'pt5_3', name: '下载照片',            daysAfterStart: 5,  duration: 30,  description: '从指定渠道(Pixieset/网盘等)下载所有所需精修照片' },
  { id: 'pt5_4', name: '上传照片并设计相册',  daysAfterStart: 7,  duration: 300, description: '将照片导入相册软件,完成所有页面的排版设计' },
  { id: 'pt5_5', name: '下订单',              daysAfterStart: 14, duration: 30,  description: '客户确认设计稿后,提交印刷订单' },
  { id: 'pt5_6', name: '送达相册',            daysAfterStart: 30, duration: 60,  description: '相册印刷完成后,跟进物流,确认客户收到成品' },
];

// 按 role_id 取项目模板。r5 在拍摄项目里不出现(它走相册独立模块)
export function getProjectTemplate(roleId: string): ProjectTemplate[] {
  if (roleId === 'r1') return PROJECT_TEMPLATES_R1;
  if (roleId === 'r2') return PROJECT_TEMPLATES_R2;
  if (roleId === 'r3') return PROJECT_TEMPLATES_R3;
  return [];
}

// Marketing 联动模板 — 项目级,3 步,仅 婚礼/婚纱 触发
// id 是模板 id,与 project_completions.task_template_id 对齐
export const MARKETING_TEMPLATES = [
  { id: 'mk_blog', kind: '博客', platform: '工作室网站',     duration: 90, nameFmt: '撰写【{client}{type}】博客文章',                  descFmt: '为客户【{client}】的{type}拍摄撰写博客内容,发布到工作室网站blog' },
  { id: 'mk_ig',   kind: 'IG',   platform: 'Instagram',     duration: 60, nameFmt: '在Instagram发布【{client}{type}】拼图',          descFmt: '挑选精修图制作Instagram拼图,发布到工作室Instagram账号' },
  { id: 'mk_xhs',  kind: '小红书', platform: '小红书婚礼账号', duration: 60, nameFmt: '在小红书婚礼账号发布【{client}{type}】成片',     descFmt: '挑选精修成片,撰写文案,发布到小红书婚礼账号' },
] as const;

export function isWeddingType(shootType: string): boolean {
  return shootType === '婚礼' || shootType === '婚纱';
}

// 把 'YYYY-MM-DD' + days(可正可负)算成新 'YYYY-MM-DD'
// 用 UTC 算,避免本机 TZ 偏移
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
