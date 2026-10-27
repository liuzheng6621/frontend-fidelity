/**
 * stacks.mjs —— 把同一套设计令牌/组件类名搬到 React 与 Vue
 *
 * 设计原则：CSS 不动。tokens/base/components/depth/catalog 五份 CSS 是唯一的视觉事实源，
 * 这里只把「类名 + 语义结构」包成组件，保证两个栈与 html 骨架像素级一致。
 * 所以这里不引 UI 库、不写样式，只写 props → className。
 */

const REACT = 'react';
const VUE = 'vue';

const pkgReact = (name) => JSON.stringify({
  name: name + '-ui',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview', typecheck: 'tsc --noEmit' },
  dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
  devDependencies: { '@types/react': '^18.3.12', '@types/react-dom': '^18.3.1', '@vitejs/plugin-react': '^4.3.4', typescript: '^5.6.3', vite: '^5.4.11' },
}, null, 2) + '\n';

const pkgVue = (name) => JSON.stringify({
  name: name + '-ui',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vue-tsc -b && vite build', preview: 'vite preview', typecheck: 'vue-tsc --noEmit' },
  dependencies: { vue: '^3.5.13' },
  devDependencies: { '@vitejs/plugin-vue': '^5.2.1', typescript: '^5.6.3', vite: '^5.4.11', 'vue-tsc': '^2.1.10' },
}, null, 2) + '\n';

const tsconfig = JSON.stringify({
  compilerOptions: {
    target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'bundler',
    jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, isolatedModules: true,
    allowImportingTsExtensions: false, resolveJsonModule: true, verbatimModuleSyntax: false,
  },
  include: ['src'],
}, null, 2) + '\n';

const viteReact = "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n";
const viteVue = "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\n\nexport default defineConfig({ plugins: [vue()] });\n";

const indexHtml = (name, entry) => '<!doctype html>\n<html lang="zh-CN" data-theme="light">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>' + name + '</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="' + entry + '"></script>\n  </body>\n</html>\n';

const stylesIndex = ["@import './tokens.css';", "@import './base.css';", "@import './components.css';", "@import './depth.css';", "@import './catalog.css';", ''].join('\n');

const cxTs = "export const cx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(' ');\n";
const cxTsVue = "export const cx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(' ');\nexport type ClassValue = Parameters<typeof cx>[number];\n";

export function stackFiles({ stack, siteName, css }) {
  if (stack === 'html') return [];
  const out = [];
  const push = (path, body) => out.push([path, body]);
  const styles = (dir) => {
    push(dir + '/src/styles/index.css', stylesIndex);
    for (const [file, body] of Object.entries(css)) push(dir + '/src/styles/' + file, body);
  };
  if (stack === 'react' || stack === 'all') reactFiles({ push, styles, siteName });
  if (stack === 'vue' || stack === 'all') vueFiles({ push, styles, siteName });
  return out;
}

function reactFiles({ push, styles, siteName }) {
  const d = 'react';
  push(d + '/package.json', pkgReact(siteName));
  push(d + '/tsconfig.json', tsconfig);
  push(d + '/vite.config.ts', viteReact);
  push(d + '/index.html', indexHtml(siteName, '/src/main.tsx'));
  push(d + '/.gitignore', 'node_modules\ndist\n');
  styles(d);
  push(d + '/src/lib/cx.ts', cxTs);
  push(d + '/src/lib/theme.tsx', REACT_THEME);
  push(d + '/src/ui/Button.tsx', REACT_BUTTON);
  push(d + '/src/ui/Form.tsx', REACT_FORM);
  push(d + '/src/ui/Surface.tsx', REACT_SURFACE);
  push(d + '/src/ui/Data.tsx', REACT_DATA);
  push(d + '/src/ui/Overlay.tsx', REACT_OVERLAY);
  push(d + '/src/ui/index.ts', REACT_BARREL);
  push(d + '/src/pages/Dashboard.tsx', REACT_DASHBOARD);
  push(d + '/src/pages/Catalog.tsx', REACT_CATALOG);
  push(d + '/src/App.tsx', REACT_APP);
  push(d + '/src/main.tsx', REACT_MAIN);
  push(d + '/README.md', readme('React', siteName));
}

function vueFiles({ push, styles, siteName }) {
  const d = 'vue';
  push(d + '/package.json', pkgVue(siteName));
  push(d + '/tsconfig.json', tsconfig);
  push(d + '/vite.config.ts', viteVue);
  push(d + '/index.html', indexHtml(siteName, '/src/main.ts'));
  push(d + '/.gitignore', 'node_modules\ndist\n');
  styles(d);
  push(d + '/src/lib/cx.ts', cxTsVue);
  push(d + '/src/lib/theme.ts', VUE_THEME);
  push(d + '/src/ui/UiButton.vue', VUE_BUTTON);
  push(d + '/src/ui/UiForm.vue', VUE_FORM);
  push(d + '/src/ui/UiSurface.vue', VUE_SURFACE);
  push(d + '/src/ui/UiData.vue', VUE_DATA);
  push(d + '/src/ui/UiOverlay.vue', VUE_OVERLAY);
  push(d + '/src/ui/index.ts', VUE_BARREL);
  push(d + '/src/pages/Dashboard.vue', VUE_DASHBOARD);
  push(d + '/src/pages/Catalog.vue', VUE_CATALOG);
  push(d + '/src/App.vue', VUE_APP);
  push(d + '/src/main.ts', VUE_MAIN);
  push(d + '/README.md', readme('Vue', siteName));
}

const readme = (label, name) => [
  '# ' + name + ' · ' + label + ' 版骨架',
  '',
  '这套代码和同目录生成的 html 骨架**共用同一份 CSS**（`src/styles/` 下五份），',
  '组件只负责把 props 拼成 class，不写任何样式。所以换人格、换深度语言时只要重跑：',
  '',
  '```bash',
  'node scripts/scaffold.mjs --persona warm --stack ' + label.toLowerCase() + ' --out ui',
  '```',
  '',
  '## 跑起来',
  '',
  '```bash',
  'cd ' + label.toLowerCase(),
  'npm install',
  'npm run dev',
  '```',
  '',
  '## 目录',
  '',
  '- `src/styles/` — tokens / base / components / depth / catalog，**只改这里**',
  '- `src/ui/` — Button（含 IconButton）、Form（Field/Input/Textarea/Select/Check）、',
  '  Surface（Card/Tag/Alert/Empty/Skeleton）、Data（Table/Pager）、Overlay（Modal/Toast/Tabs）',
  '- `src/pages/` — Dashboard（后台）、Catalog（目录陈列），照这两个页面往下加',
  '- `src/lib/theme.ts' + (label === 'React' ? 'x' : '') + '` — 主题读写（`localStorage` 的 `ui-theme`）',
  '',
  '## 约定',
  '',
  '- 页面里不写硬编码颜色和像素字号，只用 `var(--…)` 令牌与 `src/ui` 的组件',
  '- `{{TODO: …}}` 表示要换成真内容，交付前 `grep -rn "{{TODO" src/` 必须为空',
  '- 组件不引第三方 UI 库：类名就是契约，想换 Tailwind / CSS-in-JS 也只替换这一层',
  '',
].join('\n');

/* ---------------------------------------------------------------- React */

const REACT_THEME = `import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'ui-theme';

interface ThemeValue {
  theme: Theme;
  set: (t: Theme) => void;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeValue>({ theme: 'light', set: () => {}, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === 'undefined') return 'light';
    const raw = localStorage.getItem(KEY);
    return raw === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* 隐私模式下写不进去就算了，主题仍然生效 */
    }
  }, [theme]);

  const set = useCallback((t: Theme) => setTheme(t), []);
  const toggle = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  const value = useMemo(() => ({ theme, set, toggle }), [theme, set, toggle]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
`;

const REACT_BUTTON = `import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block = false, className, children, ...rest }: ButtonProps) {
  const cls = cx('btn', 'btn--' + variant, size !== 'md' && 'btn--' + size, block && 'btn--block', className);
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={cx('btn', 'btn--ghost', 'btn--icon', className)} aria-label={label} {...rest}>
      {children}
    </button>
  );
}
`;

const REACT_FORM = `import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from '../lib/cx';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, error, required, full, children, htmlFor }: FieldProps) {
  return (
    <div className={cx('field', full && 'field--full')}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="help">{hint}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('input', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('textarea', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('select', className)} {...rest}>
      {children}
    </select>
  );
}

export function Check({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="check">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

`;

const REACT_SURFACE = `import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export function Card({
  title,
  meta,
  flat = false,
  pop = false,
  className,
  children,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  flat?: boolean;
  pop?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cx('card', flat && 'card--flat', pop && 'card--pop', className)}>
      {title ? <h3 className="card__title">{title}</h3> : null}
      {meta ? <p className="card__meta">{meta}</p> : null}
      {children}
    </section>
  );
}

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'brand';

export function Tag({ tone, children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('tag', tone && 'tag--' + tone, className)}>{children}</span>;
}

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cx('alert', 'alert--' + tone)}>{children}</div>;
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true" />
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('skeleton', className)} aria-hidden="true" />;
}
`;
