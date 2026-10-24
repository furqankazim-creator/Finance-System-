import type { CSSProperties, InputHTMLAttributes, MouseEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function LedgerPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('mx-auto max-w-[1240px] space-y-6', className)}>{children}</div>;
}

export function LedgerHeader({
  title,
  description,
  eyebrow = 'TGT FINANCE',
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2.5">{action}</div>}
    </div>
  );
}

export function LedgerButton({
  children,
  className,
  type = 'button',
  onClick,
  disabled = false,
  variant = 'primary',
}: {
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  onClick?: (e?: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const variantClass = {
    primary:
      'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 active:scale-[0.99] focus:ring-2 focus:ring-emerald-500/30 dark:bg-emerald-500 dark:hover:bg-emerald-600',
    secondary:
      'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99] focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:ring-slate-700',
    danger:
      'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 active:scale-[0.99] focus:ring-2 focus:ring-rose-500/30 dark:bg-rose-500 dark:hover:bg-rose-600',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variantClass,
        className
      )}
    >
      {children}
    </button>
  );
}

export function LedgerRowAction({
  children,
  onClick,
  tone = 'default',
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
        tone === 'danger'
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
          : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
      )}
    >
      {children}
    </button>
  );
}

export function LedgerCard({
  children,
  className,
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      style={style}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_4px_14px_-2px_rgba(15,23,42,0.08),0_2px_6px_-1px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] dark:ring-white/[0.06] dark:hover:border-slate-700',
        className
      )}
    >
      {children}
    </div>
  );
}

export function LedgerSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  options?: { value: string; label: string }[];
  className?: string;
}) {
  if (!options) {
    return (
      <div
        className={cn(
          'min-w-[130px] rounded-xl border border-slate-300/85 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
          className
        )}
      >
        {value}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'min-w-[140px] cursor-pointer appearance-none rounded-xl border border-slate-300/85 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:border-emerald-500',
          className
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-500">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function LedgerStatCard({
  label,
  value,
  note,
  noteTone = 'muted',
}: {
  label: string;
  value: string;
  note: string;
  noteTone?: 'positive' | 'negative' | 'muted';
}) {
  const cardGradientClass =
    noteTone === 'positive'
      ? 'bg-gradient-to-b from-emerald-500/[0.04] via-white to-white dark:from-emerald-500/[0.08] dark:via-slate-900 dark:to-slate-900'
      : noteTone === 'negative'
        ? 'bg-gradient-to-b from-rose-500/[0.04] via-white to-white dark:from-rose-500/[0.08] dark:via-slate-900 dark:to-slate-900'
        : 'bg-gradient-to-b from-slate-100/70 via-white to-white dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-900';

  const noteBadgeClass =
    noteTone === 'positive'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70'
      : noteTone === 'negative'
        ? 'bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70'
        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  const toneAccentClass =
    noteTone === 'positive'
      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
      : noteTone === 'negative'
        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
        : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600';

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_16px_-2px_rgba(15,23,42,0.08),0_3px_6px_-1px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] dark:ring-white/[0.06] dark:hover:border-slate-700',
        cardGradientClass
      )}
    >
      {/* Precision micro-accent line at the top */}
      <div className={cn('absolute inset-x-0 top-0 h-1 opacity-90 transition-opacity group-hover:opacity-100', toneAccentClass)} />

      <div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums lg:text-[28px]">
          {value}
        </p>
      </div>

      <div className="mt-3 flex items-center">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
            noteBadgeClass
          )}
        >
          {noteTone === 'positive' && <span className="font-bold">↑</span>}
          {noteTone === 'negative' && <span className="font-bold">↓</span>}
          <span>{note}</span>
        </span>
      </div>
    </div>
  );
}

export function LedgerSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
      {children}
    </div>
  );
}

export function LedgerTable({
  headers,
  children,
  compact = false,
}: {
  headers: string[];
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/[0.04]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
              {headers.map((header) => (
                <th
                  key={header}
                  className={cn(
                    'px-5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400',
                    compact ? 'py-3' : 'py-3.5'
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function LedgerRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn('transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50', className)}>
      {children}
    </tr>
  );
}

export function LedgerCell({
  children,
  className,
  muted = false,
  strong = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  strong?: boolean;
  style?: CSSProperties;
}) {
  return (
    <td
      style={style}
      className={cn(
        'px-5 py-3.5 text-xs',
        strong
          ? 'font-semibold text-slate-900 dark:text-slate-100'
          : muted
            ? 'text-slate-500 dark:text-slate-400'
            : 'text-slate-700 dark:text-slate-300',
        className
      )}
    >
      {children}
    </td>
  );
}

export function LedgerBadge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const toneClass = {
    green:
      'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60',
    yellow:
      'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60',
    red:
      'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/60',
    neutral:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize tracking-wide',
        toneClass
      )}
    >
      {children}
    </span>
  );
}

export function LedgerProgress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-emerald-600 transition-all duration-300 dark:bg-emerald-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function LedgerModal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 pt-12 backdrop-blur-sm sm:p-6">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl ring-1 ring-slate-900/[0.05] animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LedgerField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  'w-full rounded-xl border border-slate-300/85 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15 focus:bg-white dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 dark:focus:bg-slate-950';

export function LedgerInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(fieldClass, className)} />;
}

export function LedgerTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(fieldClass, 'min-h-[88px] resize-y leading-relaxed', className)} />;
}

export function LedgerFormSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
) {
  const { className, options, ...rest } = props;
  return (
    <div className="relative">
      <select
        {...rest}
        className={cn(
          fieldClass,
          'cursor-pointer appearance-none pr-9 text-slate-900 dark:text-slate-100',
          className
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function LedgerCheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
      />
      {label}
    </label>
  );
}

export function LedgerFormActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2.5">{children}</div>;
}

export function LedgerFormError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
      {children}
    </div>
  );
}

export function LedgerEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-xs text-slate-400 dark:text-slate-500">
        {children}
      </td>
    </tr>
  );
}
