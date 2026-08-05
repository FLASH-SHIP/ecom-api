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
  Reference?: string;
  Reference2?: string;
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
  Barcode?: boolean;
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
  voidFeePercent?: number;
}

export interface EpicHubBalanceResult {
  Balance: EpicHubMonetaryValue;
}

/**
 * Registry of available EpicHub service codes.
 */
export const EPICHUB_SERVICE_CODES = {
  USPS_GDE_GROUND_ADVANTAGE: 'USPS_GDE_GA', // Primary default for Ecom Express ePacket
  UPS_GROUND: 'UPS_GND',
  UPS_NEXT_DAY_AIR: 'UPS_NDAY',
  UPS_2ND_DAY_AIR: 'UPS_2DAY',
  UPS_3_DAY_SELECT: 'UPS_3DAY',
  UPS_NEXT_DAY_AIR_SAVER: 'UPS_NDAY_SAVER',
  UPS_NEXT_DAY_AIR_EARLY: 'UPS_NDAY_EARLY',
  UPS_2ND_DAY_AIR_AM: 'UPS_2DAY_AM',
  UPS_HEAVY_GOODS: 'UPS_HVYG',
  UPS_GROUND_SAVER: 'UPS_GND_SAVER',
  USPS_GROUND_ADVANTAGE: 'USPS_GA',
  USPS_PRIORITY_MAIL: 'USPS_PM',
  USPS_GDE_PRIORITY_MAIL: 'USPS_GDE_PM',
  UNIUNI_GROUND: 'UNIUNI_GND',
} as const;

export const EPICHUB_DEFAULT_SERVICE_CODE = EPICHUB_SERVICE_CODES.USPS_GDE_GROUND_ADVANTAGE;

/**
 * 100% Independent US ShipFrom Warehouse Addresses mapped by ShippingOrigin (HAN vs SGN).
 * These addresses are completely separate from Ecom order's sender* info.
 */
export const EPICHUB_SHIP_FROM_ADDRESSES: Record<'HAN' | 'SGN', EpicHubParty> = {
  // Kho HAN (Hà Nội) -> California Warehouse
  HAN: {
    Name: 'Sender Test',
    AttentionName: 'Sender Test',
    Phone: '2133730000',
    EmailAddress: 'sender@example.com',
    Address: {
      AddressLine1: '10725 Springdale Ave',
      AddressLine2: 'STE 2',
      City: 'Santa Fe Springs',
      StateProvinceCode: 'CA',
      PostalCode: '90670',
      CountryCode: 'US',
    },
  },
  // Kho SGN (Sài Gòn) -> New Jersey Warehouse
  SGN: {
    Name: 'Sender Test',
    AttentionName: 'Sender Test',
    Phone: '2133730000',
    EmailAddress: 'sender@example.com',
    Address: {
      AddressLine1: '1050 SLOCUM AVE',
      AddressLine2: 'STE G',
      City: 'RIDGEFIELD',
      StateProvinceCode: 'NJ',
      PostalCode: '07657',
      CountryCode: 'US',
    },
  },
};

/**
 * Pre-flight Payload Sanitizer to ensure EpicHub field length limits are respected.
 */
export function sanitizeEpicHubPayload(payload: EpicHubCreateLabelPayload): EpicHubCreateLabelPayload {
  const sanitizeParty = (party: EpicHubParty): EpicHubParty => ({
    Name: (party.Name || 'Sender Test').slice(0, 35),
    AttentionName: party.AttentionName ? party.AttentionName.slice(0, 35) : undefined,
    Phone: party.Phone ? party.Phone.replace(/[^0-9]/g, '').slice(-10) || '2133730000' : '2133730000',
    EmailAddress: party.EmailAddress ? party.EmailAddress.slice(0, 50) : undefined,
    Address: {
      AddressLine1: (party.Address.AddressLine1 || '').slice(0, 35),
      AddressLine2: party.Address.AddressLine2 ? party.Address.AddressLine2.slice(0, 35) : undefined,
      City: (party.Address.City || '').slice(0, 45),
      StateProvinceCode: (party.Address.StateProvinceCode || '').slice(0, 4).toUpperCase(),
      PostalCode: (party.Address.PostalCode || '').slice(0, 10),
      CountryCode: (party.Address.CountryCode || 'US').slice(0, 2).toUpperCase(),
    },
  });

  return {
    ...payload,
    RequestId: payload.RequestId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28),
    ShipmentDescription: payload.ShipmentDescription ? payload.ShipmentDescription.slice(0, 50) : undefined,
    ServiceCode: payload.ServiceCode || EPICHUB_DEFAULT_SERVICE_CODE,
    ShipFrom: sanitizeParty(payload.ShipFrom),
    ShipTo: sanitizeParty(payload.ShipTo),
    Package: payload.Package.map((pkg) => ({
      ...pkg,
      Items: pkg.Items
        ? pkg.Items.map((item) => ({
            ...item,
            Description: item.Description.slice(0, 100),
          }))
        : undefined,
    })),
  };
}

