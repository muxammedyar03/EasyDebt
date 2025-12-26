import { PrismaClient, Prisma } from "@prisma/client";

// SQL query parametrlari uchun type
type SqlParameter = string | number | boolean | null | Date | Buffer;

// Query natijasi uchun record type
type QueryResult = Record<string, Prisma.JsonValue>;

export type MigrationAdapter = {
  query: <T extends QueryResult = QueryResult>(sql: string, params?: SqlParameter[]) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
  many: <T extends QueryResult = QueryResult>(sql: string) => Promise<T[]>;
  one: <T extends QueryResult = QueryResult>(sql: string) => Promise<T | null>;
};

export function createPrismaAdapter(prisma: PrismaClient): MigrationAdapter {
  return {
    query: async <T extends QueryResult = QueryResult>(sql: string, params?: SqlParameter[]): Promise<T[]> => {
      return prisma.$queryRawUnsafe<T[]>(sql, ...(params || []));
    },
    exec: async (sql: string): Promise<void> => {
      await prisma.$executeRawUnsafe(sql);
    },
    many: async <T extends QueryResult = QueryResult>(sql: string): Promise<T[]> => {
      return prisma.$queryRawUnsafe<T[]>(sql);
    },
    one: async <T extends QueryResult = QueryResult>(sql: string): Promise<T | null> => {
      const results = await prisma.$queryRawUnsafe<T[]>(sql);
      return results[0] || null;
    },
  };
}
