import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockPaymentRepository } from "@/lib/mock/repositories/payment.repository.mock";
import { PaymentRepository, paymentRepository as prismaPaymentRepository } from "./payment.repository";

export { PaymentRepository };
export const paymentRepository = createRepositoryProxy(mockPaymentRepository, prismaPaymentRepository);
