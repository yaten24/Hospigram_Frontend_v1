// Hospital / lab overview (/hospital, /lab): today's numbers, bookings that need action, today's schedule, profile health.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Hourglass,
  Inbox,
  RotateCcw,
  Sun,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StatCard,
  StatusBadge,
  cx,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { providerApi } from "../../lib/api";
import { formatDate, formatTime, todayIST, useLoad } from "../../lib/format";
import { useProviderPanel } from "./ProviderLayout";
import {
  ActionButtons,
  BookingDrawer,
  useStatusChange,
} from "./ProviderBookings";

/** Counts up smoothly when the number changes */
function CountUp({ value }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("en-IN"));
  useEffect(() => {
    const c = animate(mv, value || 0, {
      duration: 0.7,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

function greeting() {
  const h = Number(
    new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 13),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-14" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, sub, to, linkLabel = "View all" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-base font-bold">{title}</h2>
        {sub && <p className="text-xs text-ink-500">{sub}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function ProfileHealth({ account, base, noun }) {
  const checks = [
    { label: "Photo of your " + noun, done: Boolean(account?.image) },
    {
      label: "About text (a few lines)",
      done: (account?.description || "").trim().length >= 30,
    },
    { label: "Services listed", done: (account?.services || []).length > 0 },
    {
      label: "Opening timings",
      done: Boolean((account?.timings || "").trim()),
    },
  ];
  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Profile completeness</h2>
        <span
          className={cx(
            "font-display text-lg font-extrabold",
            pct === 100 ? "text-care-700" : "text-ink-900",
          )}
        >
          {pct}%
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-sm bg-ink-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <motion.div
          className={cx("h-full", pct === 100 ? "bg-care-500" : "bg-brand-500")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            {c.done ? (
              <CheckCircle2
                className="h-4 w-4 text-care-600"
                aria-hidden="true"
              />
            ) : (
              <Circle className="h-4 w-4 text-ink-300" aria-hidden="true" />
            )}
            <span
              className={c.done ? "text-ink-500" : "font-medium text-ink-800"}
            >
              {c.label}
            </span>
            <span className="sr-only">{c.done ? "(done)" : "(missing)"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-500">
        Complete listings get more bookings from patients.
      </p>
      <Button
        as={Link}
        to={`${base}/profile`}
        variant={pct === 100 ? "secondary" : "primary"}
        size="sm"
        iconRight={ArrowRight}
        className="mt-3 w-full"
      >
        {pct === 100 ? "View profile" : "Complete your profile"}
      </Button>
    </Card>
  );
}

export default function ProviderOverview() {
  const { account } = useAuth();
  const { stats, statsError, reloadStats, base, copy, approved } =
    useProviderPanel();
  const navigate = useNavigate();
  const pending = useLoad(() =>
    providerApi.appointments({ status: "pending", limit: 5 }),
  );
  const today = useLoad(() =>
    providerApi.appointments({ when: "today", limit: 30 }),
  );
  const [openAppt, setOpenAppt] = useState(null);

  const setPending = pending.setData;
  const setToday = today.setData;
  const onUpdated = useCallback(
    (u) => {
      const patch = (d) =>
        d
          ? {
              ...d,
              items: d.items.map((x) => (x._id === u._id ? { ...x, ...u } : x)),
            }
          : d;
      // A booking that is no longer pending leaves the "needs action" list.
      setPending((d) =>
        d && u.status !== "pending"
          ? {
              ...d,
              items: d.items.filter((x) => x._id !== u._id),
              total: Math.max(0, d.total - 1),
            }
          : patch(d),
      );
      setToday(patch);
      setOpenAppt((o) => (o && o._id === u._id ? { ...o, ...u } : o));
    },
    [setPending, setToday],
  );
  const { request, busy, dialog } = useStatusChange(onUpdated);

  const s = stats || {};
  const statsLoading = !stats && !statsError;
  const cards = [
    {
      label: "Today",
      value: s.today,
      sub: "Active bookings today",
      icon: Sun,
      tone: "brand",
      to: `${base}/bookings?date=${todayIST()}`,
    },
    {
      label: "Upcoming",
      value: s.upcoming,
      sub: "Pending + confirmed",
      icon: CalendarClock,
      tone: "sky",
      to: `${base}/bookings`,
    },
    {
      label: "Pending",
      value: s.counts?.pending,
      sub: "Waiting for you",
      icon: Hourglass,
      tone: "amber",
      to: `${base}/bookings?status=pending&when=all`,
    },
    {
      label: "Completed",
      value: s.counts?.completed,
      sub: "All time",
      icon: CheckCircle2,
      tone: "care",
      to: `${base}/bookings?status=completed&when=all`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-500">{greeting()},</p>
          <h2 className="truncate text-2xl font-extrabold sm:text-3xl">
            {account?.name}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            {formatDate(todayIST(), {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {approved ? (
              <Badge tone="care">Verified {copy.noun}</Badge>
            ) : (
              <StatusBadge status={account?.status} />
            )}
          </p>
        </div>
        <Button
          as={Link}
          to={`${base}/bookings`}
          variant="dark"
          icon={CalendarCheck}
          className="w-full sm:w-auto"
        >
          Open bookings
        </Button>
      </motion.div>

      {/* numbers */}
      {statsError && !stats ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-ink-600">
            Could not load your numbers. {statsError.message}
          </span>
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            onClick={reloadStats}
          >
            Try again
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
            >
              <StatCard
                label={c.label}
                value={<CountUp value={c.value} />}
                sub={c.sub}
                icon={c.icon}
                tone={c.tone}
                loading={statsLoading}
                onClick={() => navigate(c.to)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* needs action */}
          <Card className="overflow-hidden">
            <SectionHead
              title="Needs your action"
              sub="New requests waiting for confirmation"
              to={`${base}/bookings?status=pending&when=all`}
            />
            {pending.error ? (
              <ErrorState error={pending.error} onRetry={pending.reload} />
            ) : pending.loading && !pending.data ? (
              <ListSkeleton />
            ) : !pending.data?.items.length ? (
              <EmptyState
                icon={Check}
                title="You're all caught up"
                text="No bookings are waiting for confirmation."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {pending.data.items.map((a, i) => (
                  <motion.li
                    key={a._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenAppt(a)}
                      className="min-w-0 flex-1 rounded-sm text-left"
                    >
                      <p className="truncate font-semibold text-ink-900">
                        {a.patientName}{" "}
                        <span className="font-mono text-xs font-normal text-ink-400">
                          {a.patientCode}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-500">
                        {a.service || "General consultation"} ·{" "}
                        {formatDate(a.date, { day: "numeric", month: "short" })}
                        , {formatTime(a.time)}
                        {a.homeCollection ? " · Home collection" : ""}
                      </p>
                    </button>
                    <ActionButtons
                      appt={{
                        ...a,
                        next: (a.next || []).filter(
                          (x) => x === "confirmed" || x === "rejected",
                        ),
                      }}
                      onAction={request}
                      busy={busy}
                      approved={approved}
                    />
                  </motion.li>
                ))}
              </ul>
            )}
            {pending.data?.total > 5 && (
              <p className="border-t border-ink-100 px-5 py-2.5 text-xs text-ink-500">
                {pending.data.total - pending.data.items.length} more pending.{" "}
                <Link
                  to={`${base}/bookings?status=pending&when=all`}
                  className="link"
                >
                  See all
                </Link>
              </p>
            )}
          </Card>

          {/* today's schedule */}
          <Card className="overflow-hidden">
            <SectionHead
              title="Today's schedule"
              sub={formatDate(todayIST())}
              to={`${base}/bookings?date=${todayIST()}`}
            />
            {today.error ? (
              <ErrorState error={today.error} onRetry={today.reload} />
            ) : today.loading && !today.data ? (
              <ListSkeleton rows={4} />
            ) : !today.data?.items.length ? (
              <EmptyState
                icon={CalendarDays}
                title="Nothing booked for today"
                text="Bookings for today will show up here."
              />
            ) : (
              <ol className="divide-y divide-ink-100">
                {today.data.items.map((a, i) => (
                  <motion.li
                    key={a._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenAppt(a)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-50/70 sm:px-5"
                    >
                      <span className="w-16 shrink-0 font-display text-sm font-bold text-ink-900">
                        {formatTime(a.time)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">
                          {a.patientName}
                        </span>
                        <span className="block truncate text-xs text-ink-500">
                          {a.service || "General consultation"}
                          {a.homeCollection ? " · Home collection" : ""}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </button>
                  </motion.li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <ProfileHealth account={account} base={base} noun={copy.noun} />
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-ink-100 text-ink-600">
                <Inbox className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  All bookings
                </p>
                <p className="font-display text-xl font-extrabold text-ink-900">
                  {stats ? (
                    <CountUp value={stats.total} />
                  ) : statsLoading ? (
                    <Skeleton className="mt-1 h-6 w-12" />
                  ) : (
                    "-"
                  )}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <BookingDrawer
        appt={openAppt}
        onClose={() => setOpenAppt(null)}
        onAction={request}
        busy={busy}
        approved={approved}
      />
      {dialog}
    </div>
  );
}
