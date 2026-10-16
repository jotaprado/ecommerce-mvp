import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import { buttonClasses } from "../components/ui/Button";

function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <EmptyState
        icon={<Compass className="h-6 w-6" />}
        message="404 · No encontramos la página que buscas."
        action={
          <Link to="/" className={buttonClasses("primary")}>
            Ir al catálogo
          </Link>
        }
      />
    </div>
  );
}

export default NotFound;
