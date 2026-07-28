"use client";

import { Button } from "../button";
import { CloseIcon } from "../icon-component/CloseIcon";
import { cn } from "../../lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, Search } from "lucide-react";
import { type ReactNode, useId } from "react";

// ---------------------------------------------------------------------------
// Overlay (internal)
// ---------------------------------------------------------------------------
function BaseModalOverlay() {
  return (
    <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
  );
}

// ---------------------------------------------------------------------------
// Root re-exports — for convenient co-located usage
// Root re-exports — dùng trực tiếp thay vì import từ @radix-ui/react-dialog
// ---------------------------------------------------------------------------
export const BaseModal = DialogPrimitive.Root;
export const BaseModalTrigger = DialogPrimitive.Trigger;
export const BaseModalClose = DialogPrimitive.Close;

// ---------------------------------------------------------------------------
// Content props
// ---------------------------------------------------------------------------
export interface BaseModalContentProps {
  /**
   * Modal title shown in the header.
   * Tiêu đề hiển thị ở phần header của modal.
   * @default "Select Saved"
   */
  title?: ReactNode;

  /**
   * Placeholder text inside the search input.
   * Văn bản gợi ý bên trong ô tìm kiếm.
   * @default "Search by name / number…"
   */
  searchPlaceholder?: string;

  /**
   * Controlled value of the search input.
   * Giá trị được kiểm soát của ô tìm kiếm (controlled input).
   */
  searchValue?: string;

  /**
   * Called whenever the search input value changes.
   * Được gọi mỗi khi giá trị ô tìm kiếm thay đổi.
   */
  onSearchChange?: (value: string) => void;

  /**
   * Label for the "Create new" action button.
   * Pass `null` to hide the button entirely.
   * Has no effect when `hideSearch` is true.
   * ---
   * Nhãn hiển thị trên nút "Tạo mới".
   * Truyền `null` để ẩn nút này hoàn toàn.
   * Không có tác dụng khi `hideSearch` là `true`.
   * @default "Create new"
   */
  createLabel?: string | null;

  /**
   * Called when the "Create new" button is clicked.
   * Được gọi khi người dùng nhấn nút "Tạo mới".
   */
  onCreateNew?: () => void;

  /**
   * When `true`, hides the search bar + create-button row entirely.
   * Use this for form-style modals where you provide your own body content
   * (e.g. a "New Address" form).
   * ---
   * Khi `true`, ẩn toàn bộ hàng tìm kiếm + nút tạo mới.
   * Dùng cho các modal dạng form (ví dụ: form "Địa chỉ mới") khi bạn
   * tự cung cấp nội dung body thay vì danh sách gợi ý.
   * @default false
   */
  hideSearch?: boolean;

  /**
   * Content rendered inside the scrollable body.
   * Can be list items (`<BaseModalItem>`) or any custom form fields.
   * ---
   * Nội dung hiển thị bên trong vùng có thể cuộn.
   * Có thể là các item danh sách (`<BaseModalItem>`) hoặc bất kỳ
   * form field tuỳ chỉnh nào.
   */
  children?: ReactNode;

  /**
   * Extra CSS class names applied to the modal panel.
   * CSS class bổ sung áp dụng lên panel của modal.
   */
  className?: string;

  /**
   * Node displayed when there are no items and `isLoading` is `false`.
   * If omitted, a default "No items found." message is shown.
   * ---
   * Nội dung hiển thị khi không có item nào và `isLoading` là `false`.
   * Nếu không truyền, hiển thị thông báo mặc định "No items found."
   */
  emptyState?: ReactNode;

  /**
   * When `true`, shows skeleton placeholder rows instead of `children`.
   * Khi `true`, hiển thị các hàng skeleton thay thế cho `children` trong
   * lúc đang tải dữ liệu.
   * @default false
   */
  isLoading?: boolean;

  /**
   * CSS `max-height` value for the scrollable body area.
   * Increase this if you have many items or tall form content.
   * ---
   * Giá trị CSS `max-height` cho vùng có thể cuộn.
   * Tăng lên nếu bạn có nhiều item hoặc nội dung form dài.
   * @default "420px"
   */
  listMaxHeight?: string;

  /**
   * Optional footer content rendered **below** the scrollable body and
   * **outside** the scroll container. Typically used for action buttons
   * such as Cancel / Submit. The footer is right-aligned by default
   * and separated from the body with a top border.
   * ---
   * Nội dung footer tuỳ chọn hiển thị **bên dưới** vùng cuộn và
   * **ngoài** container cuộn. Thường dùng cho các nút hành động như
   * Huỷ / Xác nhận. Footer được căn phải mặc định và ngăn cách với
   * phần body bằng một đường viền phía trên.
   */
  footer?: ReactNode;
}

// ---------------------------------------------------------------------------
// Content panel
// ---------------------------------------------------------------------------
export function BaseModalContent({
  title = "Select Saved",
  searchPlaceholder = "Search by name / number…",
  searchValue,
  onSearchChange,
  createLabel = "Create new",
  onCreateNew,
  hideSearch = false,
  children,
  className,
  emptyState,
  isLoading = false,
  listMaxHeight,
  footer,
}: BaseModalContentProps) {
  const searchId = useId();

  return (
    <DialogPrimitive.Portal>
      <BaseModalOverlay />

      <DialogPrimitive.Content
        onInteractOutside={(e) => {
          // Prevent Dialog from closing when user clicks inside a Radix
          // Select / Popover portal that is rendered outside the Dialog DOM.
          const target = e.target as HTMLElement | null;
          if (
            target?.closest("[data-radix-select-content]") ||
            target?.closest("[data-radix-popper-content-wrapper]")
          ) {
            e.preventDefault();
          }
        }}
        className={cn(
          // positioning
          "fixed left-1/2 top-1/2 z-[201] -translate-x-1/2 -translate-y-1/2",
          // sizing — Figma designed width 862px, max-height leaves 1rem space top & bottom
          "w-[calc(100vw-2rem)] max-w-[862px] max-h-[calc(100vh-2rem)]",
          // panel
          "flex flex-col rounded-lg bg-background shadow-xl overflow-hidden",
          // animation
          "duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-border shrink-0">
          <DialogPrimitive.Title className="text-xl font-semibold leading-6 text-foreground">
            {title}
          </DialogPrimitive.Title>

          <DialogPrimitive.Close
            aria-label="Close"
            className="rounded-md p-1.5 !text-[#0A0A0A] text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CloseIcon className="h-[10px] w-[10px]" />
          </DialogPrimitive.Close>
        </div>

        {/* Search + Create row — hidden in form-style modals */}
        {!hideSearch && (
          <div className="flex items-center gap-4 px-6 py-4 shrink-0">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={searchId}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  "h-[52px] w-full rounded-lg border border-input bg-background",
                  "pl-9 pr-4 text-sm text-foreground",
                  "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "transition-colors duration-200",
                )}
              />
            </div>

            {createLabel !== null && (
              <Button
                type="button"
                onClick={onCreateNew}
                className="h-9 lg:h-10 xl:h-11 2xl:h-[52px] shrink-0 rounded-[10px] px-4 text-xl font-medium"
              >
                <Plus data-icon="inline-start" />
                {createLabel}
              </Button>
            )}
          </div>
        )}

        {/* Scrollable body — list items or form fields */}
        <div
          className={cn(
            "flex flex-col gap-[10px] overflow-y-auto px-6 flex-1 min-h-0",
            // Add top padding when search row is hidden so content
            // doesn't sit flush against the header border (Figma: 16px gap)
            hideSearch ? "pt-4" : "pt-0",
            // When a footer is present, reduce bottom padding so the footer
            // sits flush; otherwise keep the original 24px bottom padding.
            footer ? "pb-4" : "pb-6",
          )}
          style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
        >
          {isLoading ? (
            <BaseModalSkeleton />
          ) : children ? (
            children
          ) : (
            (emptyState ?? (
              <p className="py-8 text-center text-sm text-muted-foreground">No items found.</p>
            ))
          )}
        </div>

        {/* Footer — right-aligned action buttons (Cancel / Submit etc.) */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-4 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---------------------------------------------------------------------------
// Row item
// ---------------------------------------------------------------------------
export interface BaseModalItemProps {
  /**
   * Primary label displayed at the top-left of the row. Usually the full name.
   * Nhãn chính hiển thị ở góc trên-trái của hàng. Thường là tên đầy đủ.
   */
  name: string;

  /**
   * Inline secondary text shown right after the name, separated by a pipe `|`.
   * Useful for phone numbers, IDs, or any short identifiers.
   * ---
   * Văn bản phụ hiển thị cùng hàng với tên, ngăn cách bởi dấu `|`.
   * Thường dùng cho số điện thoại, mã ID, hoặc bất kỳ định danh ngắn nào.
   */
  meta?: string;

  /**
   * Second line of text below the name row. Useful for street addresses,
   * descriptions, or any additional detail.
   * ---
   * Dòng văn bản thứ hai bên dưới hàng tên. Thường dùng cho địa chỉ đường phố,
   * mô tả, hoặc bất kỳ thông tin bổ sung nào.
   */
  description?: string;

  /**
   * Small text badge rendered below the description. Typically a country code
   * (e.g. `"US"`, `"VN"`) or a category label.
   * ---
   * Nhãn nhỏ hiển thị bên dưới description. Thường là mã quốc gia
   * (ví dụ: `"US"`, `"VN"`) hoặc nhãn phân loại.
   */
  badge?: string;

  /**
   * Action buttons rendered on the right side of the row.
   * Typical examples: "Set Default" and "Edit" buttons.
   * ---
   * Các nút hành động hiển thị bên phải của hàng.
   * Ví dụ thường gặp: nút "Đặt mặc định" và "Chỉnh sửa".
   */
  actions?: ReactNode;

  /**
   * If provided, the **entire row** becomes a clickable `<button>` element.
   * Useful for single-click selection flows without separate action buttons.
   * When omitted the row renders as a plain `<div>`.
   * ---
   * Nếu được truyền vào, **toàn bộ hàng** trở thành phần tử `<button>` có thể
   * nhấn. Hữu ích cho luồng chọn 1-click mà không cần các nút hành động riêng.
   * Khi không truyền, hàng render dưới dạng `<div>` thông thường.
   */
  onClick?: () => void;

  /**
   * Extra CSS class names applied to the row container.
   * CSS class bổ sung áp dụng lên container của hàng.
   */
  className?: string;
}

export function BaseModalItem({
  name,
  meta,
  description,
  badge,
  actions,
  onClick,
  className,
}: BaseModalItemProps) {
  const sharedClassName = cn(
    "flex items-center justify-between gap-5 rounded-lg border border-border bg-background",
    "px-5 py-[14px]",
    "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]",
    "transition-colors duration-150",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          sharedClassName,
          "w-full text-left cursor-pointer hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {/* Left: info block */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-medium text-foreground">{name}</span>
            {meta && (
              <>
                <span className="text-base font-medium text-muted-foreground">|</span>
                <span className="text-base font-medium text-muted-foreground">{meta}</span>
              </>
            )}
          </div>
          {description && (
            <span className="truncate text-sm text-muted-foreground">{description}</span>
          )}
          {badge && (
            <span className="mt-0.5 inline-block w-fit text-sm font-medium text-primary">
              {badge}
            </span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </button>
    );
  }

  return (
    <div className={sharedClassName}>
      {/* Left: info block */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Name + optional pipe + meta */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-medium text-foreground">{name}</span>
          {meta && (
            <>
              <span className="text-base font-medium text-muted-foreground">|</span>
              <span className="text-base font-medium text-muted-foreground">{meta}</span>
            </>
          )}
        </div>

        {/* Description line */}
        {description && (
          <span className="truncate text-sm text-muted-foreground">{description}</span>
        )}

        {/* Badge (e.g. country code, category) */}
        {badge && (
          <span className="mt-0.5 inline-block w-fit text-sm font-medium text-primary">
            {badge}
          </span>
        )}
      </div>

      {/* Right: actions */}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader — shown when isLoading=true
// ---------------------------------------------------------------------------
const SKELETON_KEYS = ["skeleton-a", "skeleton-b", "skeleton-c"] as const;

function BaseModalSkeleton() {
  return (
    <>
      {SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="flex animate-pulse items-center justify-between rounded-lg border border-border bg-background px-5 py-[14px]"
        >
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-56 rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-[10px] bg-muted" />
            <div className="h-10 w-16 rounded-[10px] bg-muted" />
          </div>
        </div>
      ))}
    </>
  );
}
