import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * User entity – API (repository).
 * Data access only; no business logic.
 */
export class UserRepository {
  async findMany(
    where: Prisma.UserWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.UserOrderByWithRelationInput;
      select?: Prisma.UserSelect;
      include?: Prisma.UserInclude;
    },
  ) {
    return prisma.user.findMany({
      where,
      ...options,
    });
  }
}

export const userRepository = new UserRepository();
