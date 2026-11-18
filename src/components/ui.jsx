// Hospigram UI kit. Every screen builds on these so the look stays consistent.
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, RotateCcw, Search, X } from "lucide-react";
import { STATUS } from "../lib/format";

export const cx = (...c) => c.filter(Boolean).join(" ");

// ---------------------------------------------------------------- buttons
const VARIANTS = {
  primary: "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-800",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  secondary: "border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  care: "bg-care-600 text-white hover:bg-care-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  "danger-ghost": "text-red-600 hover:bg-red-50",
  light: "bg-white text-ink-900 hover:bg-ink-50",
};
const SIZES = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-[15px] gap-2" };

/** <Button variant="primary|dark|secondary|ghost|care|danger|danger-ghost|light" size="sm|md|lg" icon={Icon} loading /> */
export function Button({ variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading, className, children, as: As = "button", ...props }) {
  const isButton = As === "button";
  return (
    <As
      {...(isButton ? { type: props.type || "button", disabled: loading || props.disabled } : {})}
      {...props}
      className={cx(
        "inline-flex select-none items-center justify-center rounded-md font-semibold whitespace-nowrap transition duration-200 disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
      {IconRight && !loading && <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </As>
  );
}

export function IconButton({ icon: Icon, label, tone = "ink", className, ...props }) {
  const tones = { ink: "text-ink-500 hover:bg-ink-100 hover:text-ink-900", brand: "text-brand-600 hover:bg-brand-50", red: "text-red-600 hover:bg-red-50", care: "text-care-700 hover:bg-care-50" };
  return (
    <button type="button" title={label} aria-label={label} {...props} className={cx("inline-grid h-8 w-8 place-items-center rounded-md transition disabled:opacity-40", tones[tone], className)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

// ---------------------------------------------------------------- form fields
/** <Field label error hint required>{(id, describedBy) => <input id={id} .../>}</Field>  (children may also be a plain element) */
export function Field({ label, error, hint, required, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      )}
      {typeof children === "function" ? children(id, describedBy) : children}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-xs font-medium text-brand-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ error, className, icon: Icon, ...props }) {
  if (!Icon) return <input {...props} aria-invalid={Boolean(error) || undefined} className={cx("input", error && "input-error", className)} />;
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
      <input {...props} aria-invalid={Boolean(error) || undefined} className={cx("input pl-9", error && "input-error", className)} />
    </div>
  );
}
export const Select = ({ error, className, children, ...props }) => (
  <select {...props} aria-invalid={Boolean(error) || undefined} className={cx("input pr-8", error && "input-error", className)}>
    {children}
  </select>
);
export const Textarea = ({ error, className, ...props }) => (
  <textarea rows={4} {...props} aria-invalid={Boolean(error) || undefined} className={cx("input resize-y", error && "input-error", className)} />
);

export function Checkbox({ label, hint, className, ...props }) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-3", className)}>
      <input type="checkbox" {...props} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-ink-300 accent-brand-600" />
      <span>
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {hint && <span className="block text-xs text-ink-500">{hint}</span>}
      </span>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", className }) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="input pl-9" />
    </div>
  );
}

export function FormAlert({ tone = "error", children }) {
  if (!children) return null;
  const tones = { error: "border-brand-200 bg-brand-50 text-brand-800", info: "border-sky-200 bg-sky-50 text-sky-800", success: "border-care-100 bg-care-50 text-care-700", warn: "border-amber-200 bg-amber-50 text-amber-900" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("animate-fade rounded-md border px-3.5 py-2.5 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- display
const BADGE = {
  ink: "bg-ink-100 text-ink-700 ring-ink-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  care: "bg-care-50 text-care-700 ring-care-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};
export function Badge({ tone = "ink", className, children }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", BADGE[tone], className)}>{children}</span>;
}
/** Appointment / provider / patient / enquiry status pill */
export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status || "-", tone: "ink" };
  return (
    <Badge tone={s.tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

export function Avatar({ name = "", size = "md", className }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  return <span className={cx("inline-grid shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700 ring-1 ring-brand-100", sizes[size], className)}>{ini}</span>;
}

export function Card({ className, children, ...props }) {
  return (
    <div {...props} className={cx("card", className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = "brand", loading, onClick }) {
  const tones = { brand: "bg-brand-50 text-brand-600", care: "bg-care-50 text-care-700", ink: "bg-ink-100 text-ink-700", amber: "bg-amber-50 text-amber-700", sky: "bg-sky-50 text-sky-700", violet: "bg-violet-50 text-violet-700" };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={cx("card w-full p-4 text-left", onClick && "card-hover")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          {loading ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{value}</p>}
          {sub && !loading && <p className="mt-0.5 truncate text-xs text-ink-500">{sub}</p>}
        </div>
        {Icon && (
          <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-md", tones[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </Comp>
  );
}

export function Tabs({ options, value, onChange, className }) {
  return (
    <div role="tablist" className={cx("inline-flex max-w-full gap-1 overflow-x-auto rounded-md bg-ink-100 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx("flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-semibold transition", active ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800")}
          >
            {o.label}
            {o.count != null && <span className={cx("rounded-sm px-1.5 text-[11px]", active ? "bg-brand-50 text-brand-700" : "bg-ink-200/70 text-ink-600")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- states
export const Spinner = ({ className }) => <Loader2 className={cx("h-5 w-5 animate-spin text-brand-600", className)} aria-label="Loading" />;
export function PageSpinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
export const Skeleton = ({ className }) => <span className={cx("block animate-pulse rounded-sm bg-ink-100", className)} />;

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-base font-bold text-ink-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-base font-bold text-ink-900">Could not load this</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{error?.message || "Something went wrong."}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage, label = "results" }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink-500">
      <span>
        {total.toLocaleString("en-IN")} {label}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
          <span className="px-2 font-medium text-ink-700">
            {page} / {pages}
          </span>
          <IconButton icon={ChevronRight} label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- overlays
function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

/** Centered dialog. size: sm | md | lg */
export function Modal({ open, onClose, title, subtitle, footer, size = "md", children }) {
  useEscape(open, onClose);
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
          <motion.div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className={cx("relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-2xl sm:rounded-lg", widths[size])}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{title}</h2>
                {subtitle && <div className="mt-0.5 text-sm text-ink-500">{subtitle}</div>}
              </div>
              <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
            </div>
            <div className="overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Right-side panel for details and forms */
export function Drawer({ open, onClose, title, subtitle, footer, children, width = "max-w-xl" }) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
          <motion.div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className={cx("absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl", width)}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{title}</h2>
                {subtitle && <div className="mt-0.5 text-sm text-ink-500">{subtitle}</div>}
              </div>
              <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Confirmation dialog; onConfirm may be async (button shows a spinner) */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", tone = "danger", loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-600">{message}</div>
    </Modal>
  );
}

// ---------------------------------------------------------------- motion helpers
/** Fades/rises children into view once */
export function Reveal({ as = "div", delay = 0, className, children, ...props }) {
  const M = motion[as] || motion.div;
  return (
    <M initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }} className={className} {...props}>
      {children}
    </M>
  );
}

/** Section title used on public pages */
export function SectionHeading({ eyebrow, title, text, align = "center", className }) {
  return (
    <div className={cx(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-base leading-relaxed text-ink-500">{text}</p>}
    </div>
  );
}
