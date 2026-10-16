import { Link, useLocation } from "react-router-dom";
import { getCurrentUserRole } from "../lib/auth";

function tabClass(active: boolean) {
  return `px-4 py-2.5 text-small font-semibold border-b-2 transition-colors ${
    active
      ? "border-accent-blue text-accent-blue"
      : "border-transparent text-muted hover:text-text-primary"
  }`;
}

function PanelNav() {
  const { pathname } = useLocation();
  const role = getCurrentUserRole();

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
      <Link to="/panel" className={tabClass(pathname === "/panel")}>
        Órdenes
      </Link>
      {role === "admin" && (
        <>
          <Link to="/panel/products" className={tabClass(pathname === "/panel/products")}>
            Productos
          </Link>
          <Link to="/panel/dashboard" className={tabClass(pathname === "/panel/dashboard")}>
            Dashboard
          </Link>
        </>
      )}
    </div>
  );
}

export default PanelNav;
