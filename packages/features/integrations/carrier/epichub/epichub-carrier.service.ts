import type {
  AddressAmbiguousResult,
  AddressInfo,
  BalanceResultDto,
  CarrierCapabilities,
  CreateLabelDto,
  CreateLabelResultDto,
  ICarrierProvider,
  PriceInquiryDto,
  ServiceRateResult,
  TrackingResultDto,
  VoidResultDto,
} from '../interfaces/carrier-provider.interface';
import type {
  EpicHubBalanceResult,
  EpicHubCandidatesResult,
  EpicHubCreateLabelPayload,
  EpicHubCreateLabelResult,
  EpicHubPackageTrackingResult,
  EpicHubParty,
  EpicHubPriceInquiryItemResult,
  EpicHubPriceInquiryPayload,
  EpicHubPrintLabelResult,
  EpicHubVoidResult,
} from './dtos/epichub.dto';
import { sanitizeEpicHubPayload } from './dtos/epichub.dto';
import type { EpicHubHttpClient } from './epichub-http-client';

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number; actionName?: string } = {},
): Promise<T> {
  const maxRetries = options.retries ?? 3;
  const initialDelay = options.delayMs ?? 500;
  const actionName = options.actionName || 'Carrier Operation';

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      const isTransientError =
        /502|503|504|429|ECONNRESET|ETIMEDOUT|fetch failed|timeout/i.test(errMsg);

      if (!isTransientError || attempt > maxRetries) {
        throw err;
      }

      const backoffMs = initialDelay * 2 ** (attempt - 1) + Math.random() * 200;
      console.warn(
        `[EpicHubCarrierService] Warning: ${actionName} failed with transient error (${errMsg}). Retrying attempt ${attempt}/${maxRetries} in ${Math.round(backoffMs)}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

export class EpicHubCarrierService implements ICarrierProvider {
  public readonly code = 'EPICHUB';
  private httpClient: EpicHubHttpClient;

  constructor(httpClient: EpicHubHttpClient) {
    this.httpClient = httpClient;
  }

  public getCapabilities(): CarrierCapabilities {
    return {
      supportsPriceInquiry: true,
      supportsAddressValidation: true,
      supportsVoid: true,
      supportsBalanceCheck: true,
      supportsReturnService: true,
    };
  }

  private mapAddressToEpicHubParty(address: AddressInfo): EpicHubParty {
    const rawDigits = (address.phone || "").replace(/[^0-9]/g, "");
    const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : "2133730000";

    return {
      Name: address.name || 'Sender Test',
      AttentionName: address.attentionName || address.name || 'Sender Test',
      Phone: cleanPhone,
      EmailAddress: address.email || 'sender@example.com',
      Address: {
        AddressLine1: address.addressLine1,
        AddressLine2: address.addressLine2 || '',
        City: address.city,
        StateProvinceCode: address.stateProvinceCode,
        PostalCode: address.postalCode,
        CountryCode: address.countryCode,
      },
    };
  }

  /**
   * Inquiry Price across all services or for a specific service.
   */
  public async inquirePrice(dto: PriceInquiryDto): Promise<ServiceRateResult[]> {
    const payload: EpicHubPriceInquiryPayload = {
      RequestId: dto.requestId,
      ServiceCode: dto.serviceCode || null,
      ShipFrom: this.mapAddressToEpicHubParty(dto.shipFrom),
      ShipTo: this.mapAddressToEpicHubParty(dto.shipTo),
      Package: dto.packages.map((pkg) => ({
        PackageWeight: {
          Weight: pkg.weight.weight,
          UnitOfMeasurement: pkg.weight.unitOfMeasurement,
        },
        Dimensions: {
          Length: pkg.dimensions.length,
          Width: pkg.dimensions.width,
          Height: pkg.dimensions.height,
          UnitOfMeasurement: pkg.dimensions.unitOfMeasurement,
        },
      })),
    };

    const { envelope } = await this.httpClient.request<EpicHubPriceInquiryItemResult[]>('v2/shipments/price-inquiry', {
      method: 'POST',
      body: payload,
    });

    if (!envelope || !Array.isArray(envelope.ResponseResults)) {
      return [];
    }

    return envelope.ResponseResults.map((item) => ({
      serviceCode: item.ServiceCode,
      totalCharges: {
        monetaryValue: Number(item.TotalCharges?.MonetaryValue || 0),
        currencyCode: item.TotalCharges?.CurrencyCode || 'USD',
      },
      totalBillingWeight: {
        weight: item.TotalBillingWeight?.Weight || 0,
        unitOfMeasurement: item.TotalBillingWeight?.UnitOfMeasurement || 'LBS',
      },
      packageResults: (item.PackageResults || []).map((pkgRes) => ({
        billingWeight: {
          weight: pkgRes.BillingWeight?.Weight || 0,
          unitOfMeasurement: pkgRes.BillingWeight?.UnitOfMeasurement || 'LBS',
        },
        charge: {
          monetaryValue: Number(pkgRes.Charge?.MonetaryValue || 0),
          currencyCode: pkgRes.Charge?.CurrencyCode || 'USD',
        },
      })),
    }));
  }

  /**
  /**
   * Helper to build EpicHubCreateLabelPayload from CreateLabelDto.
   */
  private mapCreateLabelPayload(dto: CreateLabelDto): EpicHubCreateLabelPayload {
    return {
      RequestId: dto.requestId,
      ShipmentDescription: dto.shipmentDescription || 'Ecom Express Shipping',
      ServiceCode: dto.serviceCode,
      AddressValidation: dto.addressValidation !== undefined ? dto.addressValidation : true,
      DeliveryConfirmation: dto.deliveryConfirmation !== undefined ? dto.deliveryConfirmation : 0,
      ReturnService: dto.returnService !== undefined ? dto.returnService : 0,
      InvoiceLineTotal: dto.invoiceLineTotal
        ? {
            MonetaryValue: dto.invoiceLineTotal.monetaryValue,
            CurrencyCode: dto.invoiceLineTotal.currencyCode,
          }
        : undefined,
      ShipFrom: this.mapAddressToEpicHubParty(dto.shipFrom),
      ShipTo: this.mapAddressToEpicHubParty(dto.shipTo),
      Package: dto.packages.map((pkg) => ({
        NumberLabels: pkg.numberLabels || 1,
        PackageWeight: {
          Weight: pkg.weight.weight,
          UnitOfMeasurement: pkg.weight.unitOfMeasurement,
        },
        Dimensions: {
          Length: pkg.dimensions.length,
          Width: pkg.dimensions.width,
          Height: pkg.dimensions.height,
          UnitOfMeasurement: pkg.dimensions.unitOfMeasurement,
        },
        Items: pkg.items
          ? pkg.items.map((item) => ({
              Description: item.description,
              Quantity: item.quantity,
              ItemWeight: {
                Weight: item.weight.weight,
                UnitOfMeasurement: item.weight.unitOfMeasurement,
              },
              ItemPrice: {
                MonetaryValue: item.price.monetaryValue,
                CurrencyCode: item.price.currencyCode,
              },
            }))
          : undefined,
      })),
    };
  }

  /**
   * Helper to map Status 202 Address Ambiguous response.
   */
  private mapAmbiguousResult(candidateResult?: EpicHubCandidatesResult, message?: string | null, rawEnvelope?: unknown): AddressAmbiguousResult {
    const candidates = candidateResult?.Candidates || { ShipFrom: [], ShipTo: [] };
    return {
      isAmbiguous: true,
      message: message || 'The address is ambiguous. Select a candidate for it.',
      candidates: {
        shipFrom: (candidates.ShipFrom || []).map((c) => ({
          addressLine1: c.AddressLine1,
          addressLine2: c.AddressLine2,
          city: c.City,
          stateCode: c.StateCode,
          postalCode: c.PostalCode,
          countryCode: c.CountryCode,
        })),
        shipTo: (candidates.ShipTo || []).map((c) => ({
          addressLine1: c.AddressLine1,
          addressLine2: c.AddressLine2,
          city: c.City,
          stateCode: c.StateCode,
          postalCode: c.PostalCode,
          countryCode: c.CountryCode,
        })),
      },
      rawEnvelope,
    };
  }

  /**
   * Create Shipping Label (Domestic US, International CA/PR, KR -> US).
   * Handles Status 202 Address Ambiguous Candidates.
   */
  public async createLabel(dto: CreateLabelDto): Promise<CreateLabelResultDto> {
    const payload = this.mapCreateLabelPayload(dto);
    const sanitizedPayload = sanitizeEpicHubPayload(payload);
    console.log("[EpicHub FULL Payload]", JSON.stringify(sanitizedPayload, null, 2));

    const { envelope } = await withRetry(
      () =>
        this.httpClient.request<EpicHubCreateLabelResult | EpicHubCandidatesResult>('v2/shipments/label-request', {
          method: 'POST',
          body: sanitizedPayload,
        }),
      { retries: 3, delayMs: 500, actionName: 'createLabel' },
    );

    if (!envelope) {
      throw new Error('[EpicHubCarrierService] Empty response envelope from label creation');
    }

    if (envelope.ResponseStatus.Code === 202) {
      return this.mapAmbiguousResult(envelope.ResponseResults as EpicHubCandidatesResult, envelope.ResponseStatus.Message, envelope);
    }

    const successResult = envelope.ResponseResults as EpicHubCreateLabelResult;
    return {
      isAmbiguous: false,
      requestId: successResult.RequestId,
      serviceCode: successResult.ServiceCode,
      shipmentIdentificationNumber: successResult.ShipmentIdentificationNumber,
      totalCharges: {
        monetaryValue: Number(successResult.TotalCharges?.MonetaryValue || 0),
        currencyCode: successResult.TotalCharges?.CurrencyCode || 'USD',
      },
      totalBillingWeight: {
        weight: successResult.TotalBillingWeight?.Weight || 0,
        unitOfMeasurement: successResult.TotalBillingWeight?.UnitOfMeasurement || 'LBS',
      },
      packageResults: (successResult.PackageResults || []).map((p) => ({
        sequence: p.Sequence,
        trackingNumber: p.TrackingNumber,
        billingWeight: {
          weight: p.BillingWeight?.Weight || 0,
          unitOfMeasurement: p.BillingWeight?.UnitOfMeasurement || 'LBS',
        },
        charge: {
          monetaryValue: Number(p.Charge?.MonetaryValue || 0),
          currencyCode: p.Charge?.CurrencyCode || 'USD',
        },
      })),
      rawEnvelope: envelope,
    };
  }

  /**
   * Fetch compiled PDF label (Base64 string or Binary Stream).
   */
  public async printLabel(params: {
    trackingNumber?: string;
    requestId?: string;
    encoded?: boolean;
  }): Promise<{ pdfBuffer?: Buffer; encodedLabel?: string }> {
    const encoded = params.encoded !== undefined ? params.encoded : true;

    if (encoded) {
      const { envelope } = await this.httpClient.request<EpicHubPrintLabelResult>('v2/shipments/label-print', {
        method: 'GET',
        queryParams: {
          TrackingNumber: params.trackingNumber,
          RequestId: params.requestId,
          Encoded: true,
        },
      });

      const encodedLabel = envelope?.ResponseResults?.EncodedLabel;
      const pdfBuffer = encodedLabel ? Buffer.from(encodedLabel, 'base64') : undefined;
      return { pdfBuffer, encodedLabel };
    }

    const { binaryData } = await this.httpClient.request<never>('v2/shipments/label-print', {
      method: 'GET',
      queryParams: {
        TrackingNumber: params.trackingNumber,
        RequestId: params.requestId,
        Encoded: false,
      },
      isBinaryResponse: true,
    });

    return { pdfBuffer: binaryData };
  }

  /**
   * Package Tracking API.
   */
  public async trackPackage(trackingNumber: string): Promise<TrackingResultDto> {
    const { envelope } = await this.httpClient.request<EpicHubPackageTrackingResult>('v2/shipments/package-tracking', {
      method: 'GET',
      queryParams: {
        TrackingNumber: trackingNumber,
      },
    });

    const res = envelope?.ResponseResults;
    if (!res) {
      throw new Error(`[EpicHubCarrierService] No tracking result found for ${trackingNumber}`);
    }

    return {
      trackingNumber: res.TrackingNumber,
      currentStatus: {
        code: res.CurrentStatus?.Code || 'UNKNOWN',
        condition: res.CurrentStatus?.Condition,
        description: res.CurrentStatus?.Description || '',
        type: res.CurrentStatus?.Type || '',
      },
      origin: res.Origin
        ? {
            city: res.Origin.City,
            stateProvinceCode: res.Origin.StateProvinceCode,
            countryCode: res.Origin.CountryCode,
          }
        : undefined,
      destination: res.Destination
        ? {
            city: res.Destination.City,
            stateProvinceCode: res.Destination.StateProvinceCode,
            countryCode: res.Destination.CountryCode,
          }
        : undefined,
      activity: (res.Activity || []).map((act) => ({
        eventTime: act.EventTime,
        location: act.Location,
        status: {
          code: act.Status?.Code || '',
          description: act.Status?.Description || '',
          type: act.Status?.Type || '',
        },
      })),
    };
  }

  /**
   * Void / Cancel Label.
   */
  public async voidLabel(trackingNumber: string): Promise<VoidResultDto> {
    const { envelope } = await withRetry(
      () =>
        this.httpClient.request<EpicHubVoidResult>('v2/shipments/void', {
          method: 'PUT',
          body: {
            TrackingNumber: trackingNumber,
          },
        }),
      { retries: 3, delayMs: 500, actionName: 'voidLabel' },
    );

    const voidedTracking = envelope?.ResponseResults?.VoidedTrackingNumber;
    const voidFeePercent = envelope?.ResponseResults?.voidFeePercent;
    return {
      voidedTrackingNumber: voidedTracking || trackingNumber,
      voidFeePercent: typeof voidFeePercent === "number" ? voidFeePercent : 0,
      success: true,
      message: envelope?.ResponseStatus?.Message || 'Label voided successfully',
      rawEnvelope: envelope,
    };
  }

  /**
   * Inquiry Account Balance.
   */
  public async getBalance(): Promise<BalanceResultDto> {
    const { envelope } = await this.httpClient.request<EpicHubBalanceResult>('v2/reports/balance', {
      method: 'GET',
    });

    const bal = envelope?.ResponseResults?.Balance;
    return {
      balance: {
        monetaryValue: Number(bal?.MonetaryValue || 0),
        currencyCode: bal?.CurrencyCode || 'USD',
      },
    };
  }

  /**
   * Carrier Specific Method: Change Password.
   */
  public async changePassword(username: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const basicAuth = `Basic ${Buffer.from(`${username}:${oldPassword}`).toString('base64')}`;
    const { envelope } = await this.httpClient.request<null>('v2/accounts/password', {
      method: 'PUT',
      headers: {
        Authorization: basicAuth,
        NewPassword: newPassword,
      },
    });

    return envelope?.ResponseStatus?.Code === 200;
  }
}
