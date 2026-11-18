// Patient home (/account): bookings (upcoming / past), profile and password.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  Check,
  Copy,
  FlaskConical,
  History,
  Home,
  Hospital,
  KeyRound,
  LogOut,
  MapPin,
  MessageSquareText,
  Navigation,
  Phone,
  Save,
  Stethoscope,
} from "lucide-react";
import toast from "react-hot-toast";
import { PasswordInput } from "../auth/AuthShell";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, FormAlert, Input, Select, Skeleton, StatusBadge, Tabs, Textarea, cx } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi, patientApi, tokenStore } from "../../lib/api";
import { CITIES, KIND_LABEL, SUPPORT_PHONE, SUPPORT_PHONE_LINK, formatDate, formatTime, isEmail, passwordProblem, todayIST, useForm, useLoad } from "../../lib/format";

const telLink = (phone) => `tel:${String(phone || "").startsWith("+") ? phone : `+91${phone}`}`;
const mapsLink = (...parts) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(", "))}`;

// ---------------------------------------------------------------- header
function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Patient ID copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Please select and copy it.");
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={label} title={label} className="inline-grid h-7 w-7 place-items-center rounded-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-900">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={copied ? "y" : "n"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.15 }}>
          {copied ? <Check className="h-4 w-4 text-care-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function Header({ account }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-care-500" aria-hidden="true" />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={account?.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-500">Welcome back,</p>
          <h1 className="truncate text-2xl font-extrabold">{account?.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
            {account?.patientId && (
              <span className="inline-flex items-center gap-1">
                <span className="text-ink-500">Patient ID</span>
                <span className="font-mono font-semibold text-ink-900">{account.patientId}</span>
                <CopyButton text={account.patientId} label="Copy patient ID" />
              </span>
            )}
            {account?.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-ink-400" aria-hidden="true" />
                {account.phone}
              </span>
            )}
            {account?.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-ink-400" aria-hidden="true" />
                {account.city}
              </span>
            )}
          </div>
        </div>
        <Button as={Link} to="/book" icon={CalendarPlus} className="w-full sm:w-auto">
          Book an appointment
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- bookings
function BookingCard({ a, index, onCancel }) {
  const p = a.provider && typeof a.provider === "object" ? a.provider : {};
  const kind = p.kind || a.providerKind || "hospital";
  const Icon = kind === "lab" ? FlaskConical : Hospital;
  const name = p.name || a.providerName || KIND_LABEL[kind];
  const providerUrl = p._id ? `/${kind === "lab" ? "labs" : "hospitals"}/${p._id}` : null;
  const canCancel = ["pending", "confirmed"].includes(a.status);
  const isToday = a.date === todayIST();

  return (
    <motion.li layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}>
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-md", kind === "lab" ? "bg-care-50 text-care-700" : "bg-brand-50 text-brand-600")}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                {providerUrl ? (
                  <Link to={providerUrl} className="block truncate font-display text-base font-bold text-ink-900 hover:text-brand-700">
                    {name}
                  </Link>
                ) : (
                  <p className="truncate font-display text-base font-bold text-ink-900">{name}</p>
                )}
                <p className="text-xs text-ink-500">
                  {KIND_LABEL[kind]} · Booking <span className="font-mono">{a.bookingId}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {isToday && a.status !== "cancelled" && <Badge tone="brand">Today</Badge>}
                <StatusBadge status={a.status} />
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  {formatDate(a.date)} · <span className="font-semibold">{formatTime(a.time)}</span>
                </span>
              </p>
              <p className="flex min-w-0 items-center gap-2">
                <Stethoscope className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span className="truncate">{a.service || "General consultation"}</span>
              </p>
              {a.homeCollection && (
                <p className="flex items-start gap-2 sm:col-span-2">
                  <Home className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    <span className="font-semibold text-violet-700">Home collection</span>
                    {a.collectionAddress ? ` at ${a.collectionAddress}` : ""}
                  </span>
                </p>
              )}
            </div>

            {a.providerNote && (
              <div className="mt-3 flex gap-2 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="min-w-0 break-words">
                  <span className="font-semibold">Note from {name}:</span> {a.providerNote}
                </p>
              </div>
            )}

            {p.address && (
              <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{[p.address, p.city].filter(Boolean).join(", ")}</span>
              </p>
            )}
          </div>
        </div>

        {(p.phone || p.address || canCancel) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 bg-ink-50/50 px-4 py-2.5 sm:px-5">
            {p.phone && (
              <Button as="a" href={telLink(p.phone)} variant="secondary" size="sm" icon={Phone}>
                Call
              </Button>
            )}
            {p.address && (
              <Button as="a" href={mapsLink(name, p.address, p.city)} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={Navigation}>
                Directions
              </Button>
            )}
            {canCancel && (
              <Button variant="danger-ghost" size="sm" icon={CalendarX2} onClick={() => onCancel(a)} className="ml-auto">
                Cancel booking
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.li>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex gap-3 p-5">
          <Skeleton className="h-11 w-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function BookingList({ items, past, onCancel }) {
  if (!items.length) {
    return (
      <Card>
        <EmptyState
          icon={past ? History : CalendarDays}
          title={past ? "No past bookings yet" : "No upcoming bookings"}
          text={past ? "Completed, cancelled and earlier bookings will show up here." : "Book a verified hospital or diagnostic lab near you in under a minute."}
          action={
            <Button as={Link} to="/book" icon={CalendarPlus}>
              Book an appointment
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <ul className="space-y-4">
      <AnimatePresence initial={false}>
        {items.map((a, i) => (
          <BookingCard key={a._id} a={a} index={i} onCancel={onCancel} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

// ---------------------------------------------------------------- profile
const pickProfile = (a = {}) => ({
  name: a.name || "",
  email: a.email || "",
  gender: a.gender || "",
  dob: a.dob || "",
  city: a.city || "",
  address: a.address || "",
  language: a.language || "en",
});

function ProfileForm() {
  const { account, setAccount } = useAuth();
  const initial = useMemo(() => pickProfile(account), [account]);
  const f = useForm(initial);
  const v = f.values;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const er = {};
    if (v.name.trim().length < 2) er.name = "Enter your full name";
    if (v.email.trim() && !isEmail(v.email)) er.email = "Enter a valid email address";
    if (v.dob && v.dob > todayIST()) er.dob = "Date of birth cannot be in the future";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await authApi.updateMe({ ...v, name: v.name.trim(), email: v.email.trim(), city: v.city.trim(), address: v.address.trim() });
      setAccount(res.account);
      f.setValues(pickProfile(res.account));
      toast.success("Profile saved");
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold">Your details</h2>
      <p className="mt-0.5 text-sm text-ink-500">Hospitals and labs see these details with your bookings.</p>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <FormAlert>{error}</FormAlert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={f.errors.name} className="sm:col-span-2">
            {(id, d) => <Input id={id} aria-describedby={d} autoComplete="name" maxLength={80} value={v.name} onChange={f.set("name")} error={f.errors.name} />}
          </Field>
          <Field label="Mobile number" hint={`Your login. To change it, call ${SUPPORT_PHONE}.`}>
            {(id, d) => <Input id={id} aria-describedby={d} value={account?.phone || ""} disabled readOnly />}
          </Field>
          <Field label="Email" error={f.errors.email} hint="Optional">
            {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" value={v.email} onChange={f.set("email")} error={f.errors.email} />}
          </Field>
          <Field label="Gender" error={f.errors.gender}>
            {(id, d) => (
              <Select id={id} aria-describedby={d} value={v.gender} onChange={f.set("gender")} error={f.errors.gender}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            )}
          </Field>
          <Field label="Date of birth" error={f.errors.dob}>
            {(id, d) => <Input id={id} aria-describedby={d} type="date" max={todayIST()} min="1900-01-01" value={v.dob} onChange={f.set("dob")} error={f.errors.dob} />}
          </Field>
          <Field label="City" error={f.errors.city}>
            {(id, d) => (
              <>
                <Input id={id} aria-describedby={d} list="hg-account-cities" autoComplete="address-level2" maxLength={80} value={v.city} onChange={f.set("city")} error={f.errors.city} />
                <datalist id="hg-account-cities">
                  {CITIES.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Preferred language" error={f.errors.language}>
            {(id, d) => (
              <Select id={id} aria-describedby={d} value={v.language} onChange={f.set("language")} error={f.errors.language}>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </Select>
            )}
          </Field>
          <Field label="Address" error={f.errors.address} hint="Used for home sample collection" className="sm:col-span-2">
            {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} maxLength={300} autoComplete="street-address" value={v.address} onChange={f.set("address")} error={f.errors.address} />}
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" icon={Save} loading={busy} disabled={!dirty} className="w-full sm:w-auto">
            Save changes
          </Button>
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => {
                f.setValues(initial);
                f.setErrors({});
                setError("");
              }}
              disabled={busy}
            >
              Undo
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- security
function SecurityForm() {
  const { logout } = useAuth();
  const f = useForm({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const v = f.values;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setDone(false);
    const er = {};
    if (!v.current) er.current = "Enter your current password";
    const p = passwordProblem(v.next);
    if (p) er.next = p;
    else if (v.next === v.current) er.next = "Choose a password different from the current one";
    if (!er.next && v.confirm !== v.next) er.confirm = "The passwords do not match";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await authApi.changePassword(v.current, v.next);
      if (res?.token) tokenStore.set(res.token);
      f.setValues({ current: "", next: "", confirm: "" });
      setDone(true);
      toast.success("Password changed");
    } catch (err) {
      const errs = { ...(err.errors || {}) };
      if (errs.currentPassword) errs.current = errs.currentPassword;
      if (errs.newPassword) errs.next = errs.newPassword;
      f.setErrors(errs);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold">Change password</h2>
        <p className="mt-0.5 text-sm text-ink-500">You will stay logged in here. Other devices will be logged out.</p>
        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <FormAlert>{error}</FormAlert>
          {done && <FormAlert tone="success">Your password is changed.</FormAlert>}
          <Field label="Current password" error={f.errors.current}>
            {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="current-password" value={v.current} onChange={f.set("current")} error={f.errors.current} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" hint="8+ characters with a letter and a number" error={f.errors.next}>
              {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.next} onChange={f.set("next")} error={f.errors.next} />}
            </Field>
            <Field label="Confirm new password" error={f.errors.confirm}>
              {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.confirm} onChange={f.set("confirm")} error={f.errors.confirm} />}
            </Field>
          </div>
          <Button type="submit" icon={KeyRound} loading={busy} className="w-full sm:w-auto">
            Change password
          </Button>
        </form>
      </Card>
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold text-ink-900">Forgot your password?</p>
          <p className="text-sm text-ink-500">
            Call Hospigram support at{" "}
            <a href={SUPPORT_PHONE_LINK} className="link">
              {SUPPORT_PHONE}
            </a>{" "}
            and we will help you reset it.
          </p>
        </div>
        <Button variant="secondary" icon={LogOut} onClick={logout} className="shrink-0">
          Log out
        </Button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- page
const TABS = ["upcoming", "past", "profile", "security"];

export default function Account() {
  const { account } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "upcoming";
  const setTab = (t) => setParams(t === "upcoming" ? {} : { tab: t }, { replace: true });
  const { data, loading, error, reload, setData } = useLoad(() => patientApi.appointments());
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "My account · Hospigram";
  }, []);

  const askCancel = useCallback((a) => {
    setReason("");
    setCancelling(a);
  }, []);

  const doCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      const res = await patientApi.cancel(cancelling._id, reason.trim());
      const merged = { ...cancelling, ...res, provider: cancelling.provider }; // the response does not include provider details
      setData((d) => (d ? { upcoming: d.upcoming.filter((x) => x._id !== merged._id), past: [merged, ...d.past.filter((x) => x._id !== merged._id)] } : d));
      toast.success(`Booking ${cancelling.bookingId} cancelled`);
      setCancelling(null);
    } catch (err) {
      toast.error(err.message || "Could not cancel the booking");
    } finally {
      setBusy(false);
    }
  };

  const tabOptions = [
    { value: "upcoming", label: "Upcoming", count: data ? data.upcoming.length : undefined },
    { value: "past", label: "Past", count: data ? data.past.length : undefined },
    { value: "profile", label: "Profile" },
    { value: "security", label: "Security" },
  ];

  let content;
  if (tab === "profile") content = <ProfileForm />;
  else if (tab === "security") content = <SecurityForm />;
  else if (error && !data)
    content = (
      <Card>
        <ErrorState error={error} onRetry={reload} />
      </Card>
    );
  else if (loading && !data) content = <BookingsSkeleton />;
  else content = <BookingList items={tab === "past" ? data.past : data.upcoming} past={tab === "past"} onCancel={askCancel} />;

  return (
    <div className="container-page max-w-4xl py-6 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Header account={account} />
      </motion.div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs options={tabOptions} value={tab} onChange={setTab} />
        {(tab === "upcoming" || tab === "past") && data && (
          <button type="button" onClick={reload} disabled={loading} className="text-sm font-semibold text-ink-500 hover:text-ink-800 disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => !busy && setCancelling(null)}
        onConfirm={doCancel}
        loading={busy}
        title="Cancel this booking?"
        confirmLabel="Yes, cancel booking"
        message={
          cancelling && (
            <div className="space-y-4">
              <p>
                Your booking <span className="font-mono font-semibold text-ink-900">{cancelling.bookingId}</span> at{" "}
                <span className="font-semibold text-ink-900">{cancelling.provider?.name || cancelling.providerName}</span> on {formatDate(cancelling.date)} at {formatTime(cancelling.time)} will be
                cancelled. This cannot be undone.
              </p>
              <Field label="Reason (optional)" hint="Shared with the hospital or lab">
                {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I can't come on this date" />}
              </Field>
            </div>
          )
        }
      />
    </div>
  );
}
