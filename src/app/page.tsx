import { resolveSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await resolveSession();

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}
