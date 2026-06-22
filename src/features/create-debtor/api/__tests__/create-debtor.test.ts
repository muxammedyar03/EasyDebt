/**
 * createDebtor API tests: mock fetch for success, 4xx, 5xx.
 */
import { createDebtor } from "../create-debtor";

const successPayload = {
  first_name: "John",
  last_name: "Doe",
  phone_number: "+998901234567",
  address: null,
  debt_amount: null,
  debt_description: null,
};

const successResponse = {
  id: 1,
  external_id: "ext-1",
  first_name: "John",
  last_name: "Doe",
};

describe("createDebtor", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns result on success (2xx)", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(successResponse),
    });
    const result = await createDebtor(successPayload);
    expect(result).toEqual(successResponse);
    expect(result.id).toBe(1);
    expect(result.external_id).toBe("ext-1");
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/debtors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(successPayload),
    });
  });

  it("throws with API error message on 4xx", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Validation failed" }),
    });
    await expect(createDebtor(successPayload)).rejects.toThrow("Validation failed");
  });

  it("throws with API error message on 5xx", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });
    await expect(createDebtor(successPayload)).rejects.toThrow("Server error");
  });

  it("throws generic message when response has no error body", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });
    await expect(createDebtor(successPayload)).rejects.toThrow("Qarzdor qo'shishda xatolik yuz berdi");
  });
});
