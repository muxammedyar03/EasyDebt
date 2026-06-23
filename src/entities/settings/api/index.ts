import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockSettingsRepository } from "@/lib/mock/repositories/settings.repository.mock";
import { SettingsRepository, settingsRepository as prismaSettingsRepository } from "./settings.repository";

export { SettingsRepository };
export const settingsRepository = createRepositoryProxy(mockSettingsRepository, prismaSettingsRepository);
