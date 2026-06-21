import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  ShoppingCart,
  Users,
  Truck,
  ShoppingBag,
  RotateCcw,
  Wallet,
  BarChart3,
  UserCog,
  Settings,
  Store,
  Barcode,
  MessageCircle,
} from "lucide-react";

export const STORE_NAME = "Bayt Ward";
export const STORE_NAME_AR = "بيت ورد";

/** Arabic UI with Western (Latin) digits: 1234567890 */
export const DISPLAY_LOCALE = "ar-EG-u-nu-latn";

export const BRAND_COLORS = {
  cream: "#FDF5E6",
  brown: "#4B3621",
  gold: "#B8860B",
  goldLight: "#D4AF37",
  dark: "#1A1A1A",
};

export const NAV_ITEMS = [
  {
    title: "لوحة التحكم",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    title: "نقطة البيع",
    href: "/pos",
    icon: Store,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    title: "المنتجات",
    href: "/products",
    icon: Package,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "التصنيفات",
    href: "/categories",
    icon: Tags,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "المخزون",
    href: "/inventory",
    icon: Warehouse,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "طباعة الباركود",
    href: "/barcodes",
    icon: Barcode,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "المبيعات",
    href: "/sales",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    title: "المرتجعات",
    href: "/returns",
    icon: RotateCcw,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    title: "العملاء",
    href: "/customers",
    icon: Users,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    title: "واتساب",
    href: "/whatsapp",
    icon: MessageCircle,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "الموردين",
    href: "/suppliers",
    icon: Truck,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "المشتريات",
    href: "/purchases",
    icon: ShoppingBag,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "المصروفات",
    href: "/expenses",
    icon: Wallet,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
  {
    title: "التقارير",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    title: "الموظفين",
    href: "/employees",
    icon: UserCog,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "الإعدادات",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN", "MANAGER", "CASHIER"],
  },
];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
export const COLORS = [
  { name: "أسود", hex: "#000000" },
  { name: "أبيض", hex: "#FFFFFF" },
  { name: "وردي", hex: "#FFB6C1" },
  { name: "بيج", hex: "#F5F5DC" },
  { name: "كحلي", hex: "#1B2A4A" },
  { name: "رمادي", hex: "#808080" },
  { name: "ذهبي", hex: "#FFD700" },
  { name: "أزرق فاتح", hex: "#ADD8E6" },
  { name: "أحمر", hex: "#DC143C" },
  { name: "أخضر", hex: "#228B22" },
];

export const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "إيجار" },
  { value: "UTILITIES", label: "مرافق" },
  { value: "SALARIES", label: "رواتب" },
  { value: "MARKETING", label: "تسويق" },
  { value: "SUPPLIES", label: "مستلزمات" },
  { value: "MAINTENANCE", label: "صيانة" },
  { value: "OTHER", label: "أخرى" },
];

export const PAYMENT_METHODS = [
  { value: "CASH", label: "كاش" },
  { value: "CARD", label: "فيزا" },
  { value: "INSTAPAY", label: "إنستاباي" },
  { value: "WALLET", label: "محفظة" },
  { value: "TRANSFER", label: "تحويل بنكي" },
  { value: "MIXED", label: "مختلط" },
];

export const USER_ROLES = [
  { value: "ADMIN", label: "مدير" },
  { value: "MANAGER", label: "مدير فرع" },
  { value: "CASHIER", label: "كاشير" },
];

export const EMPLOYEE_ADJUSTMENT_TYPES = [
  { value: "ADVANCE", label: "سلفة" },
  { value: "DEDUCTION", label: "خصم" },
  { value: "ABSENCE", label: "غياب" },
] as const;

export const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  ADVANCE: "سلفة",
  DEDUCTION: "خصم",
  ABSENCE: "غياب",
};
