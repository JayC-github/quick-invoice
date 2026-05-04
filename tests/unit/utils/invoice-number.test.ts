import { describe, it, expect, vi } from "vitest";
import { formatInvoiceNumber, generateInvoiceNumber } from "../../../src/utils/invoice-number";

vi.mock("../../../src/db/repository", () => ({
  atomicIncrement: vi.fn(),
  keys: {
    user: {
      pk: (userId: string) => `USER#${userId}`,
      invoiceCounter: () => "INVOICE_COUNTER",
    },
  },
}));

import { atomicIncrement } from "../../../src/db/repository";

describe("formatInvoiceNumber", () => {
  it("formats single digit as INV-00001", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-00001");
  });

  it("formats double digit as INV-00042", () => {
    expect(formatInvoiceNumber(42)).toBe("INV-00042");
  });

  it("formats five digit number as INV-99999", () => {
    expect(formatInvoiceNumber(99999)).toBe("INV-99999");
  });

  it("handles numbers exceeding 5 digits without truncation", () => {
    expect(formatInvoiceNumber(100000)).toBe("INV-100000");
  });
});

describe("generateInvoiceNumber", () => {
  it("calls atomicIncrement with correct key pattern and returns formatted number", async () => {
    vi.mocked(atomicIncrement).mockResolvedValue(7);

    const result = await generateInvoiceNumber("user-123");

    expect(atomicIncrement).toHaveBeenCalledWith(
      "USER#user-123",
      "INVOICE_COUNTER",
      "counter"
    );
    expect(result).toBe("INV-00007");
  });

  it("returns INV-00001 for the first invoice", async () => {
    vi.mocked(atomicIncrement).mockResolvedValue(1);

    const result = await generateInvoiceNumber("new-user");

    expect(result).toBe("INV-00001");
  });
});
