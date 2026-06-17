import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

/** Minimal data after a full reset — one admin + store settings only. */
async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
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

  const settings = [
    { key: "store_name", value: "Bayt Ward" },
    { key: "store_name_ar", value: "بيت ورد" },
    { key: "store_phone", value: "" },
    { key: "store_whatsapp", value: "" },
    { key: "store_address", value: "" },
    { key: "store_email", value: "" },
    { key: "tax_rate", value: "0" },
    { key: "currency", value: "EGP" },
    { key: "currency_symbol", value: "ج.م" },
    { key: "whatsapp_promotion_default", value: "" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("✅ Bootstrap completed — empty store, admin only");
  console.log("admin@baytward.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
