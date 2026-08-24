import { Prisma } from "@/generated/prisma";

// Prisma returns BigInt ids and Decimal columns, neither of which survive
// JSON.stringify. Convert them to plain numbers/strings for API responses.
export function serializeRow<T extends Record<string, unknown>>(
  row: T
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "bigint") {
      output[key] = Number(value);
    } else if (value instanceof Prisma.Decimal) {
      output[key] = value.toNumber();
    } else if (value instanceof Date) {
      output[key] = value.toISOString();
    } else {
      output[key] = value;
    }
  }

  return output;
}

export function serializeRows<T extends Record<string, unknown>>(
  rows: T[]
): Record<string, unknown>[] {
  return rows.map(serializeRow);
}
