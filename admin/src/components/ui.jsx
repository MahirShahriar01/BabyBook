import { useRef, useState } from 'react';
import { upload } from '../lib/api.js';
import { useAdmin } from '../lib/AdminContext.jsx';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function PageHeader({ title, subtitle, icon, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="mr-2">{icon}</span>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function Card({ title, children, className, actions }) {
  return (
    <section className={cx('rounded-2xl border border-slate-200 bg-white p-5 shadow-soft', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({ children, variant = 'primary', size = 'md', className, ...p }) {
  const v = {
    primary: 'bg-gradient-to-r from-brand-500 to-violet-500 text-white hover:brightness-110 shadow',
    ghost: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
    subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  }[variant];
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm' }[size];
  return (
    <button className={cx('inline-flex items-center gap-1.5 rounded-xl font-semibold transition disabled:opacity-50', v, s, className)} {...p}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function Input({ value, onChange, className, ...p }) {
  return <input className={cx(inputCls, className)} value={value ?? ''} onChange={(e) => onChange(p.type === 'number' ? Number(e.target.value) : e.target.value)} {...p} />;
}

export function TextArea({ value, onChange, rows = 3, className, ...p }) {
  return <textarea className={cx(inputCls, className)} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />;
}

export function Select({ value, onChange, options, className }) {
  return (
    <select className={cx(inputCls, className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={cx('flex items-start gap-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand-500' : 'bg-slate-300')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function ColorInput({ value, onChange, label }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200" />
        <Input value={value} onChange={onChange} className="font-mono" />
      </div>
    </Field>
  );
}

export function Badge({ children, color = 'slate' }) {
  const c = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    pink: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    blue: 'bg-sky-100 text-sky-700',
  }[color];
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', c)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className={cx('my-8 w-full rounded-2xl bg-white shadow-2xl', wide ? 'max-w-5xl' : 'max-w-2xl')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="rounded-lg px-2 text-2xl text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Multi-select chips for target age groups. */
export function AgeChips({ value = [], onChange }) {
  const { bundle } = useAdmin();
  const groups = bundle?.settings.ageGroups || [];
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => {
        const on = value.includes(g.id);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== g.id) : [...value, g.id])}
            className={cx('rounded-full border px-3 py-1 text-sm font-semibold', on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500')}
          >
            {g.emoji} {g.range}
          </button>
        );
      })}
    </div>
  );
}

/** URL field with an upload button (Supabase Storage or data-URL in demo mode). */
export function MediaInput({ value, onChange, accept = 'image/*', label = 'Image' }) {
  const ref = useRef();
  const { notify } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input value={value} onChange={onChange} placeholder="https://… or upload" />
        <Button variant="ghost" type="button" disabled={busy} onClick={() => ref.current.click()}>
          {busy ? '…' : '⬆️'}
        </Button>
        <input
          ref={ref}
          type="file"
          accept={accept}
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await upload(f));
              notify('Uploaded ✓');
            } catch (err) {
              notify(err.message, 'error');
            } finally {
              setBusy(false);
              e.target.value = '';
            }
          }}
        />
      </div>
      {value && accept.startsWith('image') && <img src={value} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
      {value && accept.startsWith('audio') && <audio src={value} controls className="mt-2 h-8 w-full" />}
    </Field>
  );
}

export function EmptyState({ icon = '✨', title, children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-500">
      <div className="text-4xl">{icon}</div>
      <div className="mt-2 font-bold text-slate-700">{title}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

/** Row actions used in content tables. */
export function RowActions({ onEdit, onDelete, onUp, onDown }) {
  return (
    <div className="flex justify-end gap-1">
      {onUp && (
        <Button size="sm" variant="subtle" onClick={onUp} title="Move up">
          ↑
        </Button>
      )}
      {onDown && (
        <Button size="sm" variant="subtle" onClick={onDown} title="Move down">
          ↓
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onEdit}>
        ✏️ Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-rose-600"
        onClick={() => {
          if (confirm('Delete this item? This cannot be undone.')) onDelete();
        }}
      >
        🗑️
      </Button>
    </div>
  );
}

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || `item-${Date.now().toString(36)}`;

export const download = (name, text, type = 'application/json') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
