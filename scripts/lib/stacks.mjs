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
  dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1', 'react-router-dom': '^6.28.0' },
  devDependencies: { '@types/react': '^18.3.12', '@types/react-dom': '^18.3.1', '@vitejs/plugin-react': '^4.3.4', typescript: '^5.6.3', vite: '^5.4.11' },
}, null, 2) + '\n';

const pkgVue = (name) => JSON.stringify({
  name: name + '-ui',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: { dev: 'vite', build: 'vue-tsc -b && vite build', preview: 'vite preview', typecheck: 'vue-tsc --noEmit' },
  dependencies: { vue: '^3.5.13', 'vue-router': '^4.5.0' },
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
  push(d + '/src/lib/api.ts', REACT_API);
  push(d + '/tailwind.preset.js', TAILWIND_PRESET);
  push(d + '/tailwind.css', TAILWIND_THEME);
  push(d + '/src/pages/Dashboard.tsx', REACT_DASHBOARD);
  push(d + '/src/pages/Catalog.tsx', REACT_CATALOG);
  push(d + '/src/App.tsx', REACT_APP_ROUTER);
  push(d + '/src/main.tsx', REACT_MAIN_ROUTER);
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
  push(d + '/src/lib/api.ts', VUE_API);
  push(d + '/tailwind.preset.js', TAILWIND_PRESET);
  push(d + '/tailwind.css', TAILWIND_THEME);
  for (const [file, body] of Object.entries(VUE_UI)) push(d + '/src/ui/' + file, body);
  push(d + '/src/ui/index.ts', VUE_BARREL);
  push(d + '/src/pages/Dashboard.vue', VUE_DASHBOARD);
  push(d + '/src/pages/Catalog.vue', VUE_CATALOG);
  push(d + '/src/App.vue', VUE_APP_ROUTER);
  push(d + '/src/main.ts', VUE_MAIN_ROUTER);
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
/* ------------------------------------------------------- React · 数据面 */

const REACT_DATA = `import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface Column<T> {
  key: string;
  title: string;
  align?: 'left' | 'right';
  width?: string;
  render?: (row: T) => ReactNode;
}

export function Table<T extends { id: string | number }>({
  caption,
  columns,
  rows,
  empty,
}: {
  caption: string;
  columns: Array<Column<T>>;
  rows: T[];
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className="table-wrap">
      <table className="table" aria-label={caption}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={c.width ? { width: c.width } : undefined} className={cx(c.align === 'right' && 't-right')}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id)}>
              {columns.map((c) => (
                <td key={c.key} className={cx(c.align === 'right' && 't-right')}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({
  page,
  total,
  per = 10,
  onPage,
}: {
  page: number;
  total: number;
  per?: number;
  onPage?: (next: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / per));
  const from = total === 0 ? 0 : (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  return (
    <div className="pager">
      <p className="pager__info">
        第 {from}-{to} 条，共 {total} 条
      </p>
      <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
        <button type="button" className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => onPage?.(page - 1)}>
          上一页
        </button>
        <button type="button" className="btn btn--secondary btn--sm" disabled={page >= pages} onClick={() => onPage?.(page + 1)}>
          下一页
        </button>
      </div>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

export function Kpi({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'up' | 'down';
}) {
  return (
    <div className="kpi">
      <p className="kpi__label">{label}</p>
      <p className="kpi__value num">{value}</p>
      {delta ? (
        <p className={cx('kpi__delta', tone === 'up' && 'kpi__delta--up', tone === 'down' && 'kpi__delta--down')}>{delta}</p>
      ) : null}
    </div>
  );
}
`;

const REACT_OVERLAY = `import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={cx('modal', open && 'is-open')} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__panel">
        <h2 className="modal__title">{title}</h2>
        {children}
        <div className="modal__actions">
          {footer ?? (
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          className="tab"
          aria-selected={it.key === value}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ items }: { items: Array<{ id: number; text: string }> }) {
  return (
    <div className="toast" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast__item">
          {t.text}
        </div>
      ))}
    </div>
  );
}
`;

const REACT_BARREL = `export * from './Button';
export * from './Form';
export * from './Surface';
export * from './Data';
export * from './Overlay';
`;/* -------------------------------------------------------- React · 页面层 */

const REACT_DASHBOARD = `import { useState } from 'react';
import { Button, Empty, Kpi, Pager, Table, Tag, Toolbar } from '../ui';
import type { Column } from '../ui';
import { useTheme } from '../lib/theme';

const todo = (s: string) => '{{TODO: ' + s + '}}';

interface Row {
  id: string;
  no: string;
  title: string;
  state: 'todo' | 'doing' | 'done' | 'archived';
  owner: string;
  at: string;
}

const ROWS: Row[] = [
  { id: '10231', no: '#10231', title: '导出报表时超时', state: 'doing', owner: todo('姓名'), at: '2 分钟前' },
  { id: '10230', no: '#10230', title: '邀请成员收不到邮件', state: 'todo', owner: todo('姓名'), at: '18 分钟前' },
  { id: '10229', no: '#10229', title: '账单地址无法修改', state: 'done', owner: todo('姓名'), at: '1 小时前' },
  { id: '10228', no: '#10228', title: 'API 返回 429', state: 'doing', owner: todo('姓名'), at: '3 小时前' },
  { id: '10227', no: '#10227', title: '希望支持批量删除', state: 'archived', owner: todo('姓名'), at: '昨天' },
  { id: '10226', no: '#10226', title: '移动端表格横向滚动卡顿', state: 'done', owner: todo('姓名'), at: '昨天' },
];

const TONE = {
  todo: { label: '待处理', tone: 'warn' },
  doing: { label: '进行中', tone: 'info' },
  done: { label: '已完成', tone: 'ok' },
  archived: { label: '已归档', tone: 'brand' },
} as const;

const COLUMNS: Array<Column<Row>> = [
  { key: 'no', title: '工单号', width: '96px' },
  { key: 'title', title: '标题' },
  {
    key: 'state',
    title: '状态',
    width: '120px',
    render: (r) => <Tag tone={TONE[r.state].tone}>{TONE[r.state].label}</Tag>,
  },
  { key: 'owner', title: '负责人', width: '140px' },
  { key: 'at', title: '更新时间', width: '120px' },
  {
    key: 'op',
    title: '操作',
    align: 'right',
    width: '88px',
    render: () => <a href="#todo">详情</a>,
  },
];

export default function Dashboard({ showEmpty = false }: { showEmpty?: boolean }) {
  const { theme, toggle } = useTheme();
  const [page, setPage] = useState(1);

  return (
    <div className="app">
      <aside className="app__sidebar">
        <a className="brand" href="#todo">
          <span className="brand__mark" aria-hidden="true">
            {todo('品牌首字')}
          </span>
          <span>{todo('产品名')}</span>
        </a>
        <nav className="nav" aria-label="侧边导航">
          <span className="nav__group">工作台</span>
          <a className="nav-item" href="#todo">
            概览
          </a>
          <a className="nav-item" href="#todo" aria-current="page">
            工单 <span className="tag tag--brand nav-item__badge num">12</span>
          </a>
          <a className="nav-item" href="#todo">
            新建
          </a>
          <span className="nav__group">系统</span>
          <a className="nav-item" href="#todo">
            状态示例
          </a>
          <a className="nav-item" href="#todo">
            退出
          </a>
        </nav>
        <div className="tiny sidebar__foot">{todo('可以放版本号或帮助入口')}</div>
      </aside>

      <div className="app__main">
        <header className="topbar">
          <span className="tiny">{todo('面包屑，如 工作台 / 工单')}</span>
          <div className="topbar__spacer" />
          <button className="btn btn--ghost btn--icon" type="button" onClick={toggle} aria-label="切换主题">
            <span aria-hidden="true">{theme === 'dark' ? '◑' : '◐'}</span>
          </button>
          <span className="tag">{todo('用户名')}</span>
        </header>

        <main className="page" id="main">
          <div className="page__head">
            <div>
              <h1 className="page__title">工单</h1>
              <p className="page__desc">按更新时间排序，只显示分配给你的。{todo('换成本页真实范围')}</p>
            </div>
            <div className="page__actions">
              <Button variant="secondary">导出</Button>
              <Button>新建工单</Button>
            </div>
          </div>

          <div className="kpis">
            <Kpi label="待处理" value="12" delta="比昨天多 3" tone="up" />
            <Kpi label="今日完成" value="28" delta="+12%" tone="up" />
            <Kpi label="平均响应" value="1.8h" delta="慢了 0.2h" tone="down" />
            <Kpi label="满意度" value="96%" delta="近 7 天" />
          </div>

          <Toolbar>
            <div className="input-group toolbar__search">
              <input className="input" type="search" aria-label="搜索工单号或标题" placeholder="搜索工单号或标题" />
            </div>
            <select className="select" aria-label="按状态筛选" defaultValue="全部状态">
              <option>全部状态</option>
              <option>待处理</option>
              <option>进行中</option>
              <option>已完成</option>
            </select>
            <Button variant="secondary" size="sm">
              更多筛选
            </Button>
          </Toolbar>

          <Table caption="工单列表" columns={COLUMNS} rows={showEmpty ? [] : ROWS} empty={<Empty title="没有匹配的工单" text="换个关键词，或清空筛选条件再看一次。" />} />

          <Pager page={page} total={128} per={6} onPage={setPage} />
        </main>
      </div>
    </div>
  );
}
`;

const REACT_CATALOG = `import { useState } from 'react';
import { useTheme } from '../lib/theme';

const todo = (s: string) => '{{TODO: ' + s + '}}';

const GROUPS = [
  { title: todo('分组一'), items: [{ name: '全部', count: todo('128') }, { name: todo('子项'), count: todo('42') }] },
  { title: todo('分组二'), items: [{ name: todo('子项'), count: todo('24') }] },
];

const PILLS = [todo('全部'), todo('分类 A'), todo('分类 B'), todo('分类 C'), todo('分类 D')];

const CARDS = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  title: i === 0 ? todo('条目名称，一行到两行') : todo('条目名称'),
  meta: i === 0 ? todo('分类') + ' · ' + todo('作者') : todo('分类') + ' · ' + todo('更新时间'),
}));

export default function Catalog() {
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState(0);

  return (
    <>
      <header className="site-header">
        <div className="container site-header__in">
          <a className="brand" href="#todo">
            <span className="brand__mark" aria-hidden="true">
              {todo('品牌首字')}
            </span>
            <span>{todo('产品名')}</span>
          </a>
          <nav className="site-nav" aria-label="主导航">
            <a href="#todo" aria-current="page">
              目录
            </a>
            <a href="#todo">分类</a>
            <a href="#todo">合集</a>
            <a href="#todo">控制台</a>
          </nav>
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 'var(--s-2)' }}>
            <button className="btn btn--ghost btn--icon" type="button" onClick={toggle} aria-label="切换主题">
              <span aria-hidden="true">{theme === 'dark' ? '◑' : '◐'}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="container" style={{ paddingBlock: 'var(--s-6)' }}>
        <div className="cat">
          <aside className="cat__rail">
            <input className="cat__rail-search" type="search" aria-label={todo('搜索什么')} placeholder={todo('搜索名称、场景、关键词')} />
            <nav aria-label="目录分组">
              {GROUPS.map((g) => (
                <div className="cat__group" key={g.title}>
                  <p className="cat__group-title">{g.title}</p>
                  {g.items.map((it) => (
                    <a className="cat__nav-item" href="#todo" key={it.name} aria-current={it.name === '全部' ? 'page' : undefined}>
                      {it.name}
                      <span className="cat__nav-count">{it.count}</span>
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          <div className="cat__main">
            <p className="cat__crumbs">
              <a href="#todo">首页</a> / <a href="#todo">目录</a> / {todo('当前分类')}
            </p>
            <h1 className="cat__title">{todo('目录标题，一句话说清这一页收什么')}</h1>
            <p className="cat__lede">{todo('一到两句：谁在这里找什么，为什么是你来收。')}</p>
            <p className="cat__meta">
              <strong>{todo('5 项')}</strong> 是最近两周新增 · 最后更新 {todo('2026-11-06')}
            </p>

            <div className="cat__pills" role="tablist" aria-label="分类筛选">
              {PILLS.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  className="cat__pill"
                  aria-selected={i === active}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => setActive(i)}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="cat__count">
              <span>显示 1-9 / 共 {todo('128')} 个</span>
              <label className="tiny">
                排序
                <select
                  className="select"
                  style={{ height: 'var(--control-h-sm)', width: 'auto', marginInlineStart: 'var(--s-2)' }}
                  aria-label="排序方式"
                >
                  <option>{todo('推荐')}</option>
                  <option>最新</option>
                  <option>最热</option>
                </select>
              </label>
            </div>

            <div className="cat__grid">
              {CARDS.map((c) => (
                <a className="cat__card" key={c.id} href="#todo">
                  <span className="cat__thumb" aria-hidden="true" />
                  <span className="cat__card-title">{c.title}</span>
                  <span className="cat__card-meta">{c.meta}</span>
                </a>
              ))}
            </div>

            <nav className="cat__pager" aria-label="分页">
              <a href="#todo" aria-current="page">
                1
              </a>
              <a href="#todo">2</a>
              <a href="#todo">3</a>
              <a href="#todo">下一页</a>
            </nav>
          </div>
        </div>
      </main>
    </>
  );
}
`;

const REACT_APP = `import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';

type View = 'dashboard' | 'catalog';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  return (
    <>
      <div className="appswitch" role="group" aria-label="视图切换">
        <span className="appswitch__label">视图</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setView('dashboard')} aria-pressed={view === 'dashboard'}>
          后台
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setView('catalog')} aria-pressed={view === 'catalog'}>
          目录
        </button>
      </div>
      {view === 'dashboard' ? <Dashboard /> : <Catalog />}
    </>
  );
}
`;

const REACT_MAIN = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './lib/theme';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
`;/* ------------------------------------------------------------- Vue · 基础 */

const VUE_THEME = `import { ref, watchEffect } from 'vue';

export type Theme = 'light' | 'dark';
const KEY = 'ui-theme';
const initial: Theme = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
const theme = ref<Theme>(initial);

watchEffect(() => {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme.value;
  try {
    localStorage.setItem(KEY, theme.value);
  } catch {
    /* 隐私模式下写不进去就算了，主题仍然生效 */
  }
});

export function useTheme() {
  return {
    theme,
    set: (t: Theme) => (theme.value = t),
    toggle: () => (theme.value = theme.value === 'light' ? 'dark' : 'light'),
  };
}
`;

const VUE_UI = {};

VUE_UI['UiButton.vue'] = `<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'primary', size: 'md', block: false, type: 'button' },
);
</script>

<template>
  <button
    :type="type"
    :class="['btn', 'btn--' + variant, size !== 'md' && 'btn--' + size, block && 'btn--block']"
  >
    <slot />
  </button>
</template>
`;

VUE_UI['UiIconButton.vue'] = `<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <button type="button" class="btn btn--ghost btn--icon" :aria-label="label">
    <slot />
  </button>
</template>
`;

VUE_UI['UiField.vue'] = `<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    full?: boolean;
    htmlFor?: string;
  }>(),
  { hint: '', error: '', required: false, full: false, htmlFor: '' },
);
</script>

<template>
  <div :class="['field', full && 'field--full']">
    <label class="label" :for="htmlFor">
      {{ label }}
      <span v-if="required" class="req" aria-hidden="true">*</span>
    </label>
    <slot />
    <p v-if="hint && !error" class="help">{{ hint }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>
  </div>
</template>
`;

VUE_UI['UiInput.vue'] = `<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string;
    type?: string;
    placeholder?: string;
    id?: string;
  }>(),
  { modelValue: '', type: 'text', placeholder: '', id: '' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <input
    :id="id"
    class="input"
    :type="type"
    :placeholder="placeholder"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
`;

VUE_UI['UiTextarea.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: string; rows?: number; id?: string }>(), { modelValue: '', rows: 4, id: '' });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <textarea
    :id="id"
    class="textarea"
    :rows="rows"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  ></textarea>
</template>
`;

VUE_UI['UiSelect.vue'] = `<script setup lang="ts">
defineProps<{ id?: string; ariaLabel?: string }>();
</script>

<template>
  <select class="select" :id="id" :aria-label="ariaLabel">
    <slot />
  </select>
</template>
`;

VUE_UI['UiCheck.vue'] = `<script setup lang="ts">
defineProps<{ label: string; modelValue?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="check">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span>{{ label }}</span>
  </label>
</template>
`;VUE_UI['UiCard.vue'] = `<script setup lang="ts">
withDefaults(
  defineProps<{ title?: string; meta?: string; flat?: boolean; pop?: boolean }>(),
  { title: '', meta: '', flat: false, pop: false },
);
</script>

<template>
  <section :class="['card', flat && 'card--flat', pop && 'card--pop']">
    <h3 v-if="title" class="card__title">{{ title }}</h3>
    <p v-if="meta" class="card__meta">{{ meta }}</p>
    <slot />
  </section>
</template>
`;

VUE_UI['UiTag.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ tone?: '' | 'ok' | 'warn' | 'danger' | 'info' | 'brand' }>(), { tone: '' });
</script>

<template>
  <span :class="['tag', tone && 'tag--' + tone]"><slot /></span>
</template>
`;

VUE_UI['UiAlert.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'ok' | 'warn' | 'danger' | 'info' | 'brand' }>(), { tone: 'info' });
</script>

<template>
  <div :class="['alert', 'alert--' + tone]"><slot /></div>
</template>
`;

VUE_UI['UiEmpty.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ title: string; text?: string }>(), { text: '' });
</script>

<template>
  <div class="empty">
    <div class="empty__icon" aria-hidden="true" />
    <p class="empty__title">{{ title }}</p>
    <p v-if="text" class="empty__text">{{ text }}</p>
    <slot />
  </div>
</template>
`;

VUE_UI['UiSkeleton.vue'] = `<template>
  <span class="skeleton" aria-hidden="true" />
</template>
`;

VUE_UI['UiTable.vue'] = `<script setup lang="ts" generic="T extends Record<string, unknown>">
interface Column {
  key: string;
  title: string;
  align?: 'left' | 'right';
  width?: string;
}

withDefaults(defineProps<{ caption: string; columns: Column[]; rows: T[] }>(), {});

const cell = (row: T, key: string) => String((row as Record<string, unknown>)[key] ?? '');
</script>

<template>
  <div class="table-wrap">
    <table class="table" :aria-label="caption">
      <thead>
        <tr>
          <th
            v-for="c in columns"
            :key="c.key"
            scope="col"
            :style="c.width ? { width: c.width } : undefined"
            :class="[c.align === 'right' && 't-right']"
          >
            {{ c.title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="String(row.id ?? i)">
          <td v-for="c in columns" :key="c.key" :class="[c.align === 'right' && 't-right']">
            <slot name="cell" :row="row" :column="c">{{ cell(row, c.key) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
`;

VUE_UI['UiPager.vue'] = `<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ page: number; total: number; per?: number }>(), { per: 10 });
const emit = defineEmits<{ page: [value: number] }>();

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.per)));
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.per + 1));
const to = computed(() => Math.min(props.total, props.page * props.per));
</script>

<template>
  <div class="pager">
    <p class="pager__info">第 {{ from }}-{{ to }} 条，共 {{ total }} 条</p>
    <div style="display: flex; gap: var(--s-2)">
      <button type="button" class="btn btn--secondary btn--sm" :disabled="page <= 1" @click="emit('page', page - 1)">
        上一页
      </button>
      <button type="button" class="btn btn--secondary btn--sm" :disabled="page >= pages" @click="emit('page', page + 1)">
        下一页
      </button>
    </div>
  </div>
</template>
`;

VUE_UI['UiKpi.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string; delta?: string; tone?: '' | 'up' | 'down' }>(), {
  delta: '',
  tone: '',
});
</script>

<template>
  <div class="kpi">
    <p class="kpi__label">{{ label }}</p>
    <p class="kpi__value num">{{ value }}</p>
    <p v-if="delta" :class="['kpi__delta', tone && 'kpi__delta--' + tone]">{{ delta }}</p>
  </div>
</template>
`;

VUE_UI['UiToolbar.vue'] = `<template>
  <div class="toolbar"><slot /></div>
</template>
`;

VUE_UI['UiModal.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ open: boolean; title: string }>(), {});
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div :class="['modal', open && 'is-open']" role="dialog" aria-modal="true" :aria-label="title">
    <div class="modal__panel">
      <h2 class="modal__title">{{ title }}</h2>
      <slot />
      <div class="modal__actions">
        <slot name="footer">
          <button type="button" class="btn btn--secondary" @click="emit('close')">关闭</button>
        </slot>
      </div>
    </div>
  </div>
</template>
`;

VUE_UI['UiTabs.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ items: Array<{ key: string; label: string }>; value: string }>(), {});
const emit = defineEmits<{ change: [key: string] }>();
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="it in items"
      :key="it.key"
      type="button"
      role="tab"
      class="tab"
      :aria-selected="it.key === value"
      @click="emit('change', it.key)"
    >
      {{ it.label }}
    </button>
  </div>
</template>
`;

VUE_UI['UiToast.vue'] = `<script setup lang="ts">
withDefaults(defineProps<{ items: Array<{ id: number; text: string }> }>(), {});
</script>

<template>
  <div class="toast" aria-live="polite">
    <div v-for="t in items" :key="t.id" class="toast__item">{{ t.text }}</div>
  </div>
</template>
`;

const VUE_BARREL = Object.keys(VUE_UI)
  .filter((f) => f.endsWith('.vue'))
  .map((f) => "export { default as " + f.replace('.vue', '') + " } from './" + f + "';")
  .join('\n') + '\n';/* ------------------------------------------------------------- Vue · 页面 */

const VUE_DASHBOARD = `<script setup lang="ts">
import { ref } from 'vue';
import {
  UiButton,
  UiEmpty,
  UiIconButton,
  UiKpi,
  UiPager,
  UiTable,
  UiTag,
  UiToolbar,
} from '../ui';
import { useTheme } from '../lib/theme';

const todo = (s: string) => '{{TODO: ' + s + '}}';

const { theme, toggle } = useTheme();
const page = ref(1);

const columns = [
  { key: 'no', title: '工单号', width: '96px' },
  { key: 'title', title: '标题' },
  { key: 'state', title: '状态', width: '120px' },
  { key: 'owner', title: '负责人', width: '140px' },
  { key: 'at', title: '更新时间', width: '120px' },
  { key: 'op', title: '操作', align: 'right' as const, width: '88px' },
];

const toneOf = (s: unknown) => TONE[String(s)] ?? TONE.todo;
const cellOf = (row: unknown, key: string) => String((row as Record<string, unknown>)[key] ?? '');

const TONE: Record<string, { label: string; tone: 'ok' | 'warn' | 'info' | 'brand' }> = {
  todo: { label: '待处理', tone: 'warn' },
  doing: { label: '进行中', tone: 'info' },
  done: { label: '已完成', tone: 'ok' },
  archived: { label: '已归档', tone: 'brand' },
};

const rows = [
  { id: '10231', no: '#10231', title: '导出报表时超时', state: 'doing', owner: todo('姓名'), at: '2 分钟前' },
  { id: '10230', no: '#10230', title: '邀请成员收不到邮件', state: 'todo', owner: todo('姓名'), at: '18 分钟前' },
  { id: '10229', no: '#10229', title: '账单地址无法修改', state: 'done', owner: todo('姓名'), at: '1 小时前' },
  { id: '10228', no: '#10228', title: 'API 返回 429', state: 'doing', owner: todo('姓名'), at: '3 小时前' },
  { id: '10227', no: '#10227', title: '希望支持批量删除', state: 'archived', owner: todo('姓名'), at: '昨天' },
  { id: '10226', no: '#10226', title: '移动端表格横向滚动卡顿', state: 'done', owner: todo('姓名'), at: '昨天' },
];
</script>

<template>
  <div class="app">
    <aside class="app__sidebar">
      <a class="brand" href="#todo">
        <span class="brand__mark" aria-hidden="true">{{ todo('品牌首字') }}</span>
        <span>{{ todo('产品名') }}</span>
      </a>
      <nav class="nav" aria-label="侧边导航">
        <span class="nav__group">工作台</span>
        <a class="nav-item" href="#todo">概览</a>
        <a class="nav-item" href="#todo" aria-current="page">
          工单 <span class="tag tag--brand nav-item__badge num">12</span>
        </a>
        <a class="nav-item" href="#todo">新建</a>
        <span class="nav__group">系统</span>
        <a class="nav-item" href="#todo">状态示例</a>
        <a class="nav-item" href="#todo">退出</a>
      </nav>
      <div class="tiny sidebar__foot">{{ todo('可以放版本号或帮助入口') }}</div>
    </aside>

    <div class="app__main">
      <header class="topbar">
        <span class="tiny">{{ todo('面包屑，如 工作台 / 工单') }}</span>
        <div class="topbar__spacer" />
        <UiIconButton label="切换主题" @click="toggle">
          <span aria-hidden="true">{{ theme === 'dark' ? '◑' : '◐' }}</span>
        </UiIconButton>
        <UiTag>{{ todo('用户名') }}</UiTag>
      </header>

      <main class="page" id="main">
        <div class="page__head">
          <div>
            <h1 class="page__title">工单</h1>
            <p class="page__desc">按更新时间排序，只显示分配给你的。{{ todo('换成本页真实范围') }}</p>
          </div>
          <div class="page__actions">
            <UiButton variant="secondary">导出</UiButton>
            <UiButton>新建工单</UiButton>
          </div>
        </div>

        <div class="kpis">
          <UiKpi label="待处理" value="12" delta="比昨天多 3" tone="up" />
          <UiKpi label="今日完成" value="28" delta="+12%" tone="up" />
          <UiKpi label="平均响应" value="1.8h" delta="慢了 0.2h" tone="down" />
          <UiKpi label="满意度" value="96%" delta="近 7 天" />
        </div>

        <UiToolbar>
          <div class="input-group toolbar__search">
            <input class="input" type="search" aria-label="搜索工单号或标题" placeholder="搜索工单号或标题" />
          </div>
          <select class="select" aria-label="按状态筛选">
            <option>全部状态</option>
            <option>待处理</option>
            <option>进行中</option>
            <option>已完成</option>
          </select>
          <UiButton variant="secondary" size="sm">更多筛选</UiButton>
        </UiToolbar>

        <UiTable caption="工单列表" :columns="columns" :rows="rows">
          <template #cell="{ row, column }">
            <UiTag v-if="column.key === 'state'" :tone="toneOf(row.state).tone">{{ toneOf(row.state).label }}</UiTag>
            <a v-else-if="column.key === 'op'" href="#todo">详情</a>
            <template v-else>{{ cellOf(row, column.key) }}</template>
          </template>
        </UiTable>

        <UiPager :page="page" :total="128" :per="6" @page="page = $event" />

        <UiEmpty v-if="false" title="没有匹配的工单" text="换个关键词，或清空筛选条件再看一次。" />
      </main>
    </div>
  </div>
</template>
`;

const VUE_CATALOG = `<script setup lang="ts">
import { ref } from 'vue';
import { UiIconButton } from '../ui';
import { useTheme } from '../lib/theme';

const todo = (s: string) => '{{TODO: ' + s + '}}';

const { theme, toggle } = useTheme();
const active = ref(0);

const groups = [
  { title: todo('分组一'), items: [{ name: '全部', count: todo('128') }, { name: todo('子项'), count: todo('42') }] },
  { title: todo('分组二'), items: [{ name: todo('子项'), count: todo('24') }] },
];

const pills = [todo('全部'), todo('分类 A'), todo('分类 B'), todo('分类 C'), todo('分类 D')];

const cards = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  title: i === 0 ? todo('条目名称，一行到两行') : todo('条目名称'),
  meta: i === 0 ? todo('分类') + ' · ' + todo('作者') : todo('分类') + ' · ' + todo('更新时间'),
}));
</script>

<template>
  <header class="site-header">
    <div class="container site-header__in">
      <a class="brand" href="#todo">
        <span class="brand__mark" aria-hidden="true">{{ todo('品牌首字') }}</span>
        <span>{{ todo('产品名') }}</span>
      </a>
      <nav class="site-nav" aria-label="主导航">
        <a href="#todo" aria-current="page">目录</a>
        <a href="#todo">分类</a>
        <a href="#todo">合集</a>
        <a href="#todo">控制台</a>
      </nav>
      <div style="margin-inline-start: auto; display: flex; gap: var(--s-2)">
        <UiIconButton label="切换主题" @click="toggle">
          <span aria-hidden="true">{{ theme === 'dark' ? '◑' : '◐' }}</span>
        </UiIconButton>
      </div>
    </div>
  </header>

  <main id="main" class="container" style="padding-block: var(--s-6)">
    <div class="cat">
      <aside class="cat__rail">
        <input class="cat__rail-search" type="search" :aria-label="todo('搜索什么')" :placeholder="todo('搜索名称、场景、关键词')" />
        <nav aria-label="目录分组">
          <div v-for="g in groups" :key="g.title" class="cat__group">
            <p class="cat__group-title">{{ g.title }}</p>
            <a
              v-for="it in g.items"
              :key="it.name"
              class="cat__nav-item"
              href="#todo"
              :aria-current="it.name === '全部' ? 'page' : undefined"
            >
              {{ it.name }}
              <span class="cat__nav-count">{{ it.count }}</span>
            </a>
          </div>
        </nav>
      </aside>

      <div class="cat__main">
        <p class="cat__crumbs"><a href="#todo">首页</a> / <a href="#todo">目录</a> / {{ todo('当前分类') }}</p>
        <h1 class="cat__title">{{ todo('目录标题，一句话说清这一页收什么') }}</h1>
        <p class="cat__lede">{{ todo('一到两句：谁在这里找什么，为什么是你来收。') }}</p>
        <p class="cat__meta"><strong>{{ todo('5 项') }}</strong> 是最近两周新增 · 最后更新 {{ todo('2026-11-06') }}</p>

        <div class="cat__pills" role="tablist" aria-label="分类筛选">
          <button
            v-for="(p, i) in pills"
            :key="p"
            type="button"
            role="tab"
            class="cat__pill"
            :aria-selected="i === active"
            :aria-current="i === active ? 'true' : undefined"
            @click="active = i"
          >
            {{ p }}
          </button>
        </div>

        <div class="cat__count">
          <span>显示 1-9 / 共 {{ todo('128') }} 个</span>
          <label class="tiny">
            排序
            <select
              class="select"
              style="height: var(--control-h-sm); width: auto; margin-inline-start: var(--s-2)"
              aria-label="排序方式"
            >
              <option>{{ todo('推荐') }}</option>
              <option>最新</option>
              <option>最热</option>
            </select>
          </label>
        </div>

        <div class="cat__grid">
          <a v-for="c in cards" :key="c.id" class="cat__card" href="#todo">
            <span class="cat__thumb" aria-hidden="true" />
            <span class="cat__card-title">{{ c.title }}</span>
            <span class="cat__card-meta">{{ c.meta }}</span>
          </a>
        </div>

        <nav class="cat__pager" aria-label="分页">
          <a href="#todo" aria-current="page">1</a>
          <a href="#todo">2</a>
          <a href="#todo">3</a>
          <a href="#todo">下一页</a>
        </nav>
      </div>
    </div>
  </main>
</template>
`;

const VUE_APP = `<script setup lang="ts">
import { ref } from 'vue';
import Dashboard from './pages/Dashboard.vue';
import Catalog from './pages/Catalog.vue';

const view = ref<'dashboard' | 'catalog'>('dashboard');
</script>

<template>
  <div class="appswitch" role="group" aria-label="视图切换">
    <span class="appswitch__label">视图</span>
    <button type="button" class="btn btn--ghost btn--sm" :aria-pressed="view === 'dashboard'" @click="view = 'dashboard'">后台</button>
    <button type="button" class="btn btn--ghost btn--sm" :aria-pressed="view === 'catalog'" @click="view = 'catalog'">目录</button>
  </div>
  <Dashboard v-if="view === 'dashboard'" />
  <Catalog v-else />
</template>
`;

const VUE_MAIN = `import { createApp } from 'vue';
import App from './App.vue';
import './styles/index.css';

createApp(App).mount('#root');
`;/* ------------------------------------------------- 生态桥：router / api / tailwind */

const REACT_APP_ROUTER = `import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';

const NAV = [
  { to: '/', label: '后台', end: true },
  { to: '/catalog', label: '目录', end: false },
];

export default function App() {
  return (
    <>
      <nav className="appswitch" aria-label="视图">
        <span className="appswitch__label">视图</span>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="btn btn--ghost btn--sm">
            {n.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </>
  );
}
`;

const REACT_MAIN_ROUTER = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './lib/theme';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
`;

const VUE_APP_ROUTER = `<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <nav class="appswitch" aria-label="视图">
    <span class="appswitch__label">视图</span>
    <RouterLink to="/" class="btn btn--ghost btn--sm">后台</RouterLink>
    <RouterLink to="/catalog" class="btn btn--ghost btn--sm">目录</RouterLink>
  </nav>
  <RouterView />
</template>
`;

const VUE_MAIN_ROUTER = `import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import Dashboard from './pages/Dashboard.vue';
import Catalog from './pages/Catalog.vue';
import './styles/index.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/catalog', name: 'catalog', component: Catalog },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

createApp(App).use(router).mount('#root');
`;

const REACT_API = `import { useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** 统一取数入口：换成真实后端只改这里的前缀与鉴权。 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init && init.headers) },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  return (await res.json()) as T;
}

/**
 * 最简数据钩子：三态（loading / error / data）+ 竞态保护。
 * 项目要是已有 TanStack Query / SWR，把这个文件删掉即可。
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const run = useRef(0);
  useEffect(() => {
    const id = ++run.current;
    setState({ data: null, loading: true, error: null });
    load().then(
      (data) => { if (id === run.current) setState({ data, loading: false, error: null }); },
      (e: unknown) => { if (id === run.current) setState({ data: null, loading: false, error: String(e) }); },
    );
    // 依赖由调用方给全，这里只认 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
`;

const VUE_API = `import { ref, watchEffect, type Ref } from 'vue';

export interface AsyncState<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

/** 统一取数入口：换成真实后端只改这里的前缀与鉴权。 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init && init.headers) },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  return (await res.json()) as T;
}

/** 最简数据组合式：三态 + 自动收集依赖（用 watchEffect）。 */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(true);
  const error = ref<string | null>(null);
  watchEffect(async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await load();
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  });
  return { data, loading, error };
}
`;

const TAILWIND_PRESET = `/**
 * Tailwind preset：把 tokens.css 里的 CSS 变量映射成工具类名。
 * 用法（tailwind.config.js）：
 *   const preset = require('./tailwind.preset.js');
 *   module.exports = { presets: [preset], content: ['./index.html', './src/**/*.{ts,tsx,vue}'] };
 * Tailwind v4：本目录的 tailwind.css 里已有等价的 @theme 块，@import './tailwind.css' 即可。
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: 'var(--brand)', 600: 'var(--brand-600)', fill: 'var(--brand-fill)', ink: 'var(--brand-ink)' },
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)', 4: 'var(--ink-4)' },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        border: 'var(--border)',
        ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)', info: 'var(--info)',
      },
      borderRadius: { control: 'var(--r-md)', card: 'var(--r-lg)', pill: 'var(--r-pill)' },
      fontFamily: { sans: 'var(--font-sans)', display: 'var(--font-display)', mono: 'var(--font-mono)' },
      boxShadow: { card: 'var(--card-shadow)', hairline: 'var(--hairline)' },
      transitionTimingFunction: { out: 'var(--ease-out)', spring: 'var(--ease-spring)' },
    },
  },
};
`;

const TAILWIND_THEME = `/* Tailwind v4 桥：把生成的设计令牌暴露成 Tailwind 主题变量。
   在入口 CSS 里 @import './tailwind.css';
   注意 Tailwind v4 的 @theme 需要真实值，这里用 var() 引用 tokens.css，配合 :root 生效。 */
@theme {
  --color-brand: var(--brand);
  --color-brand-600: var(--brand-600);
  --color-ink: var(--ink);
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --radius-control: var(--r-md);
  --radius-card: var(--r-lg);
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --ease-out-quint: var(--ease-out);
}
`;