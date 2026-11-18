// Assisted booking (/admin/book): the team books for a patient who called or walked in.
// Steps: patient -> hospital / lab -> service, date & time -> review -> done.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Check,
  CircleCheck,
  Clock,
  FlaskConical,
  Home,
  Hospital,
  MapPin,
  Pencil,
  Search,
  Stethoscope,
  UserPlus,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Badge, Button, Card, Checkbox, EmptyState, ErrorState, Field, FormAlert, Input, SearchInput, Skeleton, StatusBadge, Tabs, Textarea, cx } from "../../components/ui";
import { adminApi } from "../../lib/api";
import { KIND_LABEL, addDays, formatDate, formatTime, isPhone, slotPeriod, timeSlots, todayIST, useDebounced, useLoad } from "../../lib/format";
import { CreatePatientForm, TempPasswordModal } from "./AdminPatients";

const STEPS = ["Patient", "Hospital or lab", "Date & time", "Review"];
const EMPTY = { service: "", date: "", time: "", problem: "", homeCollection: false, collectionAddress: "" };

export default function AdminNewBooking() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [patient, setPatient] = useState(null);
  const [kind, setKind] = useState("hospital");
  const [provider, setProvider] = useState(null);
  const [details, setDetails] = useState(EMPTY);
  const [tempPw, setTempPw] = useState(null);
  const [done, setDone] = useState(null);

  const go = (s) => {
    setDir(s > step ? 1 : -1);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = (keepPatient) => {
    setDone(null);
    setProvider(null);
    setDetails(EMPTY);
    if (!keepPatient) setPatient(null);
    setDir(-1);
    setStep(keepPatient ? 1 : 0);
  };

  if (done) return <Success appt={done} patient={patient} onAgain={() => reset(true)} onNew={() => reset(false)} />;

  const variants = {
    enter: (d) => ({ opacity: 0, x: d * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d * -28 }),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* step indicator */}
      <ol className="grid grid-cols-4 gap-2 text-xs font-semibold">
        {STEPS.map((label, i) => (
          <li key={label} className={cx("border-t-2 pt-2", i <= step ? "border-brand-600 text-brand-700" : "border-ink-200 text-ink-400")}>
            <button
              type="button"
              disabled={i >= step}
              onClick={() => go(i)}
              className="flex w-full items-center gap-2 text-left disabled:cursor-default"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-sm text-[11px]", i < step ? "bg-brand-600 text-white" : i === step ? "bg-brand-50 text-brand-700" : "bg-ink-100")}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden truncate sm:inline">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-ink-700 sm:hidden">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {/* summary chips of earlier choices */}
      {step > 0 && (
        <div className="flex flex-wrap gap-2">
          {patient && (
            <button type="button" onClick={() => go(0)} className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-ink-300">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-ink-400" /> <span className="truncate">{patient.name}</span> <Pencil className="h-3 w-3 shrink-0 text-ink-400" />
            </button>
          )}
          {step > 1 && provider && (
            <button type="button" onClick={() => go(1)} className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-ink-300">
              {provider.kind === "lab" ? <FlaskConical className="h-3.5 w-3.5 shrink-0 text-ink-400" /> : <Hospital className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
              <span className="truncate">{provider.name}</span> <Pencil className="h-3 w-3 shrink-0 text-ink-400" />
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
          {step === 0 && (
            <PatientStep
              patient={patient}
              onPick={setPatient}
              onCreated={(res) => {
                setPatient(res.patient);
                setTempPw(res);
              }}
              onNext={() => go(1)}
            />
          )}
          {step === 1 && (
            <ProviderStep
              kind={kind}
              setKind={setKind}
              provider={provider}
              onPick={(p) => {
                if (p._id !== provider?._id) setDetails({ ...EMPTY, collectionAddress: patient?.address || "" });
                setProvider(p);
              }}
              onBack={() => go(0)}
              onNext={() => go(2)}
            />
          )}
          {step === 2 && <DetailsStep provider={provider} details={details} setDetails={setDetails} onBack={() => go(1)} onNext={() => go(3)} />}
          {step === 3 && (
            <ReviewStep
              patient={patient}
              provider={provider}
              details={details}
              onBack={() => go(2)}
              onEdit={go}
              onBooked={(appt) => setDone(appt)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <TempPasswordModal data={tempPw} onClose={() => setTempPw(null)} />
    </div>
  );
}

// ---------------------------------------------------------------- step 1: patient
function PatientStep({ patient, onPick, onCreated, onNext }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState({ loading: false, error: "", notFound: false, result: null });
  const [creating, setCreating] = useState(false);

  const find = async (e) => {
    e.preventDefault();
    const v = q.trim();
    if (state.loading) return;
    if (!v) return setState((s) => ({ ...s, error: "Type a mobile number or patient ID" }));
    setCreating(false);
    setState({ loading: true, error: "", notFound: false, result: null });
    try {
      const p = await adminApi.lookupPatient(v);
      setState({ loading: false, error: "", notFound: false, result: p });
    } catch (err) {
      if (err.status === 404) setState({ loading: false, error: "", notFound: true, result: null });
      else setState({ loading: false, error: err.message, notFound: false, result: null });
    }
  };

  const shown = state.result || (!state.notFound && !creating ? patient : null);
  const blocked = shown?.status === "blocked";

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold">Who is the booking for?</h2>
      <p className="mt-1 text-sm text-ink-500">Find the patient by mobile number or patient ID (like HGP-4K7Q2M). New callers can be added in a minute.</p>

      <form onSubmit={find} className="mt-5 flex flex-col gap-2 sm:flex-row" noValidate>
        <div className="flex-1">
          <Input
            icon={Search}
            aria-label="Mobile number or patient ID"
            placeholder="Mobile number or patient ID"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (state.error) setState((s) => ({ ...s, error: "" }));
            }}
            error={state.error}
            autoFocus
          />
        </div>
        <Button type="submit" loading={state.loading} icon={Search}>
          Find patient
        </Button>
      </form>
      {state.error && <p className="mt-1.5 text-xs font-medium text-brand-700">{state.error}</p>}

      <AnimatePresence mode="wait" initial={false}>
        {state.notFound && !creating && (
          <motion.div key="nf" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-md border border-dashed border-ink-200 p-5 text-center">
            <p className="font-semibold text-ink-900">No patient with “{q.trim()}”</p>
            <p className="mt-1 text-sm text-ink-500">Check the number, or create a new patient account.</p>
            <Button className="mt-4" icon={UserPlus} onClick={() => setCreating(true)}>
              Create new patient
            </Button>
          </motion.div>
        )}

        {creating && (
          <motion.div key="create" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-md border border-ink-100 bg-ink-50/50 p-4 sm:p-5">
            <h3 className="mb-4 font-bold">New patient</h3>
            <CreatePatientForm
              initial={{ phone: isPhone(q) ? q.trim() : "" }}
              submitLabel="Create and continue"
              onCancel={() => setCreating(false)}
              onCreated={(res) => {
                setCreating(false);
                setState({ loading: false, error: "", notFound: false, result: res.patient });
                onCreated(res);
              }}
            />
          </motion.div>
        )}

        {shown && !creating && (
          <motion.div key={shown._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
            <div className={cx("flex flex-wrap items-center gap-3 rounded-md border p-4", patient?._id === shown._id ? "border-brand-300 bg-brand-50/40" : "border-ink-100")}>
              <Avatar name={shown.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{shown.name}</p>
                <p className="truncate text-xs text-ink-500">
                  <span className="font-mono">{shown.patientId}</span> · {shown.phone}
                  {shown.city && ` · ${shown.city}`}
                </p>
              </div>
              <StatusBadge status={shown.status} />
            </div>
            {blocked ? (
              <div className="mt-4">
              <FormAlert tone="warn">
                This patient is blocked and cannot be booked for. Unblock them on the{" "}
                <Link to={`/admin/patients?q=${encodeURIComponent(shown.patientId)}`} className="font-semibold underline">
                  Patients page
                </Link>{" "}
                first.
              </FormAlert>
              </div>
            ) : (
              <div className="mt-4 flex justify-end">
                <Button
                  iconRight={ArrowRight}
                  onClick={() => {
                    onPick(shown);
                    onNext();
                  }}
                >
                  Book for {shown.name.split(" ")[0]}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!shown && !creating && !state.notFound && (
        <div className="mt-5 flex items-center gap-2 text-sm text-ink-500">
          New caller?
          <button type="button" className="link" onClick={() => setCreating(true)}>
            Create a patient account
          </button>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- step 2: provider
function ProviderStep({ kind, setKind, provider, onPick, onBack, onNext }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim());
  const list = useLoad(adminApi.providers, { kind, status: "approved", q: dq, limit: 12 });
  const items = list.data?.items || [];

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold">Choose a hospital or lab</h2>
      <p className="mt-1 text-sm text-ink-500">Only approved partners can be booked.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          options={[
            { value: "hospital", label: "Hospital" },
            { value: "lab", label: "Lab" },
          ]}
          value={kind}
          onChange={setKind}
        />
        <SearchInput value={q} onChange={setQ} placeholder={kind === "lab" ? "Search labs by name, city or test" : "Search hospitals by name, city or department"} className="flex-1" />
      </div>

      <div className="mt-4">
        {list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState icon={kind === "lab" ? FlaskConical : Hospital} title={`No approved ${kind === "lab" ? "labs" : "hospitals"} found`} text={dq ? "Try another name, city or service." : "Approve a partner first."} />
        ) : (
          <div className={cx("grid gap-3 transition-opacity sm:grid-cols-2", list.loading && "opacity-60")} role="radiogroup" aria-label={`Choose a ${kind}`}>
            {items.map((p, i) => {
              const on = provider?._id === p._id;
              return (
                <motion.button
                  key={p._id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03 }}
                  onClick={() => onPick(p)}
                  className={cx("relative rounded-md border p-4 text-left transition", on ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20" : "border-ink-100 bg-white hover:border-ink-300")}
                >
                  {on && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <p className="pr-7 font-semibold text-ink-900">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {p.category ? `${p.category} · ` : ""}
                      {p.city}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{p.services?.length || 0} services</Badge>
                    {p.homeCollection && p.kind === "lab" && <Badge tone="care">Home collection</Badge>}
                    {p.emergency && p.kind === "hospital" && <Badge tone="brand">24×7 emergency</Badge>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Back
        </Button>
        <Button iconRight={ArrowRight} disabled={!provider} onClick={onNext}>
          Continue
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- step 3: details
function DetailsStep({ provider, details, setDetails, onBack, onNext }) {
  const [errors, setErrors] = useState({});
  const set = (k, v) => {
    setDetails((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const today = todayIST();
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const slots = details.date ? timeSlots(details.date) : [];
  const groups = ["Morning", "Afternoon", "Evening"].map((g) => ({ g, list: slots.filter((t) => slotPeriod(t) === g) })).filter((x) => x.list.length);
  const canHome = provider?.kind === "lab" && provider?.homeCollection;

  const next = () => {
    const er = {};
    if (!details.date) er.date = "Choose a date";
    if (!details.time) er.time = "Choose a time";
    if (canHome && details.homeCollection && details.collectionAddress.trim().length < 5) er.collectionAddress = "Enter the full address for the home visit";
    setErrors(er);
    if (!Object.keys(er).length) onNext();
  };

  return (
    <Card className="space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">{provider?.kind === "lab" ? "Test, date and time" : "Department, date and time"}</h2>
        <p className="mt-1 text-sm text-ink-500">At {provider?.name}</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-700">{provider?.kind === "lab" ? "Test or scan" : "Department"}</p>
        {provider?.services?.length ? (
          <div className="flex flex-wrap gap-2">
            {[...provider.services, ""].map((s) => {
              const on = details.service === s;
              return (
                <button
                  key={s || "none"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("service", s)}
                  className={cx("inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm font-semibold transition", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:border-ink-300")}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {s || "Not sure yet"}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ink-500">This partner has not listed services. Add details in the notes.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-700">
          Date <span className="text-brand-600">*</span>
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Date">
          {dates.map((d) => {
            const on = details.date === d;
            const noSlots = !timeSlots(d).length;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={noSlots}
                onClick={() => {
                  setDetails((x) => ({ ...x, date: d, time: timeSlots(d).includes(x.time) ? x.time : "" }));
                  setErrors((e) => ({ ...e, date: undefined }));
                }}
                className={cx(
                  "flex w-16 shrink-0 flex-col items-center rounded-md border py-2 transition disabled:cursor-not-allowed disabled:opacity-40",
                  on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                )}
              >
                <span className={cx("text-[11px] font-semibold uppercase", on ? "text-white/80" : "text-ink-500")}>{d === today ? "Today" : formatDate(d, { weekday: "short" })}</span>
                <span className="font-display text-lg font-extrabold leading-tight">{formatDate(d, { day: "numeric" })}</span>
                <span className={cx("text-[11px]", on ? "text-white/80" : "text-ink-500")}>{formatDate(d, { month: "short" })}</span>
              </button>
            );
          })}
        </div>
        {errors.date && <p className="text-xs font-medium text-brand-700">{errors.date}</p>}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-700">
          Time <span className="text-brand-600">*</span>
        </p>
        {!details.date ? (
          <p className="text-sm text-ink-500">Choose a date first.</p>
        ) : (
          <div className="space-y-3" role="radiogroup" aria-label="Time">
            {groups.map(({ g, list }) => (
              <div key={g}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">{g}</p>
                <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-6">
                  {list.map((t) => {
                    const on = details.time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set("time", t)}
                        className={cx("rounded-sm border py-2 text-sm font-semibold transition", on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300")}
                      >
                        {formatTime(t)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {errors.time && <p className="mt-1.5 text-xs font-medium text-brand-700">{errors.time}</p>}
      </div>

      {canHome && (
        <div className="space-y-3 rounded-md border border-care-100 bg-care-50/50 p-4">
          <Checkbox label="Home sample collection" hint="The lab visits the patient to collect the sample" checked={details.homeCollection} onChange={(e) => set("homeCollection", e.target.checked)} />
          {details.homeCollection && (
            <Field label="Collection address" required error={errors.collectionAddress}>
              {(id, d) => (
                <Textarea id={id} aria-describedby={d} rows={2} maxLength={300} value={details.collectionAddress} onChange={(e) => set("collectionAddress", e.target.value)} error={errors.collectionAddress} placeholder="House, street, area, city" />
              )}
            </Field>
          )}
        </div>
      )}

      <Field label="Problem or notes" hint="Optional. Shared with the hospital or lab.">
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} maxLength={1000} value={details.problem} onChange={(e) => set("problem", e.target.value)} placeholder="e.g. Fever for 3 days, wants to see a physician" />}
      </Field>

      <div className="flex justify-between gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Back
        </Button>
        <Button iconRight={ArrowRight} onClick={next}>
          Review
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- step 4: review
function ReviewStep({ patient, provider, details, onBack, onEdit, onBooked }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const home = provider.kind === "lab" && provider.homeCollection && details.homeCollection;

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const appt = await adminApi.book({
        patient: patient._id,
        provider: provider._id,
        service: details.service,
        problem: details.problem.trim(),
        date: details.date,
        time: details.time,
        homeCollection: Boolean(home),
        collectionAddress: home ? details.collectionAddress.trim() : "",
      });
      toast.success(`Booked. ID ${appt.bookingId}`);
      onBooked(appt);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold">Check and confirm</h2>
      <p className="mt-1 text-sm text-ink-500">The booking goes to the {provider.kind === "lab" ? "lab" : "hospital"} as a request. They confirm it, or you can confirm it from Appointments.</p>
      <div className="mt-4">
        <FormAlert>{error}</FormAlert>
      </div>
      <div className="mt-2 divide-y divide-ink-100">
        <Section onEdit={onEdit} title="Patient" step={0}>
          <p className="font-semibold text-ink-900">{patient.name}</p>
          <p className="text-xs text-ink-500">
            <span className="font-mono">{patient.patientId}</span> · {patient.phone}
          </p>
        </Section>
        <Section onEdit={onEdit} title={KIND_LABEL[provider.kind]} step={1}>
          <p className="font-semibold text-ink-900">{provider.name}</p>
          <p className="text-xs text-ink-500">{[provider.address, provider.city].filter(Boolean).join(", ")}</p>
        </Section>
        <Section onEdit={onEdit} title="When" step={2}>
          <p className="flex items-center gap-1.5 font-semibold text-ink-900">
            <Clock className="h-4 w-4 text-ink-400" aria-hidden="true" />
            {formatDate(details.date)}, {formatTime(details.time)}
          </p>
        </Section>
        <Section onEdit={onEdit} title={provider.kind === "lab" ? "Test" : "Department"} step={2}>
          <p className="flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-ink-400" aria-hidden="true" />
            {details.service || "Not decided"}
          </p>
          {home && (
            <p className="mt-1 flex items-start gap-1.5 text-care-700">
              <Home className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Home collection at {details.collectionAddress}
            </p>
          )}
          {details.problem && <p className="mt-1 whitespace-pre-wrap text-ink-600">{details.problem}</p>}
        </Section>
      </div>
      <div className="mt-6 flex justify-between gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button icon={CalendarCheck} loading={busy} onClick={confirm}>
          Confirm booking
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, step, onEdit, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
        <div className="mt-1 text-sm text-ink-800">{children}</div>
      </div>
      <button type="button" onClick={() => onEdit(step)} className="link shrink-0 text-xs">
        Change
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- done
function Success({ appt, patient, onAgain, onNew }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="mx-auto max-w-xl">
      <Card className="p-6 text-center sm:p-8">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-care-50 text-care-600">
          <CircleCheck className="h-9 w-9" aria-hidden="true" />
        </motion.span>
        <h2 className="mt-4 text-2xl font-extrabold">Booking made</h2>
        <p className="mt-1 text-sm text-ink-500">Tell the patient their booking ID. The {appt.providerKind === "lab" ? "lab" : "hospital"} will confirm it.</p>
        <p className="mt-5 inline-block rounded-md border border-dashed border-ink-300 bg-ink-50 px-4 py-2 font-mono text-xl font-bold tracking-wider text-ink-900">{appt.bookingId}</p>
        <dl className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Patient</dt>
            <dd className="text-right font-semibold text-ink-900">{appt.patientName || patient?.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">{KIND_LABEL[appt.providerKind]}</dt>
            <dd className="text-right font-semibold text-ink-900">{appt.providerName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">When</dt>
            <dd className="text-right font-semibold text-ink-900">
              {formatDate(appt.date)}, {formatTime(appt.time)}
            </dd>
          </div>
          {appt.service && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Service</dt>
              <dd className="text-right font-semibold text-ink-900">{appt.service}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-500">Status</dt>
            <dd>
              <StatusBadge status={appt.status} />
            </dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button as={Link} to={`/admin/appointments?q=${encodeURIComponent(appt.bookingId)}`} variant="secondary" icon={CalendarCheck}>
            View booking
          </Button>
          <Button variant="secondary" icon={CalendarPlus} onClick={onAgain}>
            Another for {(appt.patientName || patient?.name || "patient").split(" ")[0]}
          </Button>
          <Button icon={UserPlus} onClick={onNew}>
            New patient booking
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
