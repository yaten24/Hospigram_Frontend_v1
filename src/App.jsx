import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./context/AuthContext";
import SiteLayout from "./components/SiteLayout";
import { PageSpinner } from "./components/ui";
import Home from "./pages/public/Home";

// Logins / roles
//   Patient   /login, /register              -> /account          (self sign-up, mobile + password)
//   Hospital  /hospital/login, /register     -> /hospital/*       (self sign-up, verified by an admin)
//   Lab       /lab/login, /lab/register      -> /lab/*            (self sign-up, verified by an admin)
//   Admin     /admin/login                   -> /admin/*          (first admin from the API's .env)
const P = (f) => lazy(f);
const Providers = P(() => import("./pages/public/Providers"));
const ProviderDetail = P(() => import("./pages/public/ProviderDetail"));
const Tests = P(() => import("./pages/public/Tests"));
const Book = P(() => import("./pages/public/Book"));
const HowItWorks = P(() => import("./pages/public/HowItWorks"));
const Support = P(() => import("./pages/public/Support"));
const Legal = P(() => import("./pages/public/Legal"));
const NotFound = P(() => import("./pages/public/NotFound"));

const PatientLogin = P(() => import("./pages/auth/PatientAuth").then((m) => ({ default: m.PatientLogin })));
const PatientRegister = P(() => import("./pages/auth/PatientAuth").then((m) => ({ default: m.PatientRegister })));
const ProviderLogin = P(() => import("./pages/auth/ProviderAuth").then((m) => ({ default: m.ProviderLogin })));
const ProviderRegister = P(() => import("./pages/auth/ProviderAuth").then((m) => ({ default: m.ProviderRegister })));
const AdminLogin = P(() => import("./pages/auth/ProviderAuth").then((m) => ({ default: m.AdminLogin })));
const PartnersPage = P(() => import("./pages/auth/ProviderAuth").then((m) => ({ default: m.PartnersPage })));

const Account = P(() => import("./pages/patient/Account"));

const ProviderLayout = P(() => import("./pages/provider/ProviderLayout"));
const ProviderOverview = P(() => import("./pages/provider/ProviderOverview"));
const ProviderBookings = P(() => import("./pages/provider/ProviderBookings"));
const ProviderProfile = P(() => import("./pages/provider/ProviderProfile"));
const ProviderSettings = P(() => import("./pages/provider/ProviderSettings"));

const AdminLayout = P(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = P(() => import("./pages/admin/AdminDashboard"));
const AdminProviders = P(() => import("./pages/admin/AdminProviders"));
const AdminPatients = P(() => import("./pages/admin/AdminPatients"));
const AdminAppointments = P(() => import("./pages/admin/AdminAppointments"));
const AdminNewBooking = P(() => import("./pages/admin/AdminNewBooking"));
const AdminEnquiries = P(() => import("./pages/admin/AdminEnquiries"));
const AdminSettings = P(() => import("./pages/admin/AdminSettings"));

function providerRoutes(kind) {
  return (
    <Route
      path={`/${kind}`}
      element={
        <RequireRole role="provider" kind={kind} loginPath={`/${kind}/login`}>
          <ProviderLayout kind={kind} />
        </RequireRole>
      }
    >
      <Route index element={<ProviderOverview />} />
      <Route path="bookings" element={<ProviderBookings />} />
      <Route path="profile" element={<ProviderProfile />} />
      <Route path="settings" element={<ProviderSettings />} />
    </Route>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* ---------- public site ---------- */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/hospitals" element={<Providers kind="hospital" />} />
          <Route path="/labs" element={<Providers kind="lab" />} />
          <Route path="/hospitals/:id" element={<ProviderDetail kind="hospital" />} />
          <Route path="/labs/:id" element={<ProviderDetail kind="lab" />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/book" element={<Book />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/support" element={<Support />} />
          <Route path="/privacy" element={<Legal page="privacy" />} />
          <Route path="/terms" element={<Legal page="terms" />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route
            path="/account"
            element={
              <RequireRole role="patient" loginPath="/login">
                <Account />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---------- logins ---------- */}
        <Route path="/login" element={<PatientLogin />} />
        <Route path="/register" element={<PatientRegister />} />
        <Route path="/hospital/login" element={<ProviderLogin kind="hospital" />} />
        <Route path="/hospital/register" element={<ProviderRegister kind="hospital" />} />
        <Route path="/lab/login" element={<ProviderLogin kind="lab" />} />
        <Route path="/lab/register" element={<ProviderRegister kind="lab" />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ---------- hospital & lab dashboards ---------- */}
        {providerRoutes("hospital")}
        {providerRoutes("lab")}

        {/* ---------- admin ---------- */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin" loginPath="/admin/login">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="hospitals" element={<AdminProviders kind="hospital" />} />
          <Route path="labs" element={<AdminProviders kind="lab" />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="book" element={<AdminNewBooking />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* old links */}
        <Route path="/partner-login" element={<Navigate to="/partners" replace />} />
        <Route path="/hospital-login" element={<Navigate to="/hospital/login" replace />} />
        <Route path="/labs-login" element={<Navigate to="/lab/login" replace />} />
        <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/become-hospital-partner" element={<Navigate to="/hospital/register" replace />} />
        <Route path="/become-lab-partner" element={<Navigate to="/lab/register" replace />} />
        <Route path="/profile" element={<Navigate to="/account" replace />} />
        <Route path="/book-now" element={<Navigate to="/book" replace />} />
      </Routes>
    </Suspense>
  );
}
