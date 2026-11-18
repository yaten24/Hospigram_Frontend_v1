// Hospital / lab settings (/hospital/settings, /lab/settings): account info, password, help.
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, LifeBuoy, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { PasswordInput } from "../auth/AuthShell";
import { Button, Card, Field, FormAlert, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi, tokenStore } from "../../lib/api";
import { KIND_LABEL, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_LINK, formatDateTime, passwordProblem, useForm } from "../../lib/format";
import { useProviderPanel } from "./ProviderLayout";

/** Current / new / confirm password form. Stores the new session token on success. */
export function ChangePasswordForm({ variant = "primary" }) {
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
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert>{error}</FormAlert>
      {done && <FormAlert tone="success">Your password is changed. Other devices have been logged out.</FormAlert>}
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
      <Button type="submit" variant={variant} icon={KeyRound} loading={busy} className="w-full sm:w-auto">
        Change password
      </Button>
    </form>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-ink-900 sm:text-right">{children}</dd>
    </div>
  );
}

const rise = (i) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.3 } });

export default function ProviderSettings() {
  const { account } = useAuth();
  const { kind, base, copy } = useProviderPanel();

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <motion.div {...rise(0)}>
          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-bold">Account</h2>
            <dl className="mt-2 divide-y divide-ink-100">
              <InfoRow label="Login email">{account?.email || "-"}</InfoRow>
              <InfoRow label="Account type">{KIND_LABEL[account?.kind || kind]}</InfoRow>
              <InfoRow label="Status">
                <StatusBadge status={account?.status} />
              </InfoRow>
              {account?.statusNote && <InfoRow label="Note from Hospigram">{account.statusNote}</InfoRow>}
              <InfoRow label="Member since">{formatDateTime(account?.createdAt)}</InfoRow>
            </dl>
            <p className="mt-3 text-xs text-ink-500">
              To change your login email, contact Hospigram support. Your {copy.noun} name, phone and address are on the{" "}
              <Link to={`${base}/profile`} className="link">
                Profile
              </Link>{" "}
              page.
            </p>
          </Card>
        </motion.div>

        <motion.div {...rise(1)}>
          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-bold">Change password</h2>
            <p className="mb-5 mt-0.5 text-sm text-ink-500">You will stay logged in here. Other devices will be logged out.</p>
            <ChangePasswordForm variant="care" />
          </Card>
        </motion.div>
      </div>

      <motion.aside {...rise(2)} className="lg:self-start">
        <Card className="overflow-hidden">
          <div className="bg-ink-950 p-5 text-white">
            <LifeBuoy className="h-6 w-6 text-brand-400" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-white">Need help?</h2>
            <p className="mt-1 text-sm text-ink-300">Our partner team helps with verification, bookings and account issues.</p>
          </div>
          <div className="space-y-2 p-4">
            <a href={SUPPORT_PHONE_LINK} className="flex items-center gap-3 rounded-md border border-ink-100 p-3 transition hover:border-ink-200 hover:bg-ink-50">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-xs text-ink-500">Call us</span>
                <span className="block text-sm font-semibold text-ink-900">{SUPPORT_PHONE}</span>
              </span>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 rounded-md border border-ink-100 p-3 transition hover:border-ink-200 hover:bg-ink-50">
              <Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-xs text-ink-500">Email</span>
                <span className="block break-all text-sm font-semibold text-ink-900">{SUPPORT_EMAIL}</span>
              </span>
            </a>
            <Link to="/support" className="flex items-center justify-between gap-2 px-1 pt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Visit the support page <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </motion.aside>
    </div>
  );
}
