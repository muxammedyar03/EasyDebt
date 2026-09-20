import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Only pass DB work: the callback may be retried on serialization conflicts. */
export async function serializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 2)
        throw error;
    }
  }
}
