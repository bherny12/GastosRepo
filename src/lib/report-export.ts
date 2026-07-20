import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Category, Transaction, WithDocument } from "@/types/domain";

function findCategory(categories: WithDocument<Category>[], id: string) {
  return categories.find((category) => category.$id === id)?.name ?? "Sin categoría";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCsv(transactions: WithDocument<Transaction>[], categories: WithDocument<Category>[], period: string) {
  const rows = [
    ["Los gastos de Doña Mónica"],
    [`Periodo: ${period}`],
    [`Generado: ${formatDate(new Date())}`],
    [],
    ["Fecha", "Tipo", "Categoría", "Descripción", "Método", "Monto", "Notas"],
    ...transactions.map((transaction) => [
      formatDate(transaction.transactionDate),
      transaction.type === "income" ? "Ingreso" : "Gasto",
      findCategory(categories, transaction.categoryId),
      transaction.description,
      transaction.paymentMethod,
      transaction.amount.toFixed(2),
      transaction.notes || ""
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadBlob(`reporte-dona-monica-${Date.now()}.csv`, new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
}

async function logoDataUrl() {
  const response = await fetch("/logo.png");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportTransactionsPdf(transactions: WithDocument<Transaction>[], categories: WithDocument<Category>[], period: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await logoDataUrl().catch(() => "");
  if (logo) doc.addImage(logo, "PNG", 14, 12, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Los gastos de Doña Mónica", 42, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Periodo: ${period}`, 42, 27);
  doc.text(`Generado: ${formatDate(new Date())}`, 42, 32);

  const income = transactions.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((total, item) => total + item.amount, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`Ingresos: ${formatCurrency(income)}    Gastos: ${formatCurrency(expense)}    Balance: ${formatCurrency(income - expense)}`, 14, 44);

  autoTable(doc, {
    startY: 52,
    head: [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]],
    body: transactions.map((transaction) => [
      formatDate(transaction.transactionDate),
      transaction.type === "income" ? "Ingreso" : "Gasto",
      findCategory(categories, transaction.categoryId),
      transaction.description,
      formatCurrency(transaction.amount)
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [139, 58, 74] },
    alternateRowStyles: { fillColor: [251, 243, 230] }
  });
  doc.save(`reporte-dona-monica-${Date.now()}.pdf`);
}
