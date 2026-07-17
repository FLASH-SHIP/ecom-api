"use client";

import { Field, FieldError, FieldGroup, FieldLabel } from "@ecom/ui/components/field";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
} from "react-hook-form";

export interface BasicInfoFormFields {
  shippingOrigin: string;
  shippingMethod: string;
  sellerOrderId?: string;
  detailDescription?: string;
  declaredValue?: string;
}

export interface BasicInfoSectionProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
}

export function BasicInfoSection<TFieldValues extends FieldValues = FieldValues>({
  control,
  register,
  errors,
}: BasicInfoSectionProps<TFieldValues>) {
  const controlParent = control as unknown as Control<BasicInfoFormFields>;
  const registerParent = register as unknown as UseFormRegister<BasicInfoFormFields>;
  const errorsParent = errors as unknown as FieldErrors<BasicInfoFormFields>;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-lg 2xl:text-xl font-semibold text-[#232323] leading-6">Basic Info</h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
        <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shipping Origin */}
          <Field>
            <FieldLabel>
              Shipping Origin <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              name="shippingOrigin"
              control={controlParent}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={cn(
                      "w-full bg-background/50 border-input",
                      errorsParent.shippingOrigin && "border-destructive focus:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Select shipping origin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HAN">HAN (Hà Nội)</SelectItem>
                    <SelectItem value="SGN">SGN (TP. HCM)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errorsParent.shippingOrigin]} />
          </Field>

          {/* Shipping Method */}
          <Field>
            <FieldLabel>
              Shipping Method <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              name="shippingMethod"
              control={controlParent}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={cn(
                      "w-full bg-background/50 border-input",
                      errorsParent.shippingMethod && "border-destructive focus:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EPACKET">ePacket</SelectItem>
                    <SelectItem value="EXPRESS">Express</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errorsParent.shippingMethod]} />
          </Field>

          {/* Order ID */}
          <Field>
            <FieldLabel htmlFor="sellerOrderId">
              Order ID (Optional Reference)
            </FieldLabel>
            <Input
              id="sellerOrderId"
              type="text"
              {...registerParent("sellerOrderId")}
              placeholder="Enter order id reference"
              className={cn(
                "w-full bg-background/50",
                errorsParent.sellerOrderId && "border-destructive focus-visible:ring-destructive",
              )}
            />
            <FieldError errors={[errorsParent.sellerOrderId]} />
          </Field>

          {/* Hidden inputs for auto-calculated values */}
          <input type="hidden" {...registerParent("detailDescription")} />
          <input type="hidden" {...registerParent("declaredValue")} />
        </FieldGroup>
      </div>
    </div>
  );
}
