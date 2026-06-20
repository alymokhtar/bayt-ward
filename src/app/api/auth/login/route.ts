import {
  loginUser,
  SESSION_COOKIE_OPTIONS,
  signSessionToken,
} from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/env";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatDateTime } from "@/lib/utils";
import { NextResponse } from "next/server";

function formatSystemOpenMessage(user: {
  name: string;
  email: string;
  role: string;
}) {
  const openedAt = formatDateTime(new Date());

  return [
    "🔔 تم فتح النظام",
    "",
    `اسم المستخدم: ${user.name}`,
    `البريد الإلكتروني: ${user.email}`,
    `الصلاحية: ${user.role}`,
    `التوقيت: ${openedAt}`,
  ].join("\n");
}

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

    await sendTelegramMessage(formatSystemOpenMessage(user));

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
