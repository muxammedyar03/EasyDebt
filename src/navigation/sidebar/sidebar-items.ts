import {
  LayoutDashboard,
  UserCog,
  FileText,
  Users,
  BarChart3,
  Building2,
  ImageIcon,
  Store,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  roles?: string[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    items: [
      {
        title: "nav.home",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 2,
    label: "nav.groupDebtors",
    items: [
      {
        title: "nav.debtors",
        url: "/dashboard/debtors",
        icon: UserCog,
      },
      {
        title: "nav.customerRatings",
        url: "/dashboard/customers",
        icon: Users,
      },
    ],
  },
  {
    id: 3,
    label: "nav.groupCompanies",
    items: [
      {
        title: "nav.myDebts",
        url: "/dashboard/my-debts",
        icon: Building2,
      },
      {
        title: "nav.companyReceipts",
        url: "/dashboard/company-receipts",
        icon: ImageIcon,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    id: 4,
    label: "nav.groupReports",
    items: [
      {
        title: "nav.reports",
        url: "/dashboard/reports",
        icon: BarChart3,
      },
      {
        title: "nav.auditLog",
        url: "/dashboard/audit-logs",
        icon: FileText,
      },
    ],
  },
  {
    id: 5,
    label: "nav.groupAdmin",
    items: [
      {
        title: "nav.users",
        url: "/dashboard/users",
        icon: Users,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        title: "nav.clients",
        url: "/dashboard/clients",
        icon: Store,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];
