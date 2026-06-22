import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockDebtorRepository } from "@/lib/mock/repositories/debtor.repository.mock";
import { DebtorRepository, debtorRepository as prismaDebtorRepository } from "./debtor.repository";

export { DebtorRepository };
export const debtorRepository = isMockMode() ? mockDebtorRepository : prismaDebtorRepository;
