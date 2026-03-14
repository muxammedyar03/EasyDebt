/**
 * Validation tests for addDebtSchema (create-debt feature).
 */
import { addDebtSchema } from "../schema";

describe("addDebtSchema", () => {
  describe("valid", () => {
    it("accepts required amount only", () => {
      const result = addDebtSchema.safeParse({ amount: "50000" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.amount).toBe("50000");
    });

    it("accepts amount with optional description and createdAt", () => {
      const date = new Date("2025-03-01");
      const result = addDebtSchema.safeParse({
        amount: "100000",
        description: "Goods",
        createdAt: date,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("Goods");
        expect(result.data.createdAt).toEqual(date);
      }
    });
  });

  describe("invalid", () => {
    it("rejects missing amount", () => {
      const result = addDebtSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects empty amount", () => {
      const result = addDebtSchema.safeParse({ amount: "" });
      expect(result.success).toBe(false);
    });

    it("rejects non-string amount", () => {
      const result = addDebtSchema.safeParse({ amount: 1000 });
      expect(result.success).toBe(false);
    });
  });
});
