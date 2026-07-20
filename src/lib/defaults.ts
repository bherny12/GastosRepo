import type { Account, Category, NecessityLevel, PaymentStatus, RecurringStatus } from "@/types/domain";

export const currencyCode = "PEN";
export const currencySymbol = "S/";

export const paymentMethods = ["Efectivo", "Yape", "Plin", "Transferencia bancaria", "Tarjeta", "Otro"];
export const accountTypes = ["Efectivo", "Yape", "Plin", "Cuenta bancaria", "Tarjeta", "Caja de ventas de Ésika", "Ahorros", "Otra cuenta"];
export const incomeSources = ["Ventas de Ésika", "Comisión", "Trabajo", "Transferencia recibida", "Apoyo familiar", "Devolución", "Ahorros", "Otros ingresos"];
export const esikaProductCategories = ["Perfumes", "Maquillaje", "Cuidado facial", "Cuidado corporal", "Accesorios", "Otros"];

export const necessityLabels: Record<NecessityLevel, string> = {
  necessary: "Necesario",
  important: "Importante",
  avoidable: "Evitable"
};

export const recurringStatusLabels: Record<RecurringStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  overdue: "Vencido",
  partial: "Pago parcial"
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  partial: "Pago parcial"
};

export const dailyPhrases = [
  "Cada gasto registrado es una decisión más consciente.",
  "Poco a poco también es avanzar.",
  "Organizar hoy trae tranquilidad mañana.",
  "Doña Mónica, cada sol bien administrado cuenta.",
  "Su esfuerzo diario también merece verse reflejado.",
  "Las metas grandes comienzan con pequeños hábitos.",
  "Hoy es un buen día para cuidar sus finanzas."
];

export const defaultAccounts: Omit<Account, "userId" | "createdAt">[] = [
  { name: "Efectivo", type: "Efectivo", initialBalance: 0, currentBalance: 0, icon: "wallet", isActive: true },
  { name: "Yape", type: "Yape", initialBalance: 0, currentBalance: 0, icon: "smartphone", isActive: true },
  { name: "Plin", type: "Plin", initialBalance: 0, currentBalance: 0, icon: "smartphone", isActive: true },
  { name: "Caja de ventas de Ésika", type: "Caja de ventas de Ésika", initialBalance: 0, currentBalance: 0, icon: "sparkles", isActive: true }
];

export const defaultCategories: Omit<Category, "userId">[] = [
  { name: "Ventas de Ésika", type: "income", icon: "sparkles", color: "#8B3A4A", isDefault: true, isActive: true, sortOrder: 1 },
  { name: "Comisión", type: "income", icon: "badge-percent", color: "#4E7C59", isDefault: true, isActive: true, sortOrder: 2 },
  { name: "Trabajo", type: "income", icon: "briefcase", color: "#3A6EA5", isDefault: true, isActive: true, sortOrder: 3 },
  { name: "Transferencia recibida", type: "income", icon: "arrow-down-left", color: "#4E7C59", isDefault: true, isActive: true, sortOrder: 4 },
  { name: "Apoyo familiar", type: "income", icon: "heart-handshake", color: "#B98A2F", isDefault: true, isActive: true, sortOrder: 5 },
  { name: "Devolución", type: "income", icon: "rotate-ccw", color: "#3A6EA5", isDefault: true, isActive: true, sortOrder: 6 },
  { name: "Ahorros", type: "income", icon: "piggy-bank", color: "#4E7C59", isDefault: true, isActive: true, sortOrder: 7 },
  { name: "Otros ingresos", type: "income", icon: "plus-circle", color: "#6B7280", isDefault: true, isActive: true, sortOrder: 8 },
  { name: "Alquiler de la casa", type: "expense", icon: "home", color: "#8B3A4A", isDefault: true, isActive: true, sortOrder: 10 },
  { name: "Universidad 1", type: "expense", icon: "graduation-cap", color: "#3A6EA5", isDefault: true, isActive: true, sortOrder: 11 },
  { name: "Universidad 2", type: "expense", icon: "graduation-cap", color: "#5067A8", isDefault: true, isActive: true, sortOrder: 12 },
  { name: "Pasajes", type: "expense", icon: "bus", color: "#B98A2F", isDefault: true, isActive: true, sortOrder: 13 },
  { name: "Alimentación", type: "expense", icon: "utensils", color: "#D45B4A", isDefault: true, isActive: true, sortOrder: 14 },
  { name: "Servicios del hogar", type: "expense", icon: "house-plug", color: "#8B5E3C", isDefault: true, isActive: true, sortOrder: 15 },
  { name: "Agua", type: "expense", icon: "droplets", color: "#3A6EA5", isDefault: true, isActive: true, sortOrder: 16 },
  { name: "Luz", type: "expense", icon: "lightbulb", color: "#B98A2F", isDefault: true, isActive: true, sortOrder: 17 },
  { name: "Internet", type: "expense", icon: "wifi", color: "#3A6EA5", isDefault: true, isActive: true, sortOrder: 18 },
  { name: "Teléfono", type: "expense", icon: "phone", color: "#4E7C59", isDefault: true, isActive: true, sortOrder: 19 },
  { name: "Salud", type: "expense", icon: "heart-pulse", color: "#D45B4A", isDefault: true, isActive: true, sortOrder: 20 },
  { name: "Medicinas", type: "expense", icon: "pill", color: "#C85A6A", isDefault: true, isActive: true, sortOrder: 21 },
  { name: "Productos de limpieza", type: "expense", icon: "spray-can", color: "#4E7C59", isDefault: true, isActive: true, sortOrder: 22 },
  { name: "Compras para la casa", type: "expense", icon: "shopping-bag", color: "#B98A2F", isDefault: true, isActive: true, sortOrder: 23 },
  { name: "Gastos personales", type: "expense", icon: "user", color: "#8B3A4A", isDefault: true, isActive: true, sortOrder: 24 },
  { name: "Deudas", type: "expense", icon: "receipt", color: "#D45B4A", isDefault: true, isActive: true, sortOrder: 25 },
  { name: "Entretenimiento", type: "expense", icon: "music", color: "#8B3A4A", isDefault: true, isActive: true, sortOrder: 26 },
  { name: "Productos Ésika", type: "expense", icon: "package", color: "#C85A6A", isDefault: true, isActive: true, sortOrder: 27 },
  { name: "Otros", type: "expense", icon: "more-horizontal", color: "#6B7280", isDefault: true, isActive: true, sortOrder: 28 }
];

export const notificationTypes = [
  { type: "payment_due", label: "Pago próximo" },
  { type: "budget_limit", label: "Presupuesto cerca del límite" },
  { type: "customer_debt", label: "Deuda de clienta" },
  { type: "low_stock", label: "Producto con poco stock" },
  { type: "goal_reached", label: "Meta de ahorro alcanzada" },
  { type: "unusual_expense", label: "Gasto inusual" },
  { type: "missing_records", label: "Falta registrar movimientos" }
];
