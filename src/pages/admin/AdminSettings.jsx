// Admin settings (/admin/settings): my profile, change password and the admin team.
import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Mail, Save, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, FormAlert, IconButton, Input, Modal, Skeleton } from "../../components/ui";
import { PasswordInput } from "../auth/AuthShell";
import { useAuth } from "../../context/AuthContext";
import { adminApi, authApi, tokenStore } from "../../lib/api";
import { formatDateTime, isEmail, passwordProblem, timeAgo, useForm, useLoad } from "../../lib/format";

export default function AdminSettings() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
      <ProfileCard />
      <PasswordCard />
      <div className="lg:col-span-2">
        <AdminsCard />
      </div>
    </div>
  );
}

function CardHead({ icon, title, text, action }) {
  const Icon = icon;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink-100 text-ink-700">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold">{title}</h2>
          {text && <p className="text-xs text-ink-500">{text}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- profile
function ProfileCard() {
  const { account, setAccount } = useAuth();
  const [name, setName] = useState(account?.name || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== (account?.name || "");

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setError("Enter your full name");
    setBusy(true);
    setError("");
    try {
      const res = await authApi.updateMe({ name: name.trim() });
      setAccount(res.account);
      setName(res.account.name);
      toast.success("Profile saved");
    } catch (err) {
      setError(err.errors?.name || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead icon={ShieldCheck} title="My profile" text="How your name appears in the admin panel" />
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={account?.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{account?.name}</p>
            <p className="truncate text-sm text-ink-500">{account?.email}</p>
          </div>
        </div>
        <Field label="Full name" required error={error}>
          {(id, d) => <Input id={id} aria-describedby={d} value={name} maxLength={80} error={error} onChange={(e) => (setName(e.target.value), setError(""))} autoComplete="name" />}
        </Field>
        <Field label="Login email" hint="Ask another admin to recreate your account to change this.">
          {(id, d) => <Input id={id} aria-describedby={d} icon={Mail} value={account?.email || ""} disabled readOnly />}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" icon={Save} loading={busy} disabled={!changed}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- password
function PasswordCard() {
  const f = useForm({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const v = f.values;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (!v.current) er.current = "Enter your current password";
    const pw = passwordProblem(v.next);
    if (pw) er.next = pw;
    else if (v.next === v.current) er.next = "Choose a different password";
    if (v.confirm !== v.next) er.confirm = "The passwords do not match";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      const res = await authApi.changePassword(v.current, v.next);
      if (res?.token) tokenStore.set(res.token);
      f.setValues({ current: "", next: "", confirm: "" });
      toast.success("Password changed. Other devices are logged out.");
    } catch (err) {
      const errs = err.errors || {};
      f.setErrors({ current: errs.currentPassword, next: errs.newPassword });
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead icon={KeyRound} title="Change password" text="You stay logged in here. Other devices are logged out." />
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        <FormAlert>{error}</FormAlert>
        <Field label="Current password" required error={f.errors.current}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="current-password" value={v.current} onChange={f.set("current")} error={f.errors.current} />}
        </Field>
        <Field label="New password" required hint="8+ characters with a letter and a number" error={f.errors.next}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.next} onChange={f.set("next")} error={f.errors.next} />}
        </Field>
        <Field label="Repeat new password" required error={f.errors.confirm}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.confirm} onChange={f.set("confirm")} error={f.errors.confirm} />}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" icon={KeyRound} loading={busy}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- admins
function AdminsCard() {
  const { account } = useAuth();
  const list = useLoad(() => adminApi.admins());
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const admins = list.data || [];

  const doDelete = async () => {
    setBusy(true);
    try {
      await adminApi.deleteAdmin(deleting._id);
      toast.success(`${deleting.name} no longer has admin access`);
      list.setData((d) => (d || []).filter((a) => a._id !== deleting._id));
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHead
        icon={ShieldCheck}
        title="Admin team"
        text="People who can use this admin panel"
        action={
          <Button size="sm" icon={UserPlus} onClick={() => setAdding(true)}>
            Add admin
          </Button>
        }
      />
      {list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <div className="space-y-4 p-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !admins.length ? (
        <EmptyState icon={ShieldCheck} title="No admins found" />
      ) : (
        <ul className="divide-y divide-ink-100">
          {admins.map((a, i) => {
            const me = a._id === account?._id;
            return (
              <motion.li key={a._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold text-ink-900">
                    <span className="truncate">{a.name}</span>
                    {me && <Badge tone="brand">You</Badge>}
                  </p>
                  <p className="truncate text-xs text-ink-500">{a.email}</p>
                  <p className="text-xs text-ink-400">
                    Added {formatDateTime(a.createdAt)} · {a.lastLoginAt ? `last seen ${timeAgo(a.lastLoginAt)}` : "never logged in"}
                  </p>
                </div>
                {!me && <IconButton icon={Trash2} label={`Remove ${a.name}`} tone="red" onClick={() => setDeleting(a)} />}
              </motion.li>
            );
          })}
        </ul>
      )}

      <AddAdminModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(a) => {
          list.setData((d) => [...(d || []), a]);
          setAdding(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        onConfirm={doDelete}
        loading={busy}
        title={`Remove ${deleting?.name || "this admin"}?`}
        confirmLabel="Remove admin"
        message={`${deleting?.email || "They"} will no longer be able to log in to the admin panel. This cannot be undone.`}
      />
    </Card>
  );
}

function AddAdminModal({ open, onClose, onCreated }) {
  const f = useForm({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const v = f.values;

  const close = () => {
    if (busy) return;
    f.setValues({ name: "", email: "", password: "" });
    f.setErrors({});
    setError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (v.name.trim().length < 2) er.name = "Enter their full name";
    if (!isEmail(v.email)) er.email = "Enter a valid email";
    const pw = passwordProblem(v.password);
    if (pw) er.password = pw;
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      const a = await adminApi.createAdmin({ name: v.name.trim(), email: v.email.trim(), password: v.password });
      toast.success(`${a.name} can now log in as an admin`);
      f.setValues({ name: "", email: "", password: "" });
      onCreated(a);
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Add an admin"
      subtitle="They get full access to this panel. Share the password with them privately."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="add-admin-form" icon={UserPlus} loading={busy}>
            Add admin
          </Button>
        </>
      }
    >
      <form id="add-admin-form" onSubmit={submit} noValidate className="space-y-4">
        <FormAlert>{error}</FormAlert>
        <Field label="Full name" required error={f.errors.name}>
          {(id, d) => <Input id={id} aria-describedby={d} value={v.name} onChange={f.set("name")} error={f.errors.name} maxLength={80} autoComplete="off" />}
        </Field>
        <Field label="Email" required hint="They log in with this" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" value={v.email} onChange={f.set("email")} error={f.errors.email} autoComplete="off" />}
        </Field>
        <Field label="Password" required hint="8+ characters with a letter and a number" error={f.errors.password}>
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.password} onChange={f.set("password")} error={f.errors.password} />}
        </Field>
      </form>
    </Modal>
  );
}
