// Shared booking form (provider detail page and /book). Patients book; guests are sent to log in; providers/admins see a note.
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CalendarCheck, CalendarDays, CheckCircle2, Clock, Info, LogIn, MapPin, Moon, Sun, Sunrise, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Checkbox, Field, FormAlert, Select, StatusBadge, Textarea, cx } from "./ui";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../lib/api";
import { addDays, formatDate, formatTime, slotPeriod, timeSlots, todayIST, useForm } from "../lib/format";

const PERIODS = [
  { key: "Morning", icon: Sunrise },
  { key: "Afternoon", icon: Sun },
  { key: "Evening", icon: Moon },
];

function serviceOptions(provider) {
  const list = [...(provider.services || [])];
  const extra = provider.kind === "lab" ? ["Other"] : ["Consultation", "Other"];
  for (const s of extra) if (!list.includes(s)) list.push(s);
  return list;
}

// ---------------------------------------------------------------- date + time pickers
function DayChips({ days, value, onChange }) {
  return (
    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]" role="radiogroup" aria-label="Choose a date">
      {days.map((d) => {
        const on = d.ymd === value;
        return (
          <button
            key={d.ymd}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={!d.slots}
            onClick={() => onChange(d.ymd)}
            aria-label={`${formatDate(d.ymd, { weekday: "long", day: "numeric", month: "long" })}${d.slots ? "" : ", no slots left"}`}
            className={cx(
              "flex w-[60px] shrink-0 snap-start flex-col items-center rounded-md border px-1 py-2 transition",
              on ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/30" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50",
              !d.slots && "cursor-not-allowed opacity-40 hover:border-ink-200 hover:bg-white"
            )}
          >
            <span className={cx("text-[10px] font-bold uppercase tracking-wider", on ? "text-white/80" : "text-ink-400")}>{d.label}</span>
            <span className="font-display text-lg font-extrabold leading-tight">{formatDate(d.ymd, { day: "numeric" })}</span>
            <span className={cx("text-[11px] font-medium", on ? "text-white/80" : "text-ink-500")}>{formatDate(d.ymd, { month: "short" })}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlotChips({ date, value, onChange }) {
  const slots = useMemo(() => timeSlots(date), [date]);
  if (!slots.length) return <p className="rounded-md bg-ink-50 px-3 py-2.5 text-sm text-ink-500">No slots left on this day. Please pick another date.</p>;
  return (
    <div className="space-y-3" role="radiogroup" aria-label="Choose a time">
      {PERIODS.map(({ key, icon: Icon }) => {
        const list = slots.filter((s) => slotPeriod(s) === key);
        if (!list.length) return null;
        return (
          <div key={key}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {key}
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {list.map((t) => {
                const on = t === value;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange(t)}
                    className={cx("rounded-sm border px-1 py-1.5 text-xs font-semibold transition", on ? "border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600" : "border-ink-200 text-ink-700 hover:border-brand-300")}
                  >
                    {formatTime(t)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- states around the form
function Confirmation({ appt, provider, onAgain }) {
  const noun = provider.kind === "lab" ? "lab" : "hospital";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center" role="status">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-care-50 text-care-600">
        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
      </motion.span>
      <h3 className="mt-4 text-xl font-extrabold">Booking request sent</h3>
      <p className="mt-1 text-sm text-ink-500">We'll notify you when the {noun} confirms.</p>
      <dl className="mt-5 divide-y divide-ink-100 rounded-md border border-ink-100 bg-ink-50/60 text-left text-sm">
        {[
          ["Booking id", <span className="font-mono font-bold text-ink-900">{appt.bookingId || appt._id}</span>],
          [provider.kind === "lab" ? "Lab" : "Hospital", appt.providerName || provider.name],
          ["Service", appt.service || "-"],
          ["Date & time", `${formatDate(appt.date)}, ${formatTime(appt.time)}`],
          ...(appt.homeCollection ? [["Home collection", appt.collectionAddress || "Yes"]] : []),
          ["Status", <StatusBadge status={appt.status || "pending"} />],
        ].map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-ink-500">{k}</dt>
            <dd className="text-right font-semibold text-ink-800">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button as={Link} to="/account" icon={CalendarCheck}>
          My bookings
        </Button>
        <Button variant="secondary" icon={ArrowLeft} onClick={onAgain}>
          Book another
        </Button>
      </div>
    </motion.div>
  );
}

function GuestActions() {
  const location = useLocation();
  const from = location.pathname + location.search;
  return (
    <div className="space-y-2">
      <Button as={Link} to="/login" state={{ from }} size="lg" icon={LogIn} className="w-full">
        Log in to book
      </Button>
      <p className="text-center text-xs text-ink-500">
        New to Hospigram?{" "}
        <Link to="/register" state={{ from }} className="link inline-flex items-center gap-1">
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Create a free account
        </Link>
      </p>
    </div>
  );
}

function Summary({ provider, v }) {
  const rows = [
    [MapPin, provider.name],
    [Info, v.service || "Choose a service"],
    [CalendarDays, v.date ? formatDate(v.date) : "Choose a date"],
    [Clock, v.time ? formatTime(v.time) : "Choose a time"],
  ];
  return (
    <ul className="space-y-1.5 rounded-md border border-ink-100 bg-ink-50/60 p-3 text-sm">
      {rows.map(([Icon, text], i) => (
        <li key={i} className="flex items-center gap-2 text-ink-700">
          <Icon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
          <span className="truncate">{text}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- main
/** <BookingForm provider={provider} defaultService="X-Ray" /> */
export default function BookingForm({ provider, defaultService }) {
  const { role, account, loading: authLoading } = useAuth();
  const options = useMemo(() => serviceOptions(provider), [provider]);
  const days = useMemo(() => {
    const t = todayIST();
    return Array.from({ length: 14 }, (_, i) => {
      const ymd = addDays(t, i);
      return { ymd, label: i === 0 ? "Today" : i === 1 ? "Tmrw" : formatDate(ymd, { weekday: "short" }), slots: timeSlots(ymd).length };
    });
  }, []);
  const firstDay = days.find((d) => d.slots)?.ymd || days[1].ymd;
  const initialService = defaultService && options.find((o) => o.toLowerCase() === String(defaultService).toLowerCase());
  const isLab = provider.kind === "lab";
  const canHome = isLab && provider.homeCollection;

  const f = useForm({ service: initialService || options[0] || "", date: firstDay, time: "", problem: "", homeCollection: false, collectionAddress: account?.address || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const v = f.values;

  const pickDate = (d) => f.setValues((s) => ({ ...s, date: d, time: timeSlots(d).includes(s.time) ? s.time : "" }));
  const toggleHome = (e) => {
    const on = e.target.checked;
    f.setValues((s) => ({ ...s, homeCollection: on, collectionAddress: s.collectionAddress || account?.address || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!v.date) er.date = "Choose a date";
    if (!v.time) er.time = "Choose a time slot";
    if (v.homeCollection && v.collectionAddress.trim().length < 5) er.collectionAddress = "Enter the full address for the sample collection";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      const appt = await patientApi.book({
        provider: provider._id,
        service: v.service,
        problem: v.problem.trim(),
        date: v.date,
        time: v.time,
        homeCollection: canHome && v.homeCollection,
        collectionAddress: canHome && v.homeCollection ? v.collectionAddress.trim() : "",
      });
      setDone(appt);
      toast.success("Booking request sent");
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Confirmation
        appt={{ ...done, date: done.date || v.date, time: done.time || v.time, service: done.service || v.service }}
        provider={provider}
        onAgain={() => {
          setDone(null);
          f.setValues((s) => ({ ...s, time: "", problem: "" }));
        }}
      />
    );

  const isPatient = role === "patient";
  const otherRole = role && !isPatient;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormAlert>{error}</FormAlert>

      <Field label={isLab ? "Test or scan" : "Service"} error={f.errors.service}>
        {(id, d) => (
          <Select id={id} aria-describedby={d} value={v.service} onChange={f.set("service")} error={f.errors.service}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink-700">
          Date<span className="ml-0.5 text-brand-600">*</span>
        </p>
        <DayChips days={days} value={v.date} onChange={pickDate} />
        {f.errors.date && <p className="mt-1 text-xs font-medium text-brand-700">{f.errors.date}</p>}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink-700">
          Time<span className="ml-0.5 text-brand-600">*</span>
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={v.date} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <SlotChips date={v.date} value={v.time} onChange={f.set("time")} />
          </motion.div>
        </AnimatePresence>
        {f.errors.time && <p className="mt-1.5 text-xs font-medium text-brand-700">{f.errors.time}</p>}
      </div>

      <Field label={isLab ? "Notes for the lab" : "Problem or reason for visit"} hint="Optional. Helps the team prepare." error={f.errors.problem}>
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} maxLength={1000} value={v.problem} onChange={f.set("problem")} error={f.errors.problem} placeholder={isLab ? "e.g. Doctor's prescription for fasting sugar" : "e.g. Fever and cough for 3 days"} />}
      </Field>

      {canHome && (
        <div className="rounded-md border border-care-100 bg-care-50/50 p-3.5">
          <Checkbox label="Home sample collection" hint="A trained phlebotomist visits your address" checked={v.homeCollection} onChange={toggleHome} />
          <AnimatePresence initial={false}>
            {v.homeCollection && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <Field label="Collection address" required error={f.errors.collectionAddress} className="pt-3">
                  {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} maxLength={300} value={v.collectionAddress} onChange={f.set("collectionAddress")} error={f.errors.collectionAddress} placeholder="House no., street, area, city" />}
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isPatient ? (
        <div className="space-y-2">
          <Button type="submit" size="lg" loading={busy} icon={CalendarCheck} className="w-full">
            Request booking
          </Button>
          <p className="text-center text-xs text-ink-500">Free to book. The {isLab ? "lab" : "hospital"} confirms your slot.</p>
        </div>
      ) : otherRole ? (
        <FormAlert tone="info">Only patient accounts can book appointments. You are logged in as a {role === "admin" ? "Hospigram admin" : "partner"} account.</FormAlert>
      ) : (
        <div className="space-y-3">
          <Summary provider={provider} v={v} />
          {authLoading ? <Button size="lg" loading className="w-full" /> : <GuestActions />}
        </div>
      )}
    </form>
  );
}
