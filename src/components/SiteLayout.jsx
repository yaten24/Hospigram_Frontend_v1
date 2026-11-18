// Public site frame: top bar, sticky navbar, animated page outlet and footer.
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, ChevronDown, LayoutDashboard, LogOut, Mail, Menu, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import Logo from "./Logo";
import { Avatar, Button, cx } from "./ui";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../lib/api";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_LINK } from "../lib/format";

export const NAV = [
  { to: "/hospitals", label: "Hospitals" },
  { to: "/labs", label: "Diagnostic labs" },
  { to: "/tests", label: "Tests & scans" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/support", label: "Support" },
];

function AccountMenu() {
  const { role, account, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === pathname;
  const setOpen = (v) => setOpenPath((typeof v === "function" ? v(open) : v) ? pathname : null);
  if (!role) return null;
  const home = homeFor(role, account);
  const roleLabel = role === "admin" ? "Admin" : role === "provider" ? (account?.kind === "lab" ? "Lab" : "Hospital") : "Patient";
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition hover:bg-ink-100" aria-expanded={open} aria-haspopup="menu">
        <Avatar name={account?.name} size="sm" />
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-ink-800 lg:block">{account?.name?.split(" ")[0]}</span>
        <ChevronDown className="h-4 w-4 text-ink-400" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-ink-100 bg-white shadow-lift"
            >
              <div className="border-b border-ink-100 px-4 py-3">
                <p className="truncate text-sm font-bold text-ink-900">{account?.name}</p>
                <p className="text-xs text-ink-500">{roleLabel} account</p>
              </div>
              <Link to={home} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50" role="menuitem">
                {role === "patient" ? <CalendarCheck className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                {role === "patient" ? "My bookings" : "Dashboard"}
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Navbar() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === pathname;
  const setOpen = (v) => setOpenPath((typeof v === "function" ? v(open) : v) ? pathname : null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  return (
    <header className={cx("sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-shadow", scrolled ? "border-ink-100 shadow-[0_8px_24px_-18px_rgb(15_23_46/0.35)]" : "border-transparent")}>
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav className="ml-2 hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cx("relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition", isActive ? "text-brand-700" : "text-ink-600 hover:text-ink-900")}>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-brand-600" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {role ? (
            <AccountMenu />
          ) : (
            <>
              <Link to="/login" className="hidden whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 sm:block">
                Log in
              </Link>
              <Button as={Link} to="/book" size="md" icon={CalendarCheck} className="hidden sm:inline-flex">
                Book now
              </Button>
            </>
          )}
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-md text-ink-700 hover:bg-ink-100 xl:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] xl:hidden">
            <motion.div className="absolute inset-0 bg-ink-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.nav
              className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-white"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              aria-label="Mobile"
            >
              <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5">
                <Logo size={30} />
                <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-md hover:bg-ink-100" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {[{ to: "/", label: "Home" }, ...NAV].map((l, i) => (
                  <motion.div key={l.to} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <NavLink to={l.to} end className={({ isActive }) => cx("block rounded-md px-3 py-3 text-[15px] font-semibold", isActive ? "bg-brand-50 text-brand-700" : "text-ink-800 hover:bg-ink-50")}>
                      {l.label}
                    </NavLink>
                  </motion.div>
                ))}
                <div className="my-4 border-t border-ink-100" />
                <NavLink to="/partners" className="flex items-center gap-2 rounded-md px-3 py-3 text-[15px] font-semibold text-ink-800 hover:bg-ink-50">
                  <ShieldCheck className="h-4 w-4 text-care-600" /> For hospitals & labs
                </NavLink>
              </div>
              {!role && (
                <div className="grid gap-2 border-t border-ink-100 p-4">
                  <Button as={Link} to="/book" icon={CalendarCheck} size="lg">
                    Book an appointment
                  </Button>
                  <Button as={Link} to="/login" variant="secondary" icon={UserRound} size="lg">
                    Log in / Sign up
                  </Button>
                </div>
              )}
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}

function TopBar() {
  return (
    <div className="hidden bg-ink-950 text-xs text-ink-300 md:block">
      <div className="container-page flex h-9 items-center justify-between">
        <p>
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-care-500 align-middle" />
          Verified hospitals & diagnostic labs across Delhi NCR
        </p>
        <div className="flex items-center gap-5">
          <a href={SUPPORT_PHONE_LINK} className="flex items-center gap-1.5 hover:text-white">
            <Phone className="h-3.5 w-3.5" /> {SUPPORT_PHONE}
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-1.5 hover:text-white">
            <Mail className="h-3.5 w-3.5" /> {SUPPORT_EMAIL}
          </a>
          <Link to="/partners" className="font-semibold text-white hover:text-brand-300">
            For hospitals & labs →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const cols = [
    { title: "Patients", links: [["Find hospitals", "/hospitals"], ["Diagnostic labs", "/labs"], ["Tests & scans", "/tests"], ["Book an appointment", "/book"], ["My bookings", "/account"]] },
    { title: "Partners", links: [["Partner with us", "/partners"], ["Register a hospital", "/hospital/register"], ["Register a lab", "/lab/register"], ["Hospital login", "/hospital/login"], ["Lab login", "/lab/login"]] },
    { title: "Hospigram", links: [["How it works", "/how-it-works"], ["Support & contact", "/support"], ["Privacy policy", "/privacy"], ["Terms of use", "/terms"]] },
  ];
  return (
    <footer className="mt-auto bg-ink-950 text-ink-300">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo tone="light" tagline />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">Find verified hospitals and diagnostic labs near you, compare services and book a visit or a home sample collection in minutes.</p>
          <div className="mt-5 space-y-2 text-sm">
            <a href={SUPPORT_PHONE_LINK} className="flex items-center gap-2 hover:text-white">
              <Phone className="h-4 w-4 text-brand-400" /> {SUPPORT_PHONE}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4 text-brand-400" /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="font-display text-sm font-bold text-white">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Hospigram. In an emergency, call 112 or go to the nearest hospital.</p>
          <p>
            Built by{" "}
            <a href="https://ownsite.in" target="_blank" rel="noreferrer" className="font-semibold text-ink-300 hover:text-white">
              Ownsite
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={location.pathname} className="flex-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
