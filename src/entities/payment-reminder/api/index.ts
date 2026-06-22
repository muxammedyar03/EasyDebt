import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockPaymentReminderRepository } from "@/lib/mock/repositories/payment-reminder.repository.mock";
import {
  PaymentReminderRepository,
  paymentReminderRepository as prismaPaymentReminderRepository,
} from "./payment-reminder.repository";

export { PaymentReminderRepository };
export const paymentReminderRepository = isMockMode() ? mockPaymentReminderRepository : prismaPaymentReminderRepository;
