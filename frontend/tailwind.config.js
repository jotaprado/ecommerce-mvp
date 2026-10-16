/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Colores originales (se conservan para no romper clases existentes)
        "bg-neutral": "#F2F3F5",
        "text-primary": "#1E293B",
        "accent-blue": {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
          soft: "#EFF6FF",
        },
        // Solo para acciones de compra (añadir al carrito, pagar)
        "cta-green": {
          DEFAULT: "#10B981",
          hover: "#059669",
          active: "#047857",
        },
        // Tokens semánticos
        surface: "#FFFFFF",
        muted: "#64748B",
        border: "#E2E8F0",
        danger: "#DC2626",
        success: "#059669",
        warning: "#D97706",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        title: ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        heading: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        card: "0.75rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 8px 24px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};
