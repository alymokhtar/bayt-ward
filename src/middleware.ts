import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "bayt-ward-secret-key-2024"
);

const PROTECTED_ROUTES = [
  "/dashboard",
  "/pos",
  "/products",
  "/categories",
  "/inventory",
  "/barcodes",
  "/sales",
  "/returns",
  "/customers",
  "/whatsapp",
  "/suppliers",
  "/purchases",
  "/expenses",
  "/reports",
  "/employees",
  "/settings",
];

async function isValidSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;
  const hasValidSession = token ? await isValidSession(token) : false;

  if (isProtectedRoute(pathname) && !hasValidSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete("session");
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/inventory/:path*",
    "/barcodes/:path*",
    "/sales/:path*",
    "/returns/:path*",
    "/customers/:path*",
    "/whatsapp/:path*",
    "/suppliers/:path*",
    "/purchases/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/employees/:path*",
    "/settings/:path*",
    "/login",
  ],
};
