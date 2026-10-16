import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Users as UsersIcon } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { getCurrentUserId } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import PanelNav from "../../components/PanelNav";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

type Role = "customer" | "support" | "admin";

interface UserRow {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  orderCount: number;
}

interface UsersResponse {
  users: UserRow[];
  page: number;
  totalPages: number;
  total: number;
}

const ROLE_LABELS: Record<Role, string> = {
  customer: "Cliente",
  support: "Soporte",
  admin: "Administrador",
};
const ROLES = Object.keys(ROLE_LABELS) as Role[];

function Users() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("customer");
  const [creating, setCreating] = useState(false);

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");

  const toast = useToast();
  const currentUserId = getCurrentUserId();

  // Búsqueda con pequeña espera para no consultar en cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function loadUsers() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    params.set("page", String(page));

    setLoading(true);
    apiFetch(`/admin/users?${params.toString()}`)
      .then((result: UsersResponse) => {
        setData(result);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, page]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      toast.success(`Usuario ${newEmail} creado`);
      setNewEmail("");
      setNewPassword("");
      setNewRole("customer");
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  }

  async function patchUser(user: UserRow, body: { role?: Role; active?: boolean }, okMessage: string) {
    setBusyId(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success(okMessage);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el usuario");
    } finally {
      setBusyId(null);
    }
  }

  function handleRoleChange(user: UserRow, role: Role) {
    if (role === user.role) return;
    if (!window.confirm(`¿Cambiar el rol de ${user.email} a ${ROLE_LABELS[role]}?`)) return;
    patchUser(user, { role }, `Rol de ${user.email} actualizado`);
  }

  function handleToggleActive(user: UserRow) {
    if (user.active) {
      if (!window.confirm(`¿Desactivar la cuenta de ${user.email}? No podrá iniciar sesión.`)) return;
      patchUser(user, { active: false }, `Cuenta de ${user.email} desactivada`);
    } else {
      patchUser(user, { active: true }, `Cuenta de ${user.email} activada`);
    }
  }

  async function handleResetPassword(e: FormEvent, user: UserRow) {
    e.preventDefault();
    setBusyId(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: resetValue }),
      });
      toast.success(`Contraseña de ${user.email} restablecida`);
      setResetId(null);
      setResetValue("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    } finally {
      setBusyId(null);
    }
  }

  const users = data?.users ?? [];

  return (
    <div>
      <h1 className="mb-4 text-title">Panel de administración</h1>
      <PanelNav />

      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-heading">Crear usuario</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 items-end gap-3 md:grid-cols-4">
          <Input
            label="Email"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            label="Contraseña (mínimo 8)"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Select label="Rol" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="primary" loading={creating}>
            {creating ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Buscar por email"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:col-span-2"
        />
        <Select
          label="Filtrar por rol"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-small text-danger">
          {error}
        </p>
      )}

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={<UsersIcon className="h-6 w-6" />} message="No hay usuarios que coincidan." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rol</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Registro</th>
                <th scope="col" className="px-4 py-3 font-semibold">Pedidos</th>
                <th scope="col" className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const busy = busyId === user.id;

                return (
                  <tr key={user.id} className="border-b border-border align-top last:border-0">
                    <td className="px-4 py-3 font-medium">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "admin" ? "info" : "neutral"}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.active ? "success" : "danger"}>
                        {user.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">{user.orderCount}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <p className="text-xs text-muted">No puedes modificar tu propia cuenta</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            aria-label={`Rol de ${user.email}`}
                            value={user.role}
                            disabled={busy}
                            onChange={(e) => handleRoleChange(user, e.target.value as Role)}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="sm"
                            variant={user.active ? "danger" : "primary"}
                            disabled={busy}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setResetId(resetId === user.id ? null : user.id);
                              setResetValue("");
                            }}
                          >
                            Restablecer contraseña
                          </Button>
                        </div>
                      )}

                      {resetId === user.id && !isSelf && (
                        <form
                          onSubmit={(e) => handleResetPassword(e, user)}
                          className="mt-3 flex flex-wrap items-end gap-2"
                        >
                          <Input
                            label="Nueva contraseña (mínimo 8)"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={resetValue}
                            onChange={(e) => setResetValue(e.target.value)}
                          />
                          <Button type="submit" size="sm" variant="primary" loading={busy}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setResetId(null)}>
                            Cancelar
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-small text-muted">
            Página {data.page} de {data.totalPages} · {data.total} usuarios
          </span>
          <Button variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

export default Users;
