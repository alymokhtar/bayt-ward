import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/server-cache";

export function invalidateSalesData() {
  updateTag(CACHE_TAG.sales);
  updateTag(CACHE_TAG.dashboard);
  updateTag(CACHE_TAG.inventory);
  updateTag(CACHE_TAG.customers);
  updateTag(CACHE_TAG.reports);
  revalidatePath("/sales");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/customers");
  revalidatePath("/reports");
}

export function invalidateProductsData() {
  updateTag(CACHE_TAG.products);
  updateTag(CACHE_TAG.inventory);
  updateTag(CACHE_TAG.dashboard);
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}

export function invalidateCustomersData() {
  updateTag(CACHE_TAG.customers);
  updateTag(CACHE_TAG.dashboard);
  revalidatePath("/customers");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}

export function invalidateInventoryData() {
  updateTag(CACHE_TAG.inventory);
  updateTag(CACHE_TAG.stockMovements);
  updateTag(CACHE_TAG.dashboard);
  updateTag(CACHE_TAG.reports);
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export function invalidatePurchasesData() {
  updateTag(CACHE_TAG.purchases);
  updateTag(CACHE_TAG.suppliers);
  updateTag(CACHE_TAG.inventory);
  updateTag(CACHE_TAG.dashboard);
  updateTag(CACHE_TAG.reports);
  revalidatePath("/purchases");
  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export function invalidateReturnsData() {
  updateTag(CACHE_TAG.returns);
  updateTag(CACHE_TAG.sales);
  updateTag(CACHE_TAG.inventory);
  updateTag(CACHE_TAG.customers);
  updateTag(CACHE_TAG.dashboard);
  updateTag(CACHE_TAG.reports);
  revalidatePath("/returns");
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export function invalidateExpensesData() {
  updateTag(CACHE_TAG.expenses);
  updateTag(CACHE_TAG.dashboard);
  updateTag(CACHE_TAG.reports);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export function invalidateCategoriesData() {
  updateTag(CACHE_TAG.categories);
  updateTag(CACHE_TAG.products);
  updateTag(CACHE_TAG.dashboard);
  revalidatePath("/categories");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export function invalidateSuppliersData() {
  updateTag(CACHE_TAG.suppliers);
  updateTag(CACHE_TAG.purchases);
  revalidatePath("/suppliers");
  revalidatePath("/purchases");
}

export function invalidateEmployeesData() {
  updateTag(CACHE_TAG.employees);
  updateTag(CACHE_TAG.session);
  revalidatePath("/employees");
}

export function invalidateSettingsData() {
  updateTag(CACHE_TAG.settings);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
}

export function invalidateReportsData() {
  updateTag(CACHE_TAG.reports);
  revalidatePath("/reports");
}
