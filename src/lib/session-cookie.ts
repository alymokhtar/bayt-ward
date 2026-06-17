import type { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "session";

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
