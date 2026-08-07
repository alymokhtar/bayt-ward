import {
  BUSINESS_TIME_ZONE,
  getEgyptCalendarDateStamp,
} from "@/lib/business-day";
import { DISPLAY_LOCALE } from "@/lib/constants";
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export function resolvePagination(
  page?: number | string,
  pageSize?: number | string
) {
  const size = Math.min(
    Math.max(
      parseInt(String(pageSize ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
      1
    ),
    MAX_PAGE_SIZE
  );
  const currentPage = Math.max(parseInt(String(page ?? 1), 10) || 1, 1);

  return {
    take: size,
    skip: (currentPage - 1) * size,
    page: currentPage,
    pageSize: size,
  };
}

export function totalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: totalPages(total, pageSize),
  };
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return value.toLocaleString(DISPLAY_LOCALE, options);
}

export function formatCurrency(amount: number, symbol = "ج.م"): string {
  return `${formatNumber(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}

function normalizeDateInput(date: Date | string): Date {
  return date instanceof Date ? new Date(date.getTime()) : new Date(date);
}

function formatDateWithCairoTimeZone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions
): string {
  const parsedDate = normalizeDateInput(date);

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  }).format(parsedDate);
}

export function formatDate(date: Date | string): string {
  return formatDateWithCairoTimeZone(date, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCairoDateTime(date: Date | string): string {
  return formatDateWithCairoTimeZone(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  return formatCairoDateTime(date);
}

export function generateInvoiceNumber(prefix: string): string {
  const date = getEgyptCalendarDateStamp();
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

export function getPaymentMethodLabel(method: string | null | undefined): string {
  const labels: Record<string, string> = {
    CASH: "كاش",
    CARD: "فيزا",
    INSTAPAY: "إنستاباي",
    WALLET: "محفظة",
    TRANSFER: "تحويل",
    MIXED: "مختلط",
  };
  if (!method) return "—";
  return labels[method] || method;
}

export function getPaymentDisplayLabel(
  fallbackMethod: string | null | undefined,
  payments?: Array<{ method?: string | null; amount?: number }> | null
): string {
  if (payments && payments.length > 1) {
    return getPaymentMethodLabel("MIXED");
  }

  if (payments && payments.length === 1) {
    return getPaymentMethodLabel(payments[0]?.method ?? fallbackMethod);
  }

  return getPaymentMethodLabel(fallbackMethod);
}

export function getSaleStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    COMPLETED: "مكتملة",
    PENDING: "قيد الانتظار",
    CANCELLED: "ملغاة",
    REFUNDED: "مستردة",
    PARTIALLY_REFUNDED: "جزئي",
  };
  return labels[status] || status;
}

export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-purple-100 text-purple-800",
    PARTIALLY_REFUNDED: "bg-orange-100 text-orange-800",
    RECEIVED: "bg-green-100 text-green-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}
