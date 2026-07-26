import { PrismaClient, type PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    select: {
      id: true,
      totalAmount: true,
      paymentMethod: true,
    },
  });

  let created = 0;

  for (const sale of sales) {
    const method = sale.paymentMethod ?? 'CASH';

    const existingPayment = await prisma.payment.findFirst({
      where: { orderId: sale.id },
      select: { id: true },
    });

    if (existingPayment) {
      continue;
    }

    await prisma.payment.create({
      data: {
        orderId: sale.id,
        amount: sale.totalAmount,
        method: method as PaymentMethod,
      },
    });

    created += 1;
  }

  console.log(`Created ${created} payment records for existing sales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
