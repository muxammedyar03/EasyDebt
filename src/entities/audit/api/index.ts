import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockAuditLogRepository } from "@/lib/mock/repositories/audit-log.repository.mock";
import * as auditLogRepo from "./audit-log.repository";

export const AuditLogRepository = auditLogRepo.AuditLogRepository;
export const auditLogRepository = isMockMode() ? mockAuditLogRepository : auditLogRepo.auditLogRepository;
