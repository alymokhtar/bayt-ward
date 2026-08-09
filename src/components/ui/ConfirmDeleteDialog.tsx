"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { ReactNode } from "react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  children?: ReactNode;
}

export default function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  description = "هل أنت متأكد؟ هذا الإجراء سيؤدي إلى الحذف النهائي ولا يمكن التراجع عنه",
  itemName,
  confirmLabel = "تأكيد الحذف",
  cancelLabel = "تراجع",
  loading = false,
  children,
}: ConfirmDeleteDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={loading}
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-danger/20 bg-red-50/80 p-3">
          <p className="text-sm leading-6 text-brown">
            {description}
            {itemName ? (
              <>
                {" "}
                <span className="font-semibold text-danger">{itemName}</span>
              </>
            ) : null}
          </p>
        </div>

        {children}
      </div>
    </Modal>
  );
}
