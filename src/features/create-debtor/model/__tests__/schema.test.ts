/**
 * Validation tests for addDebtorSchema (create-debtor feature).
 */
import { addDebtorSchema } from "../schema";

describe("addDebtorSchema", () => {
  describe("valid", () => {
    it("accepts minimal required fields", () => {
      const result = addDebtorSchema.safeParse({
        first_name: "John",
        last_name: "Doe",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.first_name).toBe("John");
        expect(result.data.last_name).toBe("Doe");
      }
    });

    it("accepts all optional fields", () => {
      const result = addDebtorSchema.safeParse({
        first_name: "Jane",
        last_name: "Smith",
        phone_number: "+998901234567",
        address: "Toshkent",
        debt_amount: "1000000",
        debt_description: "Initial",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone_number).toBe("+998901234567");
        expect(result.data.debt_amount).toBe("1000000");
      }
    });

    it("accepts empty string for optional fields", () => {
      const result = addDebtorSchema.safeParse({
        first_name: "A",
        last_name: "B",
        phone_number: "",
        address: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid", () => {
    it("rejects missing first_name", () => {
      const result = addDebtorSchema.safeParse({
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty first_name", () => {
      const result = addDebtorSchema.safeParse({
        first_name: "",
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing last_name", () => {
      const result = addDebtorSchema.safeParse({
        first_name: "John",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty last_name", () => {
      const result = addDebtorSchema.safeParse({
        first_name: "John",
        last_name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects when first_name is not a string", () => {
      const result = addDebtorSchema.safeParse({
        first_name: 123,
        last_name: "Doe",
      });
      expect(result.success).toBe(false);
    });
  });
});
