import { prisma } from "@/lib/prisma";

export const BACKUP_VERSION = 5 as const;

type BackupRow = Record<string, unknown>;

export interface BackupPayload {
  version: number;
  generatedAt: string;
  data: {
    settings: BackupRow[];
    users: BackupRow[];
    coupons: BackupRow[];
    categories: BackupRow[];
    globalColors: BackupRow[];
    products: BackupRow[];
    productColors: BackupRow[];
    productMedia: BackupRow[];
    productVariants: BackupRow[];
    customers: BackupRow[];
    suppliers: BackupRow[];
    sales: BackupRow[];
    saleItems: BackupRow[];
    purchases: BackupRow[];
    purchaseItems: BackupRow[];
    returns: BackupRow[];
    returnItems: BackupRow[];
    exchanges: BackupRow[];
    exchangeSettlements: BackupRow[];
    stockMovements: BackupRow[];
    expenses: BackupRow[];
    employeeAdjustments: BackupRow[];
  };
}

interface BackupPayloadLike {
  version?: number;
  generatedAt?: string;
  data?: Partial<BackupPayload["data"]>;
}

export interface BackupRestoreCounts {
  settings: number;
  users: number;
  coupons: number;
  categories: number;
  globalColors: number;
  products: number;
  productColors: number;
  productMedia: number;
  productVariants: number;
  customers: number;
  suppliers: number;
  sales: number;
  saleItems: number;
  purchases: number;
  purchaseItems: number;
  returns: number;
  returnItems: number;
  exchanges: number;
  exchangeSettlements: number;
  stockMovements: number;
  expenses: number;
  employeeAdjustments: number;
}

function cloneRecords<T>(records: T[]): T[] {
  return JSON.parse(JSON.stringify(records)) as T[];
}

function toDate(value: unknown): Date {
  return new Date(String(value));
}

function toNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  return new Date(String(value));
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function buildBackupFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return `bayt-ward-backup-${stamp}.json`;
}

export async function createBackupSnapshot(): Promise<BackupPayload> {
  const [
    settings,
    users,
    coupons,
    categories,
    globalColors,
    products,
    productColors,
    productMedia,
    productVariants,
    customers,
    suppliers,
    sales,
    saleItems,
    purchases,
    purchaseItems,
    returns,
    returnItems,
    exchanges,
    exchangeSettlements,
    stockMovements,
    expenses,
    employeeAdjustments,
  ] = await Promise.all([
    prisma.setting.findMany({ orderBy: { key: "asc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        salary: true,
        startDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.coupon.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.globalColor.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productColor.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productMedia.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productVariant.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.supplier.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.sale.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.saleItem.findMany({ orderBy: { id: "asc" } }),
    prisma.purchase.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.purchaseItem.findMany({ orderBy: { id: "asc" } }),
    prisma.return.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.returnItem.findMany({ orderBy: { id: "asc" } }),
    prisma.exchange.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.exchangeSettlement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.expense.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.employeeAdjustment.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    version: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    data: {
      settings: cloneRecords(settings),
      users: cloneRecords(users),
      coupons: cloneRecords(coupons),
      categories: cloneRecords(categories),
      globalColors: cloneRecords(globalColors),
      products: cloneRecords(products),
      productColors: cloneRecords(productColors),
      productMedia: cloneRecords(productMedia),
      productVariants: cloneRecords(productVariants),
      customers: cloneRecords(customers),
      suppliers: cloneRecords(suppliers),
      sales: cloneRecords(sales),
      saleItems: cloneRecords(saleItems),
      purchases: cloneRecords(purchases),
      purchaseItems: cloneRecords(purchaseItems),
      returns: cloneRecords(returns),
      returnItems: cloneRecords(returnItems),
      exchanges: cloneRecords(exchanges),
      exchangeSettlements: cloneRecords(exchangeSettlements),
      stockMovements: cloneRecords(stockMovements),
      expenses: cloneRecords(expenses),
      employeeAdjustments: cloneRecords(employeeAdjustments),
    },
  };
}

function normalizeBackupPayload(payload: BackupPayload | BackupPayloadLike): BackupPayload["data"] {
  const version = Number(payload.version ?? 0);
  if (version !== BACKUP_VERSION && version !== 4 && version !== 3 && version !== 2 && version !== 1) {
    throw new Error("UNSUPPORTED_BACKUP_VERSION");
  }

  if (!payload.data) {
    throw new Error("INVALID_BACKUP_FILE");
  }

  const data = payload.data as Partial<BackupPayload["data"]>;

  return {
    settings: Array.isArray(data.settings) ? data.settings : [],
    users: Array.isArray(data.users) ? data.users : [],
    coupons: Array.isArray(data.coupons) ? data.coupons : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    globalColors: Array.isArray(data.globalColors) ? data.globalColors : [],
    products: Array.isArray(data.products) ? data.products : [],
    productColors: Array.isArray(data.productColors) ? data.productColors : [],
    productMedia: Array.isArray(data.productMedia) ? data.productMedia : [],
    productVariants: Array.isArray(data.productVariants) ? data.productVariants : [],
    customers: Array.isArray(data.customers) ? data.customers : [],
    suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
    sales: Array.isArray(data.sales) ? data.sales : [],
    saleItems: Array.isArray(data.saleItems) ? data.saleItems : [],
    purchases: Array.isArray(data.purchases) ? data.purchases : [],
    purchaseItems: Array.isArray(data.purchaseItems) ? data.purchaseItems : [],
    returns: Array.isArray(data.returns) ? data.returns : [],
    returnItems: Array.isArray(data.returnItems) ? data.returnItems : [],
    exchanges: Array.isArray(data.exchanges) ? data.exchanges : [],
    exchangeSettlements: Array.isArray(data.exchangeSettlements)
      ? data.exchangeSettlements
      : [],
    stockMovements: Array.isArray(data.stockMovements) ? data.stockMovements : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    employeeAdjustments: Array.isArray(data.employeeAdjustments)
      ? data.employeeAdjustments
      : [],
  };
}

export async function restoreBackupSnapshot(
  payload: BackupPayload
): Promise<BackupRestoreCounts> {
  const data = normalizeBackupPayload(payload);

  const settings = data.settings.map((row) => ({
    key: String(row.key),
    value: String(row.value),
  }));

  const coupons = data.coupons.map((row) => ({
    id: String(row.id),
    code: String(row.code).trim().toUpperCase(),
    type: row.type as "PERCENTAGE" | "FIXED_AMOUNT",
    discountPercent: toNullableNumber(row.discountPercent),
    discountAmount: toNullableNumber(row.discountAmount),
    minOrderAmount: toNullableNumber(row.minOrderAmount),
    usageLimit: row.usageLimit == null ? null : Number(row.usageLimit),
    usageCount: Number(row.usageCount ?? 0),
    expiresAt: toNullableDate(row.expiresAt),
    isActive: Boolean(row.isActive),
    stackable: Boolean(row.stackable),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  }));

  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true, password: true },
  });
  const existingUsersById = new Map(existingUsers.map((user) => [user.id, user]));
  const existingUsersByEmail = new Map(
    existingUsers.map((user) => [user.email.toLowerCase(), user])
  );

  const users = data.users.map((row) => {
    const id = String(row.id);
    const email = String(row.email);
    const existingUser =
      existingUsersById.get(id) ?? existingUsersByEmail.get(email.toLowerCase());
    const password =
      typeof row.password === "string" && row.password
        ? row.password
        : existingUser?.password;

    if (!password) {
      throw new Error(
        `لا يحتوي ملف النسخة الاحتياطية على بيانات اعتماد الموظف ${email}. أوقفنا الاستعادة لحماية الحسابات.`
      );
    }

    return {
      id,
      name: String(row.name),
      email,
      password,
      phone: toNullableString(row.phone),
      role: row.role as "ADMIN" | "MANAGER" | "CASHIER",
      salary: Number(row.salary ?? 0),
      startDate: toNullableDate(row.startDate),
      isActive: Boolean(row.isActive),
      createdAt: toDate(row.createdAt),
    };
  });

  if (!users.some((user) => user.role === "ADMIN" && user.isActive)) {
    throw new Error("يجب أن تحتوي النسخة الاحتياطية على مدير نشط واحد على الأقل");
  }

  const categories = data.categories.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    nameAr: toNullableString(row.nameAr),
    description: toNullableString(row.description),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
  }));

  const globalColors = data.globalColors.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    hexCode: String(row.hexCode),
    createdAt: toDate(row.createdAt),
  }));
  const globalColorIds = new Set(globalColors.map((color) => color.id));

  function restoreGlobalColorId(value: unknown): string | null {
    const id = toNullableString(value);
    return id && globalColorIds.has(id) ? id : null;
  }

  const products = data.products.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    nameAr: toNullableString(row.nameAr),
    description: toNullableString(row.description),
    brand: toNullableString(row.brand),
    categoryId: String(row.categoryId),
    publishToWebsite: Boolean(row.publishToWebsite),
    featuredProduct: Boolean(row.featuredProduct),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
  }));

  const productColors = data.productColors.map((row) => ({
    id: String(row.id),
    productId: String(row.productId),
    color: String(row.color),
    colorHex: toNullableString(row.colorHex),
    globalColorId: restoreGlobalColorId(row.globalColorId),
    sortOrder: Number(row.sortOrder ?? 0),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
  }));

  const productMedia = data.productMedia.map((row) => ({
    id: String(row.id),
    productColorId: String(row.productColorId),
    url: String(row.url),
    publicId: String(row.publicId),
    altText: toNullableString(row.altText),
    sortOrder: Number(row.sortOrder ?? 0),
    isPrimary: Boolean(row.isPrimary),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
  }));

  const productVariants = data.productVariants.map((row) => ({
    id: String(row.id),
    productId: String(row.productId),
    sku: String(row.sku),
    barcode: toNullableString(row.barcode),
    size: String(row.size),
    color: String(row.color),
    colorHex: toNullableString(row.colorHex),
    globalColorId: restoreGlobalColorId(row.globalColorId),
    costPrice: Number(row.costPrice ?? 0),
    sellingPrice: Number(row.sellingPrice ?? 0),
    stockQuantity: Number(row.stockQuantity ?? 0),
    minStockLevel: Number(row.minStockLevel ?? 0),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
  }));

  const customers = data.customers.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: toNullableString(row.email),
    address: toNullableString(row.address),
    notes: toNullableString(row.notes),
    totalSpent: Number(row.totalSpent ?? 0),
    visitCount: Number(row.visitCount ?? 0),
    createdAt: toDate(row.createdAt),
  }));

  const suppliers = data.suppliers.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: toNullableString(row.email),
    address: toNullableString(row.address),
    notes: toNullableString(row.notes),
    isActive: Boolean(row.isActive),
    createdAt: toDate(row.createdAt),
  }));

  const sales = data.sales.map((row) => ({
    id: String(row.id),
    invoiceNumber: String(row.invoiceNumber),
    customerId: toNullableString(row.customerId),
    couponId: toNullableString(row.couponId),
    couponCode: toNullableString(row.couponCode),
    userId: String(row.userId),
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    discountPercent: Number(row.discountPercent ?? 0),
    appliedPromotions: Array.isArray(row.appliedPromotions) ? row.appliedPromotions : [],
    taxAmount: Number(row.taxAmount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    tenderedAmount: Number(row.tenderedAmount ?? row.paidAmount ?? 0),
    paidAmount: Number(row.paidAmount ?? 0),
    changeAmount: Number(row.changeAmount ?? 0),
    paymentMethod: row.paymentMethod as "CASH" | "CARD" | "TRANSFER" | "INSTAPAY" | "WALLET" | "MIXED",
    status: row.status as "COMPLETED" | "PENDING" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED",
    notes: toNullableString(row.notes),
    createdAt: toDate(row.createdAt),
  }));

  const variantCostById = new Map(productVariants.map((variant) => [variant.id, variant.costPrice]));
  const saleItems = data.saleItems.map((row) => {
    const variantId = String(row.variantId);
    return {
      id: String(row.id),
      saleId: String(row.saleId),
      variantId,
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      costPrice: toNullableNumber(row.costPrice) ?? variantCostById.get(variantId) ?? 0,
      discountAmount: Number(row.discountAmount ?? 0),
      totalPrice: Number(row.totalPrice ?? 0),
    };
  });
  const saleItemCostBySaleVariant = new Map(
    saleItems.map((item) => [`${item.saleId}:${item.variantId}`, item.costPrice]),
  );

  const purchases = data.purchases.map((row) => ({
    id: String(row.id),
    invoiceNumber: String(row.invoiceNumber),
    supplierId: String(row.supplierId),
    userId: String(row.userId),
    subtotal: Number(row.subtotal ?? 0),
    taxAmount: Number(row.taxAmount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    status: row.status as "PENDING" | "RECEIVED" | "CANCELLED",
    notes: toNullableString(row.notes),
    receivedAt: toNullableDate(row.receivedAt),
    createdAt: toDate(row.createdAt),
  }));

  const purchaseItems = data.purchaseItems.map((row) => ({
    id: String(row.id),
    purchaseId: String(row.purchaseId),
    variantId: String(row.variantId),
    quantity: Number(row.quantity ?? 0),
    unitCost: Number(row.unitCost ?? 0),
    totalCost: Number(row.totalCost ?? 0),
  }));

  const returns = data.returns.map((row) => ({
    id: String(row.id),
    returnNumber: String(row.returnNumber),
    saleId: String(row.saleId),
    customerId: toNullableString(row.customerId),
    userId: String(row.userId),
    totalAmount: Number(row.totalAmount ?? 0),
    refundAmount: Number(row.refundAmount ?? 0),
    reason: toNullableString(row.reason),
    status: row.status as "PENDING" | "APPROVED" | "REJECTED",
    notes: toNullableString(row.notes),
    createdAt: toDate(row.createdAt),
  }));

  const saleIdByReturnId = new Map(returns.map((returnRecord) => [returnRecord.id, returnRecord.saleId]));
  const returnItems = data.returnItems.map((row) => {
    const returnId = String(row.returnId);
    const variantId = String(row.variantId);
    const saleId = saleIdByReturnId.get(returnId);
    const originalSaleCost = saleId
      ? saleItemCostBySaleVariant.get(`${saleId}:${variantId}`)
      : undefined;

    return {
      id: String(row.id),
      returnId,
      variantId,
      saleItemId: toNullableString(row.saleItemId),
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      costPrice: toNullableNumber(row.costPrice) ?? originalSaleCost ?? variantCostById.get(variantId) ?? 0,
      totalPrice: Number(row.totalPrice ?? 0),
    };
  });

  const exchanges = data.exchanges.map((row) => ({
    id: String(row.id),
    exchangeNumber: String(row.exchangeNumber),
    originalSaleId: String(row.originalSaleId),
    returnId: String(row.returnId),
    replacementSaleId: String(row.replacementSaleId),
    settlementBalance: Number(row.settlementBalance ?? 0),
    createdAt: toDate(row.createdAt),
  }));

  const exchangeSettlements = data.exchangeSettlements.map((row) => ({
    id: String(row.id),
    exchangeId: String(row.exchangeId),
    direction: row.direction as "COLLECTION" | "REFUND",
    amount: Number(row.amount ?? 0),
    method: row.method as "CASH" | "CARD" | "WALLET",
    createdAt: toDate(row.createdAt),
  }));

  const stockMovements = data.stockMovements.map((row) => ({
    id: String(row.id),
    variantId: String(row.variantId),
    userId: String(row.userId),
    type: row.type as
      | "PURCHASE"
      | "SALE"
      | "RETURN"
      | "ADJUSTMENT"
      | "DAMAGE"
      | "TRANSFER",
    quantity: Number(row.quantity ?? 0),
    previousQty: Number(row.previousQty ?? 0),
    newQty: Number(row.newQty ?? 0),
    reference: toNullableString(row.reference),
    notes: toNullableString(row.notes),
    createdAt: toDate(row.createdAt),
  }));

  const expenses = data.expenses.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    amount: Number(row.amount ?? 0),
    category: row.category as
      | "RENT"
      | "UTILITIES"
      | "SALARIES"
      | "MARKETING"
      | "SUPPLIES"
      | "MAINTENANCE"
      | "OTHER",
    description: toNullableString(row.description),
    userId: String(row.userId),
    employeeId: toNullableString(row.employeeId),
    baseSalary: toNullableNumber(row.baseSalary),
    deductionsTotal: toNullableNumber(row.deductionsTotal),
    expenseDate: toDate(row.expenseDate),
    createdAt: toDate(row.createdAt),
  }));

  const employeeAdjustments = data.employeeAdjustments.map((row) => ({
    id: String(row.id),
    userId: String(row.userId),
    createdById: String(row.createdById),
    type: row.type as "ADVANCE" | "DEDUCTION" | "ABSENCE",
    amount: Number(row.amount ?? 0),
    title: toNullableString(row.title),
    notes: toNullableString(row.notes),
    adjustmentDate: toDate(row.adjustmentDate),
    settled: Boolean(row.settled),
    settledAt: toNullableDate(row.settledAt),
    expenseId: toNullableString(row.expenseId),
    createdAt: toDate(row.createdAt),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.exchangeSettlement.deleteMany();
    await tx.exchange.deleteMany();
    await tx.returnItem.deleteMany();
    await tx.purchaseItem.deleteMany();
    await tx.saleItem.deleteMany();
    await tx.stockMovement.deleteMany();
    await tx.employeeAdjustment.deleteMany();
    await tx.expense.deleteMany();
    await tx.return.deleteMany();
    await tx.purchase.deleteMany();
    await tx.sale.deleteMany();
    await tx.coupon.deleteMany();
    await tx.productMedia.deleteMany();
    await tx.productColor.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.product.deleteMany();
    await tx.globalColor.deleteMany();
    await tx.customer.deleteMany();
    await tx.supplier.deleteMany();
    await tx.category.deleteMany();
    await tx.user.deleteMany();
    await tx.setting.deleteMany();

    await tx.setting.createMany({ data: settings });
    await tx.user.createMany({ data: users as never[] });
    await tx.coupon.createMany({ data: coupons as never[] });
    await tx.category.createMany({ data: categories as never[] });
    await tx.supplier.createMany({ data: suppliers as never[] });
    await tx.customer.createMany({ data: customers as never[] });
    await tx.product.createMany({ data: products as never[] });
    await tx.globalColor.createMany({ data: globalColors as never[] });
    await tx.productColor.createMany({ data: productColors as never[] });
    await tx.productMedia.createMany({ data: productMedia as never[] });
    await tx.productVariant.createMany({ data: productVariants as never[] });
    await tx.sale.createMany({ data: sales as never[] });
    await tx.purchase.createMany({ data: purchases as never[] });
    await tx.return.createMany({ data: returns as never[] });
    await tx.expense.createMany({ data: expenses as never[] });
    await tx.employeeAdjustment.createMany({ data: employeeAdjustments as never[] });
    await tx.saleItem.createMany({ data: saleItems as never[] });
    await tx.purchaseItem.createMany({ data: purchaseItems as never[] });
    await tx.returnItem.createMany({ data: returnItems as never[] });
    await tx.exchange.createMany({ data: exchanges as never[] });
    await tx.exchangeSettlement.createMany({ data: exchangeSettlements as never[] });
    await tx.stockMovement.createMany({ data: stockMovements as never[] });
  });

  return {
    settings: settings.length,
    users: users.length,
    coupons: coupons.length,
    categories: categories.length,
    globalColors: globalColors.length,
    products: products.length,
    productColors: productColors.length,
    productMedia: productMedia.length,
    productVariants: productVariants.length,
    customers: customers.length,
    suppliers: suppliers.length,
    sales: sales.length,
    saleItems: saleItems.length,
    purchases: purchases.length,
    purchaseItems: purchaseItems.length,
    returns: returns.length,
    returnItems: returnItems.length,
    exchanges: exchanges.length,
    exchangeSettlements: exchangeSettlements.length,
    stockMovements: stockMovements.length,
    expenses: expenses.length,
    employeeAdjustments: employeeAdjustments.length,
  };
}
