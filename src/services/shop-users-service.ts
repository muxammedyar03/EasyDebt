import { ShopUser, UserFormData, Shop } from "@/types/types";

export interface ShopUsersResponse {
  shop: Shop;
  users: ShopUser[];
  total: number;
}

export interface CreateUserResponse {
  message: string;
  user: ShopUser;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

class ShopUsersService {
  async fetchShopUsers(shopId: number): Promise<ShopUsersResponse> {
    const response = await fetch(`/api/dashboard/shops/${shopId}/users`);

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || "Failed to fetch users");
    }

    return response.json();
  }

  async createUser(shopId: number, data: UserFormData): Promise<CreateUserResponse> {
    const response = await fetch(`/api/dashboard/shops/${shopId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || "Failed to create user");
    }

    return response.json();
  }

  async updateUser(userId: number, data: Partial<UserFormData>): Promise<void> {
    const response = await fetch(`/api/dashboard/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || "Failed to update user");
    }
  }

  async updateUserStatus(userId: number, status: "ACTIVE" | "BLOCKED" | "DEACTIVATED"): Promise<void> {
    await this.updateUser(userId, { status });
  }

  async resetPassword(userId: number, password: string): Promise<void> {
    await this.updateUser(userId, { password });
  }

  async deleteUser(userId: number): Promise<{ message: string }> {
    const response = await fetch(`/api/dashboard/users/${userId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || "Failed to delete user");
    }

    return response.json();
  }
}

export const shopUsersService = new ShopUsersService();
