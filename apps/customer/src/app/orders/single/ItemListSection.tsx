"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { TrashIcon } from "@ecom/ui/components/icons";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { Control, FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { Controller, useFieldArray } from "react-hook-form";
import type { OrderFormValues } from "./page";

export interface ItemListSectionProps {
  control: Control<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
}

export function ItemListSection({ control, register, errors }: ItemListSectionProps) {
  const { languageId: currentLocale } = useI18n();
  const controlParent = control as unknown as Control<OrderFormValues>;
  const registerParent = register as unknown as UseFormRegister<OrderFormValues>;
  const errorsParent = errors as unknown as FieldErrors<OrderFormValues>;

  const { fields, append, remove } = useFieldArray({
    control: controlParent,
    name: "products",
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center px-4 py-3 2xl:py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-semibold text-[#232323] leading-6">
          {translate("customerOrder.single.itemList", currentLocale)}
        </h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-6 bg-[#FDFFFF]">
        <div className="flex flex-col gap-6">
          {fields.map((field, index) => {
            const prefixId = `products.${index}.hsCodePrefix` as `products.${number}.hsCodePrefix`;
            const numberId = `products.${index}.hsCodeNumber` as `products.${number}.hsCodeNumber`;
            return (
              <div
                key={field.id}
                className="flex flex-col gap-4 pb-6 border-b border-dashed border-[#DADADA] last:border-0 last:pb-0"
              >
                <div className="flex items-center w-full gap-2">
                  <h4 className="text-base 2xl:text-xl font-semibold text-[#232323]">
                    {translate("customerOrder.single.item", currentLocale)} {index + 1}
                  </h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => remove(index)}
                      className="!text-[#D32D20] !bg-white p-0 cursor-pointer rounded"
                    >
                      <TrashIcon />
                    </Button>
                  )}
                </div>

                <FieldGroup>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Details Description */}
                    <Field className="flex flex-col gap-2">
                      <FieldLabel className="text-[#232323] text-sm md:text-base font-medium">
                        {translate("customerOrder.single.detailsDescription", currentLocale)}{" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        type="text"
                        required
                        placeholder={translate(
                          "customerOrder.placeholder.itemDescription",
                          currentLocale,
                        )}
                        {...register(`products.${index}.description` as const)}
                        className={cn(
                          "w-full bg-background/50",
                          errors.products?.[index]?.description &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      <FieldError errors={[errors.products?.[index]?.description]} />
                    </Field>

                    {/* Quantity */}
                    <Field className="flex flex-col gap-2">
                      <FieldLabel className="text-[#232323] text-sm md:text-base font-medium">
                        {translate("customerOrder.single.quantity", currentLocale)}{" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        type="number"
                        required
                        placeholder={translate(
                          "customerOrder.placeholder.itemQuantity",
                          currentLocale,
                        )}
                        {...register(`products.${index}.quantity` as const)}
                        className={cn(
                          "w-full bg-background/50",
                          errors.products?.[index]?.quantity &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      <FieldError errors={[errors.products?.[index]?.quantity]} />
                    </Field>

                    {/* Value */}
                    <Field className="flex flex-col gap-2">
                      <FieldLabel className="text-[#232323] text-sm md:text-base font-medium">
                        {translate("customerOrder.single.declaredValueUsd", currentLocale)}{" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        placeholder={translate(
                          "customerOrder.placeholder.itemValue",
                          currentLocale,
                        )}
                        {...register(`products.${index}.value` as const)}
                        className={cn(
                          "w-full bg-background/50",
                          errors.products?.[index]?.value &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      <FieldError errors={[errors.products?.[index]?.value]} />
                    </Field>

                    {/* HS Code */}
                    <Field className="flex flex-col gap-2">
                      <FieldLabel className="text-[#232323] text-sm md:text-base font-medium">
                        {translate("customerOrder.single.hsCode", currentLocale)}
                      </FieldLabel>
                      <div
                        className={cn(
                          "flex items-center rounded-lg border border-input bg-background/50 focus-within:ring-1 focus-within:ring-ring overflow-hidden h-10",
                          errors.products?.[index]?.hsCodeNumber &&
                            "border-destructive focus-within:ring-destructive",
                        )}
                      >
                        <Controller
                          name={prefixId}
                          control={control}
                          render={({ field: selectField }) => (
                            <Select value={selectField.value} onValueChange={selectField.onChange}>
                              <SelectTrigger className="w-[80px] border-0 bg-transparent focus:ring-0 shadow-none focus:ring-offset-0 px-3 h-full cursor-pointer">
                                <SelectValue placeholder="US" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">US</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <div className="w-px h-8 bg-[#D9D9D9] shrink-0" />
                        <Input
                          type="text"
                          placeholder={translate(
                            "customerOrder.placeholder.itemHsCode",
                            currentLocale,
                          )}
                          {...register(numberId)}
                          className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none focus-visible:ring-offset-0 h-full placeholder:text-muted-foreground"
                        />
                      </div>
                      <FieldError errors={[errors.products?.[index]?.hsCodeNumber]} />
                    </Field>
                  </div>

                  {/* Hidden fields to ensure parent validation and values are correctly tracked */}
                  <input type="hidden" {...register(`products.${index}.originCountry` as const)} />
                  <input type="hidden" {...register(`products.${index}.weight` as const)} />
                  <input type="hidden" {...register(`products.${index}.sku` as const)} />
                </FieldGroup>
              </div>
            );
          })}
        </div>

        <div className="flex justify-start mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                description: "",
                quantity: "1",
                value: "",
                hsCodePrefix: "US",
                hsCodeNumber: "",
                originCountry: "VN",
                weight: "",
                sku: "",
              })
            }
            className="px-2.5 rounded-[10px] border border-[#E5E5E5] text-[#0A0A0A] text-base font-semibold bg-white hover:bg-muted/30 flex items-center gap-2 cursor-pointer shadow-sm w-fit"
          >
            <Plus className="h-5 w-5 text-[#0A0A0A]" />
            {translate("customerOrder.single.addItem", currentLocale)}
          </Button>
        </div>
      </div>
    </div>
  );
}
