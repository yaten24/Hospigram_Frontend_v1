import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, homeFor, setUnauthorizedHandler, tokenStore } from "../lib/api";
import { PageSpinner } from "../components/ui";

/**
 * One session for every role.
 * role: 'patient' | 'provider' | 'admin' | null
 * account: the logged-in patient / provider (has .kind 'hospital'|'lab') / admin
 */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ role: null, account: null, loading: Boolean(tokenStore.get()) });

  const logout = useCallback(() => {
    tokenStore.clear();
    setState({ role: null, account: null, loading: false });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(({ role, account }) => setState({ role, account, loading: false }))
      // only a rejected session logs out; a network blip keeps the token so a reload can recover
      .catch((err) => (err.status === 401 || err.status === 403 ? logout() : setState({ role: null, account: null, loading: false })));
  }, [logout]);

  /** Stores a login/register response ({ token, role, account }) */
  const signIn = useCallback(({ token, role, account }) => {
    tokenStore.set(token);
    setState({ role, account, loading: false });
    return { role, account };
  }, []);

  const setAccount = useCallback((account) => setState((s) => ({ ...s, account })), []);

  const refresh = useCallback(async () => {
    const { role, account } = await authApi.me();
    setState({ role, account, loading: false });
    return account;
  }, []);

  const value = useMemo(() => ({ ...state, signIn, logout, setAccount, refresh }), [state, signIn, logout, setAccount, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/**
 * Route guard. role: 'patient' | 'provider' | 'admin'; kind (providers only): 'hospital' | 'lab'.
 * Not logged in -> loginPath (remembers where they were going). Wrong role -> that role's home.
 */
export function RequireRole({ role, kind, loginPath, children }) {
  const { role: current, account, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!current) return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  if (current !== role || (kind && account?.kind !== kind)) return <Navigate to={homeFor(current, account)} replace />;
  return children;
}
