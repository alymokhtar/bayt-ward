import CashRegisterClient from "@/app/(dashboard)/sales/cash-register/CashRegisterClient";
import { getCashRegisterReview } from "@/lib/actions/sales";

interface CashRegisterPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

export default async function CashRegisterPage({
  searchParams,
}: CashRegisterPageProps) {
  const { from, to } = await searchParams;
  const review = await getCashRegisterReview(from, to);

  return <CashRegisterClient review={review} />;
}
