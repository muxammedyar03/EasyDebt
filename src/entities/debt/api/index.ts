import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockDebtRepository } from "@/lib/mock/repositories/debt.repository.mock";
import { DebtRepository, debtRepository as prismaDebtRepository } from "./debt.repository";

export { DebtRepository };
export const debtRepository = createRepositoryProxy(mockDebtRepository, prismaDebtRepository);
