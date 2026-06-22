// ── Crop Data ───────────────────────────────────────────────
/** Crop data returned by the dialog (pixel values) */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Aspect Presets ──────────────────────────────────────────
export interface AspectPreset {
  label: string;
  value: number | undefined; // undefined = free
}

export const ASPECT_PRESETS: AspectPreset[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '21:9', value: 21 / 9 },
  { label: '2:3', value: 2 / 3 },
  { label: '9:16', value: 9 / 16 },
];

// ── Dialog Props ────────────────────────────────────────────
/** Props for the reusable CropDialog component */
export interface CropDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to open/close the dialog */
  onOpenChange: (open: boolean) => void;
  /** URL of the image to crop */
  imageUrl: string;
  /** Alt text for the image */
  imageAlt?: string;
  /** Callback when user submits the crop — receives pixel crop data */
  onSubmit: (cropData: CropData) => void;
  /** Whether the submit action is in progress */
  loading?: boolean;
  /** Custom dialog title */
  title?: string;
  /** Custom submit button text */
  submitLabel?: string;
}
