// Client for the Hospigram API (Hospigram_Backend_v1). Relative /api works in dev (Vite proxy) and production (nginx).
// Every call returns parsed JSON or throws an Error with .status, .errors ({ field: message }) and .kind.

const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "hg_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized = null;
/** AuthContext registers a handler so an expired session logs the user out everywhere. */
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    const err = new Error("Can't reach Hospigram. Check your internet connection and try again.");
    err.status = 0;
    throw err;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = (data && data.errors) || {};
    err.kind = data && data.kind; // provider used the wrong portal (hospital vs lab)
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw err;
  }
  return data;
}

export const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
  return s ? `?${s}` : "";
};

// ---------------------------------------------------------------- auth (every role)
// Login/register responses: { token, role: 'patient'|'provider'|'admin', account }
export const authApi = {
  /** { name, phone, email?, password, city?, language? } */
  patientRegister: (data) => request("/auth/patient/register", { method: "POST", body: data }),
  /** id = mobile number */
  patientLogin: (id, password) => request("/auth/patient/login", { method: "POST", body: { id, password } }),
  /** { kind: 'hospital'|'lab', name, email, password, phone, category?, services?[], description?, address, city, pincode?, timings?, homeCollection?, emergency?, image? } */
  providerRegister: (data) => request("/auth/provider/register", { method: "POST", body: data }),
  /** id = email; kind = the portal used ('hospital' | 'lab'); a mismatch throws err.kind */
  providerLogin: (id, password, kind) => request("/auth/provider/login", { method: "POST", body: { id, password, kind } }),
  adminLogin: (id, password) => request("/auth/admin/login", { method: "POST", body: { id, password } }),
  /** -> { role, account } */
  me: () => request("/auth/me"),
  /** patient: { name, email, gender, dob, city, address, language }; provider: any provider profile field; admin: { name } */
  updateMe: (data) => request("/auth/me", { method: "PATCH", body: data }),
  /** -> { ok, token } (old sessions stop working; store the new token) */
  changePassword: (currentPassword, newPassword) => request("/auth/me/password", { method: "POST", body: { currentPassword, newPassword } }),
};

// ---------------------------------------------------------------- public
export const publicApi = {
  /** params: { kind, city, service, q, homeCollection: 1, emergency: 1, page, limit } -> { items, total, page, pages } */
  providers: (params) => request(`/public/providers${qs(params)}`),
  /** -> provider: { _id, kind, name, phone, category, services[], description, address, city, pincode, timings, homeCollection, emergency, image } */
  provider: (id) => request(`/public/providers/${id}`),
  /** -> { cities[], services[], hospitals, labs } */
  meta: () => request("/public/meta"),
  /** { name, phone?, email?, topic: general|booking|partner|complaint|other, message } */
  enquiry: (data) => request("/public/enquiries", { method: "POST", body: data }),
};

// ---------------------------------------------------------------- patient
// Appointment: { _id, bookingId, provider (populated on patient list: { name, kind, city, address, phone, image }), providerKind,
//   providerName, patientName, patientPhone, patientCode, service, problem, date 'YYYY-MM-DD', time 'HH:mm',
//   homeCollection, collectionAddress, status: pending|confirmed|completed|cancelled|rejected, providerNote, history[], createdBy, createdAt }
export const patientApi = {
  /** -> { upcoming[], past[] } */
  appointments: () => request("/patient/appointments"),
  /** { provider: id, service?, problem?, date, time, homeCollection?, collectionAddress? } -> appointment */
  book: (data) => request("/patient/appointments", { method: "POST", body: data }),
  cancel: (id, reason) => request(`/patient/appointments/${id}/cancel`, { method: "POST", body: { reason } }),
};

// ---------------------------------------------------------------- hospital / lab
export const providerApi = {
  /** -> { counts: { pending, confirmed, completed, cancelled, rejected }, total, today, upcoming } */
  stats: () => request("/provider/stats"),
  /** params: { status, when: today|upcoming|past, date, q, page, limit } -> { items (each with next: allowed statuses), total, page, pages } */
  appointments: (params) => request(`/provider/appointments${qs(params)}`),
  /** status: confirmed|rejected|completed|cancelled; note shown to the patient */
  setStatus: (id, status, note) => request(`/provider/appointments/${id}/status`, { method: "POST", body: { status, note } }),
};

// ---------------------------------------------------------------- admin
export const adminApi = {
  /** -> { patients, patientsWeek, providers: { hospital: {pending, approved, ...}, lab: {...} }, appointments: { byStatus, today, week, total },
   *       newEnquiries, pendingProviders[], recentAppointments[] } */
  stats: () => request("/admin/stats"),
  /** params: { kind, status, q, page, limit } -> { items (each + appointments count), total, page, pages, counts: { pending, approved, ... } } */
  providers: (params) => request(`/admin/providers${qs(params)}`),
  provider: (id) => request(`/admin/providers/${id}`),
  /** same body as authApi.providerRegister; created already approved */
  createProvider: (data) => request("/admin/providers", { method: "POST", body: data }),
  /** any profile field, plus email, password (resets it) */
  updateProvider: (id, data) => request(`/admin/providers/${id}`, { method: "PATCH", body: data }),
  /** status: pending|approved|rejected|suspended; note = reason shown to the provider */
  setProviderStatus: (id, status, note) => request(`/admin/providers/${id}/status`, { method: "POST", body: { status, note } }),
  deleteProvider: (id) => request(`/admin/providers/${id}`, { method: "DELETE" }),
  /** params: { status: active|blocked, q, page, limit } -> { items (each + appointments count), total, page, pages } */
  patients: (params) => request(`/admin/patients${qs(params)}`),
  /** q = mobile number or patient id (HGP-XXXXXX) */
  lookupPatient: (q) => request(`/admin/patients/lookup${qs({ q })}`),
  /** { name, phone, email?, city?, address? } -> { patient, tempPassword } */
  createPatient: (data) => request("/admin/patients", { method: "POST", body: data }),
  /** profile fields, phone, status: active|blocked, password (resets it) */
  updatePatient: (id, data) => request(`/admin/patients/${id}`, { method: "PATCH", body: data }),
  deletePatient: (id) => request(`/admin/patients/${id}`, { method: "DELETE" }),
  /** params: { status, kind, when: today|upcoming|past, q, page, limit } -> { items (each with next[]), total, page, pages } */
  appointments: (params) => request(`/admin/appointments${qs(params)}`),
  /** { patient: id, provider: id, service?, problem?, date, time, homeCollection?, collectionAddress? } */
  book: (data) => request("/admin/appointments", { method: "POST", body: data }),
  setAppointmentStatus: (id, status, note) => request(`/admin/appointments/${id}/status`, { method: "POST", body: { status, note } }),
  /** params: { status: new|in-progress|closed, q, page } -> { items, total, page, pages, counts } */
  enquiries: (params) => request(`/admin/enquiries${qs(params)}`),
  updateEnquiry: (id, data) => request(`/admin/enquiries/${id}`, { method: "PATCH", body: data }),
  deleteEnquiry: (id) => request(`/admin/enquiries/${id}`, { method: "DELETE" }),
  admins: () => request("/admin/admins"),
  createAdmin: (data) => request("/admin/admins", { method: "POST", body: data }),
  deleteAdmin: (id) => request(`/admin/admins/${id}`, { method: "DELETE" }),
};

/** Where each role lands after login */
export const homeFor = (role, account) =>
  role === "admin" ? "/admin" : role === "provider" ? (account?.kind === "lab" ? "/lab" : "/hospital") : "/account";
