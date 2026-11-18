import { useId } from "react";
import { Link } from "react-router-dom";
import { cx } from "./ui";

/** Hospigram mark: a medical cross with a heartbeat line running through it. */
export function LogoMark({ size = 34, className }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cx("shrink-0", className)}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef3a5d" />
          <stop offset="1" stopColor="#b41438" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="2" fill={`url(#${id}-g)`} />
      <path d="M12.5 7h7v5.5H25v7h-5.5V25h-7v-5.5H7v-7h5.5z" fill="#fff" />
      <path className="hg-pulse" d="M9.5 16h4l1.6-3.2 2.4 6.4 1.6-3.2h3.4" fill="none" stroke="#d61f45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
    </svg>
  );
}

/** Full logo: mark + "Hospigram" wordmark. tone="light" for dark backgrounds. */
export default function Logo({ to = "/", tone = "dark", size = 34, className, tagline = false }) {
  return (
    <Link to={to} className={cx("group inline-flex items-center gap-2.5", className)} aria-label="Hospigram home">
      <LogoMark size={size} className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="leading-none">
        <span className={cx("block font-display text-[21px] font-extrabold tracking-tight", tone === "light" ? "text-white" : "text-ink-900")}>
          Hospi<span className="text-brand-600">gram</span>
        </span>
        {tagline && <span className={cx("mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em]", tone === "light" ? "text-white/60" : "text-ink-400")}>Care, booked right</span>}
      </span>
    </Link>
  );
}
