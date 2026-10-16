export interface UserState {
  role: string;
  active: boolean;
}

export interface UserChange {
  role?: string;
  active?: boolean;
}

// Función pura: indica si aplicar `change` al usuario `target` dejaría el sistema
// sin administradores activos. `activeAdminCount` es el número actual de admins activos.
export function wouldLeaveNoActiveAdmin(
  target: UserState,
  change: UserChange,
  activeAdminCount: number,
): boolean {
  const isActiveAdminNow = target.role === "admin" && target.active;
  if (!isActiveAdminNow) return false;

  const newRole = change.role ?? target.role;
  const newActive = change.active ?? target.active;
  const staysActiveAdmin = newRole === "admin" && newActive;
  if (staysActiveAdmin) return false;

  return activeAdminCount <= 1;
}
