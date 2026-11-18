// Patients (/admin/patients): search, edit, block/unblock, reset password, delete and add patients.
// Also exports CreatePatientForm and TempPasswordModal (used by the assisted booking page).
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ban, CalendarPlus, Check, Copy, KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, Users, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
  IconButton,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  Tabs,
  Textarea,
  cx,
} from "../../components/ui";
import { PasswordInput } from "../auth/AuthShell";
import { adminApi } from "../../lib/api";
import { CITIES, formatDate, formatDateTime, isEmail, isPhone, n, passwordProblem, timeAgo, useForm, useLoad } from "../../lib/format";
import { copyText, makePassword, useQueryState, useUrlSearch } from "./AdminLayout";

const shortDate = (iso) => (iso ? formatDate(String(iso).slice(0, 10), { day: "numeric", month: "short", year: "numeric" }) : "-");

// ---------------------------------------------------------------- shared pieces
/** Shows a new patient's temporary password once, with copy buttons. data: { patient, tempPassword } */
export function TempPasswordModal({ data, onClose }) {
  const [copied, setCopied] = useState("");
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setCopied("");
  }
  const p = data?.patient;
  const copy = async (what, text) => {
    if (await copyText(text)) {
      setCopied(what);
      toast.success("Copied");
    } else toast.error("Could not copy. Please select and copy it by hand.");
  };
  const all = p ? `Hospigram login\nMobile: ${p.phone}\nPassword: ${data.tempPassword}\nPatient ID: ${p.patientId}\nLog in at hospigram.in/login and change your password from your account.` : "";
  return (
    <Modal
      open={Boolean(data)}
      onClose={onClose}
      size="sm"
      title="Patient account created"
      subtitle="This password is shown only once."
      footer={
        <>
          <Button variant="secondary" icon={copied === "all" ? Check : Copy} onClick={() => copy("all", all)}>
            Copy login details
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {p && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={p.name} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-900">{p.name}</p>
              <p className="text-xs text-ink-500">
                <span className="font-mono">{p.patientId}</span> · {p.phone}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Temporary password</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-md border border-dashed border-care-600 bg-care-50 px-3 py-2.5">
              <code className="flex-1 select-all break-all font-mono text-lg font-bold tracking-wider text-ink-900">{data.tempPassword}</code>
              <IconButton icon={copied === "pw" ? Check : Copy} label="Copy password" tone="care" onClick={() => copy("pw", data.tempPassword)} />
            </div>
          </div>
          <FormAlert tone="info">
            Share this password with the patient now (call or SMS). They log in with their mobile number <span className="font-semibold">{p.phone}</span> and can change the password from their account.
          </FormAlert>
        </div>
      )}
    </Modal>
  );
}

/** Form to create a patient on someone's behalf. onCreated({ patient, tempPassword }) */
export function CreatePatientForm({ initial = {}, onCreated, onCancel, submitLabel = "Create patient" }) {
  const f = useForm({ name: initial.name || "", phone: initial.phone || "", email: "", city: "", address: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const v = f.values;
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (v.name.trim().length < 2) er.name = "Enter the patient's full name";
    if (!isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
    if (v.email && !isEmail(v.email)) er.email = "Enter a valid email or leave it empty";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.createPatient({ name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), city: v.city.trim(), address: v.address.trim() });
      toast.success(`${res.patient.name} was added`);
      onCreated(res);
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert>{error}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={f.errors.name}>
          {(id, d) => <Input id={id} aria-describedby={d} value={v.name} onChange={f.set("name")} error={f.errors.name} maxLength={80} autoComplete="off" />}
        </Field>
        <Field label="Mobile number" required hint="The patient logs in with this" error={f.errors.phone}>
          {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} autoComplete="off" />}
        </Field>
        <Field label="Email" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" value={v.email} onChange={f.set("email")} error={f.errors.email} autoComplete="off" />}
        </Field>
        <Field label="City" error={f.errors.city}>
          {(id, d) => (
            <>
              <Input id={id} aria-describedby={d} list="hg-admin-patient-cities" value={v.city} onChange={f.set("city")} error={f.errors.city} />
              <datalist id="hg-admin-patient-cities">
                {CITIES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Address" error={f.errors.address} className="sm:col-span-2">
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} maxLength={300} value={v.address} onChange={f.set("address")} error={f.errors.address} />}
        </Field>
      </div>
      <p className="text-xs text-ink-500">A temporary password is created for them. You will see it once on the next screen.</p>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" icon={UserPlus} loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- page
export default function AdminPatients() {
  const [query, update] = useQueryState({ status: "", q: "", page: "1" });
  const page = Math.max(1, Number(query.page) || 1);
  const [search, setSearch] = useUrlSearch(query.q, update);
  const list = useLoad(adminApi.patients, { status: query.status, q: query.q, page, limit: 15 });
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetFor, setResetFor] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(null);

  const items = list.data?.items || [];
  const replace = (p) => list.setData((d) => (d ? { ...d, items: d.items.map((x) => (x._id === p._id ? { ...x, ...p } : x)) } : d));

  const setStatus = async (p, status) => {
    if (busy) return;
    setBusy(`status:${p._id}`);
    try {
      const res = await adminApi.updatePatient(p._id, { status });
      replace(res);
      toast.success(status === "blocked" ? `${p.name} is blocked` : `${p.name} can log in again`);
      setBlocking(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    const p = deleting;
    setBusy(`del:${p._id}`);
    try {
      await adminApi.deletePatient(p._id);
      toast.success(`${p.name} was deleted`);
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const actions = (p, wrap) => (
    <div className={cx("flex items-center gap-1", wrap ? "flex-wrap" : "justify-end")}>
      {wrap ? (
        <>
          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(p)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setResetFor(p)}>
            Password
          </Button>
          {p.status === "blocked" ? (
            <Button size="sm" variant="care" icon={ShieldCheck} loading={busy === `status:${p._id}`} disabled={Boolean(busy)} onClick={() => setStatus(p, "active")}>
              Unblock
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon={Ban} onClick={() => setBlocking(p)}>
              Block
            </Button>
          )}
          <IconButton icon={Trash2} label={`Delete ${p.name}`} tone="red" onClick={() => setDeleting(p)} />
        </>
      ) : (
        <>
          <IconButton icon={Pencil} label={`Edit ${p.name}`} onClick={() => setEditing(p)} />
          <IconButton icon={KeyRound} label={`Reset password for ${p.name}`} onClick={() => setResetFor(p)} />
          {p.status === "blocked" ? (
            <IconButton icon={ShieldCheck} label={`Unblock ${p.name}`} tone="care" disabled={Boolean(busy)} onClick={() => setStatus(p, "active")} />
          ) : (
            <IconButton icon={Ban} label={`Block ${p.name}`} onClick={() => setBlocking(p)} />
          )}
          <IconButton icon={Trash2} label={`Delete ${p.name}`} tone="red" onClick={() => setDeleting(p)} />
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          options={[
            { value: "", label: "All" },
            { value: "active", label: "Active" },
            { value: "blocked", label: "Blocked" },
          ]}
          value={query.status}
          onChange={(v) => update({ status: v, page: "" })}
        />
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/admin/book" variant="secondary" icon={CalendarPlus}>
            Book for a patient
          </Button>
          <Button icon={UserPlus} onClick={() => setAdding(true)}>
            Add patient
          </Button>
        </div>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search by name, mobile, email, patient ID or city" className="max-w-xl" />

      <Card className="overflow-hidden">
        {list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <div className="divide-y divide-ink-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={Users}
            title={query.q || query.status ? "No patients match" : "No patients yet"}
            text={query.q || query.status ? "Try another search or filter." : "Patients who sign up or that you add will show here."}
            action={
              !query.q && !query.status ? (
                <Button icon={UserPlus} onClick={() => setAdding(true)}>
                  Add patient
                </Button>
              ) : null
            }
          />
        ) : (
          <div className={cx("transition-opacity", list.loading && "opacity-60")}>
            <div className="hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 bg-ink-50/70 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3 text-center">Bookings</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined / last login</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.map((p, i) => (
                    <motion.tr key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.025 }} className="transition hover:bg-ink-50/70">
                      <td className="max-w-[240px] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-900">{p.name}</p>
                            <p className="font-mono text-xs text-ink-500">{p.patientId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs">
                        <a href={`tel:${p.phone}`} className="block truncate text-ink-700 hover:text-brand-700">
                          {p.phone}
                        </a>
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="block truncate text-ink-500 hover:text-brand-700">
                            {p.email}
                          </a>
                        ) : (
                          <span className="text-ink-400">No email</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-700">{p.city || <span className="text-ink-400">-</span>}</td>
                      <td className="px-4 py-3 text-center">
                        <Link to={`/admin/appointments?q=${encodeURIComponent(p.patientId || p.phone)}`} className="font-semibold text-ink-900 hover:text-brand-700" title="See their bookings">
                          {n(p.appointments)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <p className="text-ink-700">{shortDate(p.createdAt)}</p>
                        <p className="text-ink-500">{p.lastLoginAt ? `Seen ${timeAgo(p.lastLoginAt)}` : "Never logged in"}</p>
                      </td>
                      <td className="px-4 py-3">{actions(p)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-ink-100 lg:hidden">
              {items.map((p, i) => (
                <motion.li key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-ink-900">{p.name}</p>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="font-mono text-xs text-ink-500">{p.patientId}</p>
                      <p className="mt-1.5 truncate text-xs text-ink-600">
                        <a href={`tel:${p.phone}`} className="hover:text-brand-700">
                          {p.phone}
                        </a>
                        {p.email && ` · ${p.email}`}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {p.city ? `${p.city} · ` : ""}
                        {n(p.appointments)} bookings · joined {shortDate(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">{actions(p, true)}</div>
                </motion.li>
              ))}
            </ul>
            <div className="border-t border-ink-100">
              <Pagination page={page} pages={list.data.pages} total={list.data.total} onPage={(pg) => update({ page: pg })} label="patients" />
            </div>
          </div>
        )}
      </Card>

      {/* add */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a patient" subtitle="For patients who call or walk in. They can log in with their mobile number." size="lg">
        {adding && (
          <CreatePatientForm
            onCancel={() => setAdding(false)}
            onCreated={(res) => {
              setAdding(false);
              setCreated(res);
              list.reload();
            }}
          />
        )}
      </Modal>
      <TempPasswordModal data={created} onClose={() => setCreated(null)} />

      {/* edit */}
      <Drawer
        open={Boolean(editing)}
        onClose={() => busy !== "save" && setEditing(null)}
        title={editing ? `Edit ${editing.name}` : "Edit patient"}
        subtitle={editing && <span className="font-mono">{editing.patientId}</span>}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy === "save"}>
              Cancel
            </Button>
            <Button type="submit" form="patient-edit-form" loading={busy === "save"}>
              Save changes
            </Button>
          </>
        }
      >
        {editing && (
          <EditPatientForm
            key={editing._id}
            patient={editing}
            busy={busy === "save"}
            onSave={async (data) => {
              setBusy("save");
              try {
                const res = await adminApi.updatePatient(editing._id, data);
                replace(res);
                toast.success("Changes saved");
                setEditing(null);
              } finally {
                setBusy(null);
              }
            }}
          />
        )}
      </Drawer>

      <ResetPasswordModal
        patient={resetFor}
        busy={busy === "reset"}
        onClose={() => busy !== "reset" && setResetFor(null)}
        onSave={async (password) => {
          setBusy("reset");
          try {
            await adminApi.updatePatient(resetFor._id, { password });
            toast.success(`Password changed. Share it with ${resetFor.name}.`);
            setResetFor(null);
          } finally {
            setBusy(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(blocking)}
        onClose={() => !busy && setBlocking(null)}
        onConfirm={() => setStatus(blocking, "blocked")}
        loading={Boolean(blocking) && busy === `status:${blocking._id}`}
        title={`Block ${blocking?.name || "this patient"}?`}
        confirmLabel="Block"
        message="They will not be able to log in or make new bookings until you unblock them. Their existing bookings stay as they are."
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        onConfirm={doDelete}
        loading={Boolean(deleting) && busy === `del:${deleting._id}`}
        title={`Delete ${deleting?.name || "this patient"}?`}
        confirmLabel="Delete for good"
        message={
          <>
            This deletes the patient account <span className="font-mono font-semibold">{deleting?.patientId}</span> and{" "}
            <span className="font-semibold text-ink-900">all of their bookings ({n(deleting?.appointments)})</span>. It cannot be undone. To stop them from logging in but keep their history, block them instead.
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- edit + reset password
function EditPatientForm({ patient: p, busy, onSave }) {
  const f = useForm({
    name: p.name || "",
    phone: p.phone || "",
    email: p.email || "",
    gender: p.gender || "",
    dob: p.dob || "",
    city: p.city || "",
    address: p.address || "",
    language: p.language || "en",
  });
  const [error, setError] = useState("");
  const v = f.values;
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (v.name.trim().length < 2) er.name = "Enter the full name";
    if (!isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
    if (v.email && !isEmail(v.email)) er.email = "Enter a valid email or leave it empty";
    f.setErrors(er);
    if (Object.keys(er).length) return;
    setError("");
    try {
      await onSave({ ...v, name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim(), city: v.city.trim(), address: v.address.trim() });
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    }
  };
  return (
    <form id="patient-edit-form" onSubmit={submit} noValidate className="space-y-4">
      <FormAlert>{error}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={f.errors.name} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} value={v.name} onChange={f.set("name")} error={f.errors.name} maxLength={80} />}
        </Field>
        <Field label="Mobile number" required hint="Changing this changes their login" error={f.errors.phone}>
          {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} />}
        </Field>
        <Field label="Email" error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" value={v.email} onChange={f.set("email")} error={f.errors.email} />}
        </Field>
        <Field label="Gender" error={f.errors.gender}>
          {(id) => (
            <Select id={id} value={v.gender} onChange={f.set("gender")}>
              <option value="">Not set</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          )}
        </Field>
        <Field label="Date of birth" error={f.errors.dob}>
          {(id, d) => <Input id={id} aria-describedby={d} type="date" value={v.dob} max={new Date().toISOString().slice(0, 10)} onChange={f.set("dob")} error={f.errors.dob} />}
        </Field>
        <Field label="City" error={f.errors.city}>
          {(id, d) => (
            <>
              <Input id={id} aria-describedby={d} list="hg-admin-edit-cities" value={v.city} onChange={f.set("city")} error={f.errors.city} />
              <datalist id="hg-admin-edit-cities">
                {CITIES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Language" error={f.errors.language}>
          {(id) => (
            <Select id={id} value={v.language} onChange={f.set("language")}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </Select>
          )}
        </Field>
        <Field label="Address" error={f.errors.address} className="sm:col-span-2">
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} maxLength={300} value={v.address} onChange={f.set("address")} error={f.errors.address} />}
        </Field>
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-md bg-ink-50 p-3 text-xs">
        <div>
          <dt className="text-ink-500">Joined</dt>
          <dd className="font-semibold text-ink-800">{formatDateTime(p.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Last login</dt>
          <dd className="font-semibold text-ink-800">{p.lastLoginAt ? formatDateTime(p.lastLoginAt) : "Never"}</dd>
        </div>
      </dl>
    </form>
  );
}

function ResetPasswordModal({ patient, busy, onClose, onSave }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [prev, setPrev] = useState(patient);
  if (prev !== patient) {
    setPrev(patient);
    setPw("");
    setError("");
    setCopied(false);
  }
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const problem = pw ? passwordProblem(pw) : "Type a new password";
    if (problem) return setError(problem);
    try {
      await onSave(pw);
    } catch (err) {
      setError(err.errors?.password || err.message);
    }
  };
  return (
    <Modal
      open={Boolean(patient)}
      onClose={onClose}
      size="sm"
      title="Reset password"
      subtitle={patient && `For ${patient.name} (${patient.phone})`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="reset-pw-form" icon={KeyRound} loading={busy}>
            Set password
          </Button>
        </>
      }
    >
      <form id="reset-pw-form" onSubmit={submit} noValidate className="space-y-3">
        <Field label="New password" required hint="8+ characters with a letter and a number" error={error}>
          {(id, d) => (
            <PasswordInput
              id={id}
              describedBy={d}
              autoComplete="new-password"
              value={pw}
              error={error}
              onChange={(e) => {
                setPw(e.target.value);
                setError("");
                setCopied(false);
              }}
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Wand2}
            onClick={() => {
              setPw(makePassword());
              setError("");
              setCopied(false);
            }}
          >
            Suggest a password
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? Check : Copy}
            disabled={!pw}
            onClick={async () => {
              if (await copyText(pw)) setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-ink-500">Their old password stops working right away. Tell the patient the new one.</p>
      </form>
    </Modal>
  );
}
