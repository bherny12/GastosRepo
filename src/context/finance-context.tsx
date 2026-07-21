"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isSupabaseConfigured, normalizeSupabaseError } from "@/lib/supabase";
import { defaultAccounts, defaultCategories, notificationTypes } from "@/lib/defaults";
import {
  addSavingsContribution as remoteAddSavingsContribution,
  createAccount,
  createBudget,
  createCategory,
  createEsikaCustomer,
  createEsikaProduct,
  createEsikaSale,
  createRecurringPayment,
  createSavingsGoal,
  createTransaction,
  createTransfer,
  updateCategory,
  deleteAccount,
  deleteBudget,
  deleteCategory,
  deleteEsikaCustomer,
  deleteEsikaProduct,
  deleteEsikaSale,
  deleteRecurringPayment,
  deleteSavingsGoal,
  deleteTransaction,
  duplicateTransaction,
  loadFinanceData,
  markNotificationRead,
  markRecurringAsPaid,
  registerCustomerPayment,
  setNotificationPreference,
  updateTransaction
} from "@/services/supabase-service";
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
  RecurringPayment,
  SavingsContribution,
  SavingsGoal,
  Transaction,
  Transfer,
  WithDocument
} from "@/types/domain";
import type { AccountInput, BudgetInput, EsikaCustomerInput, EsikaProductInput, EsikaSaleInput, RecurringPaymentInput, SavingsContributionInput, SavingsGoalInput, TransactionInput, TransferInput } from "@/validations/schemas";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";

const LOCAL_KEY = "gastos-monica-local-data";

const emptyFinanceData: FinanceData = {
  accounts: [],
  categories: [],
  transactions: [],
  recurringPayments: [],
  budgets: [],
  savingsGoals: [],
  savingsContributions: [],
  esikaProducts: [],
  esikaCustomers: [],
  esikaSales: [],
  esikaSaleItems: [],
  transfers: [],
  notifications: [],
  notificationPreferences: []
};

interface FinanceContextValue {
  data: FinanceData;
  loading: boolean;
  saving: boolean;
  reload: () => Promise<void>;
  addTransaction: (input: TransactionInput, receipt?: File) => Promise<boolean>;
  editTransaction: (previous: WithDocument<Transaction>, input: TransactionInput, receipt?: File) => Promise<boolean>;
  removeTransaction: (transaction: WithDocument<Transaction>) => Promise<boolean>;
  copyTransaction: (transaction: WithDocument<Transaction>) => Promise<boolean>;
  addAccount: (input: AccountInput) => Promise<boolean>;
  removeAccount: (accountId: string) => Promise<boolean>;
  addTransfer: (input: TransferInput) => Promise<boolean>;
  addCategory: (input: { name: string; type: "income" | "expense" | "both" | "esika"; icon: string; color: string }) => Promise<boolean>;
  saveCategory: (categoryId: string, input: { name?: string; isActive?: boolean; sortOrder?: number; color?: string }) => Promise<boolean>;
  removeCategory: (categoryId: string) => Promise<boolean>;
  addBudget: (input: BudgetInput) => Promise<boolean>;
  removeBudget: (budgetId: string) => Promise<boolean>;
  addRecurringPayment: (input: RecurringPaymentInput) => Promise<boolean>;
  removeRecurringPayment: (paymentId: string) => Promise<boolean>;
  payRecurring: (payment: WithDocument<RecurringPayment>, accountId: string) => Promise<boolean>;
  addSavingsGoal: (input: SavingsGoalInput) => Promise<boolean>;
  removeSavingsGoal: (goalId: string) => Promise<boolean>;
  addSavingsContribution: (input: SavingsContributionInput) => Promise<boolean>;
  addEsikaProduct: (input: EsikaProductInput, image?: File) => Promise<boolean>;
  removeEsikaProduct: (productId: string) => Promise<boolean>;
  addEsikaCustomer: (input: EsikaCustomerInput) => Promise<boolean>;
  removeEsikaCustomer: (customerId: string) => Promise<boolean>;
  addEsikaSale: (input: EsikaSaleInput) => Promise<boolean>;
  removeEsikaSale: (saleId: string) => Promise<boolean>;
  payEsikaSale: (sale: WithDocument<EsikaSale>, amount: number, accountId: string, paymentMethod: string, incomeCategoryId?: string) => Promise<boolean>;
  readNotification: (notificationId: string) => Promise<void>;
  toggleNotification: (preferenceId: string, enabled: boolean) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function localDocument<T extends object>(data: T): WithDocument<T> {
  const now = new Date().toISOString();
  return { ...data, $id: crypto.randomUUID(), $createdAt: now, $updatedAt: now, $permissions: [] } as WithDocument<T>;
}

function makeLocalData(userId: string): FinanceData {
  const now = new Date().toISOString();
  return {
    ...emptyFinanceData,
    accounts: defaultAccounts.map((account) => localDocument<Account>({ ...account, userId, createdAt: now })),
    categories: defaultCategories.map((category) => localDocument<Category>({ ...category, userId })),
    notificationPreferences: notificationTypes.map((item) => localDocument<NotificationPreference>({ userId, type: item.type, enabled: true }))
  };
}

function readLocalData(userId: string) {
  if (typeof window === "undefined") return makeLocalData(userId);
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as FinanceData) : makeLocalData(userId);
  } catch {
    return makeLocalData(userId);
  }
}

function saveLocalData(next: FinanceData) {
  if (typeof window !== "undefined") localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
}

function adjustAccount(data: FinanceData, accountId: string, delta: number) {
  return data.accounts.map((account) => account.$id === accountId ? { ...account, currentBalance: account.currentBalance + delta, $updatedAt: new Date().toISOString() } : account);
}

function transactionDelta(input: Pick<Transaction, "type" | "amount">) {
  return input.type === "income" ? input.amount : -input.amount;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<FinanceData>(emptyFinanceData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const localMode = !isSupabaseConfigured || user?.$id === "local-dona-monica";

  const setAndPersistLocal = useCallback((updater: (current: FinanceData) => FinanceData) => {
    setData((current) => {
      const next = updater(current);
      saveLocalData(next);
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (localMode) {
        const local = readLocalData(user.$id);
        setData(local);
        saveLocalData(local);
      } else {
        setData(await loadFinanceData(user.$id));
      }
    } catch (error) {
      showToast({ tone: "error", title: "No se pudieron cargar los datos", message: normalizeSupabaseError(error) });
    } finally {
      setLoading(false);
    }
  }, [localMode, showToast, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const run = useCallback(async (remoteAction: () => Promise<unknown>, success: string, localAction?: () => void) => {
    if (!user) return false;
    setSaving(true);
    try {
      if (localMode && localAction) {
        localAction();
      } else {
        await remoteAction();
        await reload();
      }
      showToast({ tone: "success", title: success });
      return true;
    } catch (error) {
      showToast({ tone: "error", title: "No se pudo guardar", message: normalizeSupabaseError(error) });
      return false;
    } finally {
      setSaving(false);
    }
  }, [localMode, reload, showToast, user]);

  const value = useMemo<FinanceContextValue>(() => ({
    data,
    loading,
    saving,
    reload,
    addTransaction: (input, receipt) => run(
      () => createTransaction(input, user!.$id, receipt),
      "Movimiento registrado",
      () => setAndPersistLocal((current) => {
        const tx = localDocument<Transaction>({ userId: user!.$id, ...input, receiptFileId: "", notes: input.notes || "", recurringPaymentId: input.recurringPaymentId || "", tags: input.tags ?? [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        return { ...current, transactions: [tx, ...current.transactions], accounts: adjustAccount(current, input.accountId, transactionDelta(input)) };
      })
    ),
    editTransaction: (previous, input, receipt) => run(
      () => updateTransaction(previous.$id, previous, input, receipt),
      "Movimiento actualizado",
      () => setAndPersistLocal((current) => ({ ...current, transactions: current.transactions.map((tx) => tx.$id === previous.$id ? { ...tx, ...input, updatedAt: new Date().toISOString(), $updatedAt: new Date().toISOString() } : tx), accounts: adjustAccount({ ...current, accounts: adjustAccount(current, previous.accountId, -transactionDelta(previous)) }, input.accountId, transactionDelta(input)) }))
    ),
    removeTransaction: (transaction) => run(
      () => deleteTransaction(transaction),
      "Movimiento eliminado",
      () => setAndPersistLocal((current) => ({ ...current, transactions: current.transactions.filter((tx) => tx.$id !== transaction.$id), accounts: adjustAccount(current, transaction.accountId, -transactionDelta(transaction)) }))
    ),
    copyTransaction: (transaction) => run(
      () => duplicateTransaction(transaction),
      "Movimiento duplicado",
      () => setAndPersistLocal((current) => {
        const copy = localDocument<Transaction>({ ...transaction, userId: user!.$id, transactionDate: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        return { ...current, transactions: [copy, ...current.transactions], accounts: adjustAccount(current, copy.accountId, transactionDelta(copy)) };
      })
    ),
    addAccount: (input) => run(
      () => createAccount(input, user!.$id),
      "Cuenta creada",
      () => setAndPersistLocal((current) => ({ ...current, accounts: [...current.accounts, localDocument<Account>({ ...input, userId: user!.$id, currentBalance: input.currentBalance || input.initialBalance, createdAt: new Date().toISOString() })] }))
    ),
    removeAccount: (accountId) => run(
      () => deleteAccount(accountId),
      "Cuenta eliminada",
      () => setAndPersistLocal((current) => ({ ...current, accounts: current.accounts.filter((account) => account.$id !== accountId), transactions: current.transactions.filter((transaction) => transaction.accountId !== accountId), transfers: current.transfers.filter((transfer) => transfer.sourceAccountId !== accountId && transfer.destinationAccountId !== accountId) }))
    ),
    addTransfer: (input) => run(
      () => createTransfer(input, user!.$id),
      "Transferencia registrada",
      () => setAndPersistLocal((current) => ({ ...current, transfers: [localDocument<Transfer>({ ...input, userId: user!.$id }), ...current.transfers], accounts: adjustAccount({ ...current, accounts: adjustAccount(current, input.sourceAccountId, -input.amount) }, input.destinationAccountId, input.amount) }))
    ),
    addCategory: (input) => run(
      () => createCategory({ ...input, parentCategoryId: "", isDefault: false, isActive: true, sortOrder: data.categories.length + 1 }, user!.$id),
      "Categoría creada",
      () => setAndPersistLocal((current) => ({ ...current, categories: [...current.categories, localDocument<Category>({ ...input, userId: user!.$id, parentCategoryId: "", isDefault: false, isActive: true, sortOrder: current.categories.length + 1 })] }))
    ),
    saveCategory: (categoryId, input) => run(
      () => updateCategory(categoryId, input),
      "Categoría actualizada",
      () => setAndPersistLocal((current) => ({ ...current, categories: current.categories.map((category) => category.$id === categoryId ? { ...category, ...input } : category) }))
    ),
    removeCategory: (categoryId) => run(
      () => deleteCategory(categoryId),
      "Categoría eliminada",
      () => setAndPersistLocal((current) => ({ ...current, categories: current.categories.filter((category) => category.$id !== categoryId), budgets: current.budgets.filter((budget) => budget.categoryId !== categoryId) }))
    ),
    addBudget: (input) => run(() => createBudget(input, user!.$id), "Presupuesto guardado", () => setAndPersistLocal((current) => ({ ...current, budgets: [...current.budgets, localDocument<Budget>({ ...input, userId: user!.$id })] }))),
    removeBudget: (budgetId) => run(() => deleteBudget(budgetId), "Presupuesto eliminado", () => setAndPersistLocal((current) => ({ ...current, budgets: current.budgets.filter((budget) => budget.$id !== budgetId) }))),
    addRecurringPayment: (input) => run(() => createRecurringPayment(input, user!.$id), "Pago recurrente guardado", () => setAndPersistLocal((current) => ({ ...current, recurringPayments: [...current.recurringPayments, localDocument<RecurringPayment>({ ...input, userId: user!.$id, notes: input.notes || "" })] }))),
    removeRecurringPayment: (paymentId) => run(() => deleteRecurringPayment(paymentId), "Pago recurrente eliminado", () => setAndPersistLocal((current) => ({ ...current, recurringPayments: current.recurringPayments.filter((payment) => payment.$id !== paymentId) }))),
    payRecurring: (payment, accountId) => run(() => markRecurringAsPaid(payment, accountId), "Pago registrado", () => setAndPersistLocal((current) => ({ ...current, recurringPayments: current.recurringPayments.map((item) => item.$id === payment.$id ? { ...item, status: "paid" } : item), transactions: [localDocument<Transaction>({ userId: user!.$id, type: "expense", amount: payment.amount, categoryId: payment.categoryId, accountId, description: payment.name, transactionDate: new Date().toISOString(), paymentMethod: "Efectivo", necessityLevel: "necessary", isRecurring: true, recurringPaymentId: payment.$id, notes: payment.notes || "", tags: ["recurrente"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }), ...current.transactions], accounts: adjustAccount(current, accountId, -payment.amount) }))),
    addSavingsGoal: (input) => run(() => createSavingsGoal(input, user!.$id), "Meta guardada", () => setAndPersistLocal((current) => ({ ...current, savingsGoals: [...current.savingsGoals, localDocument<SavingsGoal>({ ...input, userId: user!.$id })] }))),
    removeSavingsGoal: (goalId) => run(() => deleteSavingsGoal(goalId), "Meta eliminada", () => setAndPersistLocal((current) => ({ ...current, savingsGoals: current.savingsGoals.filter((goal) => goal.$id !== goalId), savingsContributions: current.savingsContributions.filter((contribution) => contribution.goalId !== goalId) }))),
    addSavingsContribution: (input) => run(() => remoteAddSavingsContribution(input, user!.$id), "Aporte registrado", () => setAndPersistLocal((current) => ({ ...current, savingsContributions: [...current.savingsContributions, localDocument<SavingsContribution>({ ...input, userId: user!.$id, notes: input.notes || "" })], savingsGoals: current.savingsGoals.map((goal) => goal.$id === input.goalId ? { ...goal, currentAmount: goal.currentAmount + input.amount } : goal) }))),
    addEsikaProduct: (input) => run(() => createEsikaProduct(input, user!.$id), "Producto guardado", () => setAndPersistLocal((current) => ({ ...current, esikaProducts: [...current.esikaProducts, localDocument<EsikaProduct>({ ...input, userId: user!.$id, imageFileId: "", notes: input.notes || "" })] }))),
    removeEsikaProduct: (productId) => run(() => deleteEsikaProduct(productId), "Producto eliminado", () => setAndPersistLocal((current) => ({ ...current, esikaProducts: current.esikaProducts.filter((product) => product.$id !== productId), esikaSaleItems: current.esikaSaleItems.filter((item) => item.productId !== productId) }))),
    addEsikaCustomer: (input) => run(() => createEsikaCustomer(input, user!.$id), "Clienta guardada", () => setAndPersistLocal((current) => ({ ...current, esikaCustomers: [...current.esikaCustomers, localDocument<EsikaCustomer>({ ...input, userId: user!.$id, address: input.address || "", notes: input.notes || "", createdAt: new Date().toISOString() })] }))),
    removeEsikaCustomer: (customerId) => run(() => deleteEsikaCustomer(customerId), "Clienta eliminada", () => setAndPersistLocal((current) => { const saleIds = new Set(current.esikaSales.filter((sale) => sale.customerId === customerId).map((sale) => sale.$id)); return { ...current, esikaCustomers: current.esikaCustomers.filter((customer) => customer.$id !== customerId), esikaSales: current.esikaSales.filter((sale) => sale.customerId !== customerId), esikaSaleItems: current.esikaSaleItems.filter((item) => !saleIds.has(item.saleId)) }; })),
    addEsikaSale: (input) => run(() => createEsikaSale(input, user!.$id), "Venta registrada", () => setAndPersistLocal((current) => {
      const subtotal = input.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
      const total = Math.max(0, subtotal - input.discount);
      const amountPaid = Math.min(input.amountPaid, total);
      const sale = localDocument<EsikaSale>({ userId: user!.$id, customerId: input.customerId, saleDate: input.saleDate, subtotal, discount: input.discount, total, amountPaid, pendingAmount: Math.max(0, total - amountPaid), paymentStatus: total - amountPaid <= 0 ? "paid" : amountPaid > 0 ? "partial" : input.paymentStatus, paymentMethod: input.paymentMethod, accountId: input.accountId || "", promisedPaymentDate: input.promisedPaymentDate || "", notes: input.notes || "" });
      const items = input.items.map((item) => localDocument<EsikaSaleItem>({ userId: user!.$id, saleId: sale.$id, productId: item.productId, quantity: item.quantity, unitCost: item.unitCost, unitPrice: item.unitPrice, subtotal: item.quantity * item.unitPrice, profit: item.quantity * (item.unitPrice - item.unitCost) }));
      return { ...current, esikaSales: [sale, ...current.esikaSales], esikaSaleItems: [...items, ...current.esikaSaleItems], esikaProducts: current.esikaProducts.map((product) => ({ ...product, stock: product.stock - (input.items.find((item) => item.productId === product.$id)?.quantity ?? 0) })), accounts: input.accountId && amountPaid > 0 ? adjustAccount(current, input.accountId, amountPaid) : current.accounts };
    })),
    removeEsikaSale: (saleId) => run(() => deleteEsikaSale(saleId), "Venta eliminada", () => setAndPersistLocal((current) => ({ ...current, esikaSales: current.esikaSales.filter((sale) => sale.$id !== saleId), esikaSaleItems: current.esikaSaleItems.filter((item) => item.saleId !== saleId) }))),
    payEsikaSale: (sale, amount, accountId, paymentMethod, incomeCategoryId) => run(() => registerCustomerPayment(sale, amount, accountId, paymentMethod, incomeCategoryId), "Pago de clienta registrado", () => setAndPersistLocal((current) => ({ ...current, esikaSales: current.esikaSales.map((item) => item.$id === sale.$id ? { ...item, amountPaid: item.amountPaid + amount, pendingAmount: Math.max(0, item.pendingAmount - amount), paymentStatus: item.pendingAmount - amount <= 0 ? "paid" : "partial" } : item), accounts: adjustAccount(current, accountId, amount) }))),
    async readNotification(notificationId) {
      if (localMode) setAndPersistLocal((current) => ({ ...current, notifications: current.notifications.map((item) => item.$id === notificationId ? { ...item, isRead: true } : item) }));
      else { await markNotificationRead(notificationId); await reload(); }
    },
    async toggleNotification(preferenceId, enabled) {
      if (localMode) setAndPersistLocal((current) => ({ ...current, notificationPreferences: current.notificationPreferences.map((item) => item.$id === preferenceId ? { ...item, enabled } : item) }));
      else { await setNotificationPreference(preferenceId, enabled); await reload(); }
    }
  }), [data, loading, localMode, reload, run, saving, setAndPersistLocal, user]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance debe usarse dentro de FinanceProvider");
  return context;
}



