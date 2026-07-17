import { redirect } from "next/navigation";

export default function RootPage() {
  // توجيه أي زائر للرابط الرئيسي إلى مسار المتجر تلقائياً
  redirect("/store");
}