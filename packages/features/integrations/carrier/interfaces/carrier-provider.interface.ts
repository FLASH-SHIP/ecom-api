export const CARRIER_CODES = {
  EPICHUB: 'EPICHUB',
  USPS: 'USPS',
  UPS: 'UPS',
  IBC: 'IBC',
  SBP: 'SBP',
} as const;

export type CarrierCode = typeof CARRIER_CODES[keyof typeof CARRIER_CODES];

export interface CarrierCapabilities {
  supportsPriceInquiry: boolean;
  supportsAddressValidation: boolean;
  supportsVoid: boolean;
  supportsBalanceCheck: boolean;
  supportsReturnService: boolean;
}

export interface AddressInfo {
  name: string;
  phone?: string;
  email?: string;
  attentionName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvinceCode: string;
  postalCode: string;
  countryCode: string;
}

export interface PackageWeightInfo {
  weight: number;
  unitOfMeasurement: 'LBS' | 'KGS' | 'OZS';
}

export interface PackageDimensionsInfo {
  length: number;
  width: number;
  height: number;
  unitOfMeasurement: 'IN' | 'CM';
}

export interface PackageItemInfo {
  description: string;
  quantity: number;
  weight: PackageWeightInfo;
  price: {
    monetaryValue: number;
    currencyCode: string;
  };
}

export interface PackageSpec {
  numberLabels?: number;
  weight: PackageWeightInfo;
  dimensions: PackageDimensionsInfo;
  items?: PackageItemInfo[];
}

export interface PriceInquiryDto {
  requestId: string;
  serviceCode?: string | null;
  shipFrom: AddressInfo;
  shipTo: AddressInfo;
  packages: PackageSpec[];
}

export interface ServiceRateResult {
  serviceCode: string;
  totalCharges: {
    monetaryValue: number;
    currencyCode: string;
  };
  totalBillingWeight: PackageWeightInfo;
  packageResults: Array<{
    billingWeight: PackageWeightInfo;
    charge: {
      monetaryValue: number;
      currencyCode: string;
    };
  }>;
}

export interface CreateLabelDto {
  requestId: string;
  shipmentDescription?: string;
  serviceCode: string;
  addressValidation?: boolean;
  deliveryConfirmation?: 0 | 1 | 2; // 0: None, 1: Signature, 2: Adult Signature
  returnService?: 0 | 1;             // 0: Forward, 1: Return
  invoiceLineTotal?: {
    monetaryValue: number;
    currencyCode: string;
  };
  shipFrom: AddressInfo;
  shipTo: AddressInfo;
  packages: PackageSpec[];
}

export interface AddressCandidate {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
}

export interface AddressAmbiguousResult {
  isAmbiguous: true;
  message: string;
  candidates: {
    shipFrom: AddressCandidate[];
    shipTo: AddressCandidate[];
  };
  rawEnvelope?: unknown;
}

export interface LabelPackageResult {
  sequence: number;
  trackingNumber: string;
  billingWeight: PackageWeightInfo;
  charge: {
    monetaryValue: number;
    currencyCode: string;
  };
}

export interface CreateLabelSuccessResult {
  isAmbiguous?: false;
  requestId: string;
  serviceCode: string;
  shipmentIdentificationNumber: string;
  totalCharges: {
    monetaryValue: number;
    currencyCode: string;
  };
  totalBillingWeight: PackageWeightInfo;
  packageResults: LabelPackageResult[];
  rawEnvelope?: unknown;
}

export type CreateLabelResultDto = CreateLabelSuccessResult | AddressAmbiguousResult;

export interface TrackingEvent {
  eventTime: string;
  location: string;
  status: {
    code: string;
    description: string;
    type: string;
  };
}

export interface TrackingResultDto {
  trackingNumber: string;
  currentStatus: {
    code: string;
    condition?: string;
    description: string;
    type: string;
  };
  origin?: {
    city: string;
    stateProvinceCode: string;
    countryCode: string;
  };
  destination?: {
    city: string;
    stateProvinceCode: string;
    countryCode: string;
  };
  activity: TrackingEvent[];
}

export interface VoidResultDto {
  voidedTrackingNumber: string;
  voidFeePercent?: number;
  success: boolean;
  message?: string;
  rawEnvelope?: unknown;
}

export interface BalanceResultDto {
  balance: {
    monetaryValue: number;
    currencyCode: string;
  };
}

export interface ICarrierProvider {
  readonly code: string;
  getCapabilities(): CarrierCapabilities;
  inquirePrice(dto: PriceInquiryDto): Promise<ServiceRateResult[]>;
  createLabel(dto: CreateLabelDto): Promise<CreateLabelResultDto>;
  trackPackage(trackingNumber: string): Promise<TrackingResultDto>;
  printLabel?(params: { trackingNumber?: string; requestId?: string; encoded?: boolean }): Promise<{ pdfBuffer?: Buffer; encodedLabel?: string }>;
  voidLabel?(trackingNumber: string): Promise<VoidResultDto>;
  getBalance?(): Promise<BalanceResultDto>;
}
