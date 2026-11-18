// Appointments (/admin/appointments): every booking, with filters, status changes and full history.
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CalendarPlus, Check, CheckCheck, Clock, FlaskConical, Home, Hospital, Phone, RotateCcw, ShieldCheck, User, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Drawer, EmptyState, ErrorState, Field, Modal, Pagination, SearchInput, Select, Skeleton, StatusBadge, Tabs, Textarea, cx } from "../../components/ui";
import { adminApi } from "../../lib/api";
import { ACTION_LABEL, KIND_LABEL, STATUS, formatDate, formatDateTime, formatTime, statusLabel, useLoad } from "../../lib/format";
import { useQueryState, useUrlSearch } from "./AdminLayout";

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "rejected"];
const WHEN = [
  { value: "all", label: "All dates" },
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
];
const ACTION_STYLE = {
  confirmed: { variant: "care", icon: Check },
  completed: { variant: "dark", icon: CheckCheck },
  rejected: { variant: "secondary", icon: X },
  cancelled: { variant: "secondary", icon: X },
  pending: { variant: "secondary", icon: RotateCcw },
};
const BY_LABEL = { patient: "Patient", provider: "Hospital / lab", admin: "Hospigram team", system: "System" };
const NEEDS_NOTE = (s) => s === "rejected" || s === "cancelled";

export default function AdminAppointments() {
  const [query, update] = useQueryState({ status: "", kind: "", when: "all", q: "", page: "1" });
  const page = Math.max(1, Number(query.page) || 1);
  const [search, setSearch] = useUrlSearch(query.q, update);
  const list = useLoad(adminApi.appointments, { status: query.status, kind: query.kind, when: query.when === "all" ? "" : query.when, q: query.q, page, limit: 20 });
  const [openId, setOpenId] = useState(null);
  const [noteFor, setNoteFor] = useState(null); // { appt, status }
  const [busy, setBusy] = useState(null);

  const items = list.data?.items || [];
  const open = items.find((a) => a._id === openId) || null;

  const setStatus = async (a, status, note) => {
    if (busy) return false;
    setBusy(`${a._id}:${status}`);
    try {
      const res = await adminApi.setAppointmentStatus(a._id, status, note);
      list.setData((d) => (d ? { ...d, items: d.items.map((x) => (x._id === a._id ? { ...x, ...res } : x)) } : d));
      toast.success(`Booking ${a.bookingId} is now ${statusLabel(status).toLowerCase()}`);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  const act = (a, status) => (NEEDS_NOTE(status) ? setNoteFor({ appt: a, status }) : setStatus(a, status));

  const filtered = query.q || query.status || query.kind || query.when !== "all";

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs options={[{ value: "", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: STATUS[s].label }))]} value={query.status} onChange={(v) => update({ status: v, page: "" })} />
        <Button as={Link} to="/admin/book" icon={CalendarPlus} className="shrink-0">
          New booking
        </Button>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search booking ID, patient, mobile, provider or service" className="flex-1 md:max-w-md" />
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select aria-label="Hospital or lab" value={query.kind} onChange={(e) => update({ kind: e.target.value, page: "" })} className="md:w-40">
            <option value="">Hospitals & labs</option>
            <option value="hospital">Hospitals</option>
            <option value="lab">Labs</option>
          </Select>
          <Select aria-label="Date" value={query.when} onChange={(e) => update({ when: e.target.value, page: "" })} className="md:w-36">
            {WHEN.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <div className="divide-y divide-ink-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={CalendarCheck}
            title={filtered ? "No bookings match" : "No bookings yet"}
            text={filtered ? "Try another filter or search." : "Bookings made by patients or by the team will show here."}
            action={
              filtered ? (
                <Button variant="secondary" onClick={() => (setSearch(""), update({ status: "", kind: "", when: "", q: "", page: "" }))}>
                  Clear filters
                </Button>
              ) : (
                <Button as={Link} to="/admin/book" icon={CalendarPlus}>
                  Make a booking
                </Button>
              )
            }
          />
        ) : (
          <div className={cx("transition-opacity", list.loading && "opacity-60")}>
            <div className="hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 bg-ink-50/70 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Hospital / lab</th>
                    <th className="px-4 py-3">Date & time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.map((a, i) => (
                    <motion.tr
                      key={a._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 12) * 0.02 }}
                      onClick={() => setOpenId(a._id)}
                      className="cursor-pointer align-top transition hover:bg-ink-50/70"
                    >
                      <td className="px-4 py-3">
                        <button type="button" onClick={(e) => (e.stopPropagation(), setOpenId(a._id))} className="font-mono text-xs font-semibold text-ink-900 hover:text-brand-700">
                          {a.bookingId}
                        </button>
                        <div className="mt-1">
                          <CreatedBy by={a.createdBy} />
                        </div>
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <p className="truncate font-semibold text-ink-900">{a.patientName}</p>
                        <p className="truncate text-xs text-ink-500">
                          <span className="font-mono">{a.patientCode}</span> ·{" "}
                          <a href={`tel:${a.patientPhone}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-700">
                            {a.patientPhone}
                          </a>
                        </p>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate font-semibold text-ink-900">{a.providerName}</p>
                        <p className="truncate text-xs text-ink-500">
                          {KIND_LABEL[a.providerKind]}
                          {a.service && ` · ${a.service}`}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-semibold text-ink-900">{formatDate(a.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                        <p className="flex items-center gap-1 text-xs text-ink-500">
                          {formatTime(a.time)}
                          {a.homeCollection && (
                            <span className="inline-flex items-center gap-0.5 text-care-700" title="Home collection">
                              · <Home className="h-3 w-3" aria-hidden="true" /> Home
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ActionButtons a={a} busy={busy} onAct={act} className="justify-end" />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-ink-100 lg:hidden">
              {items.map((a, i) => {
                const KindIcon = a.providerKind === "lab" ? FlaskConical : Hospital;
                return (
                  <motion.li key={a._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="p-4">
                    <button type="button" onClick={() => setOpenId(a._id)} className="block w-full text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-900">{a.patientName}</p>
                          <p className="truncate text-xs text-ink-500">
                            <span className="font-mono">{a.bookingId}</span> · {a.patientPhone}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-ink-700">
                        <KindIcon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                        <span className="truncate">
                          {a.providerName}
                          {a.service && <span className="text-ink-500"> · {a.service}</span>}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatDate(a.date, { weekday: "short", day: "numeric", month: "short" })}, {formatTime(a.time)}
                        </span>
                        {a.homeCollection && <Badge tone="care">Home collection</Badge>}
                        <CreatedBy by={a.createdBy} />
                      </p>
                    </button>
                    {a.next?.length > 0 && <ActionButtons a={a} busy={busy} onAct={act} className="mt-3 flex-wrap" />}
                  </motion.li>
                );
              })}
            </ul>
            <div className="border-t border-ink-100">
              <Pagination page={page} pages={list.data.pages} total={list.data.total} onPage={(pg) => update({ page: pg })} label="bookings" />
            </div>
          </div>
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open ? `Booking ${open.bookingId}` : "Booking"}
        subtitle={open && <StatusBadge status={open.status} />}
        footer={open?.next?.length ? <ActionButtons a={open} busy={busy} onAct={act} /> : null}
      >
        {open && <BookingDetails a={open} />}
      </Drawer>

      <NoteModal
        target={noteFor}
        busy={noteFor && busy === `${noteFor.appt._id}:${noteFor.status}`}
        onClose={() => !busy && setNoteFor(null)}
        onSubmit={async (note) => {
          if (await setStatus(noteFor.appt, noteFor.status, note)) setNoteFor(null);
        }}
      />
    </div>
  );
}

function CreatedBy({ by }) {
  return by === "admin" ? (
    <Badge tone="violet">
      <ShieldCheck className="h-3 w-3" aria-hidden="true" /> By team
    </Badge>
  ) : (
    <Badge>
      <User className="h-3 w-3" aria-hidden="true" /> By patient
    </Badge>
  );
}

function ActionButtons({ a, busy, onAct, className }) {
  if (!a.next?.length) return <span className="text-xs text-ink-400">No actions</span>;
  return (
    <div className={cx("flex gap-1.5", className)}>
      {a.next.map((s) => {
        const st = ACTION_STYLE[s] || { variant: "secondary" };
        return (
          <Button key={s} size="sm" variant={st.variant} icon={st.icon} loading={busy === `${a._id}:${s}`} disabled={Boolean(busy)} onClick={() => onAct(a, s)}>
            {ACTION_LABEL[s] || statusLabel(s)}
          </Button>
        );
      })}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink-800">{children || <span className="text-ink-400">-</span>}</dd>
    </div>
  );
}

function BookingDetails({ a }) {
  const history = [...(a.history || [])].reverse();
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-ink-100 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Patient</p>
          <p className="mt-1 font-semibold text-ink-900">{a.patientName}</p>
          <p className="font-mono text-xs text-ink-500">{a.patientCode}</p>
          <a href={`tel:${a.patientPhone}`} className="link mt-1 inline-flex items-center gap-1 text-sm">
            <Phone className="h-3.5 w-3.5" /> {a.patientPhone}
          </a>
        </div>
        <div className="rounded-md border border-ink-100 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{KIND_LABEL[a.providerKind]}</p>
          <p className="mt-1 font-semibold text-ink-900">{a.providerName}</p>
          <Link to={`/admin/${a.providerKind === "lab" ? "labs" : "hospitals"}?open=${a.provider}`} className="link mt-1 inline-block text-sm">
            View {a.providerKind === "lab" ? "lab" : "hospital"}
          </Link>
        </div>
      </div>

      <dl className="divide-y divide-ink-100">
        <Row label="Date">{formatDate(a.date)}</Row>
        <Row label="Time">{formatTime(a.time)}</Row>
        <Row label="Service">{a.service}</Row>
        <Row label="Problem / notes">{a.problem && <span className="whitespace-pre-wrap">{a.problem}</span>}</Row>
        <Row label="Home collection">{a.homeCollection ? a.collectionAddress || "Yes" : "No"}</Row>
        <Row label="Booked by">{a.createdBy === "admin" ? "Hospigram team" : "Patient"}</Row>
        <Row label="Booked on">{formatDateTime(a.createdAt)}</Row>
        {a.providerNote && <Row label="Note to patient">{a.providerNote}</Row>}
      </dl>

      <section>
        <h3 className="text-sm font-bold">Status history</h3>
        {!history.length ? (
          <p className="mt-2 text-sm text-ink-400">No history yet.</p>
        ) : (
          <ol className="relative mt-3 space-y-4 border-l-2 border-ink-100 pl-5">
            <AnimatePresence initial={false}>
              {history.map((h, i) => (
                <motion.li key={`${h.at}-${h.status}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                  <span className={cx("absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white", i === 0 ? "bg-brand-500" : "bg-ink-300")} aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-ink-500">by {BY_LABEL[h.by] || h.by || "-"}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">{formatDateTime(h.at)}</p>
                  {h.note && <p className="mt-1 rounded-md bg-ink-50 px-2.5 py-1.5 text-sm text-ink-700">{h.note}</p>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </section>
    </div>
  );
}

function NoteModal({ target, busy, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [prev, setPrev] = useState(target);
  if (prev !== target) {
    setPrev(target);
    setNote("");
  }
  const reject = target?.status === "rejected";
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      size="sm"
      title={reject ? "Reject this booking?" : "Cancel this booking?"}
      subtitle={target && `${target.appt.bookingId} · ${target.appt.patientName} at ${target.appt.providerName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Keep booking
          </Button>
          <Button type="submit" form="appt-note-form" variant="danger" loading={busy}>
            {reject ? "Reject booking" : "Cancel booking"}
          </Button>
        </>
      }
    >
      <form
        id="appt-note-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onSubmit(note.trim());
        }}
      >
        <Field label="Note for the patient" hint="Optional. Shown with the booking.">
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} maxLength={500} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The doctor is on leave that day. Please book another date." />}
        </Field>
      </form>
    </Modal>
  );
}
