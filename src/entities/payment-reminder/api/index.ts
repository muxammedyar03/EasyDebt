import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockPaymentReminderRepository } from "@/lib/mock/repositories/payment-reminder.repository.mock";
import {
  PaymentReminderRepository,
  paymentReminderRepository as prismaPaymentReminderRepository,
} from "./payment-reminder.repository";

export { PaymentReminderRepository };
export const paymentReminderRepository = createRepositoryProxy(
  mockPaymentReminderRepository,
  prismaPaymentReminderRepository,
);
