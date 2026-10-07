import type { User } from "@prisma/client";

/** Do not put password hashes or PINs in audit JSON or API responses. */
export function userAuditFields(
  user: Pick<User, "username" | "email" | "role" | "first_name" | "last_name" | "is_active">,
) {
  return {
    username: user.username,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    is_active: user.is_active,
  };
}
