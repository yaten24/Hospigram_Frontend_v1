// Dashboard frame for admin, hospital and lab panels: sidebar (desktop), slide-in drawer (mobile), header, page outlet.
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import Logo from "./Logo";
import { Avatar, cx } from "./ui";
import { useAuth } from "../context/AuthContext";

/**
 * links: [{ to, label, icon, end?, badge? }]
 * label: panel name under the logo ("Admin", "Hospital", "Lab")
 * banner: optional element shown above every page (e.g. "awaiting approval")
 */
export default function PanelShell({ links, label, banner }) {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === location.pathname;
  const setOpen = (v) => setOpenPath((typeof v === "function" ? v(open) : v) ? location.pathname : null);
  const current = [...links].sort((a, b) => b.to.length - a.to.length).find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)));

  const doLogout = () => {
    logout();
    navigate("/");
  };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <Logo tone="light" size={30} to={links[0]?.to || "/"} />
        <span className="ml-auto rounded-sm bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">{label}</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={`${label} navigation`}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => cx("group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition", isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white")}
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId={`${label}-active`} className="absolute inset-y-1.5 left-0 w-[3px] bg-brand-500" />}
                <l.icon className={cx("h-[18px] w-[18px]", isActive ? "text-brand-400" : "text-ink-400 group-hover:text-ink-200")} aria-hidden="true" />
                {l.label}
                {l.badge ? <span className="ml-auto rounded-sm bg-brand-600 px-1.5 text-[11px] font-bold text-white">{l.badge}</span> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" /> View website
        </Link>
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-950 lg:block">{nav}</aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink-950/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-72 bg-ink-950" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.25 }}>
              <button onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md text-white/70 hover:bg-white/10" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
              {nav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-md text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{current?.label || label}</h1>
            {current?.description && <p className="hidden truncate text-xs text-ink-500 sm:block">{current.description}</p>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[200px] truncate text-sm font-semibold text-ink-900">{account?.name}</p>
              <p className="max-w-[200px] truncate text-xs text-ink-500">{account?.email || account?.phone}</p>
            </div>
            <Avatar name={account?.name} />
          </div>
        </header>
        {banner}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={location.pathname} className="p-4 sm:p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
