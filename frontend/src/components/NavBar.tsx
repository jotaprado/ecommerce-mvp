import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Package, ShoppingCart, User, X } from "lucide-react";
import { STORE_NAME } from "../config";
import { clearToken, getCurrentUserRole, getToken } from "../lib/auth";
import { getCartCount, notifyCartUpdated, onCartUpdated } from "../lib/cart";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-small font-medium transition-colors ${
    isActive ? "bg-accent-blue-soft text-accent-blue" : "text-text-primary hover:bg-slate-100"
  }`;

function NavBar() {
  const [cartCount, setCartCount] = useState(0);
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [role, setRole] = useState(getCurrentUserRole());
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const canSeePanel = role === "support" || role === "admin";

  useEffect(() => {
    function refresh() {
      setLoggedIn(!!getToken());
      setRole(getCurrentUserRole());
      getCartCount()
        .then(setCartCount)
        .catch(() => setCartCount(0));
    }

    refresh();
    return onCartUpdated(refresh);
  }, []);

  // Cierra los menús al cambiar de página.
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;

    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [userMenuOpen]);

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setRole(null);
    setUserMenuOpen(false);
    setMenuOpen(false);
    notifyCartUpdated();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="text-heading font-bold text-text-primary">
          {STORE_NAME}
        </Link>

        {/* Escritorio */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={linkClass}>
            Catálogo
          </NavLink>
          <NavLink to="/seguimiento" className={linkClass}>
            Rastrear pedido
          </NavLink>
          {loggedIn && (
            <NavLink to="/orders" className={linkClass}>
              Mis pedidos
            </NavLink>
          )}
          {canSeePanel && (
            <NavLink to="/panel" className={linkClass}>
              Panel
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            aria-label={`Carrito, ${cartCount} artículos`}
            className="relative rounded-lg p-2 text-text-primary hover:bg-slate-100"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-blue px-1 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Menú de usuario (escritorio) */}
          <div className="relative hidden md:block" ref={userMenuRef}>
            {loggedIn ? (
              <>
                <button
                  onClick={() => setUserMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-small font-medium text-text-primary hover:bg-slate-100"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Mi cuenta
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 rounded-card border border-border bg-surface p-1 shadow-card-hover"
                  >
                    <Link
                      role="menuitem"
                      to="/orders"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-small hover:bg-slate-100"
                    >
                      <Package className="h-4 w-4" aria-hidden="true" /> Mis pedidos
                    </Link>
                    {canSeePanel && (
                      <Link
                        role="menuitem"
                        to="/panel"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-small hover:bg-slate-100"
                      >
                        <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Panel
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-small hover:bg-slate-100"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/login" className={linkClass({ isActive: false })}>
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-accent-blue px-3 py-2 text-small font-semibold text-white hover:bg-accent-blue-hover"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Botón de menú móvil */}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-text-primary hover:bg-slate-100 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Menú móvil colapsable */}
      {menuOpen && (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={linkClass}>
              Catálogo
            </NavLink>
            <NavLink to="/seguimiento" className={linkClass}>
              Rastrear pedido
            </NavLink>
            {loggedIn ? (
              <>
                <NavLink to="/orders" className={linkClass}>
                  Mis pedidos
                </NavLink>
                {canSeePanel && (
                  <NavLink to="/panel" className={linkClass}>
                    Panel
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-left text-small font-medium text-text-primary hover:bg-slate-100"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Iniciar sesión
                </NavLink>
                <NavLink to="/register" className={linkClass}>
                  Registrarse
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default NavBar;
