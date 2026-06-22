import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockNotificationRepository } from "@/lib/mock/repositories/notification.repository.mock";
import * as notificationRepo from "./notification.repository";

export const NotificationRepository = notificationRepo.NotificationRepository;
export const notificationRepository = isMockMode()
  ? mockNotificationRepository
  : notificationRepo.notificationRepository;
