"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeSupabaseError } from "@/lib/supabase";
import {
  addSavingsContribution,
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
  deleteTransaction,
  duplicateTransaction,
  loadFinanceData,
  markNotificationRead,
  markRecurringAsPaid,
  registerCustomerPayment,
  setNotificationPreference,
  updateTransaction
} from "@/services/supabase-service";
import type { EsikaSale, FinanceData, RecurringPayment, Transaction, WithDocument } from "@/types/domain";
import type { AccountInput, BudgetInput, EsikaCustomerInput, EsikaProductInput, EsikaSaleInput, RecurringPaymentInput, SavingsContributionInput, SavingsGoalInput, TransactionInput, TransferInput } from "@/validations/schemas";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";

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
  addTransfer: (input: TransferInput) => Promise<boolean>;
  addCategory: (input: { name: string; type: "income" | "expense" | "both" | "esika"; icon: string; color: string }) => Promise<boolean>;
  saveCategory: (categoryId: string, input: { name?: string; isActive?: boolean; sortOrder?: number; color?: string }) => Promise<boolean>;
  addBudget: (input: BudgetInput) => Promise<boolean>;
  addRecurringPayment: (input: RecurringPaymentInput) => Promise<boolean>;
  payRecurring: (payment: WithDocument<RecurringPayment>, accountId: string) => Promise<boolean>;
  addSavingsGoal: (input: SavingsGoalInput) => Promise<boolean>;
  addSavingsContribution: (input: SavingsContributionInput) => Promise<boolean>;
  addEsikaProduct: (input: EsikaProductInput, image?: File) => Promise<boolean>;
  addEsikaCustomer: (input: EsikaCustomerInput) => Promise<boolean>;
  addEsikaSale: (input: EsikaSaleInput) => Promise<boolean>;
  payEsikaSale: (sale: WithDocument<EsikaSale>, amount: number, accountId: string, paymentMethod: string, incomeCategoryId?: string) => Promise<boolean>;
  readNotification: (notificationId: string) => Promise<void>;
  toggleNotification: (preferenceId: string, enabled: boolean) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<FinanceData>(emptyFinanceData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setData(await loadFinanceData(user.$id));
    } catch (error) {
      showToast({ tone: "error", title: "No se pudieron cargar los datos", message: normalizeSupabaseError(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      if (!user) return false;
      setSaving(true);
      try {
        await action();
        await reload();
        showToast({ tone: "success", title: success });
        return true;
      } catch (error) {
        showToast({ tone: "error", title: "No se pudo guardar", message: normalizeSupabaseError(error) });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [reload, showToast, user]
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      data,
      loading,
      saving,
      reload,
      addTransaction: (input, receipt) => run(() => createTransaction(input, user!.$id, receipt), "Movimiento registrado"),
      editTransaction: (previous, input, receipt) => run(() => updateTransaction(previous.$id, previous, input, receipt), "Movimiento actualizado"),
      removeTransaction: (transaction) => run(() => deleteTransaction(transaction), "Movimiento eliminado"),
      copyTransaction: (transaction) => run(() => duplicateTransaction(transaction), "Movimiento duplicado"),
      addAccount: (input) => run(() => createAccount(input, user!.$id), "Cuenta creada"),
      addTransfer: (input) => run(() => createTransfer(input, user!.$id), "Transferencia registrada"),
      addCategory: (input) => run(() => createCategory({ ...input, parentCategoryId: "", isDefault: false, isActive: true, sortOrder: data.categories.length + 1 }, user!.$id), "Categoría creada"),
      saveCategory: (categoryId, input) => run(() => updateCategory(categoryId, input), "Categoría actualizada"),
      addBudget: (input) => run(() => createBudget(input, user!.$id), "Presupuesto guardado"),
      addRecurringPayment: (input) => run(() => createRecurringPayment(input, user!.$id), "Pago recurrente guardado"),
      payRecurring: (payment, accountId) => run(() => markRecurringAsPaid(payment, accountId), "Pago registrado"),
      addSavingsGoal: (input) => run(() => createSavingsGoal(input, user!.$id), "Meta guardada"),
      addSavingsContribution: (input) => run(() => addSavingsContribution(input, user!.$id), "Aporte registrado"),
      addEsikaProduct: (input, image) => run(() => createEsikaProduct(input, user!.$id, image), "Producto guardado"),
      addEsikaCustomer: (input) => run(() => createEsikaCustomer(input, user!.$id), "Clienta guardada"),
      addEsikaSale: (input) => run(() => createEsikaSale(input, user!.$id), "Venta registrada"),
      payEsikaSale: (sale, amount, accountId, paymentMethod, incomeCategoryId) => run(() => registerCustomerPayment(sale, amount, accountId, paymentMethod, incomeCategoryId), "Pago de clienta registrado"),
      async readNotification(notificationId) {
        await markNotificationRead(notificationId);
        await reload();
      },
      async toggleNotification(preferenceId, enabled) {
        await setNotificationPreference(preferenceId, enabled);
        await reload();
      }
    }),
    [data, loading, reload, run, saving, user]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance debe usarse dentro de FinanceProvider");
  return context;
}




