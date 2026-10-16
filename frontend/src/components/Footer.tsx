import { Link } from "react-router-dom";
import { STORE_NAME } from "../config";

function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-bold text-text-primary">{STORE_NAME}</p>
          <p className="text-small text-muted">Proyecto MVP de demostración</p>
        </div>
        <nav aria-label="Enlaces del pie de página" className="flex gap-4 text-small">
          <Link to="/" className="text-accent-blue hover:underline">
            Catálogo
          </Link>
          <Link to="/orders" className="text-accent-blue hover:underline">
            Mis pedidos
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
