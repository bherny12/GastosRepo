import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center text-ink">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl shadow-soft">
          <Image src="/logo.png" alt="Los gastos de Doña Mónica" fill sizes="96px" className="object-cover" priority />
        </div>
        <div>
          <p className="font-display text-2xl font-semibold">Los gastos de Doña Mónica</p>
          <p className="mt-2 text-sm text-ink/70">Preparando sus cuentas con calma.</p>
        </div>
      </div>
    </main>
  );
}
