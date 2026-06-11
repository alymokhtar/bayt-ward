import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, symbol = "ج.م"): string {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateInvoiceNumber(prefix: string): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${date}-${random}`;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "مدير",
    MANAGER: "مدير فرع",
    CASHIER: "كاشير",
  };
  return labels[role] || role;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "نقدي",
    CARD: "بطاقة",
    TRANSFER: "تحويل",
    MIXED: "مختلط",
  };
  return labels[method] || method;
}

export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-purple-100 text-purple-800",
    RECEIVED: "bg-green-100 text-green-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}
