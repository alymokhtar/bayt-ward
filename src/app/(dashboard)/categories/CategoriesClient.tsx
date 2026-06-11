"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
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
} from "@/lib/actions/categories";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setNameAr("");
    setDescription("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setNameAr(cat.nameAr || "");
    setDescription(cat.description || "");
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = editing
      ? await updateCategory(editing.id, { name, nameAr, description })
      : await createCategory({ name, nameAr, description });

    setLoading(false);

    if (result.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "حدث خطأ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    const result = await deleteCategory(id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
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
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل التصنيف" : "تصنيف جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "حفظ" : "إنشاء"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
