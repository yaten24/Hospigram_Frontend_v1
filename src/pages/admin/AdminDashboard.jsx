// Admin home: key numbers, bookings by status, providers waiting for approval and the latest bookings.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, CalendarPlus, Check, Clock, Eye, FlaskConical, Hospital, MessageSquare, ShieldCheck, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, StatCard, StatusBadge, cx } from "../../components/ui";
import { adminApi } from "../../lib/api";
import { KIND_LABEL, STATUS, formatDate, formatTime, n, timeAgo, useLoad } from "../../lib/format";
import { refreshAdminBadges } from "./AdminLayout";

const BAR = { pending: "bg-amber-400", confirmed: "bg-sky-500", completed: "bg-care-500", cancelled: "bg-ink-300", rejected: "bg-brand-500" };
const ORDER = ["pending", "confirmed", "completed", "cancelled", "rejected"];
const providerPath = (kind) => (kind === "lab" ? "/admin/labs" : "/admin/hospitals");

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useLoad(() => adminApi.stats());
  const [approving, setApproving] = useState(null);

  if (error && !data) return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  const s = data;
  const busy = loading && !s;
  const hosp = s?.providers?.hospital || {};
  const lab = s?.providers?.lab || {};
  const pendingTotal = (hosp.pending || 0) + (lab.pending || 0);
  const byStatus = s?.appointments?.byStatus || {};
  const total = s?.appointments?.total || 0;

  const approve = async (p) => {
    if (approving) return;
    setApproving(p._id);
    try {
      await adminApi.setProviderStatus(p._id, "approved");
      toast.success(`${p.name} is approved and now visible to patients`);
      reload();
      refreshAdminBadges();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApproving(null);
    }
  };

  const cards = [
    { label: "Patients", value: n(s?.patients), sub: `+${n(s?.patientsWeek)} this week`, icon: Users, tone: "brand", to: "/admin/patients" },
    { label: "Approved hospitals", value: n(hosp.approved), sub: `${n(hosp.pending)} waiting`, icon: Hospital, tone: "care", to: "/admin/hospitals?status=approved" },
    { label: "Approved labs", value: n(lab.approved), sub: `${n(lab.pending)} waiting`, icon: FlaskConical, tone: "sky", to: "/admin/labs?status=approved" },
    { label: "Today's bookings", value: n(s?.appointments?.today), sub: `${n(s?.appointments?.week)} booked this week`, icon: CalendarCheck, tone: "violet", to: "/admin/appointments?when=today" },
    {
      label: "Pending approvals",
      value: n(pendingTotal),
      sub: `${n(hosp.pending)} hospitals · ${n(lab.pending)} labs`,
      icon: ShieldCheck,
      tone: "amber",
      to: !hosp.pending && lab.pending ? "/admin/labs?status=pending" : "/admin/hospitals?status=pending",
    },
    { label: "New enquiries", value: n(s?.newEnquiries), sub: "Waiting for a reply", icon: MessageSquare, tone: "ink", to: "/admin/enquiries" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">Good to see you</h2>
          <p className="mt-0.5 text-sm text-ink-500">Here is what needs your attention on Hospigram today.</p>
        </div>
        <Button as={Link} to="/admin/book" icon={CalendarPlus}>
          New booking
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }} className="min-w-0">
            <StatCard label={c.label} value={c.value} sub={c.sub} icon={c.icon} tone={c.tone} loading={busy} onClick={() => navigate(c.to)} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* bookings by status */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold">Bookings by status</h3>
              <p className="text-xs text-ink-500">All time · {n(total)} bookings</p>
            </div>
            <Link to="/admin/appointments" className="link text-xs">
              View all
            </Link>
          </div>
          {busy ? (
            <div className="mt-5 space-y-4">
              {ORDER.map((k) => (
                <Skeleton key={k} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="mt-5 flex h-3 w-full overflow-hidden rounded-sm bg-ink-100" aria-hidden="true">
                {ORDER.map((k) => (
                  <motion.span key={k} className={BAR[k]} initial={{ width: 0 }} animate={{ width: total ? `${((byStatus[k] || 0) / total) * 100}%` : 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
                ))}
              </div>
              <ul className="mt-5 space-y-3">
                {ORDER.map((k, i) => {
                  const v = byStatus[k] || 0;
                  const pct = total ? Math.round((v / total) * 100) : 0;
                  return (
                    <li key={k}>
                      <Link to={`/admin/appointments?status=${k}`} className="group block rounded-sm focus-visible:outline-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-semibold text-ink-700 group-hover:text-ink-900">
                            <span className={cx("h-2.5 w-2.5 rounded-full", BAR[k])} aria-hidden="true" />
                            {STATUS[k].label}
                          </span>
                          <span className="text-ink-500">
                            <span className="font-bold text-ink-900">{n(v)}</span> · {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-sm bg-ink-100">
                          <motion.div className={cx("h-full", BAR[k])} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: [0.2, 0.8, 0.2, 1] }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {/* waiting for approval */}
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div>
              <h3 className="font-bold">Waiting for approval</h3>
              <p className="text-xs text-ink-500">New hospitals and labs that signed up</p>
            </div>
            {pendingTotal > 0 && <Badge tone="amber">{n(pendingTotal)} pending</Badge>}
          </div>
          {busy ? (
            <ListSkeleton />
          ) : !s.pendingProviders?.length ? (
            <EmptyState icon={ShieldCheck} title="All caught up" text="No hospital or lab is waiting for approval." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {s.pendingProviders.map((p, i) => {
                const Icon = p.kind === "lab" ? FlaskConical : Hospital;
                return (
                  <motion.li key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">{p.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {KIND_LABEL[p.kind]} · {p.city || "No city"} · signed up {timeAgo(p.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" icon={Eye} onClick={() => navigate(`${providerPath(p.kind)}?status=pending&open=${p._id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="care" icon={Check} loading={approving === p._id} disabled={Boolean(approving)} onClick={() => approve(p)}>
                        Approve
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* recent bookings */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="font-bold">Recent bookings</h3>
            <p className="text-xs text-ink-500">The latest appointments made on Hospigram</p>
          </div>
          <Link to="/admin/appointments" className="link inline-flex items-center gap-1 text-xs">
            All bookings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {busy ? (
          <ListSkeleton />
        ) : !s.recentAppointments?.length ? (
          <EmptyState icon={CalendarCheck} title="No bookings yet" text="Bookings made by patients or by the team will show here." action={<Button as={Link} to="/admin/book" icon={CalendarPlus}>Make a booking</Button>} />
        ) : (
          <ul className="divide-y divide-ink-100">
            {s.recentAppointments.map((a, i) => (
              <motion.li key={a._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link to={`/admin/appointments?q=${encodeURIComponent(a.bookingId || "")}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-ink-50">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-semibold text-ink-900">
                      {a.patientName} <span className="font-normal text-ink-400">→</span> {a.providerName}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      <span className="font-mono">{a.bookingId}</span> · {KIND_LABEL[a.providerKind]} · booked {timeAgo(a.createdAt)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-ink-600">
                    <Clock className="h-4 w-4 text-ink-400" aria-hidden="true" />
                    {formatDate(a.date, { day: "numeric", month: "short" })}, {formatTime(a.time)}
                  </span>
                  <StatusBadge status={a.status} />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4 px-5 py-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
