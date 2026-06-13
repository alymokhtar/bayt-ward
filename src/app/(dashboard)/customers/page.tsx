import CustomersClient from "@/app/(dashboard)/customers/CustomersClient";
import { getCustomers } from "@/lib/actions/customers";
import { resolveSession } from "@/lib/auth";

interface CustomersPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const { search } = await searchParams;

  const [customers, session] = await Promise.all([
    getCustomers({ search }),
    resolveSession(),
  ]);

  const canManage =
    session?.role === "ADMIN" || session?.role === "MANAGER";

  return (
    <CustomersClient
      customers={customers}
      search={search}
      canManage={canManage}
    />
  );
}
