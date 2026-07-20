import Image from "next/image";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center text-ink">
      <section className="max-w-sm">
        <div className="mx-auto mb-5 h-24 w-24 overflow-hidden rounded-2xl shadow-soft">
          <Image src="/logo.png" alt="Logo de Los gastos de Doña Mónica" width={96} height={96} className="h-full w-full object-cover" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Sin conexión</h1>
        <p className="mt-3 text-base text-ink/75">
          Puede seguir revisando lo guardado en este dispositivo. Los formularios pendientes se sincronizarán cuando vuelva internet.
        </p>
      </section>
    </main>
  );
}
