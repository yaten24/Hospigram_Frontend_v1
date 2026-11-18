// Hospital / lab bookings (/hospital/bookings, /lab/bookings): filter, search, act on and inspect every booking.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CalendarX2, Check, CheckCheck, Clock, FileText, Home, MapPin, MessageSquareText, Phone, Stethoscope, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Drawer, EmptyState, ErrorState, Field, Input, Modal, Pagination, SearchInput, Select, Skeleton, StatusBadge, Tabs, Textarea, cx } from "../../components/ui";
import { providerApi } from "../../lib/api";
import { ACTION_LABEL, STATUS, formatDate, formatDateTime, formatTime, statusLabel, timeAgo, todayIST, useDebounced, useLoad } from "../../lib/format";
import { useProviderPanel } from "./ProviderLayout";

// ================================================================ shared pieces (also used by the overview page)

export const telLink = (phone) => `tel:${String(phone || "").startsWith("+") ? phone : `+91${phone}`}`;

const ACTION_STYLE = {
  confirmed: { variant: "care", icon: Check },
  completed: { variant: "dark", icon: CheckCheck },
  rejected: { variant: "danger-ghost", icon: X },
  cancelled: { variant: "danger-ghost", icon: CalendarX2 },
  pending: { variant: "secondary", icon: Clock },
};
const NEEDS_NOTE = ["rejected", "cancelled"];

/**
 * Status changes with a note dialog for reject / cancel.
 * -> { request(appt, status), busy: { id, status } | null, dialog }  (render `dialog` once)
 */
export function useStatusChange(onUpdated) {
  const { reloadStats } = useProviderPanel() || {};
  const [busy, setBusy] = useState(null);
  const [ask, setAsk] = useState(null); // { appt, status }
  const [note, setNote] = useState("");

  const run = useCallback(
    async (appt, status, text = "") => {
      setBusy({ id: appt._id, status });
      try {
        const updated = await providerApi.setStatus(appt._id, status, text.trim());
        onUpdated?.(updated);
        reloadStats?.();
        toast.success(`Booking ${appt.bookingId} ${statusLabel(status).toLowerCase()}`);
        setAsk(null);
      } catch (err) {
        toast.error(err.message || "Could not update the booking");
      } finally {
        setBusy(null);
      }
    },
    [onUpdated, reloadStats]
  );

  const request = useCallback(
    (appt, status) => {
      if (NEEDS_NOTE.includes(status)) {
        setNote("");
        setAsk({ appt, status });
      } else run(appt, status);
    },
    [run]
  );

  const close = useCallback(() => !busy && setAsk(null), [busy]);
  const isReject = ask?.status === "rejected";
  const dialog = (
    <Modal
      open={Boolean(ask)}
      onClose={close}
      size="sm"
      title={isReject ? "Reject this booking?" : "Cancel this booking?"}
      subtitle={ask ? `${ask.appt.bookingId} · ${ask.appt.patientName}` : null}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={Boolean(busy)}>
            Go back
          </Button>
          <Button variant="danger" loading={Boolean(busy)} onClick={() => ask && run(ask.appt, ask.status, note)}>
            {isReject ? "Reject booking" : "Cancel booking"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ask) run(ask.appt, ask.status, note);
        }}
      >
        <Field label="Note for the patient" hint="Optional. The patient sees this note with the booking.">
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              rows={3}
              maxLength={500}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isReject ? "e.g. The doctor is not available on this date. Please book another day." : "e.g. Our centre is closed that day."}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
  return { request, busy, dialog };
}

/** One button per allowed next status */
export function ActionButtons({ appt, onAction, busy, size = "sm", className, approved = true }) {
  const next = appt.next || [];
  if (!next.length) return null;
  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {next.map((s) => {
        const st = ACTION_STYLE[s] || { variant: "secondary" };
        return (
          <Button
            key={s}
            size={size}
            variant={st.variant}
            icon={st.icon}
            loading={busy?.id === appt._id && busy?.status === s}
            disabled={Boolean(busy && busy.id === appt._id) || !approved}
            title={approved ? undefined : "Available once your account is approved"}
            onClick={(e) => {
              e.stopPropagation();
              onAction(appt, s);
            }}
          >
            {ACTION_LABEL[s] || statusLabel(s)}
          </Button>
        );
      })}
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
        <div className="mt-0.5 break-words text-sm text-ink-800">{children}</div>
      </div>
    </div>
  );
}

const BY_LABEL = { patient: "Patient", provider: "You", admin: "Hospigram team", system: "System" };

/** Full booking details + status history */
export function BookingDrawer({ appt, onClose, onAction, busy, approved }) {
  return (
    <Drawer
      open={Boolean(appt)}
      onClose={onClose}
      title={appt ? appt.patientName : ""}
      subtitle={
        appt ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{appt.bookingId}</span>
            <StatusBadge status={appt.status} />
          </span>
        ) : null
      }
      footer={appt && appt.next?.length ? <ActionButtons appt={appt} onAction={onAction} busy={busy} size="md" approved={approved} /> : null}
    >
      {appt && (
        <div className="space-y-6">
          <section aria-label="Patient">
            <h3 className="text-sm font-bold">Patient</h3>
            <div className="mt-1 divide-y divide-ink-100">
              <DetailRow icon={UserRound} label="Name">
                {appt.patientName}
                {appt.patientCode && <span className="ml-2 font-mono text-xs text-ink-500">{appt.patientCode}</span>}
              </DetailRow>
              {appt.patientPhone && (
                <DetailRow icon={Phone} label="Mobile">
                  <a href={telLink(appt.patientPhone)} className="link">
                    {appt.patientPhone}
                  </a>
                </DetailRow>
              )}
            </div>
          </section>

          <section aria-label="Booking">
            <h3 className="text-sm font-bold">Booking</h3>
            <div className="mt-1 divide-y divide-ink-100">
              <DetailRow icon={Stethoscope} label="Service">
                {appt.service || "General consultation"}
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Date & time">
                {formatDate(appt.date)} at {formatTime(appt.time)}
              </DetailRow>
              {appt.homeCollection && (
                <DetailRow icon={Home} label="Home collection address">
                  {appt.collectionAddress || "Address not given. Call the patient."}
                </DetailRow>
              )}
              {appt.problem && (
                <DetailRow icon={FileText} label="Problem / notes from patient">
                  <span className="whitespace-pre-line">{appt.problem}</span>
                </DetailRow>
              )}
              {appt.providerNote && (
                <DetailRow icon={MessageSquareText} label="Your note to the patient">
                  {appt.providerNote}
                </DetailRow>
              )}
              <DetailRow icon={Clock} label="Booked">
                {formatDateTime(appt.createdAt)} {appt.createdBy === "admin" ? "by the Hospigram team" : "by the patient"}
              </DetailRow>
            </div>
          </section>

          {appt.history?.length > 0 && (
            <section aria-label="Status history">
              <h3 className="text-sm font-bold">Status history</h3>
              <ol className="relative mt-3 space-y-4 border-l border-ink-200 pl-5">
                {[...appt.history].reverse().map((h, i) => (
                  <motion.li key={`${h.at}-${i}`} className="relative" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <span
                      className={cx("absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white", i === 0 ? "bg-brand-500" : "bg-ink-300")}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-ink-500">by {BY_LABEL[h.by] || h.by || "-"}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {formatDateTime(h.at)} · {timeAgo(h.at)}
                    </p>
                    {h.note && <p className="mt-1.5 rounded-sm bg-ink-50 px-3 py-2 text-sm text-ink-700">{h.note}</p>}
                  </motion.li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

// ================================================================ page

const WHEN = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
  { value: "all", label: "All dates" },
];
const STATUS_TABS = ["", "pending", "confirmed", "completed", "cancelled", "rejected"];
const LIMIT = 20;

function RowSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

export default function ProviderBookings() {
  const { stats, copy, approved } = useProviderPanel();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const date = params.get("date") || "";
  const when = date ? "" : params.get("when") || "upcoming";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("q") || "");
  const q = useDebounced(search.trim(), 350);
  const [openId, setOpenId] = useState(null);

  const update = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  // Keep the debounced search in the URL.
  useEffect(() => {
    if ((params.get("q") || "") !== q) update({ q });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = { status, when: when === "all" ? "" : when, date, q, page, limit: LIMIT };
  const { data, loading, error, reload, setData } = useLoad((p) => providerApi.appointments(p), query);

  const onUpdated = useCallback((u) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x._id === u._id ? { ...x, ...u } : x)) } : d)), [setData]);
  const { request, busy, dialog } = useStatusChange(onUpdated);

  const items = data?.items || [];
  const open = items.find((x) => x._id === openId) || null;
  const counts = stats?.counts;
  const tabOptions = STATUS_TABS.map((s) => ({ value: s, label: s ? STATUS[s].label : "All", count: counts ? (s ? counts[s] : stats.total) : undefined }));
  const filtered = Boolean(status || q || date || when !== "upcoming");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs options={tabOptions} value={status} onChange={(v) => update({ status: v })} />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <SearchInput value={search} onChange={setSearch} placeholder="Search booking id, patient name, mobile, patient id or service" />
          <Field label="When" className="md:w-40">
            {(id) => (
              <Select id={id} value={when || "all"} disabled={Boolean(date)} onChange={(e) => update({ when: e.target.value === "upcoming" ? "" : e.target.value })}>
                {WHEN.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date" className="md:w-48">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} type="date" value={date} onChange={(e) => update({ date: e.target.value })} />
                {date && <Button variant="secondary" icon={X} aria-label="Clear date" title="Clear date" onClick={() => update({ date: "" })} className="px-3" />}
              </div>
            )}
          </Field>
        </div>
        {!date && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={() => update({ date: todayIST() })} className="rounded-sm border border-ink-200 px-2.5 py-1 font-semibold text-ink-600 hover:border-ink-300 hover:bg-ink-50">
              Jump to today
            </button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <RowSkeleton />
        ) : !items.length ? (
          <EmptyState
            icon={CalendarDays}
            title={filtered ? "No bookings match these filters" : "No upcoming bookings"}
            text={filtered ? "Try another status, date or search." : `New bookings for your ${copy.noun} will show up here.`}
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setParams({}, { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div className={cx("transition-opacity", loading && "opacity-60")} aria-busy={loading}>
            {/* desktop table */}
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="border-b border-ink-100 bg-ink-50/70 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Patient
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Service
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Date & time
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                <AnimatePresence initial={false}>
                  {items.map((a, i) => (
                    <motion.tr
                      key={a._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.025 }}
                      onClick={() => setOpenId(a._id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), setOpenId(a._id))}
                      tabIndex={0}
                      aria-label={`Open booking ${a.bookingId}`}
                      className="cursor-pointer align-top transition hover:bg-ink-50/70 focus-visible:bg-ink-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-900">{a.patientName}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          <span className="font-mono">{a.patientCode || "-"}</span> ·{" "}
                          <a href={telLink(a.patientPhone)} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-600 hover:underline">
                            {a.patientPhone}
                          </a>
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-400">{a.bookingId}</p>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="text-ink-800">{a.service || "General consultation"}</p>
                        {a.homeCollection && (
                          <div className="mt-1">
                            <Badge tone="violet">
                              <Home className="h-3 w-3" aria-hidden="true" /> Home collection
                            </Badge>
                            {a.collectionAddress && <p className="mt-1 line-clamp-2 text-xs text-ink-500">{a.collectionAddress}</p>}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-medium text-ink-800">{formatDate(a.date)}</p>
                        <p className="text-xs text-ink-500">{formatTime(a.time)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ActionButtons appt={a} onAction={request} busy={busy} approved={approved} className="justify-end" />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* mobile / tablet cards */}
            <ul className="divide-y divide-ink-100 lg:hidden">
              {items.map((a, i) => (
                <motion.li key={a._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.03 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenId(a._id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), setOpenId(a._id))}
                    aria-label={`Open booking ${a.bookingId}`}
                    className="block w-full cursor-pointer p-4 text-left transition hover:bg-ink-50/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">{a.patientName}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          <span className="font-mono">{a.patientCode || "-"}</span> · <span className="font-mono">{a.bookingId}</span>
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-3 grid gap-1.5 text-sm text-ink-700">
                      <p className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                        <span className="min-w-0 truncate">{a.service || "General consultation"}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                        {formatDate(a.date)} · {formatTime(a.time)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                        <a href={telLink(a.patientPhone)} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-600 hover:underline">
                          {a.patientPhone}
                        </a>
                      </p>
                      {a.homeCollection && (
                        <p className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
                          <span className="min-w-0 break-words">
                            <span className="font-semibold text-violet-700">Home collection</span>
                            {a.collectionAddress ? `: ${a.collectionAddress}` : ""}
                          </span>
                        </p>
                      )}
                    </div>
                    <ActionButtons appt={a} onAction={request} busy={busy} approved={approved} className="mt-3" />
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
        {data?.total > 0 && !error && (
          <div className="border-t border-ink-100">
            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={(p) => update({ page: String(p) })} label="bookings" />
          </div>
        )}
      </Card>

      {!approved && <p className="text-center text-xs text-ink-500">You can confirm or reject bookings once Hospigram approves your {copy.noun}.</p>}

      <BookingDrawer appt={open} onClose={() => setOpenId(null)} onAction={request} busy={busy} approved={approved} />
      {dialog}
    </div>
  );
}
