// Hospital / lab login (/hospital/login, /lab/login), registration (/hospital/register, /lab/register),
// admin login (/admin/login) and the partner portal chooser (/partners).
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Check, FlaskConical, Hospital, LocateFixed, Mail, Plus, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import AuthShell, { PasswordInput, afterLogin } from "./AuthShell";
import { Button, Checkbox, Field, FormAlert, Input, Reveal, Select, Textarea, cx } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi, homeFor } from "../../lib/api";
import { CITIES, HOSPITAL_SERVICES, LAB_SERVICES, SUPPORT_PHONE, isEmail, isPhone, passwordProblem, useForm } from "../../lib/format";

const COPY = {
  hospital: {
    noun: "hospital",
    Noun: "Hospital",
    icon: Hospital,
    home: "/hospital",
    categories: ["Multi-speciality hospital", "Super-speciality hospital", "General hospital", "Nursing home", "Clinic", "Maternity centre", "Eye hospital", "Dental clinic"],
    services: HOSPITAL_SERVICES,
    side: {
      eyebrow: "For hospitals",
      title: "Fill your OPD, without the phone tag.",
      text: "List your hospital on Hospigram, receive appointment requests and confirm them from one simple dashboard.",
      points: ["Verified listing seen by patients near you", "Confirm, reject or complete bookings in a tap", "Every booking with patient id and contact", "Free to join for partner hospitals"],
    },
  },
  lab: {
    noun: "lab",
    Noun: "Lab",
    icon: FlaskConical,
    home: "/lab",
    categories: ["Diagnostic centre", "Pathology lab", "Imaging centre", "Collection centre"],
    services: LAB_SERVICES,
    side: {
      eyebrow: "For diagnostic labs",
      title: "More tests booked, fewer walk-ins lost.",
      text: "List your lab on Hospigram, offer home sample collection and manage every test booking from one dashboard.",
      points: ["Verified listing with your tests and timings", "Home collection requests with the address", "Confirm and complete bookings in a tap", "Free to join for partner labs"],
    },
  },
};

// ---------------------------------------------------------------- login
export function ProviderLogin({ kind }) {
  const c = COPY[kind];
  const { role, account, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const f = useForm({ email: "", password: "" });
  const [error, setError] = useState("");
  const [wrongKind, setWrongKind] = useState(null);
  const [busy, setBusy] = useState(false);
  if (role && !busy) return <Navigate to={homeFor(role, account)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!isEmail(f.values.email)) er.email = "Enter your registered email";
    if (!f.values.password) er.password = "Enter your password";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    setWrongKind(null);
    try {
      const s = signIn(await authApi.providerLogin(f.values.email, f.values.password, kind));
      toast.success(`Welcome, ${s.account.name}`);
      navigate(afterLogin(location.state, c.home, c.home), { replace: true });
    } catch (err) {
      setError(err.message);
      setWrongKind(err.kind || null);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      tone="care"
      side={c.side}
      icon={c.icon}
      title={`${c.Noun} login`}
      subtitle={`Manage your ${c.noun}'s bookings on Hospigram.`}
      footer={
        <>
          Not a partner yet?{" "}
          <Link to={`/${kind}/register`} className="link">
            Register your {c.noun}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert>
          {error}
          {wrongKind && (
            <>
              {" "}
              <Link to={`/${wrongKind}/login`} className="font-semibold underline">
                Go to the {COPY[wrongKind].noun} login
              </Link>
            </>
          )}
        </FormAlert>
        <Field label="Email" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} icon={Mail} type="email" autoComplete="email" placeholder={`you@${c.noun}.com`} value={f.values.email} onChange={f.set("email")} error={f.errors.email} />}
        </Field>
        <Field label="Password" error={f.errors.password}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="current-password" value={f.values.password} onChange={f.set("password")} error={f.errors.password} />}
        </Field>
        <Button type="submit" variant="care" size="lg" loading={busy} className="w-full">
          Log in
        </Button>
        <p className="text-center text-xs text-ink-500">
          Forgot your password? Call Hospigram partner support at <span className="font-semibold text-ink-700">{SUPPORT_PHONE}</span>.
        </p>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------- registration (2 steps)
function ServicePicker({ options, value, onChange }) {
  const [custom, setCustom] = useState("");
  const toggle = (s) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  const add = () => {
    const s = custom.trim();
    if (s && !value.includes(s)) onChange([...value, s]);
    setCustom("");
  };
  const extras = value.filter((s) => !options.includes(s));
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[...options, ...extras].map((s) => {
          const on = value.includes(s);
          return (
            <button key={s} type="button" onClick={() => toggle(s)} className={cx("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-semibold transition", on ? "border-care-600 bg-care-50 text-care-700" : "border-ink-200 text-ink-600 hover:border-ink-300")}>
              {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {s}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Add another service" className="input" maxLength={60} />
        <Button variant="secondary" onClick={add} icon={Plus}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function ProviderRegister({ kind }) {
  const c = COPY[kind];
  const { role, account, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const f = useForm({ name: "", category: "", email: "", phone: "", password: "", address: "", city: "", pincode: "", timings: "Mon–Sat, 9 AM – 8 PM", services: [], description: "", homeCollection: false, emergency: false, agree: false });
  if (role && !busy) return <Navigate to={homeFor(role, account)} replace />;
  const v = f.values;

  const check = (s) => {
    const er = {};
    if (s === 0) {
      if (v.name.trim().length < 2) er.name = `Enter the ${c.noun} name`;
      if (!isEmail(v.email)) er.email = "Enter a valid email (this is your login)";
      if (!isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
      const pw = passwordProblem(v.password);
      if (pw) er.password = pw;
    } else {
      if (v.address.trim().length < 5) er.address = "Enter the full address";
      if (v.city.trim().length < 2) er.city = "Enter the city";
      if (v.pincode && !/^\d{6}$/.test(v.pincode)) er.pincode = "Enter a 6-digit PIN code";
      if (!v.services.length) er.services = "Choose at least one service";
      if (!v.agree) er.agree = "Please confirm the details are correct";
    }
    f.setErrors(er);
    return !Object.keys(er).length;
  };

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Location is not available in this browser");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
          const a = (await res.json()).address || {};
          f.setValues((s) => ({ ...s, city: a.city || a.town || a.state_district || a.county || s.city, pincode: a.postcode || s.pincode }));
          toast.success("Location filled in");
        } catch {
          toast.error("Could not detect the city. Please type it.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error("Location permission was denied");
      }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (step === 0) return check(0) && setStep(1);
    if (!check(1)) return;
    setBusy(true);
    setError("");
    try {
      const { agree, ...data } = v; // eslint-disable-line no-unused-vars
      const s = signIn(await authApi.providerRegister({ ...data, kind, name: v.name.trim(), email: v.email.trim(), homeCollection: kind === "lab" && v.homeCollection, emergency: kind === "hospital" && v.emergency }));
      toast.success(`${s.account.name} is registered. We will verify it shortly.`);
      navigate(c.home, { replace: true });
    } catch (err) {
      const errs = err.errors || {};
      f.setErrors(errs);
      if (["name", "email", "phone", "password"].some((k) => errs[k])) setStep(0);
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      tone="care"
      side={c.side}
      icon={c.icon}
      wide
      title={`Register your ${c.noun}`}
      subtitle="Our team verifies every partner before it is listed. This usually takes one working day."
      footer={
        <>
          Already registered?{" "}
          <Link to={`/${kind}/login`} className="link">
            Log in
          </Link>
        </>
      }
    >
      <ol className="mb-6 grid grid-cols-2 gap-2 text-xs font-semibold">
        {["Account", `${c.Noun} details`].map((label, i) => (
          <li key={label} className={cx("flex items-center gap-2 border-t-2 pt-2", i <= step ? "border-care-600 text-care-700" : "border-ink-200 text-ink-400")}>
            <span className={cx("grid h-5 w-5 place-items-center rounded-sm text-[11px]", i < step ? "bg-care-600 text-white" : i === step ? "bg-care-50 text-care-700" : "bg-ink-100")}>{i < step ? "✓" : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert>{error}</FormAlert>
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div key="s0" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="grid gap-4 sm:grid-cols-2">
              <Field label={`${c.Noun} name`} required error={f.errors.name} className="sm:col-span-2">
                {(id, d) => <Input id={id} aria-describedby={d} value={v.name} onChange={f.set("name")} error={f.errors.name} placeholder={kind === "lab" ? "e.g. City Diagnostics" : "e.g. Sunrise Multispeciality Hospital"} />}
              </Field>
              <Field label="Type" className="sm:col-span-2">
                {(id) => (
                  <Select id={id} value={v.category} onChange={f.set("category")}>
                    <option value="">Select type</option>
                    {c.categories.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Login email" required error={f.errors.email}>
                {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" value={v.email} onChange={f.set("email")} error={f.errors.email} />}
              </Field>
              <Field label="Contact mobile" required error={f.errors.phone}>
                {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} />}
              </Field>
              <Field label="Password" required hint="8+ characters with a letter and a number" error={f.errors.password} className="sm:col-span-2">
                {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.password} onChange={f.set("password")} error={f.errors.password} />}
              </Field>
            </motion.div>
          ) : (
            <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }} className="grid gap-4 sm:grid-cols-2">
              <Field label="Full address" required error={f.errors.address} className="sm:col-span-2">
                {(id, d) => <Input id={id} aria-describedby={d} value={v.address} onChange={f.set("address")} error={f.errors.address} placeholder="Building, street, area" />}
              </Field>
              <Field label="City" required error={f.errors.city}>
                {(id, d) => (
                  <>
                    <Input id={id} aria-describedby={d} list="hg-cities" value={v.city} onChange={f.set("city")} error={f.errors.city} />
                    <datalist id="hg-cities">
                      {CITIES.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Field label="PIN code" error={f.errors.pincode}>
                {(id, d) => (
                  <div className="flex gap-2">
                    <Input id={id} aria-describedby={d} inputMode="numeric" maxLength={6} value={v.pincode} onChange={f.set("pincode")} error={f.errors.pincode} />
                    <Button variant="secondary" icon={LocateFixed} loading={locating} onClick={locate} title="Use my location" aria-label="Use my location" />
                  </div>
                )}
              </Field>
              <Field label="Timings" className="sm:col-span-2">
                {(id) => <Input id={id} value={v.timings} onChange={f.set("timings")} placeholder="Mon–Sat, 9 AM – 8 PM" />}
              </Field>
              <Field label={kind === "lab" ? "Tests & scans offered" : "Departments & services"} required error={f.errors.services} className="sm:col-span-2">
                <ServicePicker options={c.services} value={v.services} onChange={f.set("services")} />
              </Field>
              <Field label="About" className="sm:col-span-2">
                {(id) => <Textarea id={id} rows={3} maxLength={2000} value={v.description} onChange={f.set("description")} placeholder={`A few lines patients will see about your ${c.noun}`} />}
              </Field>
              <div className="sm:col-span-2">
                {kind === "lab" ? (
                  <Checkbox label="We offer home sample collection" hint="Patients can ask for a home visit when booking" checked={v.homeCollection} onChange={f.set("homeCollection")} />
                ) : (
                  <Checkbox label="24×7 emergency services" hint="Shown as a badge on your listing" checked={v.emergency} onChange={f.set("emergency")} />
                )}
              </div>
              <div className="sm:col-span-2">
                <Checkbox label="I confirm these details are correct and I am authorised to register this facility" checked={v.agree} onChange={f.set("agree")} />
                {f.errors.agree && <p className="mt-1 text-xs font-medium text-brand-700">{f.errors.agree}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-3 pt-2">
          {step === 1 && (
            <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(0)}>
              Back
            </Button>
          )}
          <Button type="submit" variant="care" size="lg" loading={busy} iconRight={step === 0 ? ArrowRight : undefined} className="flex-1">
            {step === 0 ? "Continue" : "Submit for verification"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------- admin
export function AdminLogin() {
  const { role, account, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const f = useForm({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (role && !busy) return <Navigate to={homeFor(role, account)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!isEmail(f.values.email)) er.email = "Enter your admin email";
    if (!f.values.password) er.password = "Enter your password";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      signIn(await authApi.adminLogin(f.values.email, f.values.password));
      navigate(afterLogin(location.state, "/admin", "/admin"), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      tone="ink"
      icon={ShieldCheck}
      side={{ eyebrow: "Hospigram team", title: "Admin console", text: "Approve partners, help patients book and keep every appointment on track.", points: ["Approve hospitals & labs", "Book on behalf of patients", "Manage patients and bookings", "Answer support enquiries"] }}
      title="Admin login"
      subtitle="For the Hospigram team only."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert>{error}</FormAlert>
        <Field label="Email" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} icon={Mail} type="email" autoComplete="username" value={f.values.email} onChange={f.set("email")} error={f.errors.email} />}
        </Field>
        <Field label="Password" error={f.errors.password}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="current-password" value={f.values.password} onChange={f.set("password")} error={f.errors.password} />}
        </Field>
        <Button type="submit" variant="dark" size="lg" loading={busy} className="w-full">
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------- partner portal
export function PartnersPage() {
  const cards = [
    { kind: "hospital", icon: Hospital, title: "Hospitals & clinics", text: "Get appointment requests from patients near you and manage them from one dashboard." },
    { kind: "lab", icon: FlaskConical, title: "Diagnostic labs", text: "Receive test bookings and home-collection requests with the patient's address." },
  ];
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-care-50 via-white to-transparent" />
      <div className="container-page relative py-16 sm:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow !text-care-700">
            <Building2 className="h-4 w-4" /> Partner with Hospigram
          </p>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Bring your hospital or lab online</h1>
          <p className="mt-4 text-lg text-ink-500">Join verified healthcare providers on Hospigram. Registration is free and takes about five minutes.</p>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.kind} delay={0.08 * i} className="card card-hover flex flex-col p-7">
              <span className="grid h-14 w-14 place-items-center rounded-md bg-care-50 text-care-700">
                <c.icon className="h-7 w-7" />
              </span>
              <h2 className="mt-5 text-xl font-bold">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{c.text}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button as={Link} to={`/${c.kind}/register`} variant="care" iconRight={ArrowRight}>
                  Register
                </Button>
                <Button as={Link} to={`/${c.kind}/login`} variant="secondary">
                  {c.kind === "lab" ? "Lab" : "Hospital"} login
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} className="mx-auto mt-10 grid max-w-4xl gap-4 rounded-lg border border-ink-100 bg-white p-6 sm:grid-cols-3">
          {[
            ["1", "Register", "Tell us about your facility and services."],
            ["2", "Get verified", "Our team checks the details, usually within a working day."],
            ["3", "Receive bookings", "Confirm requests and manage them from your dashboard."],
          ].map(([nIdx, t, d]) => (
            <div key={nIdx} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-ink-900 font-display text-sm font-bold text-white">{nIdx}</span>
              <div>
                <p className="font-bold text-ink-900">{t}</p>
                <p className="mt-0.5 text-sm text-ink-500">{d}</p>
              </div>
            </div>
          ))}
        </Reveal>
        <p className="mt-8 text-center text-sm text-ink-500">
          Hospigram team?{" "}
          <Link to="/admin/login" className="font-semibold text-ink-700 hover:underline">
            Admin login
          </Link>
        </p>
      </div>
    </div>
  );
}

