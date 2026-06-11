import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@baytward.com" },
    update: {},
    create: {
      name: "مدير النظام",
      email: "admin@baytward.com",
      password: adminPassword,
      phone: "01000000001",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@baytward.com" },
    update: {},
    create: {
      name: "مديرة المحل",
      email: "manager@baytward.com",
      password: managerPassword,
      phone: "01000000002",
      role: "MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@baytward.com" },
    update: {},
    create: {
      name: "كاشير",
      email: "cashier@baytward.com",
      password: cashierPassword,
      phone: "01000000003",
      role: "CASHIER",
    },
  });

  const settings = [
    { key: "store_name", value: "Bayt Ward" },
    { key: "store_name_ar", value: "بيت ورد" },
    { key: "store_phone", value: "01000000000" },
    { key: "store_whatsapp", value: "01000000000" },
    { key: "store_address", value: "القاهرة، مصر" },
    { key: "store_email", value: "info@baytward.com" },
    { key: "tax_rate", value: "0" },
    { key: "currency", value: "EGP" },
    { key: "currency_symbol", value: "ج.م" },
    {
      key: "whatsapp_promotion_default",
      value: "عرض خاص لعملائنا الكرام! خصم على التشكيلات الجديدة ✨",
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  const categories = [
    { name: "Dresses", nameAr: "فساتين" },
    { name: "Tops", nameAr: "بلوزات وتوبات" },
    { name: "Pants", nameAr: "بناطيل" },
    { name: "Abayas", nameAr: "عبايات" },
    { name: "Accessories", nameAr: "إكسسوارات" },
    { name: "Outerwear", nameAr: "معاطف وجاكيتات" },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      createdCategories[cat.name] = existing.id;
    } else {
      const created = await prisma.category.create({
        data: cat,
      });
      createdCategories[cat.name] = created.id;
    }
  }

  const products = [
    {
      name: "Floral Summer Dress",
      nameAr: "فستان صيفي مزهر",
      brand: "Bayt Ward",
      category: "Dresses",
      variants: [
        { size: "S", color: "وردي", colorHex: "#FFB6C1", cost: 350, price: 650, stock: 12 },
        { size: "M", color: "وردي", colorHex: "#FFB6C1", cost: 350, price: 650, stock: 15 },
        { size: "L", color: "وردي", colorHex: "#FFB6C1", cost: 350, price: 650, stock: 8 },
        { size: "M", color: "أبيض", colorHex: "#FFFFFF", cost: 350, price: 650, stock: 10 },
      ],
    },
    {
      name: "Elegant Abaya",
      nameAr: "عباية أنيقة",
      brand: "Bayt Ward",
      category: "Abayas",
      variants: [
        { size: "M", color: "أسود", colorHex: "#000000", cost: 500, price: 950, stock: 20 },
        { size: "L", color: "أسود", colorHex: "#000000", cost: 500, price: 950, stock: 15 },
        { size: "XL", color: "كحلي", colorHex: "#1B2A4A", cost: 520, price: 980, stock: 10 },
      ],
    },
  ];

  let skuCounter = 1;

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (existing) continue;

    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        nameAr: product.nameAr,
        brand: product.brand,
        categoryId: createdCategories[product.category],
        variants: {
          create: product.variants.map((v) => {
            const sku = `BW-${String(skuCounter++).padStart(5, "0")}`;

            return {
              sku,
              barcode: sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              costPrice: v.cost,
              sellingPrice: v.price,
              stockQuantity: v.stock,
              minStockLevel: 5,
            };
          }),
        },
      },
    });

    const variants = await prisma.productVariant.findMany({
      where: { productId: createdProduct.id },
    });

    for (const variant of variants) {
      await prisma.stockMovement.create({
        data: {
          variantId: variant.id,
          userId: admin.id,
          type: "ADJUSTMENT",
          quantity: variant.stockQuantity,
          previousQty: 0,
          newQty: variant.stockQuantity,
          reference: "INITIAL_STOCK",
          notes: "رصيد افتتاحي",
        },
      });
    }
  }

  console.log("✅ Seed completed successfully");
  console.log("admin@baytward.com / admin123");
  console.log("manager@baytward.com / manager123");
  console.log("cashier@baytward.com / cashier123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
