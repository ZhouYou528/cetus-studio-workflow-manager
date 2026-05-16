import { useEffect, useRef, useState } from 'react';
import { Moon, Settings, Sun } from 'lucide-react';
import { useLocale, useTheme } from '../lib/prefs';
import { useT } from '../lib/i18n';
import { THEMES, getThemeOverride, setThemeOverride, useActiveTheme } from '../lib/theme';

// 顶栏只放一个齿轮;点开下拉里集中 深色模式 / 语言 / 主题 三项设置。
export default function HeaderControls() {
  const [theme, setTheme] = useTheme();
  const [locale, setLocale] = useLocale();
  const t = useT();
  const active = useActiveTheme();          // 订阅:换主题时重渲染,select 回显同步
  const override = getThemeOverride();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
        title={t('settings')}
        aria-label={t('settings')}
        aria-expanded={open}
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-50 space-y-3">
          {/* 深色模式 */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('dark_mode')}</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* 语言 */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('language')}</span>
            <button
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 min-w-[3rem]"
            >
              {locale === 'zh' ? '中文' : 'English'}
            </button>
          </div>

          {/* 主题 */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-300 shrink-0">{t('theme_picker')}</span>
            <select
              value={override}
              onChange={(e) => setThemeOverride(e.target.value)}
              aria-label={t('theme_picker')}
              className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-0 cursor-pointer focus:outline-none"
            >
              <option value="auto">{active.logo || '🔴'} {t('theme_auto')}</option>
              {THEMES.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.logo || '🔴'} {t(('theme_' + th.id) as never)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
