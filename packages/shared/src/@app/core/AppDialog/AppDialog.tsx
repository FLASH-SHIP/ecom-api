import { Dialog, DialogContent } from "@ecom/ui/components/dialog";
import type { ReactNode } from "react";

export interface AppDialogContentProps {
  handleClose: () => void;
  data?: unknown;
}

export interface AppDialogProps {
  id: string;
  open?: boolean;
  onClose?: (T: string) => void;
  content: (T: AppDialogContentProps) => ReactNode;
  data?: unknown;
  classes?: { paper?: string };
}

export function AppDialog(props: AppDialogProps) {
  const { id, open = false, onClose, content, data } = props;

  function handleClose() {
    onClose?.(id);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className={props.classes?.paper}>
        {content?.({ handleClose, data })}
      </DialogContent>
    </Dialog>
  );
}
