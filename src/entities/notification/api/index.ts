import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockNotificationRepository } from "@/lib/mock/repositories/notification.repository.mock";
import * as notificationRepo from "./notification.repository";

export const NotificationRepository = notificationRepo.NotificationRepository;
export const notificationRepository = createRepositoryProxy(
  mockNotificationRepository,
  notificationRepo.notificationRepository,
);
