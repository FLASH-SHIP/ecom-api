import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo, CreateLabelDto, PriceInquiryDto } from '../interfaces/carrier-provider.interface';
import { EpicHubAuthService } from '../epichub-auth.service';
import { EpicHubCarrierService } from '../epichub-carrier.service';
import { EpicHubHttpClient } from '../epichub-http-client';
import { PartnerProviderRegistry } from '../../../shared/partner-provider-registry';
import { decryptSecret, encryptSecret, resolvePartnerConfig } from '../../../shared/partner-config-crypto';

// Mock @flash-ship/ecom-lib/redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

vi.mock('@flash-ship/ecom-lib/redis', () => ({
  getRedisClient: () => mockRedis,
}));

describe('EpicHub Integration Unit Tests', () => {
  const dummyConfig = {
    baseUrl: 'https://clutchshipper.com/api',
    username: 'EcomExp_dev',
    password: '33xP!dvp',
    tokenTtlSeconds: 41400,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EpicHubAuthService', () => {
    it('should fetch new session token when Redis cache is empty', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const mockTokenResponse = {
        ResponseStatus: { Code: 200, Description: 'Success', Error: null, Message: 'Valid credentials.' },
        ResponseResults: { Token: 'mock-session-token-12345' },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const authService = new EpicHubAuthService(dummyConfig);
      const token = await authService.getSessionToken();

      expect(token).toBe('mock-session-token-12345');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://clutchshipper.com/api/auth/token',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should return cached token from Redis when available', async () => {
      mockRedis.get.mockResolvedValue('cached-redis-token-999');

      const authService = new EpicHubAuthService(dummyConfig);
      const token = await authService.getSessionToken();

      expect(token).toBe('cached-redis-token-999');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('EpicHubCarrierService', () => {
    const dummyAddress: AddressInfo = {
      name: 'John Doe',
      phone: '2133730000',
      email: 'john@example.com',
      addressLine1: '123 Main St',
      city: 'Los Angeles',
      stateProvinceCode: 'CA',
      postalCode: '90001',
      countryCode: 'US',
    };

    it('should report capabilities correctly', () => {
      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const carrierService = new EpicHubCarrierService(httpClient);

      const caps = carrierService.getCapabilities();
      expect(caps.supportsPriceInquiry).toBe(true);
      expect(caps.supportsAddressValidation).toBe(true);
      expect(caps.supportsVoid).toBe(true);
      expect(caps.supportsBalanceCheck).toBe(true);
      expect(caps.supportsReturnService).toBe(true);
    });

    it('should calculate shipping rates via inquirePrice()', async () => {
      mockRedis.get.mockResolvedValue('valid-token');

      const mockPriceResponse = {
        ResponseStatus: { Code: 200, Description: 'Success', Error: null, Message: null },
        ResponseResults: [
          {
            ServiceCode: '03',
            TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '31.28' },
            TotalBillingWeight: { UnitOfMeasurement: 'LBS', Weight: 25.0 },
            PackageResults: [
              {
                BillingWeight: { UnitOfMeasurement: 'LBS', Weight: 25.0 },
                Charge: { CurrencyCode: 'USD', MonetaryValue: '31.28' },
              },
            ],
          },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPriceResponse,
      });

      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const carrierService = new EpicHubCarrierService(httpClient);

      const priceDto: PriceInquiryDto = {
        requestId: 'req_price_001',
        shipFrom: dummyAddress,
        shipTo: dummyAddress,
        packages: [
          {
            weight: { weight: 5, unitOfMeasurement: 'LBS' },
            dimensions: { length: 10, width: 8, height: 6, unitOfMeasurement: 'IN' },
          },
        ],
      };

      const rates = await carrierService.inquirePrice(priceDto);
      expect(rates).toHaveLength(1);
      expect(rates[0].serviceCode).toBe('03');
      expect(rates[0].totalCharges.monetaryValue).toBe(31.28);
    });

    it('should handle Status 202 Address Ambiguous Candidates in createLabel()', async () => {
      mockRedis.get.mockResolvedValue('valid-token');

      const mock202Response = {
        ResponseStatus: {
          Code: 202,
          Description: 'Accepted',
          Error: 'Accepted',
          Message: 'The address is ambiguous. Select a candidate for it.',
        },
        ResponseResults: {
          Candidates: {
            ShipFrom: [],
            ShipTo: [
              {
                AddressLine1: '1234 NW 82ND AVE',
                City: 'DORAL',
                StateCode: 'FL',
                PostalCode: '33166',
                CountryCode: 'US',
              },
            ],
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mock202Response,
      });

      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const carrierService = new EpicHubCarrierService(httpClient);

      const createLabelDto: CreateLabelDto = {
        requestId: 'req_dom_001',
        serviceCode: '03',
        shipFrom: dummyAddress,
        shipTo: dummyAddress,
        packages: [
          {
            weight: { weight: 5, unitOfMeasurement: 'LBS' },
            dimensions: { length: 10, width: 8, height: 6, unitOfMeasurement: 'IN' },
          },
        ],
      };

      const result = await carrierService.createLabel(createLabelDto);
      expect(result.isAmbiguous).toBe(true);
      if (result.isAmbiguous) {
        expect(result.candidates.shipTo).toHaveLength(1);
        expect(result.candidates.shipTo[0].addressLine1).toBe('1234 NW 82ND AVE');
      }
    });

    it('should create label successfully on Status 200', async () => {
      mockRedis.get.mockResolvedValue('valid-token');

      const mock200Response = {
        ResponseStatus: { Code: 200, Description: 'Success', Error: null, Message: null },
        ResponseResults: {
          RequestId: 'req_dom_001',
          ServiceCode: '03',
          ShipmentIdentificationNumber: '1ZX2402221150301923678045',
          TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '80.48' },
          TotalBillingWeight: { UnitOfMeasurement: 'LBS', Weight: 5.0 },
          PackageResults: [
            {
              Sequence: 1,
              TrackingNumber: '1ZX2402221150301923678045',
              BillingWeight: { UnitOfMeasurement: 'LBS', Weight: 5.0 },
              Charge: { CurrencyCode: 'USD', MonetaryValue: '80.48' },
            },
          ],
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mock200Response,
      });

      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const carrierService = new EpicHubCarrierService(httpClient);

      const createLabelDto: CreateLabelDto = {
        requestId: 'req_dom_001',
        serviceCode: '03',
        shipFrom: dummyAddress,
        shipTo: dummyAddress,
        packages: [
          {
            weight: { weight: 5, unitOfMeasurement: 'LBS' },
            dimensions: { length: 10, width: 8, height: 6, unitOfMeasurement: 'IN' },
          },
        ],
      };

      const result = await carrierService.createLabel(createLabelDto);
      expect(result.isAmbiguous).toBe(false);
      if (!result.isAmbiguous) {
        expect(result.shipmentIdentificationNumber).toBe('1ZX2402221150301923678045');
        expect(result.packageResults[0].trackingNumber).toBe('1ZX2402221150301923678045');
      }
    });

    it('should query account balance via getBalance()', async () => {
      mockRedis.get.mockResolvedValue('valid-token');

      const mockBalanceResponse = {
        ResponseStatus: { Code: 200, Description: 'Success', Error: null, Message: null },
        ResponseResults: { Balance: { MonetaryValue: 150.5, CurrencyCode: 'USD' } },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBalanceResponse,
      });

      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const carrierService = new EpicHubCarrierService(httpClient);

      const bal = await carrierService.getBalance();
      expect(bal.balance.monetaryValue).toBe(150.5);
      expect(bal.balance.currencyCode).toBe('USD');
    });

    it('should void label via voidLabel()', async () => {
      mockRedis.get.mockResolvedValue('valid-token');

      const mockVoidResponse = {
        ResponseStatus: { Code: 200, Description: 'Success', Error: null, Message: null },
        ResponseResults: { VoidedTrackingNumber: '1ZX2402221150301923678045' },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockVoidResponse,
      });

      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const carrierService = new EpicHubCarrierService(httpClient);

      const voidRes = await carrierService.voidLabel('1ZX2402221150301923678045');
      expect(voidRes.success).toBe(true);
      expect(voidRes.voidedTrackingNumber).toBe('1ZX2402221150301923678045');
    });
  });

  describe('PartnerProviderRegistry (Multi-Domain 3rd Party Framework)', () => {
    it('should register and retrieve EpicHub carrier via Registry', () => {
      const registry = PartnerProviderRegistry.getInstance();
      registry.clear();

      const authService = new EpicHubAuthService(dummyConfig);
      const httpClient = new EpicHubHttpClient(dummyConfig.baseUrl, authService);
      const epicHubService = new EpicHubCarrierService(httpClient);

      registry.registerCarrier(epicHubService);

      expect(registry.hasProvider('carrier', 'EPICHUB')).toBe(true);
      const retrievedCarrier = registry.getCarrier('EPICHUB');
      expect(retrievedCarrier.code).toBe('EPICHUB');
    });

    it('should support registering non-carrier 3rd party providers (fulfillment, customs, pod)', () => {
      const registry = PartnerProviderRegistry.getInstance();

      const mockFulfillmentProvider = { name: 'FlexportFulfillment', syncInventory: vi.fn() };
      const mockCustomsProvider = { name: 'ZonosCustoms', calculateTax: vi.fn() };

      registry.registerProvider('fulfillment', 'FLEXPORT', mockFulfillmentProvider);
      registry.registerProvider('customs', 'ZONOS', mockCustomsProvider);

      expect(registry.hasProvider('fulfillment', 'FLEXPORT')).toBe(true);
      expect(registry.hasProvider('customs', 'ZONOS')).toBe(true);

      const retrievedFulfillment = registry.getProvider('fulfillment', 'FLEXPORT');
      expect(retrievedFulfillment).toBe(mockFulfillmentProvider);
    });
  });

  describe('Hybrid Credential Provider Chain & AES-256 Encryption', () => {
    it('should encrypt and decrypt secrets cleanly with AES-256-GCM', () => {
      const originalPassword = 'SecretPassword!123';

      const encrypted = encryptSecret(originalPassword);
      expect(encrypted).toContain('enc:v1:');
      expect(encrypted).not.toBe(originalPassword);

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(originalPassword);
    });

    it('should resolve credentials using Hybrid Chain (DB apiConfig priority + Env fallback)', () => {
      const encryptedDbPassword = encryptSecret('EncryptedPasswordFromDB');
      const dbApiConfig = {
        baseUrl: 'https://db-custom-api.com/v2',
        username: 'db_user',
        password: encryptedDbPassword,
      };

      const envFallback = {
        baseUrl: 'https://env-api.com',
        username: 'env_user',
        password: 'env_password',
      };

      const resolved = resolvePartnerConfig<typeof envFallback>(dbApiConfig, envFallback);
      expect(resolved.baseUrl).toBe('https://db-custom-api.com/v2');
      expect(resolved.username).toBe('db_user');
      expect(resolved.password).toBe('EncryptedPasswordFromDB'); // Auto-decrypted!
    });
  });
});
