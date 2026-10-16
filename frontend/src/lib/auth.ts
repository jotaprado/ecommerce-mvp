const TOKEN_KEY = "auth_token";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function decodeToken(): { id?: string; role?: string } | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): string | null {
  return decodeToken()?.role ?? null;
}

export function getCurrentUserId(): string | null {
  return decodeToken()?.id ?? null;
}

export const AUTH_NOTICE_KEY = "auth_notice";
