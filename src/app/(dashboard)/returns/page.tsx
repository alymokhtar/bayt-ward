import ReturnsClient from "@/app/(dashboard)/returns/ReturnsClient";
import { Card, CardContent } from "@/components/ui/Card";
import { getReturns } from "@/lib/actions/returns";

export default async function ReturnsPage() {
  const returns = await getReturns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">المرتجعات</h1>
        <p className="text-sm text-muted mt-1">معالجة مرتجعات العملاء</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ReturnsClient returns={returns} />
        </CardContent>
      </Card>
    </div>
  );
}
