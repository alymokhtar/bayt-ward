/** Cache tags for unstable_cache + revalidateTag after mutations */
export const CACHE_TAG = {
  products: "products",
  customers: "customers",
  sales: "sales",
  inventory: "inventory",
  stockMovements: "stock-movements",
  dashboard: "dashboard",
  categories: "categories",
  suppliers: "suppliers",
  purchases: "purchases",
  returns: "returns",
  expenses: "expenses",
  employees: "employees",
  settings: "settings",
  reports: "reports",
  session: "session",
  storefront: "storefront",
} as const;

/** Default TTL for read-heavy list/stats queries (seconds) */
export const READ_CACHE_SECONDS = 30;
