// Hospitals (/admin/hospitals) and labs (/admin/labs): approve, reject, suspend, edit, delete and add providers.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, FlaskConical, Hospital, Mail, MapPin, Pencil, Phone, Plus, RotateCcw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Checkbox,
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
import { CITIES, HOSPITAL_SERVICES, LAB_SERVICES, STATUS, formatDate, formatDateTime, isEmail, isPhone, n, passwordProblem, useForm, useLoad, fullAddress } from "../../lib/format";
import { refreshAdminBadges, useQueryState, useUrlSearch } from "./AdminLayout";

const COPY = {
  hospital: {
    noun: "hospital",
    Noun: "Hospital",
    plural: "hospitals",
    icon: Hospital,
    categories: ["Multi-speciality hospital", "Super-speciality hospital", "General hospital", "Nursing home", "Clinic", "Maternity centre", "Eye hospital", "Dental clinic"],
    services: HOSPITAL_SERVICES,
    servicesLabel: "Departments & services",
  },
  lab: {
    noun: "lab",
    Noun: "Lab",
    plural: "labs",
    icon: FlaskConical,
    categories: ["Diagnostic centre", "Pathology lab", "Imaging centre", "Collection centre"],
    services: LAB_SERVICES,
    servicesLabel: "Tests & scans offered",
  },
};
const STATUSES = ["pending", "approved", "rejected", "suspended"];
const APPT_ORDER = ["pending", "confirmed", "completed", "cancelled", "rejected"];

/** Which status buttons a provider in `status` gets */
function statusActions(status) {
  if (status === "pending") return [{ to: "approved", label: "Approve", icon: Check, variant: "care" }, { to: "rejected", label: "Reject", icon: X, variant: "secondary" }];
  if (status === "approved") return [{ to: "suspended", label: "Suspend", icon: Ban, variant: "secondary" }];
  if (status === "rejected") return [{ to: "approved", label: "Approve", icon: Check, variant: "care" }];
  if (status === "suspended") return [{ to: "approved", label: "Reactivate", icon: RotateCcw, variant: "care" }];
  return [];
}

export default function AdminProviders({ kind }) {
  const c = COPY[kind];
  const [query, update] = useQueryState({ status: "", q: "", page: "1", open: "" });
  const page = Math.max(1, Number(query.page) || 1);
  const [search, setSearch] = useUrlSearch(query.q, update);
  const list = useLoad(adminApi.providers, { kind, status: query.status, q: query.q, page, limit: 15 });
  const [drawerMode, setDrawerMode] = useState("view");
  const [adding, setAdding] = useState(false);
  const [reasonFor, setReasonFor] = useState(null); // { provider, status }
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(null); // `${id}:${status}` or `del:${id}`
  const [detailTick, setDetailTick] = useState(0);

  const openId = query.open;
  const detail = useLoad((p) => (p.id ? adminApi.provider(p.id) : null), { id: openId, t: detailTick });
  const d = detail.data && detail.data._id === openId ? detail.data : null;

  const counts = list.data?.counts || {};
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [{ value: "", label: "All", count: allCount }, ...STATUSES.map((s) => ({ value: s, label: STATUS[s].label, count: counts[s] || 0 }))];

  const openDrawer = (id, mode = "view") => {
    setDrawerMode(mode);
    update({ open: id });
  };
  const closeDrawer = () => update({ open: "" });

  const afterChange = () => {
    list.reload();
    if (openId) setDetailTick((t) => t + 1);
    refreshAdminBadges();
  };

  const setStatus = async (p, status, note) => {
    const key = `${p._id}:${status}`;
    if (busy) return false;
    setBusy(key);
    try {
      await adminApi.setProviderStatus(p._id, status, note);
      const msg = { approved: p.status === "suspended" ? "is active again" : "is approved and visible to patients", rejected: "was rejected", suspended: "is suspended", pending: "is back to pending" }[status];
      toast.success(`${p.name} ${msg}`);
      afterChange();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const runAction = (p, a) => (a.to === "rejected" || a.to === "suspended" ? setReasonFor({ provider: p, status: a.to }) : setStatus(p, a.to));

  const doDelete = async () => {
    const p = deleting;
    setBusy(`del:${p._id}`);
    try {
      await adminApi.deleteProvider(p._id);
      toast.success(`${p.name} was deleted`);
      setDeleting(null);
      if (openId === p._id) closeDrawer();
      list.reload();
      refreshAdminBadges();
    } catch (err) {
      toast.error(err.message, { duration: 6000 });
      setDeleting(null);
    } finally {
      setBusy(null);
    }
  };

  const items = list.data?.items || [];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs options={tabs} value={query.status} onChange={(v) => update({ status: v, page: "" })} />
        <Button icon={Plus} onClick={() => setAdding(true)} className="shrink-0">
          Add {c.noun}
        </Button>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${c.plural} by name, email, phone, city or service`} className="max-w-xl" />

      <Card className="overflow-hidden">
        {list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <RowsSkeleton />
        ) : !items.length ? (
          <EmptyState
            icon={c.icon}
            title={query.q || query.status ? `No ${c.plural} match` : `No ${c.plural} yet`}
            text={query.q || query.status ? "Try another search or status." : `${c.Noun}s that register or that you add will show here.`}
            action={
              !query.q && !query.status ? (
                <Button icon={Plus} onClick={() => setAdding(true)}>
                  Add {c.noun}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className={cx("transition-opacity", list.loading && "opacity-60")}>
            {/* desktop table */}
            <div className="hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 bg-ink-50/70 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3">{c.Noun}</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3 text-center">Services</th>
                    <th className="px-4 py-3 text-center">Bookings</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  <AnimatePresence initial={false}>
                    {items.map((p, i) => (
                      <motion.tr
                        key={p._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: Math.min(i, 10) * 0.025 }}
                        onClick={() => openDrawer(p._id)}
                        className="cursor-pointer align-middle transition hover:bg-ink-50/70"
                      >
                        <td className="max-w-[260px] px-4 py-3">
                          <button type="button" onClick={(e) => (e.stopPropagation(), openDrawer(p._id))} className="block max-w-full truncate text-left font-semibold text-ink-900 hover:text-brand-700">
                            {p.name}
                          </button>
                          <p className="truncate text-xs text-ink-500">
                            {p.category || c.Noun} · {p.city || "No city"}
                          </p>
                        </td>
                        <td className="max-w-[220px] px-4 py-3 text-xs">
                          <p className="truncate text-ink-700">{p.phone}</p>
                          <p className="truncate text-ink-500">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-ink-700">{n(p.services?.length)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-ink-900">{n(p.appointments)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">{formatDate(p.createdAt?.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <RowActions p={p} busy={busy} onAction={runAction} onEdit={() => openDrawer(p._id, "edit")} onDelete={() => setDeleting(p)} />
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {/* mobile cards */}
            <ul className="divide-y divide-ink-100 lg:hidden">
              {items.map((p, i) => (
                <motion.li key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="p-4">
                  <button type="button" onClick={() => openDrawer(p._id)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">{p.name}</p>
                        <p className="truncate text-xs text-ink-500">
                          {p.category || c.Noun} · {p.city || "No city"}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-2 truncate text-xs text-ink-600">
                      {p.phone} · {p.email}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {n(p.services?.length)} services · {n(p.appointments)} bookings · joined {formatDate(p.createdAt?.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </button>
                  <div className="mt-3">
                    <RowActions p={p} busy={busy} onAction={runAction} onEdit={() => openDrawer(p._id, "edit")} onDelete={() => setDeleting(p)} wrap />
                  </div>
                </motion.li>
              ))}
            </ul>
            <div className="border-t border-ink-100">
              <Pagination page={page} pages={list.data.pages} total={list.data.total} onPage={(pg) => update({ page: pg })} label={c.plural} />
            </div>
          </div>
        )}
      </Card>

      {/* details / edit drawer */}
      <Drawer
        open={Boolean(openId)}
        onClose={closeDrawer}
        title={d?.name || `${c.Noun} details`}
        subtitle={d ? <StatusBadge status={d.status} /> : null}
        footer={
          d && drawerMode === "view" ? (
            <>
              <Button variant="danger-ghost" icon={Trash2} onClick={() => setDeleting(d)} className="mr-auto">
                Delete
              </Button>
              <Button variant="secondary" icon={Pencil} onClick={() => setDrawerMode("edit")}>
                Edit
              </Button>
              {statusActions(d.status).map((a) => (
                <Button key={a.to} variant={a.variant} icon={a.icon} loading={busy === `${d._id}:${a.to}`} disabled={Boolean(busy)} onClick={() => runAction(d, a)}>
                  {a.label}
                </Button>
              ))}
            </>
          ) : d && drawerMode === "edit" ? (
            <>
              <Button variant="secondary" onClick={() => setDrawerMode("view")}>
                Cancel
              </Button>
              <Button type="submit" form="provider-edit-form" loading={busy === "save"}>
                Save changes
              </Button>
            </>
          ) : null
        }
      >
        {detail.error ? (
          <ErrorState error={detail.error} onRetry={detail.reload} />
        ) : !d ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {drawerMode === "edit" ? (
              <motion.div key="edit" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                <ProviderForm
                  key={d._id + d.updatedAt}
                  formId="provider-edit-form"
                  kind={kind}
                  initial={d}
                  busy={busy === "save"}
                  onSubmit={async (data) => {
                    setBusy("save");
                    try {
                      await adminApi.updateProvider(d._id, data);
                      toast.success("Changes saved");
                      setDrawerMode("view");
                      afterChange();
                    } finally {
                      setBusy(null);
                    }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div key="view" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}>
                <ProviderDetails p={d} c={c} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </Drawer>

      {/* add drawer */}
      <Drawer
        open={adding}
        onClose={() => busy !== "create" && setAdding(false)}
        title={`Add a ${c.noun}`}
        subtitle={`It is approved right away and visible to patients. Share the login email and password with the ${c.noun}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)} disabled={busy === "create"}>
              Cancel
            </Button>
            <Button type="submit" form="provider-create-form" icon={Plus} loading={busy === "create"}>
              Add {c.noun}
            </Button>
          </>
        }
      >
        <ProviderForm
          formId="provider-create-form"
          kind={kind}
          create
          busy={busy === "create"}
          onSubmit={async (data) => {
            setBusy("create");
            try {
              const p = await adminApi.createProvider({ ...data, kind });
              toast.success(`${p.name || data.name} was added and approved`);
              setAdding(false);
              list.reload();
              refreshAdminBadges();
            } finally {
              setBusy(null);
            }
          }}
        />
      </Drawer>

      <ReasonModal
        target={reasonFor}
        c={c}
        busy={reasonFor && busy === `${reasonFor.provider._id}:${reasonFor.status}`}
        onClose={() => !busy && setReasonFor(null)}
        onSubmit={async (note) => {
          const ok = await setStatus(reasonFor.provider, reasonFor.status, note);
          if (ok) setReasonFor(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        onConfirm={doDelete}
        loading={Boolean(deleting) && busy === `del:${deleting._id}`}
        title={`Delete ${deleting?.name || `this ${c.noun}`}?`}
        confirmLabel="Delete for good"
        message={
          <>
            This removes the {c.noun}, its login and its past bookings. It cannot be undone.
            <br />
            <span className="mt-2 block text-ink-500">If it still has pending or confirmed bookings, suspend it instead.</span>
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- pieces
function RowActions({ p, busy, onAction, onEdit, onDelete, wrap }) {
  return (
    <div className={cx("flex items-center gap-1.5", wrap ? "flex-wrap" : "justify-end")}>
      {statusActions(p.status).map((a) => (
        <Button key={a.to} size="sm" variant={a.variant} icon={a.icon} loading={busy === `${p._id}:${a.to}`} disabled={Boolean(busy)} onClick={() => onAction(p, a)}>
          {a.label}
        </Button>
      ))}
      <IconButton icon={Pencil} label={`Edit ${p.name}`} onClick={onEdit} />
      <IconButton icon={Trash2} label={`Delete ${p.name}`} tone="red" onClick={onDelete} />
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="divide-y divide-ink-100">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-4 w-32 sm:block" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink-800">{children || <span className="text-ink-400">-</span>}</dd>
    </div>
  );
}

function ProviderDetails({ p, c }) {
  const counts = p.appointments || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        {p.image ? (
          <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-ink-100" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-care-50 text-care-700">
            <c.icon className="h-7 w-7" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{p.category || c.Noun}</p>
          <p className="flex items-start gap-1 text-sm text-ink-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span>
              {fullAddress(p.address, p.city, p.pincode) || "No address"}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.kind === "lab" && p.homeCollection && <Badge tone="care">Home collection</Badge>}
            {p.kind === "hospital" && p.emergency && <Badge tone="brand">24×7 emergency</Badge>}
          </div>
        </div>
      </div>

      {p.statusNote && (p.status === "rejected" || p.status === "suspended") && (
        <FormAlert tone="warn">
          <span className="font-semibold">Reason shown to the {c.noun}:</span> {p.statusNote}
        </FormAlert>
      )}

      <section>
        <h3 className="text-sm font-bold">Bookings</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <div className="rounded-md bg-ink-900 px-2 py-2 text-center text-white">
            <p className="font-display text-lg font-extrabold">{n(total)}</p>
            <p className="text-[11px] text-white/70">Total</p>
          </div>
          {APPT_ORDER.map((s) => (
            <div key={s} className="rounded-md border border-ink-100 px-2 py-2 text-center">
              <p className="font-display text-lg font-extrabold text-ink-900">{n(counts[s])}</p>
              <p className="truncate text-[11px] text-ink-500">{STATUS[s].label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold">Contact & login</h3>
        <dl className="mt-1 divide-y divide-ink-100">
          <InfoRow label="Login email">
            <a href={`mailto:${p.email}`} className="link inline-flex items-center gap-1 font-medium">
              <Mail className="h-3.5 w-3.5" /> {p.email}
            </a>
          </InfoRow>
          <InfoRow label="Phone">
            <a href={`tel:${p.phone}`} className="link inline-flex items-center gap-1 font-medium">
              <Phone className="h-3.5 w-3.5" /> {p.phone}
            </a>
          </InfoRow>
          <InfoRow label="Timings">{p.timings}</InfoRow>
          <InfoRow label="Joined">{formatDateTime(p.createdAt)}</InfoRow>
          <InfoRow label="Approved">{p.approvedAt ? formatDateTime(p.approvedAt) : ""}</InfoRow>
          <InfoRow label="Last login">{p.lastLoginAt ? formatDateTime(p.lastLoginAt) : "Never"}</InfoRow>
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-bold">
          {c.servicesLabel} <span className="font-normal text-ink-400">({n(p.services?.length)})</span>
        </h3>
        {p.services?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.services.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-400">None listed</p>
        )}
      </section>

      {p.description && (
        <section>
          <h3 className="text-sm font-bold">About</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{p.description}</p>
        </section>
      )}
    </div>
  );
}

function ReasonModal({ target, c, busy, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [prev, setPrev] = useState(target);
  if (prev !== target) {
    setPrev(target);
    setNote("");
    setError("");
  }
  const reject = target?.status === "rejected";
  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (note.trim().length < 5) return setError(`Write a short reason the ${c.noun} will see`);
    onSubmit(note.trim());
  };
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      size="sm"
      title={reject ? `Reject ${target?.provider.name}?` : `Suspend ${target?.provider.name}?`}
      subtitle={reject ? `It will not be listed. The ${c.noun} sees your reason when it logs in.` : `It is hidden from patients and cannot take new bookings until you reactivate it.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="reason-form" variant="danger" loading={busy}>
            {reject ? "Reject" : "Suspend"}
          </Button>
        </>
      }
    >
      <form id="reason-form" onSubmit={submit} noValidate>
        <Field label={`Reason (shown to the ${c.noun})`} required error={error}>
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              rows={3}
              maxLength={500}
              autoFocus
              value={note}
              error={error}
              onChange={(e) => (setNote(e.target.value), setError(""))}
              placeholder={reject ? "e.g. We could not verify the registration certificate." : "e.g. Several patients reported closed doors at booked times."}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- add / edit form
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
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s)}
              className={cx("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-semibold transition", on ? "border-care-600 bg-care-50 text-care-700" : "border-ink-200 text-ink-600 hover:border-ink-300")}
            >
              {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {s}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add another service"
          aria-label="Add another service"
          className="input"
          maxLength={60}
        />
        <Button variant="secondary" onClick={add} icon={Plus}>
          Add
        </Button>
      </div>
    </div>
  );
}

function ProviderForm({ formId, kind, initial, create, busy, onSubmit }) {
  const c = COPY[kind];
  const i = initial || {};
  const f = useForm({
    name: i.name || "",
    category: i.category || "",
    email: i.email || "",
    phone: i.phone || "",
    password: "",
    address: i.address || "",
    city: i.city || "",
    pincode: i.pincode || "",
    timings: i.timings ?? (create ? "Mon–Sat, 9 AM – 8 PM" : ""),
    services: i.services || [],
    description: i.description || "",
    image: i.image || "",
    homeCollection: Boolean(i.homeCollection),
    emergency: Boolean(i.emergency),
  });
  const [error, setError] = useState("");
  const v = f.values;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const er = {};
    if (v.name.trim().length < 2) er.name = `Enter the ${c.noun} name`;
    if (!isEmail(v.email)) er.email = "Enter a valid email (used to log in)";
    if (!isPhone(v.phone)) er.phone = "Enter a valid 10-digit mobile number";
    if (create || v.password) {
      const pw = v.password ? passwordProblem(v.password) : "Set a password";
      if (pw) er.password = pw;
    }
    if (v.address.trim().length < 5) er.address = "Enter the full address";
    if (v.city.trim().length < 2) er.city = "Enter the city";
    if (v.pincode && !/^\d{6}$/.test(v.pincode.trim())) er.pincode = "Enter a 6-digit PIN code";
    if (create && !v.services.length) er.services = "Choose at least one service";
    if (v.image && !/^https?:\/\/\S+$/.test(v.image.trim())) er.image = "Enter a full image link starting with https://";
    f.setErrors(er);
    if (Object.keys(er).length) return setError("Please fix the highlighted fields.");
    setError("");
    const data = {
      name: v.name.trim(),
      category: v.category,
      email: v.email.trim(),
      phone: v.phone.trim(),
      address: v.address.trim(),
      city: v.city.trim(),
      pincode: v.pincode.trim(),
      timings: v.timings.trim(),
      services: v.services,
      description: v.description.trim(),
      image: v.image.trim(),
      homeCollection: kind === "lab" && v.homeCollection,
      emergency: kind === "hospital" && v.emergency,
    };
    if (v.password) data.password = v.password;
    try {
      await onSubmit(data);
    } catch (err) {
      f.setErrors(err.errors || {});
      setError(err.message);
    }
  };

  const categories = v.category && !c.categories.includes(v.category) ? [v.category, ...c.categories] : c.categories;

  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-5">
      <FormAlert>{error}</FormAlert>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-bold text-ink-900">Basic details</legend>
        <Field label={`${c.Noun} name`} required error={f.errors.name} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} value={v.name} onChange={f.set("name")} error={f.errors.name} maxLength={120} />}
        </Field>
        <Field label="Type" className="sm:col-span-2">
          {(id) => (
            <Select id={id} value={v.category} onChange={f.set("category")}>
              <option value="">Select type</option>
              {categories.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Login email" required error={f.errors.email}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="off" value={v.email} onChange={f.set("email")} error={f.errors.email} />}
        </Field>
        <Field label="Contact mobile" required error={f.errors.phone}>
          {(id, d) => <Input id={id} aria-describedby={d} type="tel" inputMode="numeric" value={v.phone} onChange={f.set("phone")} error={f.errors.phone} />}
        </Field>
        <Field
          label={create ? "Password" : "New password"}
          required={create}
          hint={create ? "8+ characters with a letter and a number" : "Leave empty to keep the current password"}
          error={f.errors.password}
          className="sm:col-span-2"
        >
          {(id, d) => <PasswordInput id={id} describedBy={d} autoComplete="new-password" value={v.password} onChange={f.set("password")} error={f.errors.password} />}
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-bold text-ink-900">Location & timings</legend>
        <Field label="Full address" required error={f.errors.address} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} value={v.address} onChange={f.set("address")} error={f.errors.address} placeholder="Building, street, area" />}
        </Field>
        <Field label="City" required error={f.errors.city}>
          {(id, d) => (
            <>
              <Input id={id} aria-describedby={d} list={`${formId}-cities`} value={v.city} onChange={f.set("city")} error={f.errors.city} />
              <datalist id={`${formId}-cities`}>
                {CITIES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="PIN code" error={f.errors.pincode}>
          {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" maxLength={6} value={v.pincode} onChange={f.set("pincode")} error={f.errors.pincode} />}
        </Field>
        <Field label="Timings" className="sm:col-span-2">
          {(id) => <Input id={id} value={v.timings} onChange={f.set("timings")} placeholder="Mon–Sat, 9 AM – 8 PM" maxLength={120} />}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-bold text-ink-900">Services & listing</legend>
        <Field label={c.servicesLabel} required={create} error={f.errors.services}>
          <ServicePicker options={c.services} value={v.services} onChange={f.set("services")} />
        </Field>
        <Field label="About">
          {(id) => <Textarea id={id} rows={3} maxLength={2000} value={v.description} onChange={f.set("description")} placeholder={`A few lines patients will see about this ${c.noun}`} />}
        </Field>
        <Field label="Photo link" hint="Optional. A public https:// image link." error={f.errors.image}>
          {(id, d) => <Input id={id} aria-describedby={d} type="url" value={v.image} onChange={f.set("image")} error={f.errors.image} placeholder="https://" />}
        </Field>
        {kind === "lab" ? (
          <Checkbox label="Offers home sample collection" hint="Patients can ask for a home visit when booking" checked={v.homeCollection} onChange={f.set("homeCollection")} />
        ) : (
          <Checkbox label="24×7 emergency services" hint="Shown as a badge on the listing" checked={v.emergency} onChange={f.set("emergency")} />
        )}
      </fieldset>
    </form>
  );
}
