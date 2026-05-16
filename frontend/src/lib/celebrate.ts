// 庆祝特效:今日待办清空时放彩带(普通颗粒,颜色随当周主题变)。
// canvas-confetti 懒加载——首次庆祝前不进主 bundle。
// 尊重 prefers-reduced-motion;并发去抖避免连点重复放炮。
import { activeTheme } from './theme';

let firing = false;

export async function celebrateAllDone(): Promise<void> {
  if (firing) return;
  if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  firing = true;
  try {
    const confetti = (await import('canvas-confetti')).default;
    const colors = activeTheme().confettiColors;
    // 中心来一发大的
    confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 }, colors, scalar: 0.9 });
    // 两侧持续小喷 ~0.9s
    const end = Date.now() + 900;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch {
    /* 加载失败就静默,不影响完成任务本身 */
  } finally {
    setTimeout(() => { firing = false; }, 1500);
  }
}
