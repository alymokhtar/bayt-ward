import { MapPin } from "lucide-react";

type StoreOnlyPromotionBadgeProps = {
  className?: string;
};

export default function StoreOnlyPromotionBadge({
  className = "",
}: StoreOnlyPromotionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold leading-5 text-rose-800 ${className}`}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      حصرياً داخل الفرع
    </span>
  );
}