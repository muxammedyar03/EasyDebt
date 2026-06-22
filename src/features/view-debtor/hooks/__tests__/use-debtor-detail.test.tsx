/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDebtorDetail, DEBTOR_QUERY_KEY } from "../use-debtor-detail";
import * as fetchApi from "../../api/fetch-debtor";
import type { DebtorDomain } from "@/types/domain";

jest.mock("../../api/fetch-debtor", () => ({
  fetchDebtorById: jest.fn(),
}));

const mockDebtor: DebtorDomain = {
  id: 1,
  externalId: "e1",
  firstName: "Test",
  lastName: "User",
  phoneNumber: null,
  address: null,
  totalDebt: 1000,
  isOverdue: false,
  lastPaymentDate: null,
  riskStatus: "low",
  status: "active",
  daysOverdue: null,
  createdAt: new Date("2025-03-01"),
  updatedAt: new Date("2025-03-01"),
  createdBy: 1,
  debts: [],
  payments: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useDebtorDetail", () => {
  beforeEach(() => {
    (fetchApi.fetchDebtorById as jest.Mock).mockResolvedValue(mockDebtor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns debtor when initialData is provided", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDebtorDetail({
          debtorId: 1,
          overdueDays: 45,
          initialData: mockDebtor,
        }),
      { wrapper },
    );
    expect(result.current.debtor).toEqual(mockDebtor);
    expect(result.current.debtor.id).toBe(1);
    expect(result.current.stats).toBeDefined();
    expect(result.current.rating).toBeDefined();
    expect(result.current.timeline).toBeDefined();
    expect(result.current.refresh).toBeDefined();
  });

  it("calls refetch when refresh is called", async () => {
    (fetchApi.fetchDebtorById as jest.Mock).mockResolvedValue(mockDebtor);
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDebtorDetail({
          debtorId: 1,
          overdueDays: 45,
          initialData: mockDebtor,
        }),
      { wrapper },
    );
    (fetchApi.fetchDebtorById as jest.Mock).mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchApi.fetchDebtorById).toHaveBeenCalledWith(1);
  });
});

describe("DEBTOR_QUERY_KEY", () => {
  it("is defined for invalidation", () => {
    expect(DEBTOR_QUERY_KEY).toBe("debtor");
  });
});
