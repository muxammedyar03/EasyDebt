import { createRepositoryProxy } from "@/lib/mock/create-repository-proxy";
import { mockAuditLogRepository } from "@/lib/mock/repositories/audit-log.repository.mock";
import * as auditLogRepo from "./audit-log.repository";

export const AuditLogRepository = auditLogRepo.AuditLogRepository;
export const auditLogRepository = createRepositoryProxy(mockAuditLogRepository, auditLogRepo.auditLogRepository);
