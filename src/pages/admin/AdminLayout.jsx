// Admin panel frame: sidebar links with live badges (pending approvals, new enquiries).
// Also exports small helpers shared by the admin pages.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { CalendarCheck, CalendarPlus, FlaskConical, Hospital, LayoutDashboard, MessageSquare, Settings, Users } from "lucide-react";
import PanelShell from "../../components/PanelShell";
import { adminApi } from "../../lib/api";

const REFRESH_EVENT = "hg:admin-refresh";
/** Ask the sidebar to reload its badge counts (after approving a provider, closing an enquiry, ...). */
export const refreshAdminBadges = () => window.dispatchEvent(new Event(REFRESH_EVENT));

/**
 * Filters kept in the URL (?status=&q=&page=). defaults: { key: defaultValue } (strings).
 * -> [values, update(patch)]; values equal to their default are removed from the URL.
 */
export function useQueryState(defaults) {
  const [params, setParams] = useSearchParams();
  const defs = useRef(defaults);
  const values = {};
  for (const [k, d] of Object.entries(defaults)) values[k] = params.get(k) ?? d;
  const update = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === "" || v == null || String(v) === String(defs.current[k] ?? "")) next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );
  return [values, update];
}

/** Search box text that is written (debounced) to the URL as ?q= and resets ?page=. */
export function useUrlSearch(q, update, delay = 350) {
  const [text, setText] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== q) update({ q: text.trim(), page: "" });
    }, delay);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return [text, setText];
}

/** Copies text to the clipboard; resolves true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Random password that passes the backend rules (letters + digits, 10 characters). */
export function makePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let out = "Hg";
  for (let i = 0; i < 5; i++) out += pick(letters);
  for (let i = 0; i < 3; i++) out += pick(digits);
  return out;
}

export default function AdminLayout() {
  const location = useLocation();
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    window.addEventListener(REFRESH_EVENT, load);
    return () => window.removeEventListener(REFRESH_EVENT, load);
  }, [load]);

  const links = [
    { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard, description: "Today on Hospigram at a glance" },
    { to: "/admin/hospitals", label: "Hospitals", icon: Hospital, description: "Approve and manage partner hospitals", badge: stats?.providers?.hospital?.pending || 0 },
    { to: "/admin/labs", label: "Labs", icon: FlaskConical, description: "Approve and manage diagnostic labs", badge: stats?.providers?.lab?.pending || 0 },
    { to: "/admin/patients", label: "Patients", icon: Users, description: "Patient accounts and access" },
    { to: "/admin/appointments", label: "Appointments", icon: CalendarCheck, description: "Every booking on Hospigram" },
    { to: "/admin/book", label: "New booking", icon: CalendarPlus, description: "Book on behalf of a patient" },
    { to: "/admin/enquiries", label: "Enquiries", icon: MessageSquare, description: "Support messages from the website", badge: stats?.newEnquiries || 0 },
    { to: "/admin/settings", label: "Settings", icon: Settings, description: "Your profile, password and admin team" },
  ];

  return <PanelShell links={links} label="Admin" />;
}
