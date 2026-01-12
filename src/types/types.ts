import { DebtDomain, PaymentDomain } from "./domain";
import { DebtorView } from "./view";

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

// export enum PaymentType {
//   CASH = "CASH",
//   CLICK = "CLICK",
//   CARD = "CARD",
// }

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
  created_debts?: DebtDomain[];
  created_payments?: PaymentDomain[];
};

export type Debtor = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  is_overdue: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number;

  // Relations (optional)
  creator?: User;
  debts?: DebtDomain[];
  payments?: PaymentDomain[];
};

// export type Debt = {
//   id: number;
//   debtor_id: number;
//   amount: number;
//   description: string | null;
//   items: DebtItem[] | null;
//   created_at: Date;
//   created_by: number;

//   // Relations (optional)
//   debtor?: Debtor;
//   creator?: User;
// };

// export type Payment = {
//   id: number;
//   debtor_id: number;
//   amount: number;
//   payment_type: PaymentType;
//   note: string | null;
//   created_at: Date;
//   created_by: number;

//   // Relations (optional)
//   debtor?: Debtor;
//   creator?: User;
// };

export interface CustomerTableProps {
  debtorId: number;
  debtor: DebtorView;
  payments: PaymentDomain[];
  validPayments: number;
  avgDaysBetweenPayments: number;
  avgDaysBetweenDebtAndPayment: number;
  rating: "high" | "medium" | "critical";
}

export interface AuditLogTableProps {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_value: string;
  new_value:
    | string
    | {
        debtor_id: number;
        amount: number;
        username: string;
        debtorName: string;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
      };
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  user: {
    id: number;
    username: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  debtorName?: string | null;
}
