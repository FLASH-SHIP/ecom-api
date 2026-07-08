import { useCallback, useState } from "react";

interface AddFromUrlOptions {
  title?: string;
  label?: string;
  placeholder?: string;
  onSubmit: (url: string) => void;
}

interface AddFromUrlState {
  open: boolean;
  title?: string;
  label?: string;
  placeholder?: string;
  onSubmit: ((url: string) => void) | null;
}

const CLOSED: AddFromUrlState = {
  open: false,
  onSubmit: null,
};

/**
 * Hook to imperatively trigger the Add-from-URL dialog.
 *
 * Returns `dialogProps` to spread onto `<AddFromUrlDialog>` plus an `askUrl`
 * function to programmatically open the dialog with a callback.
 *
 * @example
 * const { dialogProps, askUrl } = useAddFromUrl();
 *
 * // In JSX:
 * <AddFromUrlDialog {...dialogProps} />
 *
 * // To open:
 * askUrl({
 *   onSubmit: (url) => setFormData(prev => ({ ...prev, featuredImage: url })),
 * });
 *
 * // With custom title:
 * askUrl({
 *   title: "Add banner image URL",
 *   onSubmit: (url) => setFormData(prev => ({ ...prev, bannerImage: url })),
 * });
 */
export function useAddFromUrl() {
  const [state, setState] = useState<AddFromUrlState>(CLOSED);

  const askUrl = useCallback((opts: AddFromUrlOptions) => {
    setState({ open: true, ...opts });
  }, []);

  const submit = useCallback(
    (url: string) => {
      state.onSubmit?.(url);
      setState(CLOSED);
    },
    [state],
  );

  const cancel = useCallback(() => setState(CLOSED), []);

  return {
    askUrl,
    dialogProps: {
      open: state.open,
      title: state.title,
      label: state.label,
      placeholder: state.placeholder,
      onSubmit: submit,
      onCancel: cancel,
    },
  };
}
