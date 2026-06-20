import { requireRole } from "@/lib/auth";
import {
  buildBackupFilename,
  createBackupSnapshot,
  restoreBackupSnapshot,
} from "@/lib/backup";
import {
  invalidateCategoriesData,
  invalidateCustomersData,
  invalidateEmployeesData,
  invalidateExpensesData,
  invalidateInventoryData,
  invalidateProductsData,
  invalidatePurchasesData,
  invalidateReportsData,
  invalidateReturnsData,
  invalidateSalesData,
  invalidateSettingsData,
  invalidateSuppliersData,
} from "@/lib/revalidate-tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function createJsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return createJsonResponse({ success: false, error: "يجب تسجيل الدخول أولاً" }, 401);
    }

    if (error.message === "FORBIDDEN") {
      return createJsonResponse({ success: false, error: "ليس لديك صلاحية لهذا الإجراء" }, 403);
    }

    return createJsonResponse({ success: false, error: error.message }, 400);
  }

  return createJsonResponse({ success: false, error: "حدث خطأ غير متوقع" }, 500);
}

function invalidateAllData() {
  invalidateSalesData();
  invalidateInventoryData();
  invalidateCustomersData();
  invalidatePurchasesData();
  invalidateReturnsData();
  invalidateExpensesData();
  invalidateCategoriesData();
  invalidateSuppliersData();
  invalidateEmployeesData();
  invalidateSettingsData();
  invalidateReportsData();
  invalidateProductsData();
}

export async function GET() {
  try {
    await requireRole(["ADMIN", "MANAGER", "CASHIER"]);

    const backup = await createBackupSnapshot();
    const filename = buildBackupFilename(new Date(backup.generatedAt));

    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        ...JSON_HEADERS,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);

    const body = (await request.json()) as { payload?: unknown };
    if (!body.payload || typeof body.payload !== "object") {
      return createJsonResponse({ success: false, error: "ملف النسخة الاحتياطية غير صالح" }, 400);
    }

    const counts = await restoreBackupSnapshot(body.payload as Parameters<typeof restoreBackupSnapshot>[0]);
    invalidateAllData();

    return createJsonResponse({ success: true, data: counts });
  } catch (error) {
    return handleAuthError(error);
  }
}
