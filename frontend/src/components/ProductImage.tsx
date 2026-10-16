import { useState } from "react";
import {
  Cpu,
  Headphones,
  Laptop,
  Monitor,
  Mouse,
  Package,
  Smartphone,
  Tablet,
  Watch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  laptops: Laptop,
  celulares: Smartphone,
  audio: Headphones,
  monitores: Monitor,
  perifericos: Mouse,
  tablets: Tablet,
  componentes: Cpu,
  wearables: Watch,
};

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
}

// Muestra la imagen del producto; si falta o falla al cargar, un respaldo por categoría.
function ProductImage({ src, alt, category, className = "" }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;

  if (showFallback) {
    const Icon = (category && CATEGORY_ICONS[category]) || Package;
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-accent-blue-soft to-slate-200 text-slate-400 ${className}`}
      >
        <Icon className="h-1/3 w-1/3" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={`bg-slate-100 object-cover ${className}`}
    />
  );
}

export default ProductImage;
