import { ensureSupabaseConfig, supabase, supabaseConfig, toCurrentUser, toDocument, type CurrentUser } from "@/lib/supabase";
import { defaultAccounts, defaultCategories, notificationTypes } from "@/lib/defaults";
import type {
  Account,
  AppNotification,
  Budget,
  Category,
  EsikaCustomer,
  EsikaProduct,
  EsikaSale,
  EsikaSaleItem,
  FinanceData,
  NotificationPreference,
  Profile,
  RecurringPayment,
  SavingsContribution,
  SavingsGoal,
  Transaction,
  Transfer,
  WithDocument
} from "@/types/domain";
import type {
  AccountInput,
  BudgetInput,
  EsikaCustomerInput,
  EsikaProductInput,
  EsikaSaleInput,
  ProfileInput,
  RecurringPaymentInput,
  SavingsContributionInput,
  SavingsGoalInput,
  TransactionInput,
  TransferInput
} from "@/validations/schemas";

export type { CurrentUser };

const TABLES = {
  profiles: "profiles",
  accounts: "accounts",
  categories: "categories",
  transactions: "transactions",
  recurringPayments: "recurring_payments",
  budgets: "budgets",
  savingsGoals: "savings_goals",
  savingsContributions: "savings_contributions",
  esikaProducts: "esika_products",
  esikaCustomers: "esika_customers",
  esikaSales: "esika_sales",
  esikaSaleItems: "esika_sale_items",
  transfers: "transfers",
  notifications: "notifications",
  notificationPreferences: "notification_preferences"
} as const;

type Order = { column: string; ascending?: boolean };

function throwIfError(error: unknown) {
  if (error) throw error;
}

export async function getCurrentUser() {
  ensureSupabaseConfig();
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);
  if (!data.user) throw new Error("No hay sesión activa.");
  return toCurrentUser(data.user);
}

export async function loginWithEmail(email: string, password: string) {
  ensureSupabaseConfig();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  throwIfError(error);
  if (!data.user) throw new Error("No se pudo iniciar sesión.");
  return toCurrentUser(data.user);
}

export async function logout() {
  ensureSupabaseConfig();
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

export async function sendPasswordRecovery(email: string) {
  ensureSupabaseConfig();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${supabaseConfig.appUrl}/recuperar-contrasena`
  });
  throwIfError(error);
}

export async function completePasswordRecovery(_userId: string, _secret: string, password: string) {
  ensureSupabaseConfig();
  const { error } = await supabase.auth.updateUser({ password });
  throwIfError(error);
}

export async function uploadPrivateFile(file: File, userId: string) {
  ensureSupabaseConfig();
  const extension = file.name.split(".").pop() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(supabaseConfig.bucket).upload(path, file, { upsert: false, contentType: file.type });
  throwIfError(error);
  return path;
}

export function getFileView(fileId?: string) {
  if (!fileId || !supabaseConfig.bucket) return "";
  return supabase.storage.from(supabaseConfig.bucket).getPublicUrl(fileId).data.publicUrl;
}

async function listUserDocuments<T>(table: string, userId: string, order?: Order) {
  ensureSupabaseConfig();
  let query = supabase.from(table).select("*").eq("userId", userId).limit(5000);
  if (order) query = query.order(order.column, { ascending: order.ascending ?? true });
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map((row) => toDocument(row as Record<string, unknown>) as WithDocument<T>);
}

async function createUserDocument<T extends { userId: string }>(table: string, data: T) {
  ensureSupabaseConfig();
  const { data: row, error } = await supabase.from(table).insert(data as never).select("*").single();
  throwIfError(error);
  return toDocument(row as Record<string, unknown>) as WithDocument<T>;
}

async function updateUserDocument<T>(table: string, documentId: string, data: Partial<T>) {
  ensureSupabaseConfig();
  const { data: row, error } = await supabase.from(table).update(data as never).eq("id", documentId).select("*").single();
  throwIfError(error);
  return toDocument(row as Record<string, unknown>) as WithDocument<T>;
}

async function deleteUserDocument(table: string, documentId: string) {
  ensureSupabaseConfig();
  const { error } = await supabase.from(table).delete().eq("id", documentId);
  throwIfError(error);
}

export async function getOrCreateProfile(user: CurrentUser) {
  const existing = await listUserDocuments<Profile>(TABLES.profiles, user.$id);
  if (existing[0]) return existing[0];
  return createUserDocument<Profile>(TABLES.profiles, {
    userId: user.$id,
    fullName: user.name || "Doña Mónica",
    email: user.email,
    phone: "",
    avatar: "",
    currency: "PEN",
    timezone: "America/Lima",
    language: "es",
    dateFormat: "dd/MM/yyyy",
    weekStartsOn: "monday",
    theme: "light",
    textScale: 1,
    pinEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function updateProfile(profileId: string, input: ProfileInput) {
  return updateUserDocument<Profile>(TABLES.profiles, profileId, { ...input, updatedAt: new Date().toISOString() });
}

export async function ensureStarterRecords(userId: string) {
  const [accounts, categories, notificationPreferences] = await Promise.all([
    listUserDocuments<Account>(TABLES.accounts, userId),
    listUserDocuments<Category>(TABLES.categories, userId),
    listUserDocuments<NotificationPreference>(TABLES.notificationPreferences, userId)
  ]);

  const now = new Date().toISOString();
  const jobs: Promise<unknown>[] = [];
  if (accounts.length === 0) jobs.push(...defaultAccounts.map((account) => createUserDocument<Account>(TABLES.accounts, { ...account, userId, createdAt: now })));
  if (categories.length === 0) jobs.push(...defaultCategories.map((category) => createUserDocument<Category>(TABLES.categories, { ...category, userId })));
  if (notificationPreferences.length === 0) jobs.push(...notificationTypes.map((item) => createUserDocument<NotificationPreference>(TABLES.notificationPreferences, { userId, type: item.type, enabled: true })));
  await Promise.all(jobs);
}

export async function loadFinanceData(userId: string): Promise<FinanceData> {
  const [
    accounts,
    categories,
    transactions,
    recurringPayments,
    budgets,
    savingsGoals,
    savingsContributions,
    esikaProducts,
    esikaCustomers,
    esikaSales,
    esikaSaleItems,
    transfers,
    notifications,
    notificationPreferences
  ] = await Promise.all([
    listUserDocuments<Account>(TABLES.accounts, userId, { column: "name" }),
    listUserDocuments<Category>(TABLES.categories, userId, { column: "sortOrder" }),
    listUserDocuments<Transaction>(TABLES.transactions, userId, { column: "transactionDate", ascending: false }),
    listUserDocuments<RecurringPayment>(TABLES.recurringPayments, userId, { column: "nextDueDate" }),
    listUserDocuments<Budget>(TABLES.budgets, userId),
    listUserDocuments<SavingsGoal>(TABLES.savingsGoals, userId, { column: "targetDate" }),
    listUserDocuments<SavingsContribution>(TABLES.savingsContributions, userId, { column: "date", ascending: false }),
    listUserDocuments<EsikaProduct>(TABLES.esikaProducts, userId, { column: "name" }),
    listUserDocuments<EsikaCustomer>(TABLES.esikaCustomers, userId, { column: "name" }),
    listUserDocuments<EsikaSale>(TABLES.esikaSales, userId, { column: "saleDate", ascending: false }),
    listUserDocuments<EsikaSaleItem>(TABLES.esikaSaleItems, userId),
    listUserDocuments<Transfer>(TABLES.transfers, userId, { column: "transferDate", ascending: false }),
    listUserDocuments<AppNotification>(TABLES.notifications, userId, { column: "createdAt", ascending: false }),
    listUserDocuments<NotificationPreference>(TABLES.notificationPreferences, userId)
  ]);
  return { accounts, categories, transactions, recurringPayments, budgets, savingsGoals, savingsContributions, esikaProducts, esikaCustomers, esikaSales, esikaSaleItems, transfers, notifications, notificationPreferences };
}

async function adjustAccountBalance(accountId: string, amountDelta: number) {
  if (amountDelta === 0) return;
  const { data, error } = await supabase.from(TABLES.accounts).select("currentBalance").eq("id", accountId).single();
  throwIfError(error);
  const next = Number((data as { currentBalance?: number } | null)?.currentBalance ?? 0) + amountDelta;
  const { error: updateError } = await supabase.from(TABLES.accounts).update({ currentBalance: next }).eq("id", accountId);
  throwIfError(updateError);
}

async function adjustSavingsGoal(goalId: string, amountDelta: number) {
  const { data, error } = await supabase.from(TABLES.savingsGoals).select("currentAmount").eq("id", goalId).single();
  throwIfError(error);
  const next = Number((data as { currentAmount?: number } | null)?.currentAmount ?? 0) + amountDelta;
  const { error: updateError } = await supabase.from(TABLES.savingsGoals).update({ currentAmount: next }).eq("id", goalId);
  throwIfError(updateError);
}

async function adjustProductStock(productId: string, quantityDelta: number) {
  const { data, error } = await supabase.from(TABLES.esikaProducts).select("stock").eq("id", productId).single();
  throwIfError(error);
  const next = Math.max(0, Number((data as { stock?: number } | null)?.stock ?? 0) + quantityDelta);
  const { error: updateError } = await supabase.from(TABLES.esikaProducts).update({ stock: next }).eq("id", productId);
  throwIfError(updateError);
}

function transactionDelta(input: Pick<Transaction, "type" | "amount">) {
  return input.type === "income" ? input.amount : -input.amount;
}

export async function createTransaction(input: TransactionInput, userId: string, receipt?: File) {
  const receiptFileId = receipt ? await uploadPrivateFile(receipt, userId) : undefined;
  const payload: Transaction = {
    userId,
    ...input,
    receiptFileId,
    notes: input.notes || "",
    recurringPaymentId: input.recurringPaymentId || "",
    tags: input.tags ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const document = await createUserDocument<Transaction>(TABLES.transactions, payload);
  try {
    await adjustAccountBalance(input.accountId, transactionDelta(payload));
    return document;
  } catch (error) {
    await deleteUserDocument(TABLES.transactions, document.$id).catch(() => undefined);
    throw error;
  }
}

export async function updateTransaction(documentId: string, previous: WithDocument<Transaction>, input: TransactionInput, receipt?: File) {
  const receiptFileId = receipt ? await uploadPrivateFile(receipt, previous.userId) : previous.receiptFileId;
  const nextData: Partial<Transaction> = { ...input, receiptFileId, updatedAt: new Date().toISOString(), notes: input.notes || "", tags: input.tags ?? [] };
  const updated = await updateUserDocument<Transaction>(TABLES.transactions, documentId, nextData);
  try {
    await adjustAccountBalance(previous.accountId, -transactionDelta(previous));
    await adjustAccountBalance(input.accountId, transactionDelta({ type: input.type, amount: input.amount }));
    return updated;
  } catch (error) {
    await updateUserDocument<Transaction>(TABLES.transactions, documentId, previous).catch(() => undefined);
    throw error;
  }
}

export async function deleteTransaction(transaction: WithDocument<Transaction>) {
  await deleteUserDocument(TABLES.transactions, transaction.$id);
  await adjustAccountBalance(transaction.accountId, -transactionDelta(transaction));
}

export async function duplicateTransaction(transaction: WithDocument<Transaction>) {
  const { $id, $createdAt, $updatedAt, $permissions, id, created_at, updated_at, ...data } = transaction as WithDocument<Transaction> & Record<string, unknown>;
  return createTransaction({ ...(data as Transaction), transactionDate: new Date().toISOString() }, transaction.userId);
}

export async function createCategory(input: Omit<Category, "userId">, userId: string) {
  return createUserDocument<Category>(TABLES.categories, { ...input, userId });
}

export async function updateCategory(documentId: string, input: Partial<Category>) {
  return updateUserDocument<Category>(TABLES.categories, documentId, input);
}

export async function createAccount(input: AccountInput, userId: string) {
  return createUserDocument<Account>(TABLES.accounts, { ...input, userId, currentBalance: input.currentBalance || input.initialBalance, createdAt: new Date().toISOString() });
}

export async function createTransfer(input: TransferInput, userId: string) {
  const transfer = await createUserDocument<Transfer>(TABLES.transfers, { ...input, userId });
  try {
    await adjustAccountBalance(input.sourceAccountId, -input.amount);
    await adjustAccountBalance(input.destinationAccountId, input.amount);
    return transfer;
  } catch (error) {
    await deleteUserDocument(TABLES.transfers, transfer.$id).catch(() => undefined);
    throw error;
  }
}

export async function createBudget(input: BudgetInput, userId: string) {
  return createUserDocument<Budget>(TABLES.budgets, { ...input, userId });
}

export async function createRecurringPayment(input: RecurringPaymentInput, userId: string) {
  return createUserDocument<RecurringPayment>(TABLES.recurringPayments, { ...input, userId, notes: input.notes || "" });
}

export async function markRecurringAsPaid(payment: WithDocument<RecurringPayment>, accountId: string) {
  const transaction = await createTransaction(
    {
      type: "expense",
      amount: payment.amount,
      categoryId: payment.categoryId,
      accountId,
      description: payment.name,
      transactionDate: new Date().toISOString(),
      paymentMethod: "Efectivo",
      necessityLevel: "necessary",
      isRecurring: true,
      recurringPaymentId: payment.$id,
      notes: payment.notes || "",
      tags: ["recurrente"]
    },
    payment.userId
  );
  await updateUserDocument<RecurringPayment>(TABLES.recurringPayments, payment.$id, { status: "paid" });
  return transaction;
}

export async function createSavingsGoal(input: SavingsGoalInput, userId: string) {
  return createUserDocument<SavingsGoal>(TABLES.savingsGoals, { ...input, userId });
}

export async function addSavingsContribution(input: SavingsContributionInput, userId: string) {
  const contribution = await createUserDocument<SavingsContribution>(TABLES.savingsContributions, { ...input, userId, notes: input.notes || "" });
  await adjustSavingsGoal(input.goalId, input.amount);
  return contribution;
}

export async function createEsikaProduct(input: EsikaProductInput, userId: string, image?: File) {
  const imageFileId = image ? await uploadPrivateFile(image, userId) : undefined;
  return createUserDocument<EsikaProduct>(TABLES.esikaProducts, { ...input, userId, imageFileId, notes: input.notes || "" });
}

export async function createEsikaCustomer(input: EsikaCustomerInput, userId: string) {
  return createUserDocument<EsikaCustomer>(TABLES.esikaCustomers, { ...input, userId, address: input.address || "", notes: input.notes || "", createdAt: new Date().toISOString() });
}

export async function createEsikaSale(input: EsikaSaleInput, userId: string) {
  const subtotal = input.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.min(input.amountPaid, total);
  const pendingAmount = Math.max(0, total - amountPaid);
  const sale = await createUserDocument<EsikaSale>(TABLES.esikaSales, {
    userId,
    customerId: input.customerId,
    saleDate: input.saleDate,
    subtotal,
    discount: input.discount,
    total,
    amountPaid,
    pendingAmount,
    paymentStatus: pendingAmount === 0 ? "paid" : amountPaid > 0 ? "partial" : input.paymentStatus,
    paymentMethod: input.paymentMethod,
    accountId: input.accountId || "",
    promisedPaymentDate: input.promisedPaymentDate || "",
    notes: input.notes || ""
  });

  try {
    await Promise.all(
      input.items.map(async (item) => {
        await createUserDocument<EsikaSaleItem>(TABLES.esikaSaleItems, {
          userId,
          saleId: sale.$id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          profit: item.quantity * (item.unitPrice - item.unitCost)
        });
        await adjustProductStock(item.productId, -item.quantity);
      })
    );
    if (amountPaid > 0 && input.accountId) {
      await createTransaction(
        {
          type: "income",
          amount: amountPaid,
          categoryId: input.incomeCategoryId || "",
          accountId: input.accountId,
          description: "Venta de Ésika",
          transactionDate: input.saleDate,
          paymentMethod: input.paymentMethod,
          isRecurring: false,
          notes: `Ingreso por venta de Ésika. Venta: ${sale.$id}`,
          tags: ["esika"]
        },
        userId
      );
    }
    return sale;
  } catch (error) {
    await deleteUserDocument(TABLES.esikaSales, sale.$id).catch(() => undefined);
    throw error;
  }
}

export async function registerCustomerPayment(sale: WithDocument<EsikaSale>, amount: number, accountId: string, paymentMethod: string, incomeCategoryId = "") {
  const paid = Math.min(amount, sale.pendingAmount);
  if (paid <= 0) throw new Error("Ingrese un monto mayor que cero.");
  const nextPaid = sale.amountPaid + paid;
  const nextPending = Math.max(0, sale.total - nextPaid);
  const updated = await updateUserDocument<EsikaSale>(TABLES.esikaSales, sale.$id, {
    amountPaid: nextPaid,
    pendingAmount: nextPending,
    paymentStatus: nextPending === 0 ? "paid" : "partial"
  });
  await createTransaction(
    {
      type: "income",
      amount: paid,
      categoryId: incomeCategoryId,
      accountId,
      description: "Pago de venta de Ésika",
      transactionDate: new Date().toISOString(),
      paymentMethod,
      isRecurring: false,
      notes: `Pago asociado a la venta ${sale.$id}`,
      tags: ["esika", "cobro"]
    },
    sale.userId
  );
  return updated;
}

export async function createNotification(input: Omit<AppNotification, "createdAt">) {
  return createUserDocument<AppNotification>(TABLES.notifications, { ...input, createdAt: new Date().toISOString() });
}

export async function markNotificationRead(notificationId: string) {
  return updateUserDocument<AppNotification>(TABLES.notifications, notificationId, { isRead: true });
}

export async function setNotificationPreference(preferenceId: string, enabled: boolean) {
  return updateUserDocument<NotificationPreference>(TABLES.notificationPreferences, preferenceId, { enabled });
}

