import { create } from "zustand";
import { ShopUser, Shop } from "@/types/types";
import { shopUsersService } from "@/services/shop-users-service";
import { toast } from "sonner";

interface ShopUsersState {
  // Data
  shop: Shop | null;
  users: ShopUser[];
  loading: boolean;

  // Actions
  setShop: (shop: Shop | null) => void;
  setUsers: (users: ShopUser[]) => void;
  setLoading: (loading: boolean) => void;
  addUser: (user: ShopUser) => void;
  updateUser: (userId: number, updates: Partial<ShopUser>) => void;
  removeUser: (userId: number) => void;
  fetchUsers: (shopId: number) => Promise<void>;
  reset: () => void;
}

const initialState = {
  shop: null,
  users: [],
  loading: true,
};

export const useShopUsersStore = create<ShopUsersState>((set) => ({
  ...initialState,

  setShop: (shop) => set({ shop }),
  setUsers: (users) => set({ users }),
  setLoading: (loading) => set({ loading }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (userId, updates) =>
    set((state) => ({
      users: state.users.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
    })),
  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    })),

  fetchUsers: async (shopId) => {
    try {
      set({ loading: true });
      const data = await shopUsersService.fetchShopUsers(shopId);
      set({ shop: data.shop, users: data.users, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load users";
      toast.error(message);
      set({ loading: false });
    }
  },

  reset: () => set(initialState),
}));
