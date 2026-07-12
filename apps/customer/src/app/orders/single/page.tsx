"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { cn } from "@ecom/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../../../components/toast-provider";
import { useOrderStore } from "./useOrderStore";

const orderFormSchema = z.object({
  shippingMethod: z.enum(["EXPRESS", "EPACKET"]),
  shippingOrigin: z.string().min(1, "Vui lòng chọn kho gửi."),
  detailDescription: z.string().min(1, "Vui lòng nhập mô tả hàng hóa."),
  declaredValue: z
    .string()
    .min(1, "Vui lòng nhập trị giá hàng hóa.")
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
      "Trị giá hàng hóa phải lớn hơn 0.",
    ),
  sellerOrderId: z.string().optional(),
  hsCode: z.string().optional(),

  // Sender Info
  senderName: z.string().min(1, "Vui lòng nhập tên người gửi."),
  senderPhone: z.string().min(1, "Vui lòng nhập số điện thoại người gửi."),
  senderEmail: z.string().email("Email người gửi không hợp lệ.").or(z.literal("")),
  senderAddress: z.string().min(1, "Vui lòng nhập địa chỉ người gửi."),
  senderCity: z.string().min(1, "Vui lòng nhập thành phố người gửi."),
  senderZipCode: z.string().min(1, "Vui lòng nhập mã zip người gửi."),
  senderCountry: z.string().min(1, "Vui lòng chọn quốc gia người gửi."),

  // Receiver Info
  receiverName: z.string().min(1, "Vui lòng nhập tên người nhận."),
  receiverPhone: z.string().optional(),
  receiverEmail: z.string().email("Email người nhận không hợp lệ.").or(z.literal("")),
  receiverAddress1: z.string().min(1, "Vui lòng nhập địa chỉ người nhận."),
  receiverAddress2: z.string().optional(),
  receiverCity: z.string().min(1, "Vui lòng nhập thành phố người nhận."),
  receiverState: z.string().min(1, "Vui lòng nhập bang/tỉnh người nhận."),
  receiverZipCode: z.string().min(1, "Vui lòng nhập mã zip người nhận."),
  receiverCountry: z.string().min(1, "Vui lòng chọn quốc gia người nhận."),

  // Package Info
  packagingCode: z.string().min(1, "Vui lòng chọn loại đóng gói."),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  weight: z
    .string()
    .min(1, "Vui lòng nhập cân nặng gói hàng.")
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
      "Cân nặng gói hàng phải lớn hơn 0.",
    ),
  packageName: z.string().min(1, "Vui lòng nhập tên gói hàng."),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: single order creation form complexity
export default function CreateSingleOrderPage() {
  const router = useRouter();
  const trpcContext = trpc.useUtils();
  const { toast } = useToast();

  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const step = useOrderStore((state) => state.step);
  const pricing = useOrderStore((state) => state.pricing);
  const storeValues = useOrderStore((state) => state.values);
  const setStep = useOrderStore((state) => state.setStep);
  const setPricing = useOrderStore((state) => state.setPricing);
  const setValues = useOrderStore((state) => state.setValues);
  const clearStore = useOrderStore((state) => state.clearStore);

  const isRestored = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      shippingMethod: "EPACKET",
      shippingOrigin: "HAN",
      detailDescription: "",
      declaredValue: "",
      sellerOrderId: "",
      hsCode: "",
      senderName: "",
      senderPhone: "",
      senderEmail: "",
      senderAddress: "",
      senderCity: "",
      senderZipCode: "",
      senderCountry: "VN",
      receiverName: "",
      receiverPhone: "",
      receiverEmail: "",
      receiverAddress1: "",
      receiverAddress2: "",
      receiverCity: "",
      receiverState: "",
      receiverZipCode: "",
      receiverCountry: "US",
      packagingCode: "cardboard_box",
      length: "",
      width: "",
      height: "",
      weight: "",
      packageName: "",
    },
  });

  // Extract watched values for Step 2 and live calculations
  const watched = watch();
  const {
    shippingMethod,
    shippingOrigin,
    detailDescription,
    declaredValue,
    sellerOrderId,
    hsCode,
    senderName,
    senderPhone,
    senderEmail,
    senderAddress,
    senderCity,
    senderZipCode,
    senderCountry,
    receiverName,
    receiverPhone,
    receiverEmail,
    receiverAddress1,
    receiverAddress2,
    receiverCity,
    receiverState,
    receiverZipCode,
    receiverCountry,
    packagingCode,
    length,
    width,
    height,
    weight,
    packageName,
  } = watched;

  const triggerError = (msg: string) => {
    setError(msg);
    toast(msg, "error");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [saveSenderSetting, setSaveSenderSetting] = useState(false);
  const [savePackageSetting, setSavePackageSetting] = useState(false);

  const [isGetLabel, setIsGetLabel] = useState(false);

  // Live volume weight calculation (gr)
  const [liveVolumeWeight, setLiveVolumeWeight] = useState(0);

  useEffect(() => {
    const l = Number(length) || 0;
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    const computedGrams = Math.round((l * w * h) / 5);
    setLiveVolumeWeight(computedGrams);
  }, [length, width, height]);

  // Set hydration status
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const storeValuesString = JSON.stringify(storeValues);

  // Load draft from Zustand store on mount once hydrated
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mount prefill and restore draft complexity
  useEffect(() => {
    if (isHydrated && !isRestored.current) {
      if (typeof window !== "undefined") {
        const savedData = sessionStorage.getItem("create_single_order_draft");
        if (savedData) {
          try {
            reset(JSON.parse(storeValuesString));
          } catch (e) {
            console.error("Failed to parse store values", e);
          }
        } else {
          // Prefill from localStorage defaults if no draft session exists
          const defaultSender = localStorage.getItem("default_sender_info");
          const defaultPackage = localStorage.getItem("default_package_info");
          const newDefaults = JSON.parse(storeValuesString);

          if (defaultSender) {
            try {
              const senderObj = JSON.parse(defaultSender);
              Object.assign(newDefaults, senderObj);
              setSaveSenderSetting(true);
            } catch (e) {
              console.error("Failed to parse default sender info", e);
            }
          }

          if (defaultPackage) {
            try {
              const packageObj = JSON.parse(defaultPackage);
              Object.assign(newDefaults, packageObj);
              setSavePackageSetting(true);
            } catch (e) {
              console.error("Failed to parse default package info", e);
            }
          }

          reset(newDefaults);
        }
      }
      isRestored.current = true;
    }
  }, [isHydrated, reset, storeValuesString]);

  // Save draft to Zustand store on field change
  const watchedString = JSON.stringify(watched);
  useEffect(() => {
    if (isHydrated && isRestored.current) {
      try {
        const parsed = JSON.parse(watchedString);
        setValues(parsed);
      } catch (e) {
        console.error("Failed to parse watched values", e);
      }
    }
  }, [watchedString, isHydrated, setValues]);

  // handle step 1 "Get Rates"
  const handleGetRates = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await trpcContext.client.customer.orders.calculateFreight.query({
        shippingMethod,
        country: receiverCountry,
        declaredWeight: Number(weight),
        dimensionLength: length ? Number(length) : null,
        dimensionWidth: width ? Number(width) : null,
        dimensionHeight: height ? Number(height) : null,
        origin: shippingOrigin,
      });

      setPricing({
        baseShippingRate: res.baseShippingRate,
        surchargeFee: res.surchargeFee,
        totalAmount: res.totalAmount,
        chargeableWeight: res.chargeableWeight,
        volumeWeight: res.volumeWeight,
        appliedRateCardId: res.appliedRateCardId ? String(res.appliedRateCardId) : undefined,
      });
      setStep(2);
      window.scrollTo(0, 0);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      triggerError(errMsg || "Không thể tính toán cước phí. Vui lòng kiểm tra lại bảng giá.");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    triggerError("Vui lòng kiểm tra và điền đầy đủ thông tin các trường bắt buộc.");
  };

  // create order mutation
  const createOrderMutation = trpc.customer.orders.create.useMutation({
    onSuccess: () => {
      // Save or remove defaults based on checkbox states
      if (typeof window !== "undefined") {
        if (saveSenderSetting) {
          const senderInfo = {
            senderName,
            senderPhone,
            senderEmail,
            senderAddress,
            senderCity,
            senderZipCode,
            senderCountry,
          };
          localStorage.setItem("default_sender_info", JSON.stringify(senderInfo));
        } else {
          localStorage.removeItem("default_sender_info");
        }

        if (savePackageSetting) {
          const packageInfo = {
            packagingCode,
            length,
            width,
            height,
            weight,
            packageName,
          };
          localStorage.setItem("default_package_info", JSON.stringify(packageInfo));
        } else {
          localStorage.removeItem("default_package_info");
        }
      }

      clearStore();
      // Refresh context cache and navigate back to list
      trpcContext.customer.orders.list.invalidate();
      router.push("/orders");
    },
    onError: (err) => {
      triggerError(err.message || "Tạo đơn hàng thất bại. Vui lòng thử lại.");
    },
  });

  const handleCreateOrder = () => {
    setError(null);
    createOrderMutation.mutate({
      shippingMethod,
      shippingOrigin,
      sellerOrderId: sellerOrderId || null,
      importId: null,

      senderName,
      senderAddress,
      senderPhone,
      senderEmail,
      senderCountry,
      senderState: "",
      senderCity,
      senderZipCode,

      receiverName,
      receiverPhone: receiverPhone || null,
      receiverEmail,
      receiverCity,
      receiverState,
      receiverAddress1,
      receiverAddress2: receiverAddress2 || null,
      receiverCountry,
      receiverZipCode,

      detailDescription,
      declaredWeight: Number(weight),
      dimensionLength: length ? Number(length) : null,
      dimensionWidth: width ? Number(width) : null,
      dimensionHeight: height ? Number(height) : null,
      declaredValue: Number(declaredValue),
      hsCode: hsCode || null,
      packagingCode,
      isGetLabel: isGetLabel ? 1 : 0,
    });
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (step === 2 && pricing) {
    // Render Step 2: Review & Payment
    return (
      <div className="flex flex-col gap-6 w-full pb-10">
        <div className="title-page-content text-2xl font-bold text-foreground">
          Review & Payment
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recipient Details */}
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                    Recipient
                  </h3>
                  <div className="grid grid-cols-3 gap-y-3 text-sm">
                    <div className="text-muted-foreground">Recipient Name</div>
                    <div className="col-span-2 font-medium text-foreground">{receiverName}</div>

                    <div className="text-muted-foreground">City/State/Country</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {receiverCity}, {receiverState}, {receiverCountry}
                    </div>

                    <div className="text-muted-foreground">Address 1</div>
                    <div className="col-span-2 font-medium text-foreground">{receiverAddress1}</div>

                    {receiverAddress2 && (
                      <>
                        <div className="text-muted-foreground">Address 2</div>
                        <div className="col-span-2 font-medium text-foreground">
                          {receiverAddress2}
                        </div>
                      </>
                    )}

                    <div className="text-muted-foreground">Zip/Post code</div>
                    <div className="col-span-2 font-medium text-foreground">{receiverZipCode}</div>

                    <div className="text-muted-foreground">Phone Number</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {receiverPhone || "N/A"}
                    </div>

                    <div className="text-muted-foreground">Email</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {receiverEmail || "N/A"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sender Details */}
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                    Sender
                  </h3>
                  <div className="grid grid-cols-3 gap-y-3 text-sm">
                    <div className="text-muted-foreground">Sender Name</div>
                    <div className="col-span-2 font-medium text-foreground">{senderName}</div>

                    <div className="text-muted-foreground">City/Country</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {senderCity}, {senderCountry}
                    </div>

                    <div className="text-muted-foreground">Address</div>
                    <div className="col-span-2 font-medium text-foreground">{senderAddress}</div>

                    <div className="text-muted-foreground">Zip/Post code</div>
                    <div className="col-span-2 font-medium text-foreground">{senderZipCode}</div>

                    <div className="text-muted-foreground">Phone Number</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {senderPhone || "N/A"}
                    </div>

                    <div className="text-muted-foreground">Email</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {senderEmail || "N/A"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info Details */}
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                    Basic Info
                  </h3>
                  <div className="grid grid-cols-3 gap-y-3 text-sm">
                    <div className="text-muted-foreground">Shipping Origin</div>
                    <div className="col-span-2 font-medium text-foreground">{shippingOrigin}</div>

                    <div className="text-muted-foreground">Order Code</div>
                    <div className="col-span-2 font-medium text-cyan-600 dark:text-cyan-400 italic">
                      Pending (Auto-generated)
                    </div>

                    <div className="text-muted-foreground">Shipping Method</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {shippingMethod === "EXPRESS" ? "Express" : "ePacket"}
                    </div>

                    <div className="text-muted-foreground">Order ID</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {sellerOrderId || "N/A"}
                    </div>

                    <div className="text-muted-foreground">Details Description</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {detailDescription}
                    </div>

                    <div className="text-muted-foreground">Created Time</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {new Date().toLocaleDateString("vi-VN")}{" "}
                      {new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Package Details */}
              <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                    Package
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="text-muted-foreground">Value</div>
                    <div className="font-medium text-foreground">${declaredValue}</div>

                    <div className="text-muted-foreground">Dimensions</div>
                    <div className="font-medium text-foreground">
                      {length && width && height
                        ? `L ${length} × W ${width} × H ${height} cm`
                        : "N/A"}
                    </div>

                    <div className="text-muted-foreground">Weight</div>
                    <div className="font-medium text-foreground">{weight} gr</div>

                    <div className="text-muted-foreground">Volume Weight</div>
                    <div className="font-medium text-foreground">{pricing.volumeWeight} gr</div>

                    <div className="text-muted-foreground">HS Code</div>
                    <div className="font-medium text-foreground">{hsCode || "N/A"}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charges & Surcharges Card */}
          <div className="flex flex-col gap-6">
            <Card className="rounded-xl border border-[#cbeef2] bg-[#E5F7F9] dark:bg-cyan-950/20 dark:border-cyan-900/30 shadow-sm">
              <CardContent className="p-6 flex flex-col gap-6">
                <h3 className="font-bold text-lg text-[#0F798C] dark:text-cyan-400">
                  Charges & Surcharges
                </h3>
                <div className="flex flex-col gap-3 text-sm text-[#0F798C] dark:text-cyan-300">
                  <div className="flex justify-between">
                    <span className="text-[#0F798C]/70 dark:text-cyan-400/70">
                      Base Shipping Rate
                    </span>
                    <span className="font-semibold text-foreground">
                      ${pricing.baseShippingRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F798C]/70 dark:text-cyan-400/70">Fuel Surcharge</span>
                    <span className="font-semibold text-foreground">
                      ${pricing.surchargeFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F798C]/70 dark:text-cyan-400/70">
                      Chargeable Weight
                    </span>
                    <span className="font-semibold text-foreground">
                      {(pricing.chargeableWeight / 1000).toFixed(2)} kg
                    </span>
                  </div>
                  <div className="border-t border-dashed border-[#a6e2eb] pt-3 flex justify-between text-base font-bold">
                    <span className="text-[#0F798C]">TOTAL AMOUNT</span>
                    <span className="text-[#0F798C] text-lg dark:text-cyan-400">
                      ${pricing.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 border-t border-[#a6e2eb] pt-4">
                  <Checkbox
                    id="get-label"
                    checked={isGetLabel}
                    onCheckedChange={(checked) => setIsGetLabel(!!checked)}
                  />
                  <label
                    htmlFor="get-label"
                    className="text-sm font-medium leading-none text-foreground cursor-pointer flex items-baseline gap-1"
                  >
                    Get Label{" "}
                    <span className="text-xs text-muted-foreground font-normal">Description</span>
                  </label>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={createOrderMutation.isPending}
                    className="w-1/2 border-[#a6e2eb] text-[#0F798C] hover:bg-[#e6f7f9] dark:hover:bg-cyan-950/40 py-2.5 rounded-lg font-semibold"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateOrder}
                    disabled={createOrderMutation.isPending}
                    className="w-1/2 bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center"
                  >
                    {createOrderMutation.isPending && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    )}
                    Create Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Render Step 1: Input Form
  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="title-page-content text-2xl font-bold text-foreground">
        Create a Single Order
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(handleGetRates, onInvalid)} className="flex flex-col gap-6">
        {/* Basic Info */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-lg text-foreground border-b border-border pb-2">
              Basic Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Shipping Method <span className="text-destructive ml-0.5">*</span>
                </Label>
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
                        <SelectItem value="EPACKET">ePacket</SelectItem>
                        <SelectItem value="EXPRESS">Express</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.shippingMethod && (
                  <p className="text-xs text-destructive mt-0.5">{errors.shippingMethod.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label
                  htmlFor="detailDescription"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Details Description <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="detailDescription"
                  type="text"
                  required
                  {...register("detailDescription")}
                  placeholder="Enter details description"
                  className={cn(
                    "w-full bg-background/50",
                    errors.detailDescription && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.detailDescription && (
                  <p className="text-xs text-destructive mt-0.5">
                    {errors.detailDescription.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Shipping Origin <span className="text-destructive ml-0.5">*</span>
                </Label>
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
                        <SelectItem value="HAN">HAN (Hà Nội)</SelectItem>
                        <SelectItem value="SGN">SGN (TP. HCM)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.shippingOrigin && (
                  <p className="text-xs text-destructive mt-0.5">{errors.shippingOrigin.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sellerOrderId" className="text-xs font-bold text-muted-foreground">
                  Order ID (Optional Reference)
                </Label>
                <Input
                  id="sellerOrderId"
                  type="text"
                  {...register("sellerOrderId")}
                  placeholder="Enter order id reference"
                  className={cn(
                    "w-full bg-background/50",
                    errors.sellerOrderId && "border-destructive focus-visible:ring-destructive",
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <Label
                    htmlFor="declaredValue"
                    className="text-xs font-bold text-muted-foreground"
                  >
                    Value ($ USD) <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Label htmlFor="hsCode" className="text-xs font-bold text-muted-foreground">
                    HS Code (Optional)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="declaredValue"
                    type="number"
                    step="0.01"
                    required
                    {...register("declaredValue")}
                    placeholder="Value"
                    className={cn(
                      "w-1/3 bg-background/50",
                      errors.declaredValue && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  <Input
                    id="hsCode"
                    type="text"
                    {...register("hsCode")}
                    placeholder="HS code number"
                    className={cn(
                      "w-2/3 bg-background/50",
                      errors.hsCode && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                </div>
                {errors.declaredValue && (
                  <p className="text-xs text-destructive mt-0.5">{errors.declaredValue.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender Info */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-lg text-foreground border-b border-border pb-2">
              Sender
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <Label htmlFor="senderAddress" className="text-xs font-bold text-muted-foreground">
                  Address <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="senderAddress"
                  type="text"
                  required
                  {...register("senderAddress")}
                  placeholder="Enter sender street address"
                  className={cn(
                    "w-full bg-background/50",
                    errors.senderAddress && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.senderAddress && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderAddress.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Country <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Controller
                  name="senderCountry"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={cn(
                          "w-full bg-background/50 border-input",
                          errors.senderCountry && "border-destructive focus:ring-destructive",
                        )}
                      >
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VN">Vietnam</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.senderCountry && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderCountry.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderZipCode" className="text-xs font-bold text-muted-foreground">
                  Postcode / Zipcode <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="senderZipCode"
                  type="text"
                  required
                  {...register("senderZipCode")}
                  placeholder="Enter zipcode"
                  className={cn(
                    "w-full bg-background/50",
                    errors.senderZipCode && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.senderZipCode && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderZipCode.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderCity" className="text-xs font-bold text-muted-foreground">
                  City / Province <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="senderCity"
                  type="text"
                  required
                  {...register("senderCity")}
                  placeholder="Enter city"
                  className={cn(
                    "w-full bg-background/50",
                    errors.senderCity && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.senderCity && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderCity.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderName" className="text-xs font-bold text-muted-foreground">
                  Sender Name <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="senderName"
                  type="text"
                  required
                  {...register("senderName")}
                  placeholder="Enter sender name"
                  className={cn(
                    "w-full bg-background/50",
                    errors.senderName && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.senderName && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderPhone" className="text-xs font-bold text-muted-foreground">
                  Phone Number <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="senderPhone"
                  type="text"
                  required
                  {...register("senderPhone")}
                  placeholder="Enter sender phone number"
                  className={cn(
                    "w-full bg-background/50",
                    errors.senderPhone && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.senderPhone && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderPhone.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderEmail" className="text-xs font-bold text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="senderEmail"
                  type="email"
                  {...register("senderEmail")}
                  placeholder="Enter sender email"
                  className={cn(
                    "w-full bg-background/50",
                    errors.senderEmail && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.senderEmail && (
                  <p className="text-xs text-destructive mt-0.5">{errors.senderEmail.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="save-sender"
                checked={saveSenderSetting}
                onCheckedChange={(c) => setSaveSenderSetting(!!c)}
              />
              <label
                htmlFor="save-sender"
                className="text-xs font-bold text-muted-foreground cursor-pointer select-none"
              >
                Save your setting for repeated use
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Receiver Info */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-lg text-foreground border-b border-border pb-2">
              Receiver
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="receiverAddress1"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Address 1 <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="receiverAddress1"
                  type="text"
                  required
                  {...register("receiverAddress1")}
                  placeholder="Enter receiver street address 1"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverAddress1 && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.receiverAddress1 && (
                  <p className="text-xs text-destructive mt-0.5">
                    {errors.receiverAddress1.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="receiverAddress2"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Address 2 (Optional)
                </Label>
                <Input
                  id="receiverAddress2"
                  type="text"
                  {...register("receiverAddress2")}
                  placeholder="Apt, Suite, Unit, etc."
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverAddress2 && "border-destructive focus-visible:ring-destructive",
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Country <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Controller
                  name="receiverCountry"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={cn(
                          "w-full bg-background/50 border-input",
                          errors.receiverCountry && "border-destructive focus:ring-destructive",
                        )}
                      >
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="VN">Vietnam</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.receiverCountry && (
                  <p className="text-xs text-destructive mt-0.5">
                    {errors.receiverCountry.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="receiverZipCode"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Postcode / Zipcode <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="receiverZipCode"
                  type="text"
                  required
                  {...register("receiverZipCode")}
                  placeholder="Enter zipcode"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverZipCode && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.receiverZipCode && (
                  <p className="text-xs text-destructive mt-0.5">
                    {errors.receiverZipCode.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="receiverState" className="text-xs font-bold text-muted-foreground">
                  State / Region <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="receiverState"
                  type="text"
                  required
                  {...register("receiverState")}
                  placeholder="Enter state"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverState && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.receiverState && (
                  <p className="text-xs text-destructive mt-0.5">{errors.receiverState.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="receiverCity" className="text-xs font-bold text-muted-foreground">
                  City <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="receiverCity"
                  type="text"
                  required
                  {...register("receiverCity")}
                  placeholder="Enter city"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverCity && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.receiverCity && (
                  <p className="text-xs text-destructive mt-0.5">{errors.receiverCity.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="receiverName" className="text-xs font-bold text-muted-foreground">
                  Receiver Name <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="receiverName"
                  type="text"
                  required
                  {...register("receiverName")}
                  placeholder="Enter receiver full name"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverName && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.receiverName && (
                  <p className="text-xs text-destructive mt-0.5">{errors.receiverName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="receiverPhone" className="text-xs font-bold text-muted-foreground">
                  Phone Number
                </Label>
                <Input
                  id="receiverPhone"
                  type="text"
                  {...register("receiverPhone")}
                  placeholder="Enter receiver phone number"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverPhone && "border-destructive focus-visible:ring-destructive",
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="receiverEmail" className="text-xs font-bold text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="receiverEmail"
                  type="email"
                  {...register("receiverEmail")}
                  placeholder="Enter receiver email"
                  className={cn(
                    "w-full bg-background/50",
                    errors.receiverEmail && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.receiverEmail && (
                  <p className="text-xs text-destructive mt-0.5">{errors.receiverEmail.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Info */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-lg text-foreground border-b border-border pb-2">
              Package Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <Label className="text-xs font-bold text-muted-foreground">
                  Type of Packaging <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Controller
                  name="packagingCode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={cn(
                          "w-full bg-background/50 border-input",
                          errors.packagingCode && "border-destructive focus:ring-destructive",
                        )}
                      >
                        <SelectValue placeholder="Select type of packaging" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardboard_box">Cardboard box</SelectItem>
                        <SelectItem value="poly_mailer">Poly mailer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.packagingCode && (
                  <p className="text-xs text-destructive mt-0.5">{errors.packagingCode.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-muted-foreground">
                  Package Dimensions (cm) <span className="text-destructive ml-0.5">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Length"
                    {...register("length")}
                    className={cn(
                      "w-full bg-background/50",
                      errors.length && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    placeholder="Width"
                    {...register("width")}
                    className={cn(
                      "w-full bg-background/50",
                      errors.width && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    placeholder="Height"
                    {...register("height")}
                    className={cn(
                      "w-full bg-background/50",
                      errors.height && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weight" className="text-xs font-bold text-muted-foreground">
                  Package Weight (gr) <span className="text-destructive ml-0.5">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    required
                    placeholder="0.00"
                    {...register("weight")}
                    className={cn(
                      "w-2/3 bg-background/50",
                      errors.weight && "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  <Select defaultValue="gram">
                    <SelectTrigger className="w-1/3 bg-background/50 border-input">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gram">Gram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.weight && (
                  <p className="text-xs text-destructive mt-0.5">{errors.weight.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <Label htmlFor="packageName" className="text-muted-foreground">
                    Package Name <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <span className="text-cyan-600 dark:text-cyan-400">
                    Volume weight: {(liveVolumeWeight / 1000).toFixed(2)} kg ({liveVolumeWeight} gr)
                  </span>
                </div>
                <Input
                  id="packageName"
                  type="text"
                  required
                  placeholder="Enter package name"
                  {...register("packageName")}
                  className={cn(
                    "w-full bg-background/50",
                    errors.packageName && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.packageName && (
                  <p className="text-xs text-destructive mt-0.5">{errors.packageName.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="save-package"
                checked={savePackageSetting}
                onCheckedChange={(c) => setSavePackageSetting(!!c)}
              />
              <label
                htmlFor="save-package"
                className="text-xs font-bold text-muted-foreground cursor-pointer select-none"
              >
                Save your setting for repeated use
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0F798C] hover:bg-[#0F798C]/90 text-white px-8 py-2.5 font-semibold rounded-lg"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            )}
            Get Rates
          </Button>
        </div>
      </form>
    </div>
  );
}
