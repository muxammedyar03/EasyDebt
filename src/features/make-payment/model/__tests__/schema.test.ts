/**
 * Validation tests for addPaymentSchema and paymentSchema (make-payment feature).
 */
import { addPaymentSchema, paymentSchema } from "../schema";

describe("addPaymentSchema", () => {
  describe("valid", () => {
    it("accepts amount and payment_type", () => {
      const result = addPaymentSchema.safeParse({
        amount: "100000",
        payment_type: "CASH",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe("100000");
        expect(result.data.payment_type).toBe("CASH");
      }
    });

    it("accepts all payment types", () => {
      for (const type of ["CASH", "CLICK", "CARD"] as const) {
        const result = addPaymentSchema.safeParse({
          amount: "50000",
          payment_type: type,
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.payment_type).toBe(type);
      }
    });

    it("accepts optional note and createdAt", () => {
      const date = new Date();
      const result = addPaymentSchema.safeParse({
        amount: "200000",
        payment_type: "CLICK",
        note: "Partial",
        createdAt: date,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note).toBe("Partial");
        expect(result.data.createdAt).toEqual(date);
      }
    });
  });

  describe("invalid", () => {
    it("rejects missing amount", () => {
      const result = addPaymentSchema.safeParse({ payment_type: "CASH" });
      expect(result.success).toBe(false);
    });

    it("rejects empty amount", () => {
      const result = addPaymentSchema.safeParse({
        amount: "",
        payment_type: "CASH",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid payment_type", () => {
      const result = addPaymentSchema.safeParse({
        amount: "100",
        payment_type: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("paymentSchema", () => {
  it("accepts amount and payment_type (no date)", () => {
    const result = paymentSchema.safeParse({
      amount: "50000",
      payment_type: "CARD",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty amount", () => {
    const result = paymentSchema.safeParse({
      amount: "",
      payment_type: "CASH",
    });
    expect(result.success).toBe(false);
  });
});
