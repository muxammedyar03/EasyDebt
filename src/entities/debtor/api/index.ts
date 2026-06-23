import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockDebtorRepository } from "@/lib/mock/repositories/debtor.repository.mock";
import { DebtorRepository, debtorRepository as prismaDebtorRepository } from "./debtor.repository";

export { DebtorRepository };
export const debtorRepository = createRepositoryProxy(mockDebtorRepository, prismaDebtorRepository);
