import { prisma } from "@/lib/prisma";
import { getEgyptCalendarDateStamp } from "@/lib/business-day";

/**
 * Generates a unique invoice number safely using database atomic operations.
 * Prevents race conditions and duplicate invoice numbers.
 * 
 * Format: PREFIX-YYYYMMDD-NNNNNN
 * Example: INV-20260814-000001, PUR-20260814-000001, RET-20260814-000001
 * 
 * @param prefix - Invoice prefix (INV, PUR, RET)
 * @returns Unique invoice number
 * @throws Error if database operation fails
 */
export async function generateInvoiceNumberSafe(prefix: string): Promise<string> {
  const dateKey = getEgyptCalendarDateStamp();
  
  // Use database transaction to atomically increment the sequence
  // This ensures no two concurrent requests will get the same sequence number
  const sequence = await prisma.invoiceSequence.upsert({
    where: {
      prefix_dateKey: {
        prefix,
        dateKey,
      },
    },
    update: {
      sequence: {
        increment: 1,
      },
    },
    create: {
      prefix,
      dateKey,
      sequence: 1,
    },
  });

  // Format: PREFIX-YYYYMMDD-000001
  const paddedSequence = String(sequence.sequence).padStart(6, "0");
  return `${prefix}-${dateKey}-${paddedSequence}`;
}

/**
 * Fallback invoice number generator (non-safe, for backward compatibility)
 * This should only be used if the database is unavailable.
 * 
 * @param prefix - Invoice prefix
 * @returns Invoice number
 */
export function generateInvoiceNumberFallback(prefix: string): string {
  const date = getEgyptCalendarDateStamp();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `${prefix}-${date}-${random}`;
}
