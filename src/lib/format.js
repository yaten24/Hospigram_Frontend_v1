// Shared labels, formatting and small hooks.
import { useCallback, useEffect, useRef, useState } from "react";

export const SUPPORT_PHONE = "+91 92581 65838";
export const SUPPORT_PHONE_LINK = "tel:+919258165838";
export const SUPPORT_EMAIL = "support@hospigram.in";
export const CITIES = ["Delhi", "Noida", "Greater Noida", "Ghaziabad", "Gurugram", "Faridabad"];

/** Status labels + badge tones for appointments, providers, patients and enquiries */
export const STATUS = {
  pending: { label: "Pending", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "sky" },
  completed: { label: "Completed", tone: "care" },
  cancelled: { label: "Cancelled", tone: "ink" },
  rejected: { label: "Rejected", tone: "red" },
  approved: { label: "Approved", tone: "care" },
  suspended: { label: "Suspended", tone: "red" },
  active: { label: "Active", tone: "care" },
  blocked: { label: "Blocked", tone: "red" },
  new: { label: "New", tone: "brand" },
  "in-progress": { label: "In progress", tone: "sky" },
  closed: { label: "Closed", tone: "ink" },
};
export const statusLabel = (s) => STATUS[s]?.label || s;

/** Action button text for moving an appointment to a status */
export const ACTION_LABEL = { confirmed: "Confirm", rejected: "Reject", completed: "Mark completed", cancelled: "Cancel", pending: "Reopen" };

export const KIND_LABEL = { hospital: "Hospital", lab: "Diagnostic lab" };

export const HOSPITAL_SERVICES = ["General Medicine", "Cardiology", "Orthopaedics", "Gynaecology", "Paediatrics", "Neurology", "ENT", "Dermatology", "Ophthalmology", "Dental", "Emergency", "ICU", "X-Ray", "Ultrasound", "CT Scan", "MRI"];
export const LAB_SERVICES = ["Blood Test", "Complete Blood Count", "Thyroid Profile", "Lipid Profile", "Liver Function Test", "Kidney Function Test", "HbA1c", "Vitamin D", "Urine Test", "X-Ray", "Ultrasound", "ECG", "CT Scan", "MRI", "Full Body Checkup"];

/** 'YYYY-MM-DD' -> 'Tue, 18 Nov 2026' (no timezone shift) */
export function formatDate(ymd, opts = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) {
  if (!ymd) return "-";
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  if (!y) return "-";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });
}
/** '14:30' -> '2:30 PM' */
export function formatTime(hm) {
  if (!hm) return "-";
  const [h, m] = hm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/** ISO timestamp -> '18 Nov 2026, 2:30 PM' */
export function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
export function timeAgo(iso) {
  if (!iso) return "-";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : formatDateTime(iso);
}

/** Today in India, 'YYYY-MM-DD' */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
export const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const nowHM = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 16);

/** Bookable slots for a date: every 30 min from 9:00 to 19:30; past slots today are dropped */
export function timeSlots(ymd) {
  const slots = [];
  for (let h = 9; h < 20; h++) for (const m of [0, 30]) slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return ymd === todayIST() ? slots.filter((t) => t > nowHM()) : slots;
}
export const slotPeriod = (hm) => (hm < "12:00" ? "Morning" : hm < "17:00" ? "Afternoon" : "Evening");

export const n = (v) => (v ?? 0).toLocaleString("en-IN");

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Loads data with fetcher(params). Reloads when params change (compared by value). Stale responses are ignored.
 * -> { data, loading, error, reload, setData }
 */
export function useLoad(fetcher, params) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params ?? null);
  const seq = useRef(0);
  const ref = useRef(fetcher);
  useEffect(() => {
    ref.current = fetcher;
  });
  const load = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(() => ref.current(JSON.parse(key)))
      .then((data) => id === seq.current && setState({ data, loading: false, error: null }))
      .catch((error) => id === seq.current && setState((s) => ({ ...s, loading: false, error })));
  }, [key]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching on mount / when params change is the point of this hook
    load();
  }, [load]);
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === "function" ? fn(s.data) : fn })), []);
  return { ...state, reload: load, setData };
}

/** Form state with field errors. -> { values, set(name)(eventOrValue), setValues, errors, setErrors, fieldError(name) } */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = useCallback(
    (name) => (e) => {
      const v = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
      setValues((s) => ({ ...s, [name]: v }));
      setErrors((er) => (er[name] ? { ...er, [name]: undefined } : er));
    },
    []
  );
  return { values, setValues, set, errors, setErrors };
}

export const isPhone = (v) => /^[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""));
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
export const passwordProblem = (v) => (v.length < 8 ? "At least 8 characters" : !/[A-Za-z]/.test(v) || !/\d/.test(v) ? "Use at least one letter and one number" : "");
