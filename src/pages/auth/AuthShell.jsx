// Split-screen frame for every login and sign-up page.
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import Logo, { LogoMark } from "../../components/Logo";
import { cx } from "../../components/ui";

/**
 * tone: 'brand' (patients) | 'care' (hospitals & labs) | 'ink' (admin)
 * side: { eyebrow, title, text, points: [string] }
 */
export default function AuthShell({ tone = "brand", side, title, subtitle, icon: Icon, children, footer, wide = false }) {
  const panels = {
    brand: "from-brand-700 via-brand-600 to-brand-800",
    care: "from-ink-900 via-care-700 to-ink-950",
    ink: "from-ink-950 via-ink-900 to-ink-800",
  };
  return (
    <div className="flex min-h-screen bg-white">
      <aside className={cx("relative hidden w-[44%] max-w-xl overflow-hidden bg-gradient-to-br p-10 text-white lg:flex lg:flex-col xl:p-14", panels[tone])}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <motion.div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity }} />
        <Logo tone="light" tagline className="relative" />
        <div className="relative mt-auto">
          {side?.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{side.eyebrow}</p>}
          <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-3 text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            {side?.title}
          </motion.h2>
          {side?.text && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">{side.text}</p>}
          {side?.points && (
            <ul className="mt-8 space-y-3">
              {side.points.map((p, i) => (
                <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }} className="flex items-start gap-3 text-sm text-white/90">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-white/15 text-[11px] font-bold">✓</span>
                  {p}
                </motion.li>
              ))}
            </ul>
          )}
        </div>
        <p className="relative mt-10 flex items-center gap-2 text-xs text-white/60">
          <Lock className="h-3.5 w-3.5" /> Your details are encrypted and never shared without your consent.
        </p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="lg:hidden">
            <Logo size={30} />
          </div>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-ink-500 hover:bg-ink-50 hover:text-ink-900">
            <ArrowLeft className="h-4 w-4" /> Back to Hospigram
          </Link>
        </div>
        <div className="flex flex-1 items-start justify-center px-5 pb-12 pt-2 sm:items-center sm:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} className={cx("w-full", wide ? "max-w-2xl" : "max-w-md")}>
            <div className="flex items-center gap-3">
              {Icon ? (
                <span className={cx("grid h-12 w-12 place-items-center rounded-md", tone === "care" ? "bg-care-50 text-care-700" : tone === "ink" ? "bg-ink-100 text-ink-800" : "bg-brand-50 text-brand-600")}>
                  <Icon className="h-6 w-6" />
                </span>
              ) : (
                <LogoMark size={44} />
              )}
            </div>
            <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-ink-500">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export function PasswordInput({ id, describedBy, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        type={show ? "text" : "password"}
        {...props}
        className={cx("input pr-11", error && "input-error")}
      />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Where to go after login: the page the guard bounced them from (if it belongs to this role), else home. */
export function afterLogin(state, fallback, prefix) {
  const from = typeof state?.from === "string" ? state.from : null;
  if (from && (!prefix || from.startsWith(prefix)) && !/\/(login|register)/.test(from)) return from;
  return fallback;
}
