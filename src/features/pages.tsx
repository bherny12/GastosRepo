"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  HandCoins,
  MessageCircle,
  Package,
  Plus,
  ReceiptText,
  Save,
  Search,
  Sparkles,
  Trash2,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, EmptyState, PageHeader, ProgressBar, Surface } from "@/components/ui/surface";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAuth } from "@/context/auth-context";
import { useFinance } from "@/context/finance-context";
import { buildAdvice, balanceEvolution, calculateMetrics, categoryExpenseSeries, esikaMonthlySeries, getDailyPhrase, monthSeries, sum, weeklyExpenseSeries } from "@/lib/calculations";
import { esikaProductCategories, necessityLabels, paymentMethods, paymentStatusLabels, recurringStatusLabels } from "@/lib/defaults";
import { endOfLocalMonth, formatCurrency, formatDate, formatDateTime, getGreeting, joinDateAndTime, startOfLocalMonth, toInputDate, toInputTime } from "@/lib/formatters";
import { exportTransactionsCsv, exportTransactionsPdf } from "@/lib/report-export";
import { getFileView } from "@/services/supabase-service";
import { queueOperation, readQueue } from "@/services/offline";
import { removeDevicePin, saveDevicePin } from "@/services/pin";
import type { Account, Category, EsikaSale, FinanceData, Transaction, WithDocument } from "@/types/domain";
import {
  accountSchema,
  budgetSchema,
  esikaCustomerSchema,
  esikaProductSchema,
  esikaSaleSchema,
  profileSchema,
  recurringPaymentSchema,
  savingsContributionSchema,
  savingsGoalSchema,
  transactionSchema,
  transferSchema
} from "@/validations/schemas";

const chartColors = ["#8B3A4A", "#4E7C59", "#B98A2F", "#3A6EA5", "#D45B4A", "#C85A6A", "#6B7280", "#8B5E3C"];

type MovementFilter = "all" | "income" | "expense";

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Revise los datos ingresados.";
}

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formNumber(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}

function categoriesFor(data: FinanceData, type: "income" | "expense") {
  return data.categories.filter((category) => category.isActive && (category.type === type || category.type === "both" || (type === "income" && category.name === "Ventas de Ésika")));
}

function categoryName(data: FinanceData, id?: string) {
  return data.categories.find((category) => category.$id === id)?.name ?? "Sin categoría";
}

function accountName(data: FinanceData, id?: string) {
  return data.accounts.find((account) => account.$id === id)?.name ?? "Sin cuenta";
}

function esikaIncomeCategoryId(data: FinanceData) {
  return data.categories.find((category) => category.name === "Ventas de Ésika")?.$id ?? "";
}

function StatCard({ label, value, tone, helper }: { label: string; value: string; tone?: "income" | "expense" | "info" | "gold"; helper?: string }) {
  return (
    <Surface className="min-h-32">
      <p className="text-sm font-semibold text-ink/60">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${tone === "income" ? "text-moss" : tone === "expense" ? "text-coral" : tone === "info" ? "text-info" : tone === "gold" ? "text-gold" : "text-ink"}`}>{value}</p>
      {helper ? <p className="mt-2 text-xs text-ink/55">{helper}</p> : null}
    </Surface>
  );
}

function ChartShell({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <Surface className="min-h-80">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <div className="mt-4 h-64">
        {empty ? <EmptyState title="Aún no hay datos suficientes" description="Cuando registre movimientos, este gráfico se actualizará automáticamente." /> : children}
      </div>
    </Surface>
  );
}

export function DashboardPage() {
  const { profile } = useAuth();
  const { data, loading } = useFinance();
  const metrics = useMemo(() => calculateMetrics(data), [data]);
  const monthly = useMemo(() => monthSeries(data.transactions), [data.transactions]);
  const expenses = useMemo(() => categoryExpenseSeries(data.transactions, data.categories), [data.transactions, data.categories]);
  const evolution = useMemo(() => balanceEvolution(data.transactions), [data.transactions]);
  const week = useMemo(() => weeklyExpenseSeries(data.transactions), [data.transactions]);
  const esika = useMemo(() => esikaMonthlySeries(data.esikaSales, data.esikaSaleItems), [data.esikaSaleItems, data.esikaSales]);
  const advice = useMemo(() => buildAdvice(data), [data]);
  const pendingQueue = typeof window === "undefined" ? [] : readQueue();

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-soft">
            <Image src="/logo.png" alt="Los gastos de Doña Mónica" fill sizes="80px" className="object-cover" priority />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-wine">{getDailyPhrase()}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{getGreeting(profile?.fullName || "Doña Mónica")}</h1>
            <p className="mt-2 text-sm text-ink/65">Aquí está el resumen claro de su dinero, pagos familiares y ventas de Ésika.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <QuickAction href="/registrar/gasto" icon={<ReceiptText size={20} />} label="Registrar gasto" tone="expense" />
          <QuickAction href="/registrar/ingreso" icon={<ArrowDownLeft size={20} />} label="Registrar ingreso" tone="income" />
          <QuickAction href="/esika/venta" icon={<Sparkles size={20} />} label="Venta de Ésika" tone="wine" />
          <QuickAction href="/pagos-recurrentes" icon={<CalendarDays size={20} />} label="Pago pendiente" tone="gold" />
          <QuickAction href="/reportes" icon={<Eye size={20} />} label="Ver resumen del mes" tone="info" />
        </div>
        {pendingQueue.length > 0 ? <p className="mt-4 rounded-lg bg-gold/15 px-4 py-3 text-sm text-ink">Tiene {pendingQueue.length} formulario{pendingQueue.length === 1 ? "" : "s"} guardado{pendingQueue.length === 1 ? "" : "s"} en este dispositivo para sincronizar.</p> : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dinero disponible" value={formatCurrency(metrics.availableMoney)} helper="Suma de cuentas activas" />
        <StatCard label="Ingresos del mes" value={formatCurrency(metrics.monthlyIncome)} tone="income" />
        <StatCard label="Gastos del mes" value={formatCurrency(metrics.monthlyExpenses)} tone="expense" />
        <StatCard label="Balance del mes" value={formatCurrency(metrics.monthlyBalance)} tone={metrics.monthlyBalance >= 0 ? "income" : "expense"} />
        <StatCard label="Ventas de Ésika" value={formatCurrency(metrics.esikaSales)} tone="gold" />
        <StatCard label="Ganancia Ésika" value={formatCurrency(metrics.esikaProfit)} tone="income" />
        <StatCard label="Pagos próximos" value={String(metrics.upcomingPayments)} tone="info" />
        <StatCard label="Deudas pendientes" value={formatCurrency(metrics.pendingDebts)} tone="expense" />
        <StatCard label="Presupuesto restante" value={formatCurrency(metrics.budgetRemaining)} tone={metrics.budgetRemaining >= 0 ? "income" : "expense"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartShell title="Ingresos contra gastos por mes" empty={monthly.every((row) => row.income === 0 && row.expense === 0)}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /><Bar dataKey="income" name="Ingresos" fill="#4E7C59" radius={[6, 6, 0, 0]} /><Bar dataKey="expense" name="Gastos" fill="#D45B4A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartShell>
        <ChartShell title="Gastos por categoría" empty={expenses.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenses} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>{expenses.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /></PieChart></ResponsiveContainer>
        </ChartShell>
        <ChartShell title="Evolución del saldo" empty={evolution.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={evolution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Line type="monotone" dataKey="saldo" stroke="#8B3A4A" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>
        </ChartShell>
        <ChartShell title="Gastos semanales" empty={week.every((row) => row.gastos === 0)}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={week}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area dataKey="gastos" fill="#D45B4A" fillOpacity={0.25} stroke="#D45B4A" /></AreaChart></ResponsiveContainer>
        </ChartShell>
        <ChartShell title="Ventas y ganancias de Ésika" empty={esika.every((row) => row.ventas === 0 && row.ganancia === 0)}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={esika}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Legend /><Bar dataKey="ventas" fill="#8B3A4A" name="Ventas" radius={[6, 6, 0, 0]} /><Bar dataKey="ganancia" fill="#B98A2F" name="Ganancia" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartShell>
        <Surface>
          <h2 className="text-base font-bold text-ink">Consejos para Doña Mónica</h2>
          <div className="mt-4 space-y-3">
            {advice.map((item) => <p key={item} className="rounded-lg bg-linen px-4 py-3 text-sm text-ink/80">{item}</p>)}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, tone }: { href: string; icon: React.ReactNode; label: string; tone: "expense" | "income" | "wine" | "gold" | "info" }) {
  const colors = {
    expense: "bg-coral text-white",
    income: "bg-moss text-white",
    wine: "bg-wine text-white",
    gold: "bg-gold text-white",
    info: "bg-info text-white"
  };
  return <Link href={href} className={`flex min-h-16 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-sm ${colors[tone]}`}>{icon}<span>{label}</span></Link>;
}

export function TransactionEntryPage({ type }: { type: "income" | "expense" }) {
  const router = useRouter();
  const { data, saving, addTransaction } = useFinance();
  const [quick, setQuick] = useState(type === "expense");
  const [receipt, setReceipt] = useState<File | undefined>();
  const [error, setError] = useState("");
  const categories = categoriesFor(data, type);
  const title = type === "income" ? "Registrar ingreso" : "Registrar gasto";
  const defaultCategory = categories[0]?.$id ?? "";
  const defaultAccount = data.accounts.find((account) => account.isActive)?.$id ?? "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const now = new Date();
    const input = {
      type,
      amount: formNumber(formData, "amount"),
      categoryId: formString(formData, "categoryId") || defaultCategory,
      accountId: formString(formData, "accountId") || defaultAccount,
      description: formString(formData, "description"),
      transactionDate: joinDateAndTime(formString(formData, "date") || toInputDate(now), formString(formData, "time") || toInputTime(now)),
      paymentMethod: formString(formData, "paymentMethod") || "Efectivo",
      necessityLevel: type === "expense" ? (formString(formData, "necessityLevel") as "necessary" | "important" | "avoidable") : undefined,
      isRecurring: formData.get("isRecurring") === "on",
      recurringPaymentId: "",
      notes: formString(formData, "notes"),
      tags: formString(formData, "tags").split(",").map((tag) => tag.trim()).filter(Boolean)
    };
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    if (!navigator.onLine && !receipt) {
      queueOperation({ type: "transaction", payload: parsed.data });
      router.push("/historial");
      return;
    }
    const ok = await addTransaction(parsed.data, receipt);
    if (ok) router.push("/dashboard");
  }

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={type === "expense" ? "Registre desde un pasaje pequeño hasta un pago familiar importante." : "Anote cada ingreso y actualice su saldo automáticamente."} />
      <Surface>
        <div className="mb-4 flex rounded-lg bg-linen p-1">
          <button type="button" onClick={() => setQuick(true)} className={`flex-1 rounded-md px-4 py-3 text-sm font-bold ${quick ? "bg-white text-wine shadow-sm" : "text-ink/65"}`}>Registro rápido</button>
          <button type="button" onClick={() => setQuick(false)} className={`flex-1 rounded-md px-4 py-3 text-sm font-bold ${!quick ? "bg-white text-wine shadow-sm" : "text-ink/65"}`}>Registro completo</button>
        </div>
        {data.accounts.length === 0 || categories.length === 0 ? (
          <EmptyState title="Primero cree una cuenta y una categoría" description="Así cada movimiento podrá afectar correctamente el saldo." action={<Link href="/cuentas"><Button>Ir a cuentas</Button></Link>} />
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            {error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-2">{error}</p> : null}
            <Field label="Monto"><Input name="amount" inputMode="decimal" type="number" min="0" step="0.01" placeholder="0.00" required /></Field>
            <Field label="Categoría"><Select name="categoryId" defaultValue={defaultCategory}>{categories.map((category) => <option key={category.$id} value={category.$id}>{category.name}</option>)}</Select></Field>
            <Field label="Descripción"><Input name="description" placeholder={type === "expense" ? "Ej. Pasaje, luz, universidad" : "Ej. Venta, apoyo, transferencia"} required /></Field>
            <Field label="Cuenta o billetera"><Select name="accountId" defaultValue={defaultAccount}>{data.accounts.filter((account) => account.isActive).map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select></Field>
            {!quick ? (
              <>
                <Field label="Fecha"><Input name="date" type="date" defaultValue={toInputDate()} /></Field>
                <Field label="Hora"><Input name="time" type="time" defaultValue={toInputTime()} /></Field>
                <Field label={type === "income" ? "Método de recepción" : "Método de pago"}><Select name="paymentMethod" defaultValue="Efectivo">{paymentMethods.map((method) => <option key={method}>{method}</option>)}</Select></Field>
                {type === "expense" ? <Field label="Nivel"><Select name="necessityLevel" defaultValue="necessary">{Object.entries(necessityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field> : null}
                <Field label="Comprobante o fotografía" hint="Se guardará en Supabase Storage"><Input type="file" accept="image/*,application/pdf" onChange={(event) => setReceipt(event.target.files?.[0])} /></Field>
                <Field label="Etiquetas"><Input name="tags" placeholder="familia, casa, universidad" /></Field>
                <label className="flex min-h-12 items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink"><input name="isRecurring" type="checkbox" className="h-5 w-5" /> Es recurrente</label>
                <div className="md:col-span-2"><Field label="Notas adicionales"><Textarea name="notes" placeholder="Detalle útil para recordar después" /></Field></div>
              </>
            ) : null}
            <div className="md:col-span-2"><Button disabled={saving} size="lg" icon={<Save size={18} />} className="w-full sm:w-auto">{saving ? "Guardando" : "Guardar movimiento"}</Button></div>
          </form>
        )}
      </Surface>
    </div>
  );
}

export function HistoryPage() {
  const { data, saving, removeTransaction, copyTransaction } = useFinance();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MovementFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [onlyReceipt, setOnlyReceipt] = useState(false);
  const [visible, setVisible] = useState(25);
  const [toDelete, setToDelete] = useState<WithDocument<Transaction> | null>(null);
  const filtered = data.transactions.filter((transaction) => {
    const text = `${transaction.description} ${transaction.notes ?? ""}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (type === "all" || transaction.type === type) && (categoryId === "all" || transaction.categoryId === categoryId) && (accountId === "all" || transaction.accountId === accountId) && (!onlyReceipt || Boolean(transaction.receiptFileId));
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Historial de movimientos" description="Busque, filtre, duplique o elimine registros con confirmación." />
      <Surface>
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Buscar"><div className="relative"><Search className="absolute left-3 top-3.5 text-ink/40" size={18} /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Descripción o nota" /></div></Field>
          <Field label="Tipo"><Select value={type} onChange={(event) => setType(event.target.value as MovementFilter)}><option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></Select></Field>
          <Field label="Categoría"><Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">Todas</option>{data.categories.map((category) => <option key={category.$id} value={category.$id}>{category.name}</option>)}</Select></Field>
          <Field label="Cuenta"><Select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="all">Todas</option>{data.accounts.map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select></Field>
          <label className="mt-7 flex min-h-12 items-center gap-3 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold"><input type="checkbox" checked={onlyReceipt} onChange={(event) => setOnlyReceipt(event.target.checked)} className="h-5 w-5" /> Con comprobante</label>
        </div>
      </Surface>
      <div className="space-y-3">
        {filtered.length === 0 ? <EmptyState title="No hay movimientos con esos filtros" description="Ajuste la búsqueda o registre un nuevo movimiento." /> : filtered.slice(0, visible).map((transaction) => (
          <Surface key={transaction.$id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><Badge tone={transaction.type === "income" ? "success" : "danger"}>{transaction.type === "income" ? "Ingreso" : "Gasto"}</Badge><Badge>{categoryName(data, transaction.categoryId)}</Badge><span className="text-xs text-ink/55">{formatDateTime(transaction.transactionDate)}</span></div>
              <p className="mt-2 font-semibold text-ink">{transaction.description}</p>
              <p className="text-sm text-ink/60">{accountName(data, transaction.accountId)} · {transaction.paymentMethod}</p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <p className={`text-xl font-bold ${transaction.type === "income" ? "text-moss" : "text-coral"}`}>{transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/movimientos/${transaction.$id}`}><Button tone="secondary" size="sm" icon={<Eye size={16} />}>Detalle</Button></Link>
                {transaction.receiptFileId ? <a href={getFileView(transaction.receiptFileId)} target="_blank" rel="noreferrer"><Button tone="secondary" size="sm" icon={<Download size={16} />}>Comprobante</Button></a> : null}
                <Button tone="secondary" size="sm" icon={<Copy size={16} />} disabled={saving} onClick={() => copyTransaction(transaction)}>Duplicar</Button>
                <Button tone="danger" size="sm" icon={<Trash2 size={16} />} disabled={saving} onClick={() => setToDelete(transaction)}>Eliminar</Button>
              </div>
            </div>
          </Surface>
        ))}
        {visible < filtered.length ? <Button tone="secondary" className="w-full" onClick={() => setVisible((value) => value + 25)}>Cargar más movimientos</Button> : null}
      </div>
      <ConfirmDialog open={Boolean(toDelete)} title="Eliminar movimiento" description="Esta acción también recalculará el saldo de la cuenta afectada." confirmLabel="Eliminar" onCancel={() => setToDelete(null)} onConfirm={async () => { if (toDelete) await removeTransaction(toDelete); setToDelete(null); }} />
    </div>
  );
}

export function MovementDetailPage({ id }: { id: string }) {
  const { data } = useFinance();
  const transaction = data.transactions.find((item) => item.$id === id);
  if (!transaction) return <EmptyState title="Movimiento no encontrado" description="Puede que el registro haya sido eliminado o aún se esté cargando." action={<Link href="/historial"><Button>Volver al historial</Button></Link>} />;
  return (
    <div className="space-y-5">
      <PageHeader title="Detalle de movimiento" action={<Link href="/historial"><Button tone="secondary">Volver</Button></Link>} />
      <Surface>
        <div className="grid gap-4 md:grid-cols-2">
          <Detail label="Tipo" value={transaction.type === "income" ? "Ingreso" : "Gasto"} />
          <Detail label="Monto" value={formatCurrency(transaction.amount)} />
          <Detail label="Categoría" value={categoryName(data, transaction.categoryId)} />
          <Detail label="Cuenta" value={accountName(data, transaction.accountId)} />
          <Detail label="Fecha y hora" value={formatDateTime(transaction.transactionDate)} />
          <Detail label="Método" value={transaction.paymentMethod} />
          <Detail label="Descripción" value={transaction.description} />
          <Detail label="Notas" value={transaction.notes || "Sin notas"} />
        </div>
        {transaction.receiptFileId ? <a className="mt-5 inline-flex" href={getFileView(transaction.receiptFileId)} target="_blank" rel="noreferrer"><Button tone="secondary" icon={<Download size={18} />}>Ver comprobante</Button></a> : null}
      </Surface>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-linen p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/50">{label}</p><p className="mt-1 font-semibold text-ink">{value}</p></div>;
}

export function BudgetsPage() {
  const { data, saving, addBudget } = useFinance();
  const [error, setError] = useState("");
  const expenseCategories = categoriesFor(data, "expense");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = budgetSchema.safeParse({
      categoryId: formString(formData, "categoryId"),
      month: formNumber(formData, "month"),
      year: formNumber(formData, "year"),
      amount: formNumber(formData, "amount"),
      alertPercentage: formNumber(formData, "alertPercentage") || 80
    });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addBudget(parsed.data)) event.currentTarget.reset();
  }
  const now = new Date();
  return (
    <div className="space-y-5">
      <PageHeader title="Presupuestos" description="Defina límites por categoría y vea el avance con barras fáciles de entender." />
      <Surface>
        <form className="grid gap-4 md:grid-cols-5" onSubmit={onSubmit}>
          {error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-5">{error}</p> : null}
          <Field label="Categoría"><Select name="categoryId" required>{expenseCategories.map((category) => <option key={category.$id} value={category.$id}>{category.name}</option>)}</Select></Field>
          <Field label="Mes"><Input name="month" type="number" min="1" max="12" defaultValue={now.getMonth() + 1} /></Field>
          <Field label="Año"><Input name="year" type="number" min="2020" defaultValue={now.getFullYear()} /></Field>
          <Field label="Monto"><Input name="amount" type="number" min="0" step="0.01" required /></Field>
          <Field label="Alerta %"><Input name="alertPercentage" type="number" min="50" max="100" defaultValue={80} /></Field>
          <div className="md:col-span-5"><Button disabled={saving} icon={<Save size={18} />}>Guardar presupuesto</Button></div>
        </form>
      </Surface>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.budgets.length === 0 ? <EmptyState title="Aún no hay presupuestos" description="Cree el primer presupuesto para controlar una categoría importante." /> : data.budgets.map((budget) => {
          const used = sum(data.transactions.filter((transaction) => transaction.type === "expense" && transaction.categoryId === budget.categoryId && new Date(transaction.transactionDate).getMonth() + 1 === budget.month && new Date(transaction.transactionDate).getFullYear() === budget.year).map((transaction) => transaction.amount));
          const percent = budget.amount > 0 ? (used / budget.amount) * 100 : 0;
          return (
            <Surface key={budget.$id}>
              <div className="flex items-start justify-between gap-4"><div><p className="font-bold text-ink">{categoryName(data, budget.categoryId)}</p><p className="text-sm text-ink/60">{budget.month}/{budget.year}</p></div><Badge tone={percent >= 100 ? "danger" : percent >= budget.alertPercentage ? "gold" : "success"}>{Math.round(percent)} % usado</Badge></div>
              <div className="mt-4"><ProgressBar value={percent} tone={percent >= 100 ? "danger" : percent >= budget.alertPercentage ? "gold" : "success"} /></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm"><Detail label="Asignado" value={formatCurrency(budget.amount)} /><Detail label="Utilizado" value={formatCurrency(used)} /><Detail label="Restante" value={formatCurrency(budget.amount - used)} /></div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { data } = useFinance();
  const [selected, setSelected] = useState(toInputDate());
  const date = new Date(selected);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const days = Array.from({ length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index + 1));
  const selectedRecords = data.transactions.filter((transaction) => toInputDate(new Date(transaction.transactionDate)) === selected);
  const selectedPayments = data.recurringPayments.filter((payment) => toInputDate(new Date(payment.nextDueDate)) === selected);
  const selectedSales = data.esikaSales.filter((sale) => sale.promisedPaymentDate && toInputDate(new Date(sale.promisedPaymentDate)) === selected);
  return (
    <div className="space-y-5">
      <PageHeader title="Calendario financiero" description="Visualice pagos recurrentes, cobros de Ésika y movimientos por fecha." />
      <Surface>
        <div className="mb-4 flex items-center justify-between gap-3"><Input type="month" value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`} onChange={(event) => setSelected(`${event.target.value}-01`)} /><Badge tone="info">{formatDate(selected)}</Badge></div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-ink/55">{["L", "M", "M", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: (first.getDay() + 6) % 7 }).map((_, index) => <span key={`blank-${index}`} />)}
          {days.map((day) => {
            const key = toInputDate(day);
            const hasItems = data.transactions.some((tx) => toInputDate(new Date(tx.transactionDate)) === key) || data.recurringPayments.some((payment) => toInputDate(new Date(payment.nextDueDate)) === key) || data.esikaSales.some((sale) => sale.promisedPaymentDate && toInputDate(new Date(sale.promisedPaymentDate)) === key);
            return <button key={key} onClick={() => setSelected(key)} className={`min-h-14 rounded-lg border text-sm font-bold ${selected === key ? "border-wine bg-wine text-white" : hasItems ? "border-gold bg-gold/15 text-ink" : "border-ink/10 bg-white text-ink"}`}>{day.getDate()}</button>;
          })}
        </div>
      </Surface>
      <Surface>
        <h2 className="font-bold">Detalle del día</h2>
        <div className="mt-4 space-y-3">
          {[...selectedPayments.map((payment) => ({ id: payment.$id, title: payment.name, amount: payment.amount, type: recurringStatusLabels[payment.status] })), ...selectedRecords.map((transaction) => ({ id: transaction.$id, title: transaction.description, amount: transaction.amount, type: transaction.type === "income" ? "Ingreso" : "Gasto" })), ...selectedSales.map((sale) => ({ id: sale.$id, title: "Cobro pendiente de Ésika", amount: sale.pendingAmount, type: paymentStatusLabels[sale.paymentStatus] }))].length === 0 ? <EmptyState title="Sin registros este día" description="Seleccione otra fecha o registre un movimiento." /> : null}
          {selectedPayments.map((payment) => <CalendarRow key={payment.$id} title={payment.name} amount={payment.amount} label={recurringStatusLabels[payment.status]} />)}
          {selectedRecords.map((transaction) => <CalendarRow key={transaction.$id} title={transaction.description} amount={transaction.amount} label={transaction.type === "income" ? "Ingreso" : "Gasto"} />)}
          {selectedSales.map((sale) => <CalendarRow key={sale.$id} title="Cobro pendiente de Ésika" amount={sale.pendingAmount} label={paymentStatusLabels[sale.paymentStatus]} />)}
        </div>
      </Surface>
    </div>
  );
}

function CalendarRow({ title, amount, label }: { title: string; amount: number; label: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-linen px-4 py-3"><div><p className="font-semibold">{title}</p><p className="text-sm text-ink/60">{label}</p></div><p className="font-bold">{formatCurrency(amount)}</p></div>;
}

export function AccountsPage() {
  const { data, saving, addAccount, addTransfer } = useFinance();
  const [error, setError] = useState("");
  const total = sum(data.accounts.filter((account) => account.isActive).map((account) => account.currentBalance));
  async function accountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = accountSchema.safeParse({ name: formString(fd, "name"), type: formString(fd, "type"), initialBalance: formNumber(fd, "initialBalance"), currentBalance: formNumber(fd, "initialBalance"), icon: "wallet", isActive: true });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addAccount(parsed.data)) event.currentTarget.reset();
  }
  async function transferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = transferSchema.safeParse({ sourceAccountId: formString(fd, "sourceAccountId"), destinationAccountId: formString(fd, "destinationAccountId"), amount: formNumber(fd, "amount"), transferDate: joinDateAndTime(formString(fd, "date") || toInputDate(), formString(fd, "time") || toInputTime()), notes: formString(fd, "notes") });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addTransfer(parsed.data)) event.currentTarget.reset();
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Cuentas y billeteras" description="Controle efectivo, Yape, Plin, banco, caja de Ésika y ahorros." />
      <StatCard label="Saldo total consolidado" value={formatCurrency(total)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface><h2 className="font-bold">Nueva cuenta</h2><form className="mt-4 grid gap-4" onSubmit={accountSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p> : null}<Field label="Nombre"><Input name="name" required /></Field><Field label="Tipo"><Select name="type"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Cuenta bancaria</option><option>Tarjeta</option><option>Caja de ventas de Ésika</option><option>Ahorros</option><option>Otra cuenta</option></Select></Field><Field label="Saldo inicial"><Input name="initialBalance" type="number" min="0" step="0.01" defaultValue={0} /></Field><Button disabled={saving}>Crear cuenta</Button></form></Surface>
        <Surface><h2 className="font-bold">Transferir entre cuentas</h2><form className="mt-4 grid gap-4" onSubmit={transferSubmit}><Field label="Origen"><Select name="sourceAccountId">{data.accounts.map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select></Field><Field label="Destino"><Select name="destinationAccountId">{data.accounts.map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select></Field><Field label="Monto"><Input name="amount" type="number" min="0" step="0.01" required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Fecha"><Input name="date" type="date" defaultValue={toInputDate()} /></Field><Field label="Hora"><Input name="time" type="time" defaultValue={toInputTime()} /></Field></div><Field label="Notas"><Input name="notes" /></Field><Button disabled={saving} icon={<ArrowRightLeft size={18} />}>Registrar transferencia</Button></form></Surface>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.accounts.map((account) => <StatCard key={account.$id} label={account.name} value={formatCurrency(account.currentBalance)} helper={account.type} />)}</div>
    </div>
  );
}

export function RecurringPaymentsPage() {
  const { data, saving, addRecurringPayment, payRecurring } = useFinance();
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = recurringPaymentSchema.safeParse({ name: formString(fd, "name"), amount: formNumber(fd, "amount"), categoryId: formString(fd, "categoryId"), accountId: formString(fd, "accountId"), frequency: formString(fd, "frequency"), dueDay: formNumber(fd, "dueDay"), nextDueDate: formString(fd, "nextDueDate"), priority: formString(fd, "priority"), reminderDays: formNumber(fd, "reminderDays"), status: "pending", notes: formString(fd, "notes") });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addRecurringPayment(parsed.data)) event.currentTarget.reset();
  }
  const defaultAccount = data.accounts[0]?.$id ?? "";
  return (
    <div className="space-y-5">
      <PageHeader title="Pagos recurrentes" description="Alquiler, universidades, servicios, cuotas y compromisos familiares." />
      <Surface><form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-3">{error}</p> : null}<Field label="Nombre"><Input name="name" placeholder="Alquiler, Universidad 1" required /></Field><Field label="Monto esperado"><Input name="amount" type="number" min="0" step="0.01" required /></Field><Field label="Categoría"><Select name="categoryId">{categoriesFor(data, "expense").map((category) => <option key={category.$id} value={category.$id}>{category.name}</option>)}</Select></Field><Field label="Cuenta sugerida"><Select name="accountId"><option value="">Elegir al pagar</option>{data.accounts.map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select></Field><Field label="Frecuencia"><Select name="frequency" defaultValue="monthly"><option value="weekly">Semanal</option><option value="biweekly">Quincenal</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option></Select></Field><Field label="Día de vencimiento"><Input name="dueDay" type="number" min="1" max="31" defaultValue={1} /></Field><Field label="Próximo vencimiento"><Input name="nextDueDate" type="date" defaultValue={toInputDate()} /></Field><Field label="Prioridad"><Select name="priority" defaultValue="high"><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></Select></Field><Field label="Recordar días antes"><Input name="reminderDays" type="number" min="0" max="30" defaultValue={3} /></Field><div className="md:col-span-3"><Field label="Notas"><Textarea name="notes" /></Field></div><div className="md:col-span-3"><Button disabled={saving}>Guardar compromiso</Button></div></form></Surface>
      <div className="grid gap-4 lg:grid-cols-2">{data.recurringPayments.length === 0 ? <EmptyState title="Sin compromisos registrados" description="Agregue los pagos importantes para recibir alertas claras." /> : data.recurringPayments.map((payment) => { const days = Math.ceil((new Date(payment.nextDueDate).getTime() - Date.now()) / 86400000); return <Surface key={payment.$id}><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{payment.name}</p><p className="text-sm text-ink/60">Vence: {formatDate(payment.nextDueDate)}</p></div><Badge tone={days <= 1 ? "danger" : days <= payment.reminderDays ? "gold" : "info"}>{days < 0 ? "Vencido" : days === 0 ? "Vence hoy" : `Vence en ${days} días`}</Badge></div><p className="mt-4 text-2xl font-bold">{formatCurrency(payment.amount)}</p><p className="mt-2 text-sm text-ink/65">Estado: {recurringStatusLabels[payment.status]}</p><Button className="mt-4" disabled={saving || !defaultAccount} onClick={() => payRecurring(payment, payment.accountId || defaultAccount)} icon={<CheckCircle2 size={18} />}>Registrar como pagado</Button></Surface>; })}</div>
    </div>
  );
}

export function SavingsGoalsPage() {
  const { data, saving, addSavingsGoal, addSavingsContribution } = useFinance();
  const [error, setError] = useState("");
  async function goalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = savingsGoalSchema.safeParse({ name: formString(fd, "name"), targetAmount: formNumber(fd, "targetAmount"), currentAmount: formNumber(fd, "currentAmount"), targetDate: formString(fd, "targetDate"), icon: "piggy-bank", status: "active" });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addSavingsGoal(parsed.data)) event.currentTarget.reset();
  }
  async function contributionSubmit(event: FormEvent<HTMLFormElement>, goalId: string) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = savingsContributionSchema.safeParse({ goalId, amount: formNumber(fd, "amount"), date: formString(fd, "date") || toInputDate(), notes: formString(fd, "notes") });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addSavingsContribution(parsed.data)) event.currentTarget.reset();
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Ahorros y metas" description="Metas familiares con avances visibles y mensajes amables." />
      <Surface><form className="grid gap-4 md:grid-cols-4" onSubmit={goalSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-4">{error}</p> : null}<Field label="Nombre"><Input name="name" placeholder="Matrícula, alquiler, emergencias" required /></Field><Field label="Objetivo"><Input name="targetAmount" type="number" min="0" step="0.01" required /></Field><Field label="Ahorrado"><Input name="currentAmount" type="number" min="0" step="0.01" defaultValue={0} /></Field><Field label="Fecha objetivo"><Input name="targetDate" type="date" defaultValue={toInputDate()} /></Field><div className="md:col-span-4"><Button disabled={saving}>Crear meta</Button></div></form></Surface>
      <div className="grid gap-4 lg:grid-cols-2">{data.savingsGoals.length === 0 ? <EmptyState title="Aún no hay metas" description="Cree una meta para separar dinero con más tranquilidad." /> : data.savingsGoals.map((goal) => { const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0; return <Surface key={goal.$id}><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{goal.name}</p><p className="text-sm text-ink/60">Objetivo: {formatDate(goal.targetDate)}</p></div><Badge tone={percent >= 100 ? "success" : "gold"}>{Math.round(percent)} %</Badge></div><div className="mt-4"><ProgressBar value={percent} tone={percent >= 100 ? "success" : "gold"} /></div><p className="mt-3 text-sm text-ink/70">Doña Mónica, ya alcanzó el {Math.round(percent)} % de su meta.</p><div className="mt-4 grid grid-cols-2 gap-2"><Detail label="Ahorrado" value={formatCurrency(goal.currentAmount)} /><Detail label="Falta" value={formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))} /></div><form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(event) => contributionSubmit(event, goal.$id)}><Input name="amount" type="number" min="0" step="0.01" placeholder="Aporte" required /><Input name="date" type="date" defaultValue={toInputDate()} /><Button disabled={saving} size="sm">Aportar</Button><Input className="sm:col-span-3" name="notes" placeholder="Nota del aporte" /></form></Surface>; })}</div>
    </div>
  );
}

export function EsikaProductsPage() {
  const { data, saving, addEsikaProduct } = useFinance();
  const [image, setImage] = useState<File | undefined>();
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = esikaProductSchema.safeParse({ name: formString(fd, "name"), code: formString(fd, "code"), category: formString(fd, "category"), campaign: formString(fd, "campaign"), purchasePrice: formNumber(fd, "purchasePrice"), salePrice: formNumber(fd, "salePrice"), stock: formNumber(fd, "stock"), minimumStock: formNumber(fd, "minimumStock"), isActive: true, notes: formString(fd, "notes") });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addEsikaProduct(parsed.data, image)) event.currentTarget.reset();
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Productos Ésika" description="Inventario, precios, campañas y alertas por poco stock." />
      <Surface><form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-3">{error}</p> : null}<Field label="Producto"><Input name="name" required /></Field><Field label="Código"><Input name="code" /></Field><Field label="Categoría"><Select name="category">{esikaProductCategories.map((category) => <option key={category}>{category}</option>)}</Select></Field><Field label="Campaña"><Input name="campaign" /></Field><Field label="Precio compra"><Input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={0} /></Field><Field label="Precio venta"><Input name="salePrice" type="number" min="0" step="0.01" required /></Field><Field label="Stock"><Input name="stock" type="number" min="0" defaultValue={0} /></Field><Field label="Stock mínimo"><Input name="minimumStock" type="number" min="0" defaultValue={1} /></Field><Field label="Fotografía"><Input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0])} /></Field><div className="md:col-span-3"><Field label="Notas"><Textarea name="notes" /></Field></div><div className="md:col-span-3"><Button disabled={saving} icon={<Package size={18} />}>Guardar producto</Button></div></form></Surface>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.esikaProducts.length === 0 ? <EmptyState title="Sin productos registrados" description="Agregue productos para vender y controlar stock." /> : data.esikaProducts.map((product) => <Surface key={product.$id}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{product.name}</p><p className="text-sm text-ink/60">{product.category} · {product.campaign || "Sin campaña"}</p></div>{product.stock <= product.minimumStock ? <Badge tone="danger">Poco stock</Badge> : <Badge tone="success">Disponible</Badge>}</div><div className="mt-4 grid grid-cols-3 gap-2"><Detail label="Stock" value={String(product.stock)} /><Detail label="Compra" value={formatCurrency(product.purchasePrice)} /><Detail label="Venta" value={formatCurrency(product.salePrice)} /></div>{product.stock <= product.minimumStock ? <p className="mt-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">Quedan pocas unidades de este producto.</p> : null}</Surface>)}</div>
    </div>
  );
}

export function EsikaSalePage() {
  const { data, saving, addEsikaSale } = useFinance();
  const router = useRouter();
  const [items, setItems] = useState([{ productId: data.esikaProducts[0]?.$id ?? "", quantity: 1 }]);
  const [error, setError] = useState("");
  const subtotal = items.reduce((total, item) => { const product = data.esikaProducts.find((p) => p.$id === item.productId); return total + item.quantity * (product?.salePrice ?? 0); }, 0);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const saleItems = items.map((item) => { const product = data.esikaProducts.find((p) => p.$id === item.productId); return { productId: item.productId, quantity: item.quantity, unitCost: product?.purchasePrice ?? 0, unitPrice: product?.salePrice ?? 0 }; });
    const parsed = esikaSaleSchema.safeParse({ customerId: formString(fd, "customerId"), saleDate: joinDateAndTime(formString(fd, "date") || toInputDate(), formString(fd, "time") || toInputTime()), discount: formNumber(fd, "discount"), amountPaid: formNumber(fd, "amountPaid"), paymentStatus: formString(fd, "paymentStatus"), paymentMethod: formString(fd, "paymentMethod"), accountId: formString(fd, "accountId"), incomeCategoryId: esikaIncomeCategoryId(data), promisedPaymentDate: formString(fd, "promisedPaymentDate"), notes: formString(fd, "notes"), items: saleItems });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addEsikaSale(parsed.data)) router.push("/esika/clientes");
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Registrar venta de Ésika" description="Registre productos, cobro, saldo pendiente y cuenta donde ingresó el dinero." />
      {data.esikaCustomers.length === 0 || data.esikaProducts.length === 0 ? <EmptyState title="Necesita una clienta y un producto" description="Cree ambos registros para poder guardar ventas de Ésika." action={<div className="flex flex-wrap justify-center gap-2"><Link href="/esika/clientes"><Button>Agregar clienta</Button></Link><Link href="/esika/productos"><Button tone="secondary">Agregar producto</Button></Link></div>} /> : <Surface><form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-3">{error}</p> : null}<Field label="Clienta"><Select name="customerId">{data.esikaCustomers.map((customer) => <option key={customer.$id} value={customer.$id}>{customer.name}</option>)}</Select></Field><Field label="Fecha"><Input name="date" type="date" defaultValue={toInputDate()} /></Field><Field label="Hora"><Input name="time" type="time" defaultValue={toInputTime()} /></Field><div className="md:col-span-3 space-y-3"><p className="text-sm font-bold">Productos vendidos</p>{items.map((item, index) => <div key={index} className="grid gap-3 rounded-lg bg-linen p-3 sm:grid-cols-[1fr_120px_48px]"><Select value={item.productId} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, productId: event.target.value } : row))}>{data.esikaProducts.map((product) => <option key={product.$id} value={product.$id}>{product.name} · stock {product.stock}</option>)}</Select><Input type="number" min="1" value={item.quantity} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))} /><Button type="button" tone="ghost" onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Quitar producto"><Trash2 size={18} /></Button></div>)}<Button type="button" tone="secondary" icon={<Plus size={18} />} onClick={() => setItems((current) => [...current, { productId: data.esikaProducts[0]?.$id ?? "", quantity: 1 }])}>Agregar producto</Button></div><Field label="Descuento"><Input name="discount" type="number" min="0" step="0.01" defaultValue={0} /></Field><Field label="Monto pagado"><Input name="amountPaid" type="number" min="0" step="0.01" defaultValue={subtotal} /></Field><Field label="Estado de pago"><Select name="paymentStatus"><option value="paid">Pagado</option><option value="pending">Pendiente</option><option value="partial">Pago parcial</option></Select></Field><Field label="Método"><Select name="paymentMethod">{paymentMethods.map((method) => <option key={method}>{method}</option>)}</Select></Field><Field label="Cuenta"><Select name="accountId"><option value="">Sin ingreso todavía</option>{data.accounts.map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select></Field><Field label="Fecha prometida de pago"><Input name="promisedPaymentDate" type="date" /></Field><div className="md:col-span-3"><Field label="Notas"><Textarea name="notes" /></Field></div><div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-linen p-4"><p className="font-bold">Total estimado: {formatCurrency(subtotal)}</p><Button disabled={saving} icon={<Sparkles size={18} />}>Guardar venta</Button></div></form></Surface>}
    </div>
  );
}

export function EsikaCustomersPage() {
  const { data, saving, addEsikaCustomer } = useFinance();
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = esikaCustomerSchema.safeParse({ name: formString(fd, "name"), phone: formString(fd, "phone"), address: formString(fd, "address"), notes: formString(fd, "notes") });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    if (await addEsikaCustomer(parsed.data)) event.currentTarget.reset();
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Clientes Ésika" description="Historial, teléfonos y saldos pendientes por clienta." />
      <Surface><form className="grid gap-4 md:grid-cols-4" onSubmit={onSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-4">{error}</p> : null}<Field label="Nombre"><Input name="name" required /></Field><Field label="Teléfono"><Input name="phone" inputMode="tel" required /></Field><Field label="Dirección"><Input name="address" /></Field><Field label="Notas"><Input name="notes" /></Field><div className="md:col-span-4"><Button disabled={saving}>Guardar clienta</Button></div></form></Surface>
      <div className="grid gap-4 lg:grid-cols-2">{data.esikaCustomers.length === 0 ? <EmptyState title="Aún no hay clientas" description="Agregue una clienta para registrar sus compras de Ésika." /> : data.esikaCustomers.map((customer) => { const sales = data.esikaSales.filter((sale) => sale.customerId === customer.$id); const total = sum(sales.map((sale) => sale.total)); const paid = sum(sales.map((sale) => sale.amountPaid)); const pending = sum(sales.map((sale) => sale.pendingAmount)); const message = encodeURIComponent(`Hola, te escribe Doña Mónica. Te recuerdo que tienes un saldo pendiente de ${formatCurrency(pending)} por tu compra de Ésika. Muchas gracias.`); return <Surface key={customer.$id}><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{customer.name}</p><p className="text-sm text-ink/60">{customer.phone}</p></div>{pending > 0 ? <Badge tone="danger">Debe {formatCurrency(pending)}</Badge> : <Badge tone="success">Al día</Badge>}</div><div className="mt-4 grid grid-cols-3 gap-2"><Detail label="Compró" value={formatCurrency(total)} /><Detail label="Pagó" value={formatCurrency(paid)} /><Detail label="Deuda" value={formatCurrency(pending)} /></div><div className="mt-4 flex flex-wrap gap-2"><a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${message}`} target="_blank" rel="noreferrer"><Button tone="success" size="sm" icon={<MessageCircle size={16} />}>WhatsApp</Button></a><Link href="/pagos-pendientes"><Button tone="secondary" size="sm">Ver pagos</Button></Link></div></Surface>; })}</div>
    </div>
  );
}

export function PendingPaymentsPage() {
  const { data, saving, payEsikaSale } = useFinance();
  const pendingSales = data.esikaSales.filter((sale) => sale.pendingAmount > 0);
  const defaultAccount = data.accounts[0]?.$id ?? "";
  return (
    <div className="space-y-5">
      <PageHeader title="Pagos pendientes" description="Cobros de Ésika y compromisos que necesitan atención." />
      <div className="grid gap-4 lg:grid-cols-2">{pendingSales.length === 0 ? <EmptyState title="No hay cobros pendientes de Ésika" description="Cuando registre una venta pendiente o parcial, aparecerá aquí." /> : pendingSales.map((sale) => { const customer = data.esikaCustomers.find((item) => item.$id === sale.customerId); return <Surface key={sale.$id}><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{customer?.name ?? "Clienta"}</p><p className="text-sm text-ink/60">Venta del {formatDate(sale.saleDate)}</p></div><Badge tone="danger">{formatCurrency(sale.pendingAmount)}</Badge></div><form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={async (event) => { event.preventDefault(); const fd = new FormData(event.currentTarget); await payEsikaSale(sale, formNumber(fd, "amount"), formString(fd, "accountId") || defaultAccount, formString(fd, "paymentMethod") || "Efectivo", esikaIncomeCategoryId(data)); }}><Input name="amount" type="number" min="0" max={sale.pendingAmount} step="0.01" defaultValue={sale.pendingAmount} /><Select name="accountId" defaultValue={defaultAccount}>{data.accounts.map((account) => <option key={account.$id} value={account.$id}>{account.name}</option>)}</Select><Select name="paymentMethod">{paymentMethods.map((method) => <option key={method}>{method}</option>)}</Select><Button disabled={saving} size="sm">Registrar pago</Button></form></Surface>; })}</div>
    </div>
  );
}

export function ReportsPage() {
  const { data } = useFinance();
  const [range, setRange] = useState("month");
  const [kind, setKind] = useState<MovementFilter>("all");
  const filtered = data.transactions.filter((transaction) => {
    const tx = new Date(transaction.transactionDate);
    const now = new Date();
    const byRange = range === "day" ? tx.toDateString() === now.toDateString() : range === "week" ? tx >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) : range === "year" ? tx.getFullYear() === now.getFullYear() : tx >= startOfLocalMonth() && tx <= endOfLocalMonth();
    return byRange && (kind === "all" || transaction.type === kind);
  });
  const income = sum(filtered.filter((item) => item.type === "income").map((item) => item.amount));
  const expense = sum(filtered.filter((item) => item.type === "expense").map((item) => item.amount));
  const period = range === "day" ? "Día" : range === "week" ? "Semana" : range === "year" ? "Año" : "Mes";
  return (
    <div className="space-y-5">
      <PageHeader title="Reportes" description="Exporte PDF con logo oficial o CSV compatible con Excel." />
      <Surface><div className="grid gap-3 md:grid-cols-4"><Field label="Periodo"><Select value={range} onChange={(event) => setRange(event.target.value)}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="year">Año</option></Select></Field><Field label="Tipo"><Select value={kind} onChange={(event) => setKind(event.target.value as MovementFilter)}><option value="all">Ingresos y gastos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></Select></Field><Button className="mt-7" tone="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportTransactionsCsv(filtered, data.categories, period)}>Exportar CSV</Button><Button className="mt-7" icon={<Download size={18} />} onClick={() => exportTransactionsPdf(filtered, data.categories, period)}>Exportar PDF</Button></div></Surface>
      <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Ingresos" value={formatCurrency(income)} tone="income" /><StatCard label="Gastos" value={formatCurrency(expense)} tone="expense" /><StatCard label="Balance" value={formatCurrency(income - expense)} tone={income - expense >= 0 ? "income" : "expense"} /></div>
      <Surface><h2 className="font-bold">Movimientos incluidos</h2><div className="mt-4 space-y-2">{filtered.length === 0 ? <EmptyState title="Sin datos para este reporte" description="Cambie el filtro o registre movimientos." /> : filtered.map((transaction) => <div key={transaction.$id} className="flex items-center justify-between gap-3 rounded-lg bg-linen px-4 py-3"><div><p className="font-semibold">{transaction.description}</p><p className="text-sm text-ink/60">{formatDate(transaction.transactionDate)} · {categoryName(data, transaction.categoryId)}</p></div><p className="font-bold">{formatCurrency(transaction.amount)}</p></div>)}</div></Surface>
    </div>
  );
}

export function NotificationsPage() {
  const { data, readNotification, toggleNotification } = useFinance();
  return (
    <div className="space-y-5">
      <PageHeader title="Notificaciones" description="Alertas internas y preferencias preparadas para web push." />
      <Surface><h2 className="font-bold">Preferencias</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.notificationPreferences.map((pref) => <label key={pref.$id} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-linen px-4 py-3 text-sm font-semibold"><span>{pref.type.replace(/_/g, " ")}</span><input type="checkbox" className="h-5 w-5" checked={pref.enabled} onChange={(event) => toggleNotification(pref.$id, event.target.checked)} /></label>)}</div></Surface>
      <div className="space-y-3">{data.notifications.length === 0 ? <EmptyState title="Sin notificaciones" description="Las alertas de pagos, presupuestos y Ésika aparecerán aquí." /> : data.notifications.map((notification) => <Surface key={notification.$id} className="flex items-center justify-between gap-4"><div><p className="font-bold">{notification.title}</p><p className="text-sm text-ink/65">{notification.message}</p><p className="mt-1 text-xs text-ink/45">{formatDateTime(notification.createdAt)}</p></div>{notification.isRead ? <Badge>Leída</Badge> : <Button size="sm" icon={<Bell size={16} />} onClick={() => readNotification(notification.$id)}>Marcar leída</Button>}</Surface>)}</div>
    </div>
  );
}

export function ProfilePage() {
  const { profile, saveProfile } = useAuth();
  const [error, setError] = useState("");
  if (!profile) return null;
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({ fullName: formString(fd, "fullName"), phone: formString(fd, "phone"), avatar: formString(fd, "avatar"), currency: formString(fd, "currency") || "PEN", timezone: formString(fd, "timezone") || "America/Lima", language: "es", dateFormat: formString(fd, "dateFormat") || "dd/MM/yyyy", weekStartsOn: formString(fd, "weekStartsOn"), theme: formString(fd, "theme"), textScale: formNumber(fd, "textScale") || 1, pinEnabled: profile!.pinEnabled });
    if (!parsed.success) return setError(firstIssue(parsed.error));
    setError("");
    await saveProfile(profile!.$id, parsed.data);
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Perfil" description="Datos personales, foto opcional y preferencias principales." />
      <Surface>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          {error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl shadow-soft"><Image src={profile.avatar || "/logo.png"} alt="Foto de perfil" fill sizes="80px" className="object-cover" /></div>
            <div><p className="font-bold">{profile.fullName}</p><p className="text-sm text-ink/60">{profile.email}</p></div>
          </div>
          <Field label="Nombre"><Input name="fullName" defaultValue={profile.fullName} required /></Field>
          <Field label="Teléfono"><Input name="phone" defaultValue={profile.phone} inputMode="tel" /></Field>
          <Field label="Foto opcional"><Input name="avatar" defaultValue={profile.avatar} placeholder="URL de imagen o archivo servido" /></Field>
          <Field label="Moneda"><Select name="currency" defaultValue={profile.currency}><option value="PEN">Sol peruano, S/</option></Select></Field>
          <Field label="Zona horaria"><Input name="timezone" defaultValue={profile.timezone} /></Field>
          <Field label="Formato de fecha"><Select name="dateFormat" defaultValue={profile.dateFormat}><option value="dd/MM/yyyy">día/mes/año</option></Select></Field>
          <Field label="Primer día de la semana"><Select name="weekStartsOn" defaultValue={profile.weekStartsOn}><option value="monday">Lunes</option><option value="sunday">Domingo</option></Select></Field>
          <Field label="Tema"><Select name="theme" defaultValue={profile.theme}><option value="light">Claro</option><option value="dark">Oscuro</option><option value="system">Según dispositivo</option></Select></Field>
          <Field label="Tamaño de texto"><Input name="textScale" type="range" min="0.9" max="1.3" step="0.05" defaultValue={profile.textScale} /></Field>
          <div className="md:col-span-2"><Button icon={<Save size={18} />}>Guardar perfil</Button></div>
        </form>
      </Surface>
    </div>
  );
}

export function SettingsPage() {
  const { profile, saveProfile, recoverPassword, logoutUser } = useAuth();
  const { data, addCategory, saveCategory } = useFinance();
  const [pin, setPin] = useState("");
  const [categoryError, setCategoryError] = useState("");
  if (!profile) return null;
  function downloadBackup() {
    const blob = new Blob([JSON.stringify({ app: "Los gastos de Doña Mónica", generatedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `copia-datos-dona-monica-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  async function categorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const name = formString(fd, "name");
    if (name.length < 2) return setCategoryError("Ingrese un nombre de categoría.");
    setCategoryError("");
    if (await addCategory({ name, type: formString(fd, "type") as "income" | "expense" | "both" | "esika", icon: "tag", color: formString(fd, "color") || "#8B3A4A" })) event.currentTarget.reset();
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Configuración" description="Preferencias de la app, categorías, seguridad y datos." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface><h2 className="font-bold">Seguridad</h2><div className="mt-4 grid gap-3"><Field label="PIN rápido"><Input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} type="password" inputMode="numeric" placeholder="4 a 6 números" /></Field><div className="flex flex-wrap gap-2"><Button disabled={pin.length < 4} onClick={async () => { await saveDevicePin(profile.userId, pin); await saveProfile(profile.$id, { fullName: profile.fullName, phone: profile.phone, avatar: profile.avatar, currency: profile.currency, timezone: profile.timezone, language: profile.language, dateFormat: profile.dateFormat, weekStartsOn: profile.weekStartsOn, theme: profile.theme, textScale: profile.textScale, pinEnabled: true }); setPin(""); }}>Activar PIN</Button><Button tone="secondary" onClick={async () => { removeDevicePin(profile.userId); await saveProfile(profile.$id, { fullName: profile.fullName, phone: profile.phone, avatar: profile.avatar, currency: profile.currency, timezone: profile.timezone, language: profile.language, dateFormat: profile.dateFormat, weekStartsOn: profile.weekStartsOn, theme: profile.theme, textScale: profile.textScale, pinEnabled: false }); }}>Desactivar PIN</Button></div><Button tone="secondary" onClick={() => recoverPassword(profile.email)}>Enviar enlace para cambiar contraseña</Button><Button tone="danger" onClick={logoutUser}>Cerrar sesión</Button></div></Surface>
        <Surface><h2 className="font-bold">Datos</h2><div className="mt-4 grid gap-3"><Button tone="secondary" icon={<Download size={18} />} onClick={downloadBackup}>Descargar copia de seguridad JSON</Button><Button tone="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportTransactionsCsv(data.transactions, data.categories, "Todos los datos")}>Exportar movimientos CSV</Button></div></Surface>
      </div>
      <Surface><h2 className="font-bold">Categorías</h2><form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={categorySubmit}>{categoryError ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral md:col-span-4">{categoryError}</p> : null}<Field label="Nombre"><Input name="name" /></Field><Field label="Tipo"><Select name="type"><option value="expense">Gasto</option><option value="income">Ingreso</option><option value="both">Ambos</option><option value="esika">Ésika</option></Select></Field><Field label="Color"><Input name="color" type="color" defaultValue="#8B3A4A" /></Field><div className="mt-7"><Button icon={<Plus size={18} />}>Crear categoría</Button></div></form><div className="mt-5 space-y-2">{data.categories.map((category) => <CategorySettingsRow key={category.$id} category={category} saveCategory={saveCategory} />)}</div></Surface>
    </div>
  );
}

function CategorySettingsRow({ category, saveCategory }: { category: WithDocument<Category>; saveCategory: (id: string, input: { name?: string; isActive?: boolean; sortOrder?: number; color?: string }) => Promise<boolean> }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  return <div className="grid gap-2 rounded-lg bg-linen p-3 md:grid-cols-[1fr_120px_120px_240px]"><Input value={name} onChange={(event) => setName(event.target.value)} /><Input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Visible" : "Oculta"}</Badge><div className="flex flex-wrap gap-2"><Button type="button" size="sm" tone="secondary" onClick={() => saveCategory(category.$id, { name, color })}>Guardar</Button><Button type="button" size="sm" tone="secondary" onClick={() => saveCategory(category.$id, { isActive: !category.isActive })}>{category.isActive ? "Ocultar" : "Mostrar"}</Button><Button type="button" size="sm" tone="ghost" onClick={() => saveCategory(category.$id, { sortOrder: Math.max(0, category.sortOrder - 1) })}>Subir</Button><Button type="button" size="sm" tone="ghost" onClick={() => saveCategory(category.$id, { sortOrder: category.sortOrder + 1 })}>Bajar</Button></div></div>;
}

export function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const email = formString(fd, "email");
    const password = formString(fd, "password");
    if (!email || !password) return setError("Ingrese correo y contraseña.");
    setError("");
    if (await login(email, password)) router.replace(params.get("next") || "/dashboard");
  }
  if (user) router.replace("/dashboard");
  return (
    <main className="grid min-h-screen bg-cream text-ink lg:grid-cols-[1fr_1.1fr]">
      <section className="flex items-center justify-center px-6 py-10"><div className="w-full max-w-md rounded-lg bg-white p-6 shadow-soft"><div className="mx-auto h-28 w-28 overflow-hidden rounded-2xl shadow-soft"><Image src="/logo.png" alt="Los gastos de Doña Mónica" width={112} height={112} className="h-full w-full object-cover" priority /></div><h1 className="mt-6 text-center font-display text-3xl font-semibold">Los gastos de Doña Mónica</h1><p className="mt-2 text-center text-sm text-ink/65">Ingrese con su correo y contraseña para cuidar sus cuentas.</p><form className="mt-6 space-y-4" onSubmit={onSubmit}>{error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p> : null}<Field label="Correo"><Input name="email" type="email" autoComplete="email" required /></Field><Field label="Contraseña"><Input name="password" type="password" autoComplete="current-password" required /></Field><Button className="w-full" size="lg">Entrar</Button></form><Link className="mt-4 block text-center text-sm font-semibold text-wine" href="/recuperar-contrasena">Recuperar contraseña</Link></div></section>
      <section className="hidden items-center justify-center bg-linen px-10 lg:flex"><div className="max-w-lg"><p className="font-display text-5xl font-semibold leading-tight">Una app familiar, clara y hecha para cada sol importante.</p><p className="mt-5 text-ink/70">Gastos, ingresos, pagos de casa, universidades y ventas de Ésika en un solo lugar seguro.</p></div></section>
    </main>
  );
}

export function RecoveryPage() {
  const { recoverPassword, resetPassword } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const userId = params.get("userId") || "";
  const secret = params.get("secret") || "";
  const [message, setMessage] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    if (userId && secret) {
      const password = formString(fd, "password");
      if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.");
      if (await resetPassword(userId, secret, password)) router.push("/login");
      return;
    }
    const email = formString(fd, "email");
    if (await recoverPassword(email)) setMessage("Revise su correo para continuar.");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-ink"><section className="w-full max-w-md rounded-lg bg-white p-6 shadow-soft"><div className="mx-auto h-24 w-24 overflow-hidden rounded-2xl"><Image src="/logo.png" alt="Los gastos de Doña Mónica" width={96} height={96} className="h-full w-full object-cover" /></div><h1 className="mt-5 text-center font-display text-3xl font-semibold">Recuperar contraseña</h1><form className="mt-6 space-y-4" onSubmit={onSubmit}>{message ? <p className="rounded-lg bg-info/10 px-4 py-3 text-sm text-info">{message}</p> : null}{userId && secret ? <Field label="Nueva contraseña"><Input name="password" type="password" minLength={8} required /></Field> : <Field label="Correo"><Input name="email" type="email" required /></Field>}<Button className="w-full">Continuar</Button></form><Link className="mt-4 block text-center text-sm font-semibold text-wine" href="/login">Volver a inicio de sesión</Link></section></main>
  );
}


