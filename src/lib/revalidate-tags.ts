import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAG } from "@/lib/server-cache";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error(`Failed to revalidate path: ${path}`, error);
  }
}

function safeUpdateTag(tag: string) {
  try {
    updateTag(tag);
  } catch (error) {
    console.error(`Failed to update tag: ${tag}`, error);
  }
}

export function invalidateSalesData() {
  safeUpdateTag(CACHE_TAG.sales);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.inventory);
  safeUpdateTag(CACHE_TAG.customers);
  safeUpdateTag(CACHE_TAG.reports);
  safeRevalidatePath("/sales");
  safeRevalidatePath("/pos");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/inventory");
  safeRevalidatePath("/customers");
  safeRevalidatePath("/reports");
}

export function invalidateProductsData() {
  safeUpdateTag(CACHE_TAG.products);
  safeUpdateTag(CACHE_TAG.inventory);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.storefront);
  safeRevalidatePath("/products");
  safeRevalidatePath("/inventory");
  safeRevalidatePath("/pos");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/");
  safeRevalidatePath("/store/products");
  safeRevalidatePath("/store/categories");
}

export function invalidateStorefrontData() {
  safeUpdateTag(CACHE_TAG.storefront);
  safeRevalidatePath("/store");
  safeRevalidatePath("/store/products");
  safeRevalidatePath("/store/categories");
}

export function invalidateCustomersData() {
  safeUpdateTag(CACHE_TAG.customers);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeRevalidatePath("/customers");
  safeRevalidatePath("/pos");
  safeRevalidatePath("/dashboard");
}

export function invalidateInventoryData() {
  safeUpdateTag(CACHE_TAG.inventory);
  safeUpdateTag(CACHE_TAG.stockMovements);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.reports);
  safeRevalidatePath("/inventory");
  safeRevalidatePath("/products");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/reports");
}

export function invalidatePurchasesData() {
  safeUpdateTag(CACHE_TAG.purchases);
  safeUpdateTag(CACHE_TAG.suppliers);
  safeUpdateTag(CACHE_TAG.inventory);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.reports);
  safeRevalidatePath("/purchases");
  safeRevalidatePath("/suppliers");
  safeRevalidatePath("/inventory");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/reports");
}

export function invalidateReturnsData() {
  safeUpdateTag(CACHE_TAG.returns);
  safeUpdateTag(CACHE_TAG.sales);
  safeUpdateTag(CACHE_TAG.inventory);
  safeUpdateTag(CACHE_TAG.customers);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.reports);
  safeRevalidatePath("/returns");
  safeRevalidatePath("/sales");
  safeRevalidatePath("/inventory");
  safeRevalidatePath("/customers");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/reports");
}

export function invalidateExpensesData() {
  safeUpdateTag(CACHE_TAG.expenses);
  safeUpdateTag(CACHE_TAG.employees);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.reports);
  safeRevalidatePath("/expenses");
  safeRevalidatePath("/employees");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/reports");
}

export function invalidateCategoriesData() {
  safeUpdateTag(CACHE_TAG.categories);
  safeUpdateTag(CACHE_TAG.products);
  safeUpdateTag(CACHE_TAG.dashboard);
  safeUpdateTag(CACHE_TAG.storefront);
  safeRevalidatePath("/categories");
  safeRevalidatePath("/products");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/store");
  safeRevalidatePath("/store/categories");
}

export function invalidateSuppliersData() {
  safeUpdateTag(CACHE_TAG.suppliers);
  safeUpdateTag(CACHE_TAG.purchases);
  safeRevalidatePath("/suppliers");
  safeRevalidatePath("/purchases");
}

export function invalidateEmployeesData() {
  safeUpdateTag(CACHE_TAG.employees);
  safeUpdateTag(CACHE_TAG.expenses);
  safeUpdateTag(CACHE_TAG.session);
  safeRevalidatePath("/employees");
  safeRevalidatePath("/expenses");
}

export function invalidateSettingsData() {
  safeUpdateTag(CACHE_TAG.settings);
  safeUpdateTag(CACHE_TAG.storefront);
  safeRevalidatePath("/settings");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/pos");
  safeRevalidatePath("/");
}

export function invalidateReportsData() {
  safeUpdateTag(CACHE_TAG.reports);
  safeRevalidatePath("/reports");
}
