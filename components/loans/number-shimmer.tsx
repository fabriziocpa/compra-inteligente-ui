// Barra shimmer que ocupa el espacio del número mientras el monto se
// calcula/carga: una línea de luz barre el ancho reservado (estilo banca).
// La animación vive en globals.css (.money-shimmer).
export function NumberShimmer({
  className = "",
  widthClass = "w-24",
}: {
  className?: string;
  widthClass?: string;
}) {
  return (
    <span
      aria-hidden
      className={`money-shimmer inline-block h-[1em] align-middle ${widthClass} ${className}`}
    />
  );
}
