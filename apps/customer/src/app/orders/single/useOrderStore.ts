import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OrderStoreState {
  step: number;
  pricing: {
    baseShippingRate: number;
    surchargeFee: number;
    totalAmount: number;
    chargeableWeight: number;
    volumeWeight: number;
    appliedRateCardId?: string;
  } | null;
  values: {
    shippingMethod: "EXPRESS" | "EPACKET";
    shippingOrigin: string;
    detailDescription: string;
    declaredValue: string;
    sellerOrderId: string;
    totalPackets: string;
    senderName: string;
    senderPhone: string;
    senderEmail: string;
    senderAddress: string;
    senderCity: string;
    senderCityName?: string;
    senderWard: string;
    senderWardName?: string;
    senderZipCode: string;
    senderCountry: string;
    receiverName: string;
    receiverPhone: string;
    receiverEmail: string;
    receiverAddress1: string;
    receiverAddress2: string;
    receiverCity: string;
    receiverCityName?: string;
    receiverState: string;
    receiverStateName?: string;
    receiverZipCode: string;
    receiverCountry: string;
    packingTypeId: number;
    length: string;
    width: string;
    height: string;
    weight: string;
    packageName: string;
    products: {
      description: string;
      quantity: string;
      value: string;
      hsCodePrefix: string;
      hsCodeNumber: string;
      originCountry: string;
      weight: string;
      sku: string;
    }[];
  };
  setStep: (step: number) => void;
  setPricing: (pricing: OrderStoreState["pricing"]) => void;
  setValues: (values: Partial<OrderStoreState["values"]>) => void;
  clearStore: () => void;
}

const initialValues: OrderStoreState["values"] = {
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
  receiverCountry: "",
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
};

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set) => ({
      step: 1,
      pricing: null,
      values: initialValues,
      setStep: (step) => set({ step }),
      setPricing: (pricing) => set({ pricing }),
      setValues: (newValues) => set((state) => ({ values: { ...state.values, ...newValues } })),
      clearStore: () => set({ step: 1, pricing: null, values: initialValues }),
    }),
    {
      name: "create_single_order_draft",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
