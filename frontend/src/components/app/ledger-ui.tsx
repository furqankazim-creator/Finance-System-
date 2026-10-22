import type { CSSProperties, InputHTMLAttributes, MouseEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const serifStyle = { fontFamily: "Georgia, 'Times New Roman', serif" };

export function LedgerPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('mx-auto max-w-[980px] space-y-5', className)}>{children}</div>;
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
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7f8279]">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-[28px] leading-none text-[#1f352c]" style={serifStyle}>
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-[#6c726c]">{description}</p>
      </div>
      {action}
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
    primary: 'bg-[#0d6847] text-[#f3efe4] hover:bg-[#0b5b3d]',
    secondary: 'border border-[#d7d1c6] bg-[#fbfaf6] text-[#31443c] hover:bg-[#f1ece2]',
    danger: 'bg-[#c2555f] text-[#fbfaf6] hover:bg-[#ab4750]',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-[8px] px-4 py-2 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
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
        'text-[11px] font-medium underline-offset-2 hover:underline',
        tone === 'danger' ? 'text-[#b25d67]' : 'text-[#0d6847]'
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
        'rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6] shadow-[0_1px_0_rgba(80,85,71,0.04)]',
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
      <div className={cn('min-w-[126px] rounded-[7px] border border-[#ddd7cc] bg-[#fbfaf6] px-3 py-2 text-[12px] text-[#49544d]', className)}>
        {value}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        'min-w-[126px] rounded-[7px] border border-[#ddd7cc] bg-[#fbfaf6] px-3 py-2 text-[12px] text-[#49544d] outline-none focus:border-[#0d6847]',
        className
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
  const noteClass =
    noteTone === 'positive'
      ? 'text-[#2c9a74]'
      : noteTone === 'negative'
        ? 'text-[#d27777]'
        : 'text-[#7b8078]';

  return (
    <LedgerCard className="p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#909388]">{label}</p>
      <p className="mt-2 text-[27px] leading-none text-[#293d34]" style={serifStyle}>
        {value}
      </p>
      <p className={cn('mt-2 text-[11px]', noteClass)}>{note}</p>
    </LedgerCard>
  );
}

export function LedgerSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-[#ded8cd] px-4 py-3 text-[11px] text-[#7a7f77]">{children}</p>
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
    <LedgerCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[#ded8cd] bg-[#f9f7f1]">
              {headers.map((header) => (
                <th
                  key={header}
                  className={cn(
                    'px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7e837b]',
                    compact ? 'py-2.5' : 'py-3'
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </LedgerCard>
  );
}

export function LedgerRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn('border-b border-[#ebe5da] last:border-b-0', className)}>{children}</tr>;
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
        'px-4 py-3 text-[12px]',
        strong ? 'font-semibold text-[#344840]' : muted ? 'text-[#6d746d]' : 'text-[#425048]',
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
    green: 'bg-[#d7efdf] text-[#418562]',
    yellow: 'bg-[#f4e9c9] text-[#8f7a2f]',
    red: 'bg-[#f3dbdd] text-[#ba676f]',
    neutral: 'bg-[#ece8de] text-[#776f5f]',
  }[tone];

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', toneClass)}>
      {children}
    </span>
  );
}

export function LedgerProgress({ value }: { value: number }) {
  return (
    <div className="h-[4px] rounded-full bg-[#e7e1d6]">
      <div className="h-[4px] rounded-full bg-[#0d6847]" style={{ width: `${value}%` }} />
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1c2620]/40 px-4 py-10">
      <div
        className="w-full max-w-lg rounded-[12px] border border-[#d8d2c7] bg-[#fbfaf6] p-6 shadow-[0_10px_30px_rgba(30,40,34,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] leading-none text-[#1f352c]" style={serifStyle}>
              {title}
            </h2>
            {description && <p className="mt-1.5 text-[12px] text-[#6c726c]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-[#8b8f85] hover:text-[#31443c]"
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
      <span className="block text-[11px] font-medium text-[#4b544c]">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  'w-full rounded-[7px] border border-[#d9d3c8] bg-white px-3 py-2 text-[12px] text-[#31443c] outline-none placeholder:text-[#9aa097] focus:border-[#0d6847]';

export function LedgerInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(fieldClass, className)} />;
}

export function LedgerTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(fieldClass, 'min-h-[72px] resize-y', className)} />;
}

export function LedgerFormSelect(
  props: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }
) {
  const { className, options, ...rest } = props;
  return (
    <select {...rest} className={cn(fieldClass, className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
    <label className="flex items-center gap-2 text-[12px] text-[#4b544c]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-[#d9d3c8] text-[#0d6847] focus:ring-0"
      />
      {label}
    </label>
  );
}

export function LedgerFormActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export function LedgerFormError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[7px] border border-[#efc9cc] bg-[#faecee] px-3 py-2 text-[12px] text-[#b25d67]">
      {children}
    </div>
  );
}

export function LedgerEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-[12px] text-[#8b8f85]">
        {children}
      </td>
    </tr>
  );
}
