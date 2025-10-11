// JSON types
export type DebtItem = {
  name: string;
  price: number;
  quantity?: number;
};

// Enums
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum PaymentType {
  CASH = "CASH",
  CLICK = "CLICK",
  CARD = "CARD",
}

// Types
export type User = {
  id: number;
  username: string;
  email: string | null;
  password: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Relations (optional)
  created_debtors?: Debtor[];
  created_debts?: Debt[];
  created_payments?: Payment[];
};

export type Debtor = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  created_at: Date;
  updated_at: Date;
  created_by: number;

  // Relations (optional)
  creator?: User;
  debts?: Debt[];
  payments?: Payment[];
};

export type Debt = {
  id: number;
  debtor_id: number;
  amount: number;
  description: string | null;
  items: DebtItem[] | null;
  created_at: Date;
  created_by: number;

  // Relations (optional)
  debtor?: Debtor;
  creator?: User;
};

export type Payment = {
  id: number;
  debtor_id: number;
  amount: number;
  payment_type: PaymentType;
  note: string | null;
  created_at: Date;
  created_by: number;

  // Relations (optional)
  debtor?: Debtor;
  creator?: User;
};
