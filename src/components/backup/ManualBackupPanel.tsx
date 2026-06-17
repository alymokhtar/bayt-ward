"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function ManualBackupPanel() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileLabel = useMemo(
    () => selectedFile?.name ?? "لم يتم اختيار ملف بعد",
    [selectedFile]
  );

  async function handleExport() {
    setExporting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/backup/manual", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "تعذر تصدير النسخة الاحتياطية");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? "bayt-ward-backup.json";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      setSuccess("تم تصدير النسخة الاحتياطية بنجاح");
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    } finally {
      setExporting(false);
    }
  }

  async function handleRestore() {
    if (!selectedFile) {
      setError("اختر ملف النسخة الاحتياطية أولاً");
      return;
    }

    if (!confirmRestore) {
      setError("أكد أنك تريد استبدال البيانات الحالية");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const raw = await selectedFile.text();
      const payload = JSON.parse(raw) as unknown;

      const response = await fetch("/api/backup/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      });

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? "تعذر استرجاع النسخة الاحتياطية");
      }

      setSelectedFile(null);
      setConfirmRestore(false);
      setSuccess("تم استرجاع النسخة الاحتياطية بنجاح");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-brown">تصدير البيانات</h3>
            <p className="text-sm text-muted">حفظ نسخة احتياطية من جميع البيانات</p>
          </div>

          <Button
            type="button"
            onClick={handleExport}
            loading={exporting}
            className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700 shadow-md"
          >
            <Download className="h-4 w-4" />
            تصدير JSON
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-brown">استرداد البيانات</h3>
            <p className="text-sm text-muted">استعادة بيانات من نسخة احتياطية</p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <Input
            type="file"
            label="ملف النسخة الاحتياطية"
            accept="application/json,.json"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            hint={fileLabel}
          />

          <label className="flex items-start gap-2 text-sm text-brown">
            <input
              type="checkbox"
              checked={confirmRestore}
              onChange={(e) => setConfirmRestore(e.target.checked)}
              className="mt-1 rounded border-border"
            />
            <span>أؤكد أنني أريد استبدال البيانات الحالية بالنسخة الاحتياطية.</span>
          </label>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleRestore}
              loading={importing}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Upload className="h-4 w-4" />
              استيراد
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
