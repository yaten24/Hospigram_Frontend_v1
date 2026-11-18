// Patient login (/login) and sign-up (/register).
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Phone, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import AuthShell, { PasswordInput, afterLogin } from "./AuthShell";
import { Button, Field, FormAlert, Input, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi, homeFor } from "../../lib/api";
import { CITIES, SUPPORT_PHONE, isEmail, isPhone, passwordProblem, useForm } from "../../lib/format";

const SIDE = {
  eyebrow: "For patients",
  title: "Your care, booked in minutes.",
  text: "Find verified hospitals and diagnostic labs near you and book visits, tests, scans and home sample collection.",
  points: ["Only verified hospitals & labs", "Confirmed slots, no waiting in queues", "Home sample collection for lab tests", "All your bookings in one place"],
};

export function PatientLogin() {
  const { role, account, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const f = useForm({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (role && !busy) return <Navigate to={homeFor(role, account)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!isPhone(f.values.phone)) er.phone = "Enter your 10-digit mobile number";
    if (!f.values.password) er.password = "Enter your password";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      const s = signIn(await authApi.patientLogin(f.values.phone, f.values.password));
      toast.success(`Welcome back, ${s.account.name.split(" ")[0]}`);
      navigate(afterLogin(location.state, "/account"), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      side={SIDE}
      icon={UserRound}
      title="Log in to Hospigram"
      subtitle="Use the mobile number you signed up with."
      footer={
        <>
          Hospital or lab?{" "}
          <Link to="/partners" className="link">
            Partner login
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert>{error}</FormAlert>
        <Field label="Mobile number" error={f.errors.phone}>
          {(id, d) => <Input id={id} aria-describedby={d} icon={Phone} type="tel" inputMode="numeric" autoComplete="tel" placeholder="98765 43210" value={f.values.phone} onChange={f.set("phone")} error={f.errors.phone} />}
        </Field>
        <Field label="Password" error={f.errors.password}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="current-password" placeholder="Your password" value={f.values.password} onChange={f.set("password")} error={f.errors.password} />}
        </Field>
        <Button type="submit" size="lg" loading={busy} className="w-full">
          Log in
        </Button>
        <p className="text-center text-xs text-ink-500">
          Forgot your password? Call support at <span className="font-semibold text-ink-700">{SUPPORT_PHONE}</span> to reset it.
        </p>
      </form>
      <div className="mt-6 rounded-md border border-ink-100 bg-ink-50 px-4 py-3 text-center text-sm text-ink-600">
        New to Hospigram?{" "}
        <Link to="/register" state={location.state} className="link">
          Create a free account
        </Link>
      </div>
    </AuthShell>
  );
}

export function PatientRegister() {
  const { role, account, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const f = useForm({ name: "", phone: "", email: "", city: "", password: "", confirm: "", language: "en" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (role && !busy) return <Navigate to={homeFor(role, account)} replace />;
  const v = f.values;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (v.name.trim().length < 2) er.name = "Enter your full name";
    if (!isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
    if (v.email && !isEmail(v.email)) er.email = "Enter a valid email or leave it empty";
    const pw = passwordProblem(v.password);
    if (pw) er.password = pw;
    if (v.confirm !== v.password) er.confirm = "Passwords do not match";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      const s = signIn(await authApi.patientRegister({ name: v.name.trim(), phone: v.phone, email: v.email.trim(), city: v.city, password: v.password, language: v.language }));
      toast.success(`Welcome to Hospigram, ${s.account.name.split(" ")[0]}! Your patient id is ${s.account.patientId}`);
      navigate(afterLogin(location.state, "/account"), { replace: true });
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      side={SIDE}
      icon={UserRound}
      title="Create your account"
      subtitle="It takes a minute. You will get a Hospigram patient id for all your bookings."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="link">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert>{error}</FormAlert>
        <Field label="Full name" required error={f.errors.name}>
          {(id, d) => <Input id={id} aria-describedby={d} autoComplete="name" placeholder="As on your ID" value={v.name} onChange={f.set("name")} error={f.errors.name} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number" required error={f.errors.phone}>
            {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" autoComplete="tel" placeholder="98765 43210" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} />}
          </Field>
          <Field label="City" error={f.errors.city}>
            {(id) => (
              <Select id={id} value={v.city} onChange={f.set("city")}>
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Email" hint="Optional, for booking updates" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" placeholder="you@example.com" value={v.email} onChange={f.set("email")} error={f.errors.email} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required hint="8+ characters with a letter and a number" error={f.errors.password}>
            {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.password} onChange={f.set("password")} error={f.errors.password} />}
          </Field>
          <Field label="Confirm password" required error={f.errors.confirm}>
            {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.confirm} onChange={f.set("confirm")} error={f.errors.confirm} />}
          </Field>
        </div>
        <Field label="Preferred language">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["en", "English"],
              ["hi", "हिंदी"],
            ].map(([val, label]) => (
              <button key={val} type="button" onClick={() => f.set("language")(val)} className={`rounded-md border px-3 py-2.5 text-sm font-semibold transition ${v.language === val ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:border-ink-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Button type="submit" size="lg" loading={busy} className="w-full">
          Create account
        </Button>
        <p className="text-center text-xs text-ink-500">
          By signing up you agree to our{" "}
          <Link to="/terms" className="underline">
            terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
