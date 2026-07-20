export type TransactionType = "income" | "expense";
export type CategoryType = TransactionType | "both" | "esika";
export type NecessityLevel = "necessary" | "important" | "avoidable";
export type RecurringStatus = "pending" | "paid" | "overdue" | "partial";
export type PaymentStatus = "paid" | "pending" | "partial";
export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type ThemeMode = "light" | "dark" | "system";

export interface AppDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions?: string[];
}

export type WithDocument<T> = T & AppDocument;

export interface Profile {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  currency: string;
  timezone: string;
  language: string;
  dateFormat: string;
  weekStartsOn: "monday" | "sunday";
  theme: ThemeMode;
  textScale: number;
  pinEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  userId: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  userId: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parentCategoryId?: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Transaction {
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  description: string;
  transactionDate: string;
  paymentMethod: string;
  necessityLevel?: NecessityLevel;
  receiptFileId?: string;
  isRecurring: boolean;
  recurringPaymentId?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurringPayment {
  userId: string;
  name: string;
  amount: number;
  categoryId: string;
  accountId?: string;
  frequency: Frequency;
  dueDay: number;
  nextDueDate: string;
  priority: "high" | "medium" | "low";
  reminderDays: number;
  status: RecurringStatus;
  receiptFileId?: string;
  notes?: string;
}

export interface Budget {
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  alertPercentage: number;
}

export interface SavingsGoal {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  icon: string;
  status: "active" | "completed" | "paused";
}

export interface SavingsContribution {
  userId: string;
  goalId: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface EsikaProduct {
  userId: string;
  name: string;
  code?: string;
  category: string;
  campaign?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  imageFileId?: string;
  isActive: boolean;
  notes?: string;
}

export interface EsikaCustomer {
  userId: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface EsikaSale {
  userId: string;
  customerId: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  accountId?: string;
  promisedPaymentDate?: string;
  notes?: string;
}

export interface EsikaSaleItem {
  userId: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  subtotal: number;
  profit: number;
}

export interface Transfer {
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  transferDate: string;
  notes?: string;
}

export interface AppNotification {
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface NotificationPreference {
  userId: string;
  type: string;
  enabled: boolean;
}

export interface FinanceData {
  accounts: WithDocument<Account>[];
  categories: WithDocument<Category>[];
  transactions: WithDocument<Transaction>[];
  recurringPayments: WithDocument<RecurringPayment>[];
  budgets: WithDocument<Budget>[];
  savingsGoals: WithDocument<SavingsGoal>[];
  savingsContributions: WithDocument<SavingsContribution>[];
  esikaProducts: WithDocument<EsikaProduct>[];
  esikaCustomers: WithDocument<EsikaCustomer>[];
  esikaSales: WithDocument<EsikaSale>[];
  esikaSaleItems: WithDocument<EsikaSaleItem>[];
  transfers: WithDocument<Transfer>[];
  notifications: WithDocument<AppNotification>[];
  notificationPreferences: WithDocument<NotificationPreference>[];
}

export interface DashboardMetrics {
  availableMoney: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  esikaSales: number;
  esikaProfit: number;
  upcomingPayments: number;
  pendingDebts: number;
  budgetRemaining: number;
}
