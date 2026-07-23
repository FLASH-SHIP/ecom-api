"use client";

import {
  getShippingMethodLabel,
  getShippingOriginLabel,
  SHIPPING_METHOD_OPTIONS,
  SHIPPING_ORIGIN_OPTIONS,
  ShippingMethod,
  ShippingOrigin,
} from "@ecom/types";
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
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { OrderFormValues } from "./page";

export interface BasicInfoSectionProps {
  control: Control<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
}

export function BasicInfoSection({ control, register, errors }: BasicInfoSectionProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[#DADADA] bg-[#FDFFFF]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 2xl:py-4 border-b border-[#DADADA] bg-[#FEFCFA]">
        <h3 className="text-base 2xl:text-xl font-semibold text-[#232323] leading-6">Basic Info</h3>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#FDFFFF]">
        <FieldGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Shipping Origin */}
          <Field>
            <FieldLabel>
              Shipping Origin <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              name="shippingOrigin"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={cn(
                      "w-full bg-background/50 border-input",
                      errors.shippingOrigin && "border-destructive focus:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Select shipping origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_ORIGIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.shippingOrigin]} />
          </Field>

          {/* Shipping Method */}
          <Field>
            <FieldLabel>
              Shipping Method <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              name="shippingMethod"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={cn(
                      "w-full bg-background/50 border-input",
                      errors.shippingMethod && "border-destructive focus:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.shippingMethod]} />
          </Field>

          {/* Order ID */}
          <Field>
            <FieldLabel htmlFor="sellerOrderId">
              Order ID <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="sellerOrderId"
              type="text"
              {...register("sellerOrderId")}
              placeholder="Enter order id"
              className={cn(
                "w-full bg-background/50",
                errors.sellerOrderId && "border-destructive focus-visible:ring-destructive",
              )}
            />
            <FieldError errors={[errors.sellerOrderId]} />
          </Field>

          {/* Total Packets */}
          <Field>
            <FieldLabel htmlFor="totalPackets">
              Total Packets <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="totalPackets"
              type="number"
              min={1}
              required
              {...register("totalPackets")}
              placeholder="Enter total packets"
              className={cn(
                "w-full bg-background/50",
                errors.totalPackets && "border-destructive focus-visible:ring-destructive",
              )}
            />
            <FieldError errors={[errors.totalPackets]} />
          </Field>

          {/* Hidden inputs for auto-calculated values */}
          <input type="hidden" {...register("detailDescription")} />
          <input type="hidden" {...register("declaredValue")} />
        </FieldGroup>
      </div>
    </div>
  );
}
