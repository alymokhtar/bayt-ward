import type { PaymentMethod } from "@prisma/client";

export type NormalizedSalePayment = {
  amount: number;
  method: PaymentMethod;
};

export type SalePaymentRow = {
  method?: string | null;
  amount?: number | string | null;
};

export function normalizeSalePayments(input: {
  payments?: Array<{ amount: number; method: PaymentMethod }>;
  paidAmount: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
}) {
  const hasMultiplePayments = (input.payments?.length ?? 0) > 1;

  const normalizedPayments = (input.payments?.length
    ? input.payments
    : [{ amount: input.paidAmount, method: input.paymentMethod ?? "CASH" }]
  ).map((payment) => {
    const rawAmount = Number(payment.amount ?? 0);
    const cappedAmount = hasMultiplePayments ? rawAmount : Math.min(rawAmount, input.totalAmount);

    return {
      amount: Number(cappedAmount.toFixed(2)),
      method: payment.method,
    };
  });

  const paymentTotal = normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const effectivePaidAmount = hasMultiplePayments
    ? paymentTotal
    : Math.min(input.totalAmount, paymentTotal);

  return {
    normalizedPayments,
    effectivePaidAmount,
  };
}

export function getSalePaymentSummary(input: {
  totalAmount: number;
  fallbackPaidAmount?: number;
  tenderedAmount?: number;
  changeAmount?: number;
  paymentMethod?: string | null;
  payments?: SalePaymentRow[] | null;
}) {
  const normalizedPayments = (input.payments ?? [])
    .filter((payment) => payment && payment.amount !== null && payment.amount !== undefined)
    .map((payment) => {
      const amount = Number(payment.amount ?? 0);
      return {
        method: payment.method ?? input.paymentMethod ?? "CASH",
        amount: Number.isFinite(amount) ? amount : 0,
      };
    });

  const explicitTenderedAmount =
    input.tenderedAmount !== undefined && Number.isFinite(input.tenderedAmount)
      ? Number(input.tenderedAmount)
      : undefined;
  const explicitChangeAmount =
    input.changeAmount !== undefined && Number.isFinite(input.changeAmount)
      ? Number(input.changeAmount)
      : undefined;

  const paidAmount = explicitTenderedAmount !== undefined
    ? explicitTenderedAmount
    : normalizedPayments.length > 0
      ? normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0)
      : Number(input.fallbackPaidAmount ?? 0);

  const remainingAmount = explicitChangeAmount !== undefined
    ? explicitChangeAmount
    : Math.max(input.totalAmount - paidAmount, 0);

  const paymentSummary = normalizedPayments.length > 1
    ? "MIXED"
    : normalizedPayments[0]?.method ?? input.paymentMethod ?? "CASH";

  return {
    paidAmount,
    remainingAmount,
    paymentSummary,
    normalizedPayments,
  };
}
