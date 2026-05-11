import { Moon, Sun } from 'lucide-react';
import { useLocale, useTheme } from '../lib/prefs';

// 两个并排的小按钮:dark/light + 中/EN。放在顶栏 SignOut 旁边。
export default function HeaderControls() {
  const [theme, setTheme] = useTheme();
  const [locale, setLocale] = useLocale();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      <button
        onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-[2rem]"
        title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
      >
        {locale === 'zh' ? 'EN' : '中'}
      </button>
    </div>
  );
}
