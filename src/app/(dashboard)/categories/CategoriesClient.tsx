"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import Badge from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} from "@/lib/actions/categories";
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  _count: { products: number };
};

interface CategoriesClientProps {
  categories: Category[];
}

export default function CategoriesClient({
  categories: initial,
}: CategoriesClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [categoryActive, setCategoryActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setNameAr("");
    setDescription("");
    setImageUrl("");
    setCategoryActive(true);
    setError("");
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setNameAr(cat.nameAr || "");
    setDescription(cat.description || "");
    setImageUrl(cat.imageUrl || "");
    setCategoryActive(cat.isActive);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = editing
      ? await updateCategory(editing.id, {
          name,
          nameAr,
          description,
          imageUrl: imageUrl === "" ? "" : imageUrl || undefined,
          isActive: categoryActive,
        })
      : await createCategory({
          name,
          nameAr,
          description,
          imageUrl: imageUrl === "" ? "" : imageUrl || undefined,
          isActive: categoryActive,
        });

    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCategory(deleteTarget.id);
    setDeleting(false);
    if (result.success) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  const [imageDeleteTarget, setImageDeleteTarget] = useState(false);

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    setImageUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const result = await uploadCategoryImage(formData);
      if (!result.success) {
        throw new Error(result.error);
      }

      setImageUrl(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setImageUploading(false);
    }
  }

  async function toggleActive(cat: Category) {
    const result = await updateCategory(cat.id, { isActive: !cat.isActive });
    if (result.success) router.refresh();
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          تصنيف جديد
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>الاسم العربي</TableHead>
            <TableHead>المنتجات</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initial.map((cat) => (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell>{cat.nameAr || "—"}</TableCell>
              <TableCell>{cat._count.products}</TableCell>
              <TableCell>
                <button type="button" onClick={() => toggleActive(cat)}>
                  <Badge variant={cat.isActive ? "success" : "danger"}>
                    {cat.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </button>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(cat)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDelete}
        title="تأكيد حذف التصنيف"
        description="هل أنت متأكد؟ هذا الإجراء سيؤدي إلى حذف التصنيف نهائياً ولا يمكن التراجع عنه."
        itemName={deleteTarget?.nameAr || deleteTarget?.name || undefined}
        loading={deleting}
      />

      <ConfirmDeleteDialog
        isOpen={imageDeleteTarget}
        onClose={() => setImageDeleteTarget(false)}
        onConfirm={() => {
          setImageUrl("");
          setImageDeleteTarget(false);
        }}
        title="تأكيد حذف الصورة"
        description="هل أنت متأكد؟ هذا الإجراء سيؤدي إلى حذف الصورة المرتبطة بهذا التصنيف نهائياً."
        confirmLabel="حذف الصورة"
        loading={false}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل التصنيف" : "تصنيف جديد"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" form="modal-form-category" loading={loading}>
              {editing ? "حفظ" : "إنشاء"}
            </Button>
          </div>
        }
      >
        <form id="modal-form-category" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            label="الاسم (إنجليزي)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="الاسم (عربي)"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
          <div className="space-y-3">
            <label className="block text-sm font-medium text-brown mb-1.5">
              صورة التصنيف
            </label>
            <div className="rounded-3xl border border-border bg-slate-50 p-4 font-cairo text-brown shadow-sm">
              <div className="mb-3 flex flex-col items-center gap-3">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Category image"
                    width={400}
                    height={144}
                    className="h-36 w-full max-w-sm rounded-3xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-36 w-full max-w-sm items-center justify-center rounded-3xl border border-dashed border-border bg-white text-sm text-muted">
                    لا توجد صورة بعد
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brown transition hover:border-gold hover:text-gold">
                  <ImagePlus className="h-4 w-4" />
                  رفع صورة
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      void handleImageUpload(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageDeleteTarget(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brown transition hover:border-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف الصورة
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCategoryActive((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brown transition hover:border-gold hover:text-gold"
                >
                  {categoryActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {categoryActive ? "إخفاء" : "إظهار"}
                </button>
              </div>
              {imageUploading && (
                <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/5 px-3 py-2 text-sm text-brown">
                  جارٍ رفع الصورة...
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown mb-1.5">
              الوصف
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm"
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
