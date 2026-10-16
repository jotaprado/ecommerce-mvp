import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { getToken } from "../lib/auth";

// Un invitado va a /login y vuelve a la página que quería (parámetro ?next=).
function RequireAuth({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  if (!getToken()) {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
