import { z } from "zod";

const money = z.coerce.number({ error: "Ingrese un monto válido." }).gt(0, "El monto debe ser mayor que cero.").max(9999999, "El monto es demasiado alto.");
const optionalText = z.string().trim().max(500, "Use una nota más corta.").optional().or(z.literal(""));

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: money,
  categoryId: z.string().min(1, "Seleccione una categoría."),
  accountId: z.string().min(1, "Seleccione una cuenta."),
  description: z.string().trim().min(2, "Agregue una descripción breve.").max(120),
  transactionDate: z.string().min(1),
  paymentMethod: z.string().min(1, "Seleccione un método."),
  necessityLevel: z.enum(["necessary", "important", "avoidable"]).optional(),
  isRecurring: z.boolean().default(false),
  recurringPaymentId: z.string().optional(),
  notes: optionalText,
  tags: z.array(z.string()).optional()
});

export const quickTransactionSchema = transactionSchema.pick({
  type: true,
  amount: true,
  categoryId: true,
  accountId: true,
  description: true
});

export const accountSchema = z.object({
  name: z.string().trim().min(2, "Ingrese el nombre de la cuenta."),
  type: z.string().min(1),
  initialBalance: z.coerce.number().min(0, "El saldo inicial no puede ser negativo."),
  currentBalance: z.coerce.number().min(0, "El saldo actual no puede ser negativo."),
  icon: z.string().default("wallet"),
  isActive: z.boolean().default(true)
});

export const transferSchema = z.object({
  sourceAccountId: z.string().min(1, "Seleccione la cuenta de origen."),
  destinationAccountId: z.string().min(1, "Seleccione la cuenta de destino."),
  amount: money,
  transferDate: z.string().min(1),
  notes: optionalText
}).refine((value) => value.sourceAccountId !== value.destinationAccountId, "Las cuentas deben ser distintas.");

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Seleccione una categoría."),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  amount: money,
  alertPercentage: z.coerce.number().min(50).max(100)
});

export const recurringPaymentSchema = z.object({
  name: z.string().trim().min(2, "Ingrese un nombre."),
  amount: money,
  categoryId: z.string().min(1),
  accountId: z.string().optional(),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  dueDay: z.coerce.number().min(1).max(31),
  nextDueDate: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  reminderDays: z.coerce.number().min(0).max(30),
  status: z.enum(["pending", "paid", "overdue", "partial"]),
  notes: optionalText
});

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(2),
  targetAmount: money,
  currentAmount: z.coerce.number().min(0),
  targetDate: z.string().min(1),
  icon: z.string().default("piggy-bank"),
  status: z.enum(["active", "completed", "paused"])
});

export const savingsContributionSchema = z.object({
  goalId: z.string().min(1),
  amount: money,
  date: z.string().min(1),
  notes: optionalText
});

export const esikaProductSchema = z.object({
  name: z.string().trim().min(2, "Ingrese el nombre del producto."),
  code: optionalText,
  category: z.string().min(1),
  campaign: optionalText,
  purchasePrice: z.coerce.number().min(0),
  salePrice: money,
  stock: z.coerce.number().int().min(0),
  minimumStock: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true),
  notes: optionalText
});

export const esikaCustomerSchema = z.object({
  name: z.string().trim().min(2, "Ingrese el nombre de la clienta."),
  phone: z.string().trim().min(6, "Ingrese un teléfono válido."),
  address: optionalText,
  notes: optionalText
});

export const esikaSaleSchema = z.object({
  customerId: z.string().min(1, "Seleccione una clienta."),
  saleDate: z.string().min(1),
  discount: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0),
  paymentStatus: z.enum(["paid", "pending", "partial"]),
  paymentMethod: z.string().min(1),
  accountId: z.string().optional(),
  incomeCategoryId: z.string().optional(),
  promisedPaymentDate: z.string().optional(),
  notes: optionalText,
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().int().gt(0),
    unitCost: z.coerce.number().min(0),
    unitPrice: money
  })).min(1, "Agregue al menos un producto.")
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
  currency: z.string().default("PEN"),
  timezone: z.string().default("America/Lima"),
  language: z.string().default("es"),
  dateFormat: z.string().default("dd/MM/yyyy"),
  weekStartsOn: z.enum(["monday", "sunday"]),
  theme: z.enum(["light", "dark", "system"]),
  textScale: z.coerce.number().min(0.9).max(1.3),
  pinEnabled: z.boolean()
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type RecurringPaymentInput = z.infer<typeof recurringPaymentSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type SavingsContributionInput = z.infer<typeof savingsContributionSchema>;
export type EsikaProductInput = z.infer<typeof esikaProductSchema>;
export type EsikaCustomerInput = z.infer<typeof esikaCustomerSchema>;
export type EsikaSaleInput = z.infer<typeof esikaSaleSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;



