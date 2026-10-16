import { AUTH_NOTICE_KEY, clearToken, getToken } from "./auth";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export async function apiFetch(path: string, options?: RequestInit) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  // Sesión inválida (token vencido o cuenta desactivada/eliminada): se cierra la sesión.
  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    clearToken();
    try {
      sessionStorage.setItem(
        AUTH_NOTICE_KEY,
        "Tu sesión ya no es válida o tu cuenta fue desactivada. Inicia sesión de nuevo.",
      );
    } catch {
      // sessionStorage no disponible: se redirige igualmente.
    }
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error ?? `Error en la solicitud (código ${res.status})`, res.status);
  }

  return data;
}
