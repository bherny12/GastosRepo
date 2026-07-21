"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Home,
  Landmark,
  Package,
  PiggyBank,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AuthGate, useAuth } from "@/context/auth-context";
import { FinanceProvider } from "@/context/finance-context";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: Home },
  { href: "/registrar/gasto", label: "Gasto", icon: ReceiptText },
  { href: "/registrar/ingreso", label: "Ingreso", icon: CircleDollarSign },
  { href: "/esika/venta", label: "Venta Ésika", icon: ShoppingBag },
  { href: "/historial", label: "Historial", icon: ClipboardList }
];

const secondaryNav: NavItem[] = [
  { href: "/presupuestos", label: "Presupuestos", icon: ChartNoAxesCombined },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/cuentas", label: "Cuentas", icon: WalletCards },
  { href: "/pagos-recurrentes", label: "Pagos recurrentes", icon: CreditCard },
  { href: "/metas", label: "Metas de ahorro", icon: PiggyBank },
  { href: "/esika/productos", label: "Productos Ésika", icon: Package },
  { href: "/esika/clientes", label: "Clientes Ésika", icon: UsersRound },
  { href: "/pagos-pendientes", label: "Pagos pendientes", icon: Landmark },
  { href: "/reportes", label: "Reportes", icon: ChartNoAxesCombined },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/configuracion", label: "Configuración", icon: Settings }
];

export function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <FinanceProvider>
        <AppShell>{children}</AppShell>
      </FinanceProvider>
    </AuthGate>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const allNav = [...primaryNav, ...secondaryNav];

  return (
    <div className="min-h-screen bg-cream text-ink dark:bg-[#20191b] dark:text-cream">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-ink/10 bg-white px-4 py-5 shadow-sm lg:flex dark:bg-[#2a2124]">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-linen/70 dark:hover:bg-white/5">
          <span className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-soft">
            <Image src="/logo.png" alt="Los gastos de Doña Mónica" fill sizes="56px" className="object-cover" priority />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-tight">Los gastos de</span>
            <span className="block font-display text-lg font-semibold leading-tight">Doña Mónica</span>
          </span>
        </Link>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Menú principal">
          {allNav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
          ))}
        </nav>

        <div className="mt-4 rounded-lg bg-linen p-3 dark:bg-white/5">
          <p className="text-sm font-semibold">{profile?.fullName || "Doña Mónica"}</p>
          <p className="text-xs text-ink/60 dark:text-cream/60">Acceso directo sin contraseña</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur lg:hidden dark:bg-[#20191b]/95">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="relative h-11 w-11 overflow-hidden rounded-xl shadow-soft">
            <Image src="/logo.png" alt="Los gastos de Doña Mónica" fill sizes="44px" className="object-cover" priority />
          </span>
          <span className="font-display text-lg font-semibold">Doña Mónica</span>
        </Link>
        <Link href="/notificaciones" className="touch-target grid place-items-center rounded-lg bg-white text-wine shadow-sm" aria-label="Ver notificaciones">
          <Bell size={20} />
        </Link>
      </header>

      <main className="safe-bottom mx-auto w-full max-w-7xl px-4 py-5 lg:ml-72 lg:px-8 lg:py-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink/10 bg-white px-1 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(47,36,39,0.10)] lg:hidden" aria-label="Navegación inferior">
        {primaryNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.72rem] font-semibold ${active ? "bg-linen text-wine" : "text-ink/65"}`}>
              <Icon size={20} aria-hidden="true" />
              <span className="leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-wine text-white" : "text-ink/75 hover:bg-linen dark:text-cream/75 dark:hover:bg-white/5"}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

export { primaryNav, secondaryNav };


