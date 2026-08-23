import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    tone?: "danger" | "neutral";
    onConfirm: () => void;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = "danger", onConfirm }: ConfirmDialogProps) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-finn-black/40" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-white p-5 shadow-xl">
                    <AlertDialog.Title className="text-base font-black text-finn-black">{title}</AlertDialog.Title>
                    <AlertDialog.Description asChild>
                        <div className="mt-2 text-xs leading-5 text-finn-iron">{description}</div>
                    </AlertDialog.Description>
                    <div className="mt-5 flex gap-2">
                        <AlertDialog.Cancel asChild>
                            <button type="button" className="flex-1 h-10 rounded-full border border-finn-cotton text-xs font-bold text-finn-black">Cancel</button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`flex-1 h-10 rounded-full text-xs font-bold text-white ${tone === "danger" ? "bg-finn-error" : "bg-finn-highlight-navy"}`}
                            >
                                {confirmLabel}
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}