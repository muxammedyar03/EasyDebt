import {
  LayoutDashboard,
  ChartBar,
  Banknote,
  UserCog,
  FileText,
  Users,
  BarChart3,
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
  roles?: string[]; // optional role restriction, e.g., ["SUPER_ADMIN"]
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Bosh sahifa",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      // {
      //   title: "CRM",
      //   url: "/dashboard/crm",
      //   icon: ChartBar,
      //   comingSoon: true,
      // },
      // {
      //   title: "Finance",
      //   url: "/dashboard/finance",
      //   icon: Banknote,
      //   comingSoon: true,
      // },
      {
        title: "Qarzdorlar",
        url: "/dashboard/debtors",
        icon: UserCog,
        isNew: true,
      },
      {
        title: "Mijozlar Reytingi",
        url: "/dashboard/customers",
        icon: Users,
        isNew: true,
      },
      {
        title: "Hisobotlar",
        url: "/dashboard/reports",
        icon: BarChart3,
        isNew: true,
      },
      {
        title: "Audit Log",
        url: "/dashboard/audit-logs",
        icon: FileText,
        isNew: true,
      },
      {
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
        isNew: true,
        roles: ["SUPER_ADMIN"],
      },
      // {
      //   title: "Sozlamalar",
      //   url: "/dashboard/settings",
      //   icon: Settings,
      //   isNew: true,
      // },
      // {
      //   title: "Analytics",
      //   url: "/dashboard/coming-soon",
      //   icon: Gauge,
      //   comingSoon: true,
      // },
      // {
      //   title: "E-commerce",
      //   url: "/dashboard/coming-soon",
      //   icon: ShoppingBag,
      //   comingSoon: true,
      // },
      // {
      //   title: "Academy",
      //   url: "/dashboard/coming-soon",
      //   icon: GraduationCap,
      //   comingSoon: true,
      // },
      // {
      //   title: "Logistics",
      //   url: "/dashboard/coming-soon",
      //   icon: Forklift,
      //   comingSoon: true,
      // },
    ],
  },
  // {
  //   id: 2,
  //   label: "Boshqaruv",
  //   items: [
  //     {
  //       title: "Qarzdorlar",
  //       url: "/dashboard/debtors",
  //       icon: UserCog,
  //       isNew: true,
  //     },
  //     {
  //       title: "Sozlamalar",
  //       url: "/dashboard/settings",
  //       icon: Settings,
  //       isNew: true,
  //     },
  //   ],
  // },
  // {
  //   id: 3,
  //   label: "Pages",
  //   items: [
  //     {
  //       title: "Email",
  //       url: "/dashboard/coming-soon",
  //       icon: Mail,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Chat",
  //       url: "/dashboard/coming-soon",
  //       icon: MessageSquare,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Calendar",
  //       url: "/dashboard/coming-soon",
  //       icon: Calendar,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Kanban",
  //       url: "/dashboard/coming-soon",
  //       icon: Kanban,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Invoice",
  //       url: "/dashboard/coming-soon",
  //       icon: ReceiptText,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Users",
  //       url: "/dashboard/coming-soon",
  //       icon: Users,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Roles",
  //       url: "/dashboard/coming-soon",
  //       icon: Lock,
  //       comingSoon: true,
  //     },
  //     {
  //       title: "Authentication",
  //       url: "/auth",
  //       icon: Fingerprint,
  //       subItems: [
  //         // { title: "Login v1", url: "/auth/v1/login", newTab: true },
  //         { title: "Login v2", url: "/auth/login", newTab: true },
  //         { title: "Register v1", url: "/auth/v1/register", newTab: true },
  //         { title: "Register v2", url: "/auth/v2/register", newTab: true },
  //       ],
  //     },
  //   ],
  // },
  // {
  //   id: 4,
  //   label: "Misc",
  //   items: [
  //     {
  //       title: "Others",
  //       url: "/dashboard/coming-soon",
  //       icon: SquareArrowUpRight,
  //       comingSoon: true,
  //     },
  //   ],
  // },
];
