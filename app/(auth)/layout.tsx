import { Brand } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      {/* Panel de marca / propuesta de valor */}
      <div className="bg-sidebar text-sidebar-foreground hidden flex-col justify-between p-10 lg:flex">
        <Brand />
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Simula créditos vehiculares con la modalidad Compra Inteligente.
          </h1>
          <p className="text-sidebar-foreground/70 max-w-md text-pretty">
            Plan de pagos por el método francés, cuota balón, indicadores de
            transparencia (TCEA), TIR y VAN — todo en una sola vista lista para
            presentar al cliente.
          </p>
        </div>
        <p className="text-sidebar-foreground/50 text-xs">
          SI642 · Finanzas e Ingeniería Económica
        </p>
      </div>

      {/* Panel del formulario */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
