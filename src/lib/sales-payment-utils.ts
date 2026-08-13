import type { PaymentMethod } from "@prisma/client";

export type NormalizedSalePayment = {
  amount: number;
  method: PaymentMethod;
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
  ).map((payment) => ({
    amount: Number(payment.amount.toFixed(2)),
    method: payment.method,
  }));

  const paymentTotal = normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const effectivePaidAmount = hasMultiplePayments
    ? paymentTotal
    : Math.min(input.totalAmount, paymentTotal);

  const normalizedForStorage = normalizedPayments.map((payment) => ({
    ...payment,
    amount: payment.amount > 0 && payment.amount > input.totalAmount ? input.totalAmount : payment.amount,
  }));

  return {
    normalizedPayments: normalizedForStorage,
    effectivePaidAmount,
  };
}
