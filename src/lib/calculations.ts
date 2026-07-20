import type { Budget, Category, DashboardMetrics, EsikaSale, EsikaSaleItem, FinanceData, Transaction, WithDocument } from "@/types/domain";
import { dailyPhrases } from "@/lib/defaults";
import { endOfLocalMonth, startOfLocalMonth } from "@/lib/formatters";

function inRange(date: string, start: Date, end: Date) {
  const value = new Date(date).getTime();
  return value >= start.getTime() && value <= end.getTime();
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export function getCategory(categories: WithDocument<Category>[], categoryId?: string) {
  return categories.find((category) => category.$id === categoryId);
}

export function calculateMetrics(data: FinanceData, date = new Date()): DashboardMetrics {
  const start = startOfLocalMonth(date);
  const end = endOfLocalMonth(date);
  const monthlyTransactions = data.transactions.filter((transaction) => inRange(transaction.transactionDate, start, end));
  const monthlyIncome = sum(monthlyTransactions.filter((item) => item.type === "income").map((item) => item.amount));
  const monthlyExpenses = sum(monthlyTransactions.filter((item) => item.type === "expense").map((item) => item.amount));
  const monthlySales = data.esikaSales.filter((sale) => inRange(sale.saleDate, start, end));
  const saleIds = new Set(monthlySales.map((sale) => sale.$id));
  const monthlyItems = data.esikaSaleItems.filter((item) => saleIds.has(item.saleId));
  const paidCustomerDebt = sum(data.esikaSales.map((sale) => sale.pendingAmount));
  const recurringDue = data.recurringPayments.filter((payment) => payment.status !== "paid" && new Date(payment.nextDueDate) <= end);
  const budgetRemaining = calculateBudgetRemaining(data.budgets, data.transactions, data.categories, date);

  return {
    availableMoney: sum(data.accounts.filter((account) => account.isActive).map((account) => account.currentBalance)),
    monthlyIncome,
    monthlyExpenses,
    monthlyBalance: monthlyIncome - monthlyExpenses,
    esikaSales: sum(monthlySales.map((sale) => sale.total)),
    esikaProfit: sum(monthlyItems.map((item) => item.profit)),
    upcomingPayments: recurringDue.length,
    pendingDebts: paidCustomerDebt,
    budgetRemaining
  };
}

export function calculateBudgetRemaining(
  budgets: WithDocument<Budget>[],
  transactions: WithDocument<Transaction>[],
  categories: WithDocument<Category>[],
  date = new Date()
) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const activeBudgets = budgets.filter((budget) => budget.month === month && budget.year === year);
  return sum(
    activeBudgets.map((budget) => {
      const used = sum(
        transactions
          .filter((transaction) => transaction.type === "expense" && transaction.categoryId === budget.categoryId)
          .filter((transaction) => {
            const txDate = new Date(transaction.transactionDate);
            return txDate.getMonth() + 1 === month && txDate.getFullYear() === year;
          })
          .map((transaction) => transaction.amount)
      );
      return budget.amount - used;
    })
  );
}

export function monthSeries(transactions: WithDocument<Transaction>[]) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("es-PE", { month: "short" }), income: 0, expense: 0 };
  });

  transactions.forEach((transaction) => {
    const date = new Date(transaction.transactionDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const row = months.find((item) => item.key === key);
    if (row) row[transaction.type] += transaction.amount;
  });

  return months;
}

export function categoryExpenseSeries(transactions: WithDocument<Transaction>[], categories: WithDocument<Category>[]) {
  const totals = new Map<string, number>();
  const start = startOfLocalMonth();
  const end = endOfLocalMonth();
  transactions
    .filter((transaction) => transaction.type === "expense" && inRange(transaction.transactionDate, start, end))
    .forEach((transaction) => totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amount));

  return Array.from(totals.entries())
    .map(([categoryId, value]) => ({ name: getCategory(categories, categoryId)?.name ?? "Sin categoría", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function balanceEvolution(transactions: WithDocument<Transaction>[]) {
  let balance = 0;
  return [...transactions]
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime())
    .slice(-40)
    .map((transaction) => {
      balance += transaction.type === "income" ? transaction.amount : -transaction.amount;
      return { date: new Date(transaction.transactionDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }), saldo: balance };
    });
}

export function weeklyExpenseSeries(transactions: WithDocument<Transaction>[]) {
  const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const rows = labels.map((day) => ({ day, gastos: 0 }));
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  transactions
    .filter((transaction) => transaction.type === "expense" && new Date(transaction.transactionDate) >= start)
    .forEach((transaction) => {
      const day = (new Date(transaction.transactionDate).getDay() + 6) % 7;
      rows[day].gastos += transaction.amount;
    });
  return rows;
}

export function esikaMonthlySeries(sales: WithDocument<EsikaSale>[], items: WithDocument<EsikaSaleItem>[]) {
  const months = monthSeries([] as WithDocument<Transaction>[]).map(({ key, label }) => ({ key, label, ventas: 0, ganancia: 0 }));
  sales.forEach((sale) => {
    const date = new Date(sale.saleDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const row = months.find((item) => item.key === key);
    if (!row) return;
    row.ventas += sale.total;
    row.ganancia += sum(items.filter((item) => item.saleId === sale.$id).map((item) => item.profit));
  });
  return months;
}

export function getDailyPhrase() {
  const day = Math.floor(Date.now() / 86400000);
  return dailyPhrases[day % dailyPhrases.length];
}

export function buildAdvice(data: FinanceData) {
  const metrics = calculateMetrics(data);
  const advice: string[] = [];
  const smallExpenses = sum(data.transactions.filter((tx) => tx.type === "expense" && tx.amount <= 20 && new Date(tx.transactionDate) >= startOfLocalMonth()).map((tx) => tx.amount));
  const upcoming = data.recurringPayments.filter((payment) => payment.status !== "paid" && new Date(payment.nextDueDate).getTime() - Date.now() <= 7 * 86400000);
  const lowStock = data.esikaProducts.filter((product) => product.isActive && product.stock <= product.minimumStock);

  if (smallExpenses > 0) advice.push(`Sus gastos pequeños sumaron ${new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(smallExpenses)} este mes.`);
  if (upcoming.length > 0) advice.push(`Tiene ${upcoming.length} pago${upcoming.length === 1 ? "" : "s"} importante${upcoming.length === 1 ? "" : "s"} durante los próximos siete días.`);
  if (metrics.monthlyExpenses > 0 && metrics.esikaSales > 0) advice.push(`Las ventas de Ésika cubrieron el ${Math.round((metrics.esikaSales / metrics.monthlyExpenses) * 100)} % de los gastos del hogar.`);
  if (metrics.budgetRemaining < 0) advice.push("Un presupuesto ya superó su límite; conviene revisarlo con calma antes de nuevos gastos de esa categoría.");
  if (lowStock.length > 0) advice.push(`Hay ${lowStock.length} producto${lowStock.length === 1 ? "" : "s"} de Ésika con poco stock.`);
  advice.push("Registrar los gastos pequeños ayuda a conocer a dónde se va el dinero.");
  advice.push("Podría separar primero el dinero del alquiler y las universidades para ver el saldo disponible con más claridad.");
  return advice.slice(0, 5);
}
