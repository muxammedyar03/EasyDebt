import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockSettingsRepository } from "@/lib/mock/repositories/settings.repository.mock";
import { SettingsRepository, settingsRepository as prismaSettingsRepository } from "./settings.repository";

export { SettingsRepository };
export const settingsRepository = isMockMode() ? mockSettingsRepository : prismaSettingsRepository;
