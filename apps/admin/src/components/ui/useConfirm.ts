import { useCallback, useState } from "react";

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "error" | "primary" | "warning";
  onConfirm: () => void;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  onConfirm: (() => void) | null;
}

const CLOSED: ConfirmState = {
  open: false,
  message: "",
  confirmColor: "error",
  onConfirm: null,
};

/**
 * Hook to imperatively trigger a Botble-style confirmation dialog.
 *
 * Returns `dialogProps` to spread onto `<ConfirmDialog>` plus an `askConfirm`
 * function to programmatically open the dialog with a message and callback.
 *
 * @example
 * const { dialogProps, askConfirm } = useConfirm();
 *
 * // In JSX:
 * <ConfirmDialog {...dialogProps} />
 *
 * // To open a delete dialog:
 * askConfirm({
 *   message: `Xoá nhóm "${row.title}" và tất cả trường bên trong?`,
 *   onConfirm: () => deleteMut.mutate({ id: row.id }),
 * });
 *
 * // To open a custom-labeled dialog:
 * askConfirm({
 *   title: "Xác nhận lưu trữ",
 *   confirmLabel: "Lưu trữ",
 *   cancelLabel: "Hủy",
 *   message: "Bài viết này sẽ bị ẩn khỏi trang công khai.",
 *   onConfirm: () => archiveMut.mutate({ id }),
 * });
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(CLOSED);

  const askConfirm = useCallback((opts: ConfirmOptions) => {
    setState({ open: true, ...opts });
  }, []);

  const confirm = useCallback(() => {
    state.onConfirm?.();
    setState(CLOSED);
  }, [state]);

  const cancel = useCallback(() => setState(CLOSED), []);

  return {
    askConfirm,
    dialogProps: {
      open: state.open,
      message: state.message,
      title: state.title,
      confirmLabel: state.confirmLabel,
      cancelLabel: state.cancelLabel,
      confirmColor: state.confirmColor,
      onConfirm: confirm,
      onCancel: cancel,
    },
  };
}
