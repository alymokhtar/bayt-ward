import {
  loginUser,
  SESSION_COOKIE_OPTIONS,
  signSessionToken,
} from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    console.error(
      "LOGIN ERROR: No database URL found. Set DATABASE_URL (or POSTGRES_URL) on Vercel."
    );
    return NextResponse.json(
      { error: "قاعدة البيانات غير مُعدّة على الخادم" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    const user = await loginUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = await signSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    response.cookies.set("session", token, SESSION_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
