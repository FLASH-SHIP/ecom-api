export interface EpicHubResponseStatus {
  Code: number;
  Description: string;
  Error: string | null;
  Message: string | null;
}

export interface EpicHubEnvelope<T> {
  ResponseStatus: EpicHubResponseStatus;
  ResponseResults: T;
}

export interface EpicHubTokenResult {
  Token: string;
}

export interface EpicHubAddress {
  AddressLine1: string;
  AddressLine2?: string;
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
}

export interface EpicHubParty {
  Name: string;
  AttentionName?: string;
  Phone?: string;
  EmailAddress?: string;
  Address: EpicHubAddress;
}

export interface EpicHubWeight {
  Weight: number;
  UnitOfMeasurement: 'LBS' | 'KGS' | 'OZS';
}

export interface EpicHubDimensions {
  Length: number;
  Width: number;
  Height: number;
  UnitOfMeasurement: 'IN' | 'CM';
}

export interface EpicHubMonetaryValue {
  MonetaryValue: number;
  CurrencyCode: string;
}

export interface EpicHubItem {
  Description: string;
  Quantity: number;
  ItemWeight: EpicHubWeight;
  ItemPrice: EpicHubMonetaryValue;
}

export interface EpicHubPackage {
  NumberLabels?: number;
  PackageWeight: EpicHubWeight;
  Dimensions: EpicHubDimensions;
  Items?: EpicHubItem[];
}

export interface EpicHubCreateLabelPayload {
  RequestId: string;
  ShipmentDescription?: string;
  ServiceCode: string;
  AddressValidation?: boolean;
  DeliveryConfirmation?: number;
  ReturnService?: number;
  InvoiceLineTotal?: EpicHubMonetaryValue;
  ShipFrom: EpicHubParty;
  ShipTo: EpicHubParty;
  Package: EpicHubPackage[];
}

export interface EpicHubAddressCandidate {
  AddressLine1: string;
  AddressLine2?: string;
  City: string;
  StateCode: string;
  PostalCode: string;
  CountryCode: string;
}

export interface EpicHubCandidatesResult {
  Candidates: {
    ShipFrom: EpicHubAddressCandidate[];
    ShipTo: EpicHubAddressCandidate[];
  };
}

export interface EpicHubPackageResult {
  Sequence: number;
  TrackingNumber: string;
  BillingWeight: EpicHubWeight;
  Charge: {
    MonetaryValue: string | number;
    CurrencyCode: string;
  };
}

export interface EpicHubCreateLabelResult {
  RequestId: string;
  ResidentialAddressIndicator?: boolean;
  ServiceCode: string;
  ShipmentIdentificationNumber: string;
  TotalCharges: {
    CurrencyCode: string;
    MonetaryValue: string | number;
  };
  TotalBillingWeight: EpicHubWeight;
  PackageResults: EpicHubPackageResult[];
}

export interface EpicHubPriceInquiryPayload {
  RequestId: string;
  ServiceCode?: string | null;
  ShipFrom: EpicHubParty;
  ShipTo: EpicHubParty;
  Package: EpicHubPackage[];
}

export interface EpicHubPriceInquiryItemResult {
  ServiceCode: string;
  ResidentialAddressIndicator?: boolean | null;
  TotalCharges: {
    CurrencyCode: string;
    MonetaryValue: string | number;
  };
  TotalBillingWeight: EpicHubWeight;
  PackageResults: Array<{
    BillingWeight: EpicHubWeight;
    Charge: {
      CurrencyCode: string;
      MonetaryValue: string | number;
    };
  }>;
}

export interface EpicHubTrackingStatus {
  Code: string;
  Condition?: string;
  Description: string;
  Type: string;
}

export interface EpicHubTrackingActivity {
  EventTime: string;
  Location: string;
  Status: EpicHubTrackingStatus;
}

export interface EpicHubPackageTrackingResult {
  TrackingNumber: string;
  CurrentStatus: EpicHubTrackingStatus;
  Destination?: {
    City: string;
    StateProvinceCode: string;
    CountryCode: string;
  };
  Origin?: {
    City: string;
    StateProvinceCode: string;
    CountryCode: string;
  };
  Activity: EpicHubTrackingActivity[];
}

export interface EpicHubPrintLabelResult {
  EncodedLabel?: string;
}

export interface EpicHubVoidResult {
  VoidedTrackingNumber: string;
}

export interface EpicHubBalanceResult {
  Balance: EpicHubMonetaryValue;
}
