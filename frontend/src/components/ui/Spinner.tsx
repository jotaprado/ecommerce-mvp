import { Loader2 } from "lucide-react";

function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return <Loader2 role="status" aria-label="Cargando" className={`animate-spin text-accent-blue ${className}`} />;
}

export default Spinner;
