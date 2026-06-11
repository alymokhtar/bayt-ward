import { destroySession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الخروج" },
      { status: 500 }
    );
  }
}
