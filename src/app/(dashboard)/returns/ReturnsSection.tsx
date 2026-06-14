import ReturnsClient from "@/app/(dashboard)/returns/ReturnsClient";
import { getReturns } from "@/lib/actions/returns";

export default async function ReturnsSection() {
  const returns = await getReturns();
  return <ReturnsClient returns={returns} />;
}
