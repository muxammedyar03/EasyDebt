import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockDebtRepository } from "@/lib/mock/repositories/debt.repository.mock";
import { DebtRepository, debtRepository as prismaDebtRepository } from "./debt.repository";

export { DebtRepository };
export const debtRepository = isMockMode() ? mockDebtRepository : prismaDebtRepository;
