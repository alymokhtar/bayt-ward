import { redirect } from "next/navigation";

type PromotionAliasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromotionAliasPage({
  params,
}: PromotionAliasPageProps): Promise<never> {
  const { id } = await params;
  redirect(`/store/promotions/${encodeURIComponent(id)}`);
}