"use client";

import { trpc } from "@customer/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "../../../components/toast-provider";
import { BasicInfoSection } from "./BasicInfoSection";
import { ItemListSection } from "./ItemListSection";
import { PackageInfoSection } from "./PackageInfoSection";
import { ReceiverSection } from "./ReceiverSection";
import { SenderSection } from "./SenderSection";
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
  totalPackets: z
    .string()
    .min(1, "Vui lòng nhập tổng số gói.")
    .refine(
      (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
      "Tổng số gói phải lớn hơn 0.",
    ),

  // Sender Info
  senderName: z.string().min(1, "Vui lòng nhập tên người gửi."),
  senderPhone: z.string().min(1, "Vui lòng nhập số điện thoại người gửi."),
  senderEmail: z.string().email("Email người gửi không hợp lệ.").or(z.literal("")),
  senderAddress: z.string().min(1, "Vui lòng nhập địa chỉ người gửi."),
  senderCity: z.string().min(1, "Vui lòng chọn tỉnh/thành phố người gửi."),
  senderCityName: z.string().optional(),
  senderWard: z.string().optional(),
  senderWardName: z.string().optional(),
  senderZipCode: z.string().min(1, "Vui lòng nhập mã zip người gửi."),
  senderCountry: z.string().min(1, "Vui lòng chọn quốc gia người gửi."),

  // Receiver Info
  receiverName: z.string().min(1, "Vui lòng nhập tên người nhận."),
  receiverPhone: z.string().optional(),
  receiverEmail: z.string().email("Email người nhận không hợp lệ.").or(z.literal("")),
  receiverAddress1: z.string().min(1, "Vui lòng nhập địa chỉ người nhận."),
  receiverAddress2: z.string().optional(),
  receiverCity: z.string().min(1, "Vui lòng nhập thành phố người nhận."),
  receiverCityName: z.string().optional(),
  receiverState: z.string().min(1, "Vui lòng nhập bang/tỉnh người nhận."),
  receiverStateName: z.string().optional(),
  receiverZipCode: z.string().min(1, "Vui lòng nhập mã zip người nhận."),
  receiverCountry: z.string().min(1, "Vui lòng chọn quốc gia người nhận."),

  // Package Info
  packingTypeId: z.number({ message: "Vui lòng chọn loại đóng gói." }).int().positive(),
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
  products: z
    .array(
      z.object({
        description: z.string().min(1, "Vui lòng nhập mô tả sản phẩm."),
        quantity: z
          .string()
          .min(1, "Vui lòng nhập số lượng.")
          .refine(
            (val) => !Number.isNaN(Number(val)) && Number.isInteger(Number(val)) && Number(val) > 0,
            "Số lượng phải là số nguyên dương.",
          ),
        value: z
          .string()
          .min(1, "Vui lòng nhập trị giá.")
          .refine(
            (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
            "Trị giá phải lớn hơn 0.",
          ),
        hsCodePrefix: z.string(),
        hsCodeNumber: z.string().optional(),
        originCountry: z.string().min(1, "Vui lòng chọn xuất xứ."),
        weight: z
          .string()
          .optional()
          .refine(
            (val) => !val || (!Number.isNaN(Number(val)) && Number(val) > 0),
            "Cân nặng phải lớn hơn 0.",
          ),
        sku: z.string().optional(),
      }),
    )
    .min(1, "Vui lòng khai báo ít nhất 1 sản phẩm."),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

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
    setValue,
    getValues,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      shippingMethod: "EPACKET",
      shippingOrigin: "HAN",
      detailDescription: "",
      declaredValue: "",
      sellerOrderId: "",
      totalPackets: "1",
      senderName: "",
      senderPhone: "",
      senderEmail: "",
      senderAddress: "",
      senderCity: "",
      senderCityName: "",
      senderWard: "",
      senderWardName: "",
      senderZipCode: "",
      senderCountry: "VN",
      receiverName: "",
      receiverPhone: "",
      receiverEmail: "",
      receiverAddress1: "",
      receiverAddress2: "",
      receiverCity: "",
      receiverCityName: "",
      receiverState: "",
      receiverStateName: "",
      receiverZipCode: "",
      receiverCountry: "US",
      packingTypeId: 0,
      length: "",
      width: "",
      height: "",
      weight: "",
      packageName: "",
      products: [
        {
          description: "",
          quantity: "1",
          value: "",
          hsCodePrefix: "US",
          hsCodeNumber: "",
          originCountry: "VN",
          weight: "",
          sku: "",
        },
      ],
    },
  });

  // Watch only necessary fields to prevent typing lag
  const watchedProducts = watch("products");

  const productsString = JSON.stringify(watchedProducts);

  // Sync declaredValue, detailDescription, and hsCode automatically when products change
  // biome-ignore lint/correctness/useExhaustiveDependencies: use productsString for deep change tracking
  useEffect(() => {
    if (!watchedProducts) return;
    const totalVal = watchedProducts.reduce((sum, p) => {
      const q = Number(p.quantity) || 0;
      const v = Number(p.value) || 0;
      return sum + q * v;
    }, 0);
    setValue("declaredValue", totalVal > 0 ? totalVal.toFixed(2) : "", { shouldValidate: true });

    const desc = watchedProducts
      .filter((p) => p.description && p.description.trim() !== "")
      .map((p) => `${p.description.trim()} (x${p.quantity})`)
      .join(", ");
    setValue("detailDescription", desc || "", { shouldValidate: true });
  }, [productsString, setValue]);

  const triggerError = (msg: string) => {
    setError(msg);
    toast(msg, "error");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [saveSenderSetting, setSaveSenderSetting] = useState(false);
  const [selectedSenderId, setSelectedSenderId] = useState<number | null>(null);
  const [saveReceiverSetting, setSaveReceiverSetting] = useState(false);
  const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null);
  const [savePackageSetting, setSavePackageSetting] = useState(false);

  // No longer needed, handled by SenderSection internally or directly by props


  const trpcUtils = trpc.useUtils();

  // Saved senders from DB
  const { data: savedSenders = [] } = trpc.customer.senders.list.useQuery();
  const createSenderMutation = trpc.customer.senders.create.useMutation();
  const updateSenderMutation = trpc.customer.senders.update.useMutation();

  // Saved receivers from DB
  const { data: savedReceivers = [] } = trpc.customer.receivers.list.useQuery();
  const createReceiverMutation = trpc.customer.receivers.create.useMutation();
  const updateReceiverMutation = trpc.customer.receivers.update.useMutation();

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  // Saved packages from DB
  const { data: savedPackages = [] } = trpc.customer.packages.list.useQuery();
  const createPackageMutation = trpc.customer.packages.create.useMutation();
  const updatePackageMutation = trpc.customer.packages.update.useMutation();

  const [isGetLabel, setIsGetLabel] = useState(false);

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
          const defaultReceiver = localStorage.getItem("default_receiver_info");
          const defaultPackage = localStorage.getItem("default_package_info");
          const newDefaults = JSON.parse(storeValuesString);

          // Auto-fill from default saved sender is handled by SenderSection



          // Auto-fill from default saved package (DB)
          const defaultPackageDb = savedPackages.find((p) => p.isDefault);
          if (defaultPackageDb) {
            Object.assign(newDefaults, {
              packageName: defaultPackageDb.packageName,
              packingTypeId: defaultPackageDb.packingTypeId,
              length: defaultPackageDb.length !== null ? String(defaultPackageDb.length) : "",
              width: defaultPackageDb.width !== null ? String(defaultPackageDb.width) : "",
              height: defaultPackageDb.height !== null ? String(defaultPackageDb.height) : "",
              weight: String(defaultPackageDb.weight),
            });
            setSelectedPackageId(defaultPackageDb.id);
            setSavePackageSetting(true);
          } else if (defaultPackage) {
            // Fallback: migrate from localStorage (one-time)
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
      // Countries are locked — force them after any restore
      setValue("senderCountry", "VN");
      setValue("receiverCountry", "US");
    }
  }, [isHydrated, reset, storeValuesString, setValue, savedReceivers, savedPackages]);

  // handle step 1 "Get Rates"
  const handleGetRates = async () => {
    setError(null);
    setLoading(true);

    const formValues = getValues();

    // Save draft to Zustand store (persisted to sessionStorage) only on Get Rates
    setValues({
      ...formValues,
      products: formValues.products.map((p: OrderFormValues["products"][number]) => ({
        ...p,
        hsCodeNumber: p.hsCodeNumber ?? "",
        weight: p.weight ?? "",
        sku: p.sku ?? "",
      })),
    });

    try {
      const res = await trpcContext.client.customer.orders.calculateFreight.query({
        shippingMethod: formValues.shippingMethod,
        country: formValues.receiverCountry,
        declaredWeight: Number(formValues.weight),
        dimensionLength: formValues.length ? Number(formValues.length) : null,
        dimensionWidth: formValues.width ? Number(formValues.width) : null,
        dimensionHeight: formValues.height ? Number(formValues.height) : null,
        origin: formValues.shippingOrigin,
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
  const createOrderMutation = trpc.customer.orders.create.useMutation();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: single order creation logic complexity
  const handleCreateOrder = async () => {
    setError(null);
    setLoading(true);

    const formValues = getValues();
    const {
      shippingMethod,
      shippingOrigin,
      sellerOrderId,
      senderName,
      senderAddress,
      senderPhone,
      senderEmail,
      senderCountry,
      senderCity,
      senderCityName,
      senderWard,
      senderWardName,
      senderZipCode,
      receiverName,
      receiverPhone,
      receiverEmail,
      receiverCity,
      receiverCityName,
      receiverState,
      receiverStateName,
      receiverAddress1,
      receiverAddress2,
      receiverCountry,
      receiverZipCode,
      detailDescription,
      weight,
      length,
      width,
      height,
      declaredValue,
      packingTypeId,
      packageName,
      totalPackets,
      products,
    } = formValues;

    try {
      await createOrderMutation.mutateAsync({
        shippingMethod,
        shippingOrigin,
        sellerOrderId: sellerOrderId || null,
        totalPackets: Number(totalPackets) || 1,
        importId: null,

        senderName,
        senderAddress,
        senderPhone,
        senderEmail,
        senderCountry,
        senderState: "",
        senderCity: senderCityName || senderCity || null,
        senderWard: senderWardName || senderWard || null,
        senderZipCode,

        receiverName,
        receiverPhone: receiverPhone || null,
        receiverEmail,
        receiverCity: receiverCityName || receiverCity,
        receiverState: receiverStateName || receiverState,
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
        packingTypeId: packingTypeId || null,
        isGetLabel: isGetLabel ? 1 : 0,
        products: products.map((p: OrderFormValues["products"][number]) => ({
          description: p.description,
          quantity: Number(p.quantity),
          value: Number(p.value),
          hsCode: p.hsCodeNumber ? `${p.hsCodePrefix}-${p.hsCodeNumber}` : null,
          originCountry: p.originCountry || null,
          weight: p.weight ? Number(p.weight) : null,
          sku: p.sku || null,
        })),
      });

      const promises: Promise<unknown>[] = [];

      // Save sender to DB if checkbox is ticked
      console.log("saveSenderSetting state value in handleCreateOrder:", saveSenderSetting);
      if (saveSenderSetting) {
        const senderPayload = {
          name: senderName,
          phone: senderPhone || null,
          email: senderEmail || null,
          address: senderAddress,
          city: senderCity,
          ward: senderWard || null,
          zipCode: senderZipCode || null,
          country: senderCountry || "VN",
        };
        console.log("senderPayload constructed:", senderPayload);
        if (selectedSenderId) {
          console.log("Updating sender settings for id:", selectedSenderId);
          promises.push(
            updateSenderMutation.mutateAsync({ id: selectedSenderId, data: senderPayload }),
          );
        } else {
          console.log("Creating new sender settings");
          promises.push(
            createSenderMutation.mutateAsync({ ...senderPayload, isDefault: false }),
          );
        }
      }
      // Save receiver to DB if checkbox is ticked
      console.log("saveReceiverSetting state value in handleCreateOrder:", saveReceiverSetting);
      if (saveReceiverSetting) {
        const receiverPayload = {
          name: receiverName,
          phone: receiverPhone || null,
          email: receiverEmail || null,
          address1: receiverAddress1,
          address2: receiverAddress2 || null,
          city: receiverCity,
          state: receiverState,
          zipCode: receiverZipCode,
          country: receiverCountry || "US",
        };
        console.log("receiverPayload constructed:", receiverPayload);
        if (selectedReceiverId) {
          console.log("Updating receiver settings for id:", selectedReceiverId);
          promises.push(
            updateReceiverMutation.mutateAsync({ id: selectedReceiverId, data: receiverPayload }),
          );
        } else {
          console.log("Creating new receiver settings");
          promises.push(
            createReceiverMutation.mutateAsync({ ...receiverPayload, isDefault: false }),
          );
        }
      }

      // Save package to DB if checkbox is ticked
      console.log("savePackageSetting state value in handleCreateOrder:", savePackageSetting);
      if (savePackageSetting) {
        const packagePayload = {
          label: packageName,
          packageName: packageName,
          packingTypeId: Number(packingTypeId),
          length: length ? Number(length) : null,
          width: width ? Number(width) : null,
          height: height ? Number(height) : null,
          weight: Number(weight),
        };
        console.log("packagePayload constructed:", packagePayload);
        if (selectedPackageId) {
          console.log("Updating package settings for id:", selectedPackageId);
          promises.push(
            updatePackageMutation.mutateAsync({ id: selectedPackageId, data: packagePayload }),
          );
        } else {
          console.log("Creating new package settings");
          promises.push(
            createPackageMutation.mutateAsync({ ...packagePayload, isDefault: false }),
          );
        }
      }

      if (promises.length > 0) {
        try {
          console.log("Waiting for settings save promises:", promises.length);
          const results = await Promise.all(promises);
          console.log("Settings save results:", results);
          // Invalidate list queries
          await Promise.all([
            trpcUtils.customer.senders.list.invalidate(),
            trpcUtils.customer.receivers.list.invalidate(),
            trpcUtils.customer.packages.list.invalidate(),
          ]);
        } catch (e) {
          console.error("Failed to save settings:", e);
        }
      }

      if (typeof window !== "undefined") {
        // Clear legacy package settings from localStorage
        localStorage.removeItem("default_package_info");
      }

      clearStore();
      toast("Created order successfully", "success");
      // Refresh context cache and navigate back to list
      trpcContext.customer.orders.list.invalidate();
      router.push("/orders");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      triggerError(errMsg || "Tạo đơn hàng thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (step === 2 && pricing) {
    // Read details from storeValues in Step 2 to avoid watching them during Step 1 typing
    const {
      senderName,
      senderCity,
      senderCityName,
      senderWard,
      senderWardName,
      senderCountry,
      senderAddress,
      senderZipCode,
      senderPhone,
      senderEmail,
      shippingOrigin,
      shippingMethod,
      sellerOrderId,
      detailDescription,
      declaredValue,
      length,
      width,
      height,
      weight,
      products,
      receiverName,
      receiverCity,
      receiverCityName,
      receiverState,
      receiverStateName,
      receiverCountry,
      receiverAddress1,
      receiverAddress2,
      receiverZipCode,
      receiverPhone,
      receiverEmail,
    } = storeValues;

    const displayReceiverCity = receiverCityName || receiverCity;
    const displayReceiverState = receiverStateName || receiverState;
    const displaySenderCity = senderCityName || senderCity;
    const displaySenderWard = senderWardName || senderWard;

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
                      {displayReceiverCity}, {displayReceiverState}, {receiverCountry}
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

                    <div className="text-muted-foreground">Ward/City/Country</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {displaySenderWard}
                      {displaySenderCity ? `, ${displaySenderCity}` : ""}, {senderCountry}
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

                    <div className="text-muted-foreground">HS Code (Primary)</div>
                    <div className="font-medium text-foreground">
                      {products?.[0]?.hsCodeNumber
                        ? `${products[0].hsCodePrefix}-${products[0].hsCodeNumber}`
                        : "N/A"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products Details */}
            <Card className="rounded-xl border border-border bg-card">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg border-b border-border pb-2 text-foreground">
                  Products ({products?.length || 0})
                </h3>
                <div className="flex flex-col gap-4">
                  {products?.map((p) => (
                    <div
                      key={`${p.description}-${p.quantity}-${p.value}`}
                      className="flex justify-between items-start text-sm border-b border-dashed border-border last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{p.description}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {p.hsCodeNumber && (
                            <span>
                              HS Code: {p.hsCodePrefix}-{p.hsCodeNumber}
                            </span>
                          )}
                          <span>Origin: {p.originCountry}</span>
                          {p.weight && <span>| Weight: {p.weight} gr</span>}
                          {p.sku && <span>| SKU: {p.sku}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          ${Number(p.value || 0).toFixed(2)} × {p.quantity}
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold">
                          Total: ${(Number(p.value || 0) * Number(p.quantity || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
        <BasicInfoSection control={control} register={register} errors={errors} />

        {/* Sender Info */}
        <SenderSection
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          saveSenderSetting={saveSenderSetting}
          setSaveSenderSetting={setSaveSenderSetting}
          selectedSenderId={selectedSenderId}
          setSelectedSenderId={setSelectedSenderId}
          savedSenders={savedSenders}
        />
        {/* Receiver Info */}
        <ReceiverSection
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          saveReceiverSetting={saveReceiverSetting}
          setSaveReceiverSetting={setSaveReceiverSetting}
          selectedReceiverId={selectedReceiverId}
          setSelectedReceiverId={setSelectedReceiverId}
          savedReceivers={savedReceivers}
        />

        {/* Package Info */}
        <PackageInfoSection
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          savePackageSetting={savePackageSetting}
          setSavePackageSetting={setSavePackageSetting}
          selectedPackageId={selectedPackageId}
          setSelectedPackageId={setSelectedPackageId}
          savedPackages={savedPackages}
        />

        {/* Item List */}
        <ItemListSection control={control} register={register} errors={errors} />

        {/* Buttons */}
        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0F798C] hover:bg-[#0F798C]/90 text-white font-semibold rounded-lg"
          >
            {loading && (
              <span className="animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            )}
            Get Rates
          </Button>
        </div>
      </form>
    </div>
  );
}
