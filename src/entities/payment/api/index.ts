import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockPaymentRepository } from "@/lib/mock/repositories/payment.repository.mock";
import { PaymentRepository, paymentRepository as prismaPaymentRepository } from "./payment.repository";

export { PaymentRepository };
export const paymentRepository = isMockMode() ? mockPaymentRepository : prismaPaymentRepository;
