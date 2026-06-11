import CustomersClient from "@/app/(dashboard)/customers/CustomersClient";
import { Card, CardContent } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { getCustomers } from "@/lib/actions/customers";
import { Search, Users } from "lucide-react";
import Button from "@/components/ui/Button";

interface CustomersPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const { search } = await searchParams;
  const customers = await getCustomers({ search });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown">العملاء</h1>
        <p className="text-sm text-muted mt-1">{customers.length} عميل</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                name="search"
                defaultValue={search}
                placeholder="بحث بالاسم أو الهاتف..."
                className="w-full h-10 rounded-lg border border-border bg-white ps-10 pe-4 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary">
              بحث
            </Button>
          </form>

          {customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8 text-gold" strokeWidth={1.5} />}
              title="لا يوجد عملاء"
              description="أضف عملاء جدد لتتبع مشترياتهم"
            />
          ) : (
            <CustomersClient customers={customers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
