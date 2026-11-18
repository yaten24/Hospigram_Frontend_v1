// Hospital / lab dashboard frame (/hospital/*, /lab/*): PanelShell + approval banner + shared panel context.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, CalendarCheck, Clock, LayoutDashboard, Settings, Store } from "lucide-react";
import PanelShell from "../../components/PanelShell";
import { useAuth } from "../../context/AuthContext";
import { providerApi } from "../../lib/api";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_LINK } from "../../lib/format";

export const PROVIDER_COPY = {
  hospital: {
    noun: "hospital",
    Noun: "Hospital",
    categories: ["Multi-speciality hospital", "Super-speciality hospital", "General hospital", "Nursing home", "Clinic", "Maternity centre", "Eye hospital", "Dental clinic"],
  },
  lab: {
    noun: "lab",
    Noun: "Lab",
    categories: ["Diagnostic centre", "Pathology lab", "Imaging centre", "Collection centre"],
  },
};

const PanelCtx = createContext(null);

/** { kind, copy, base, stats, statsError, reloadStats, approved } for the hospital / lab pages */
export const useProviderPanel = () => useContext(PanelCtx);

function StatusBanner({ account, copy }) {
  if (!account || account.status === "approved") return null;
  if (account.status === "rejected") {
    return (
      <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-6">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Your {copy.noun} was not approved.</span>
            {account.statusNote ? <> Reason: {account.statusNote}</> : null} Please update your profile and contact support at{" "}
            <a href={SUPPORT_PHONE_LINK} className="font-semibold underline">
              {SUPPORT_PHONE}
            </a>{" "}
            or{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold break-all underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
      <div className="flex items-start gap-2.5">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Your {copy.noun} is being verified by Hospigram.</span> You'll be listed and can accept bookings once approved.
          {account.statusNote ? <> Note from Hospigram: {account.statusNote}</> : null}
        </p>
      </div>
    </div>
  );
}

export default function ProviderLayout({ kind: kindProp }) {
  const { account } = useAuth();
  const kind = kindProp || account?.kind || "hospital";
  const copy = PROVIDER_COPY[kind] || PROVIDER_COPY.hospital;
  const base = `/${kind}`;
  const { pathname } = useLocation();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  const reloadStats = useCallback(() => {
    return providerApi
      .stats()
      .then((s) => {
        setStats(s);
        setStatsError(null);
        return s;
      })
      .catch((e) => setStatsError(e));
  }, []);

  // Refresh counts (and the sidebar badge) whenever the page changes.
  useEffect(() => {
    reloadStats();
  }, [reloadStats, pathname]);

  const pending = stats?.counts?.pending || 0;
  const links = [
    { to: base, end: true, label: "Overview", icon: LayoutDashboard, description: `Today at your ${copy.noun} at a glance` },
    { to: `${base}/bookings`, label: "Bookings", icon: CalendarCheck, description: "Confirm, complete and track patient bookings", badge: pending > 99 ? "99+" : pending || null },
    { to: `${base}/profile`, label: "Profile", icon: Store, description: "Your public listing, as patients see it" },
    { to: `${base}/settings`, label: "Settings", icon: Settings, description: "Login, password and help" },
  ];

  const approved = account?.status === "approved";
  const value = useMemo(() => ({ kind, copy, base, stats, statsError, reloadStats, approved }), [kind, copy, base, stats, statsError, reloadStats, approved]);

  return (
    <PanelCtx.Provider value={value}>
      <PanelShell links={links} label={copy.Noun} banner={<StatusBanner account={account} copy={copy} />} />
    </PanelCtx.Provider>
  );
}
