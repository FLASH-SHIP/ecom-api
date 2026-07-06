"use client";

import { useToast } from "@admin/components/toast-provider";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { Textarea } from "@ecom/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const _schemaShape = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().max(500).optional().nullable(),
});

type FormValues = z.infer<typeof _schemaShape>;

const defaultValues: FormValues = {
  name: "",
  code: "",
  description: "",
};

interface GroupFormDrawerProps {
  groupId?: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function GroupFormDrawer({ groupId, open, onClose, onSaved }: GroupFormDrawerProps) {
  const t = useTranslations("customer-groups");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const isEdit = groupId !== undefined && groupId !== null;

  const { data: groupData, isLoading: isGroupLoading } = trpc.viewer.customerGroups.get.useQuery(
    { id: groupId ?? 0 },
    { enabled: open && isEdit },
  );

  const schema = z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    code: z.string().min(1, t("validation.codeRequired")),
    description: z.string().max(500).optional().nullable(),
  });

  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    mode: "onChange",
    defaultValues,
    resolver: zodResolver(schema),
  });

  const { isSubmitting } = formState;

  useEffect(() => {
    if (open) {
      if (isEdit && groupData) {
        reset({
          name: groupData.name,
          code: groupData.code,
          description: groupData.description ?? "",
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, isEdit, groupData, reset]);

  const utils = trpc.useUtils();

  const createMut = trpc.viewer.customerGroups.create.useMutation({
    onSuccess: () => {
      utils.viewer.customerGroups.list.invalidate();
      toast(t("messages.createSuccess"), "success");
      onSaved();
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const updateMut = trpc.viewer.customerGroups.update.useMutation({
    onSuccess: () => {
      utils.viewer.customerGroups.list.invalidate();
      utils.viewer.customerGroups.get.invalidate({ id: groupId ?? 0 });
      toast(t("messages.updateSuccess"), "success");
      onSaved();
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  async function onSubmit(data: FormValues) {
    if (isEdit) {
      if (groupId === null || groupId === undefined) return;
      updateMut.mutate({
        id: groupId,
        name: data.name.trim(),
        code: data.code.trim().toLowerCase(),
        description: data.description?.trim() || null,
      });
    } else {
      createMut.mutate({
        name: data.name.trim(),
        code: data.code.trim().toLowerCase(),
        description: data.description?.trim() || null,
      });
    }
  }

  const isMutPending = createMut.isPending || updateMut.isPending;
  const anyError = createMut.error || updateMut.error;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[520px]">
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{isEdit ? t("editGroup") : t("createNew")}</SheetTitle>
        </SheetHeader>

        {isEdit && isGroupLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <PerfectScroll className="flex flex-1 flex-col gap-5 px-6 py-6">
              {/* Group Name */}
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="group-name">
                      {t("form.nameLabel")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...field}
                      id="group-name"
                      placeholder={t("form.namePlaceholder")}
                      required
                      aria-invalid={!!fieldState.error}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Group Code */}
              <Controller
                name="code"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="group-code">
                      {t("form.codeLabel")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...field}
                      id="group-code"
                      placeholder={t("form.codePlaceholder")}
                      required
                      disabled={isEdit}
                      aria-invalid={!!fieldState.error}
                      onChange={(e) =>
                        field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))
                      }
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Group Description */}
              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="group-description">{t("form.descriptionLabel")}</Label>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      id="group-description"
                      placeholder={t("form.descriptionPlaceholder")}
                      aria-invalid={!!fieldState.error}
                      rows={3}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Server error */}
              {anyError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                  <AlertCircle className="size-4 shrink-0" />
                  {anyError.message}
                </div>
              )}
            </PerfectScroll>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {tCommon("cancel")}
              </Button>
              <Button id="group-form-save" type="submit" disabled={isSubmitting || isMutPending}>
                {isMutPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
