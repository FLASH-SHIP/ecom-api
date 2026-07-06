# EpicHub RESTful API Integration Guide
Version 2.1.0

This guide provides technical specifications for integrating the EpicHub RESTful API into the Ecom platform. EpicHub's API is designed to efficiently create and print shipping labels.

---

## 1. General API Information

* **Base Path**: `https://clutchshipper.com/api/`
* **Content-Type**: `application/json` (Required for all request bodies)

### Development & Testing Credentials
For integration testing and development, use the following credentials provided in the configuration files:

| Environment | Username | Password |
| :--- | :--- | :--- |
| **Development (Dev)** | `EcomExp_dev` | `33xP!dvp` |
| **Testing (Test)** | `ClutchShipper_test` | `k3sZ42EJsWv3@` |

---

## 2. Authentication Flow

EpicHub API uses a **Session Token** authentication model.
1. The developer fetches a session token by calling `/auth/token` using standard HTTP Basic Authentication with client credentials.
2. The session token returned is valid for **12 hours (720 minutes)**.
3. For all subsequent requests (except `/auth/token`), you must include the token in the header as:
   `Token: <your_session_token>`

> [!WARNING]
> Once the 12-hour validity period expires, the token will become invalid, returning a `401 Unauthorized` error. Your integration should capture this error code and automatically re-request a new session token.

---

## 3. Common Header & Response Schema

### Common Request Headers (Authenticated Calls)
* `Token`: The session token obtained from the authentication step.
* `Content-type`: `application/json`

### Standardized Response Envelope
All API responses follow a uniform container structure:
```json
{
  "ResponseStatus": {
    "Code": 200,
    "Description": "Success",
    "Error": null,
    "Message": "Valid credentials."
  },
  "ResponseResults": null
}
```

* **`ResponseStatus`** (Container):
  * **`Code`** (Integer): HTTP equivalent status code (e.g., 200, 201, 202, 400, 401, 403, 404, 500).
  * **`Description`** (String): Brief text description of the status code.
  * **`Error`** (String): Detailed error description (or `null` if the request was successful).
  * **`Message`** (String): Custom transaction/error message. In case of errors, it might contain a support reference code (e.g., `(ref: 240223.083613.381851)`).
* **`ResponseResults`** (Container or Array): Contains the payload data returned by the API if the request succeeded.

---

## 4. Key Configurations & Settings

### A. Available Shipping Services
Use the following `ServiceCode` values:

#### Domestic Shipping (US)
* `01`: UPS Next Day Air
* `02`: UPS 2nd Day Air
* `03`: UPS Ground
* `12`: UPS 3 Day Select
* `13`: UPS Next Day Air Saver
* `14`: UPS Next Day Air Early
* `59`: UPS 2nd Day Air A.M.
* `std-us-swa-mfn`: Amazon Shipping Ground *(Contact EpicHub support to activate this service)*

#### US to Unincorporated Territories / Overseas
* `01`: UPS Next Day Air *(to Puerto Rico)*
* `02`: UPS 2nd Day Air *(to Puerto Rico)*
* `03`: UPS Ground *(to Puerto Rico)*
* `11`: UPS Standard *(to Canada)*

#### Overseas to US
* `KRTHZXR`: Korea Standard *(Shipping from South Korea to US)*

---

### B. Address Validation
EpicHub supports US address validation by setting the `AddressValidation` field to `1` or `true` in a shipping label request.
* **If the address is ambiguous**: The API returns a `202 Accepted` status code. The `ResponseStatus.Error` will also be `"Accepted"` and the `Message` will say `"The address is ambiguous. Select a candidate for it."`
* The `ResponseResults.Candidates` field will then populate with matching `ShipFrom` and `ShipTo` address suggestions:
  ```json
  {
    "ResponseStatus": {
      "Code": 202,
      "Description": "Accepted",
      "Error": "Accepted",
      "Message": "The address is ambiguous. Select a candidate for it. (ref: 240220.094236.164733)"
    },
    "ResponseResults": {
      "Candidates": {
        "ShipFrom": [],
        "ShipTo": [
          {
            "AddressLine1": "1234 NW 82ND AVE",
            "AddressLine2": "",
            "City": "DORAL",
            "StateCode": "FL",
            "PostalCode": "22345",
            "CountryCode": "US"
          }
        ]
      }
    }
  }
  ```

---

### C. Delivery Confirmation
Set the `DeliveryConfirmation` integer field in shipping requests:
* `0`: No signature required (Default).
* `1`: Delivery Signature Required.
* `2`: Delivery Adult Signature Required.

> [!NOTE]
> Delivery confirmation settings are ignored for Amazon Shipping (`std-us-swa-mfn`).

---

### D. Return Service
To generate a return shipping label, set `ReturnService` to `1`.
* This swaps the input sender (`ShipFrom`) and receiver (`ShipTo`) addresses automatically, allowing you to use the original request structure without manually transposing fields.
* `0` creates a regular forward label (Default).

---

## 5. API Reference

### 1. Session Token
Retrieves a session token valid for 12 hours.

* **Method**: `GET`
* **Route**: `/auth/token`
* **Authentication**: HTTP Basic Auth (`Authorization: Basic <base64(username:password)>`)
* **Response**:
  ```json
  {
    "ResponseResults": {
      "Token": "15576696791511562927-80cb9752-78d6-4fe1-8ed8-97f1e125bfd4"
    },
    "ResponseStatus": {
      "Code": 200,
      "Description": "Success",
      "Error": null,
      "Message": "Valid credentials."
    }
  }
  ```

---

### 2. Create Shipping Labels
Generates one or more shipping labels.

* **Method**: `POST`
* **Route**: `/v2/shipments/label-request`
* **Headers**:
  * `Token`: `{{epicHubToken}}`
  * `Content-Type`: `application/json`

#### Request Payload Variations

<details>
<summary><b>Domestic US Request Structure</b></summary>

```json
{
  "RequestId": "req_dom_000001",
  "ShipmentDescription": "Domestic US Shipping",
  "ServiceCode": "03",
  "AddressValidation": true,
  "DeliveryConfirmation": 0,
  "ReturnService": 0,
  "ShipFrom": {
    "Name": "Sender Name",
    "Phone": "2133730000",
    "EmailAddress": "sender@email.com",
    "Address": {
      "AddressLine1": "1234 Sender Address Ave",
      "City": "Los Angeles",
      "StateProvinceCode": "CA",
      "PostalCode": "92231",
      "CountryCode": "US"
    }
  },
  "ShipTo": {
    "Name": "Receiver Name",
    "AttentionName": "Receiver",
    "EmailAddress": "receiver@gmail.com",
    "Address": {
      "AddressLine1": "6789 Receiver Address Ave",
      "AddressLine2": "Apt 15",
      "City": "Doral",
      "StateProvinceCode": "FL",
      "PostalCode": "27000",
      "CountryCode": "US"
    }
  },
  "Package": [
    {
      "PackageWeight": {
        "Weight": 5.0,
        "UnitOfMeasurement": "LBS"
      },
      "Dimensions": {
        "Length": 7.0,
        "Width": 8.0,
        "Height": 9.0,
        "UnitOfMeasurement": "IN"
      }
    }
  ]
}
```
</details>

<details>
<summary><b>International US to Canada / Puerto Rico Request</b></summary>

* Requires `ShipmentDescription`.
* Requires `InvoiceLineTotal` containing `MonetaryValue` and `CurrencyCode`.
* For Puerto Rico shipping, set `StateProvinceCode` and `CountryCode` to `"PR"`.

```json
{
  "RequestId": "req_intl_000001",
  "ShipmentDescription": "Books for Canada",
  "ServiceCode": "11",
  "InvoiceLineTotal": {
    "MonetaryValue": 100.0,
    "CurrencyCode": "USD"
  },
  "ShipFrom": {
    "Name": "Sender Name",
    "Address": {
      "AddressLine1": "1234 Sender Address Ave",
      "City": "Los Angeles",
      "StateProvinceCode": "CA",
      "PostalCode": "92231",
      "CountryCode": "US"
    }
  },
  "ShipTo": {
    "Name": "Receiver Name",
    "Address": {
      "AddressLine1": "6789 Receiver Address Ave",
      "City": "Burnaby",
      "StateProvinceCode": "BC",
      "PostalCode": "V5H 2P8",
      "CountryCode": "CA"
    }
  },
  "Package": [
    {
      "PackageWeight": {
        "Weight": 5.0,
        "UnitOfMeasurement": "LBS"
      },
      "Dimensions": {
        "Length": 7.0,
        "Width": 8.0,
        "Height": 9.0,
        "UnitOfMeasurement": "IN"
      }
    }
  ]
}
```
</details>

<details>
<summary><b>Overseas South Korea (KR) to US Request</b></summary>

* `ShipFrom.Address.CountryCode` must be `"KR"`.
* Service code must be `"KRTHZXR"`.
* Weight unit must be `"KGS"` (max 30.0 kg).
* Dimensions unit must be `"CM"`.
* Requires a detailed items array list (`Package[i].Items`) containing description, weight, and item price.

```json
{
  "RequestId": "req_kr_000001",
  "ServiceCode": "KRTHZXR",
  "AddressValidation": true,
  "ShipFrom": {
    "Name": "Korean Shipper",
    "Phone": "821012345678",
    "EmailAddress": "sender@korea.com",
    "Address": {
      "AddressLine1": "1234 Sender Road",
      "City": "Seocho District",
      "StateProvinceCode": "SEOUL",
      "PostalCode": "06772",
      "CountryCode": "KR"
    }
  },
  "ShipTo": {
    "Name": "US Receiver",
    "Address": {
      "AddressLine1": "6789 Receiver Address Ave",
      "City": "Doral",
      "StateProvinceCode": "FL",
      "PostalCode": "27000",
      "CountryCode": "US"
    }
  },
  "Package": [
    {
      "NumberLabels": 1,
      "PackageWeight": {
        "Weight": 2.0,
        "UnitOfMeasurement": "KGS"
      },
      "Dimensions": {
        "Length": 6.0,
        "Width": 11.0,
        "Height": 9.0,
        "UnitOfMeasurement": "CM"
      },
      "Items": [
        {
          "Description": "Toys",
          "Quantity": 1,
          "ItemWeight": {
            "Weight": 2.0,
            "UnitOfMeasurement": "KGS"
          },
          "ItemPrice": {
            "MonetaryValue": 10.0,
            "CurrencyCode": "USD"
          }
        }
      ]
    }
  ]
}
```
</details>

#### Response Body (Success)
```json
{
  "ResponseResults": {
    "RequestId": "req_dom_000001",
    "ResidentialAddressIndicator": false,
    "ServiceCode": "03",
    "ShipmentIdentificationNumber": "1ZX2402221150301923678045",
    "TotalCharges": {
      "CurrencyCode": "USD",
      "MonetaryValue": "80.48"
    },
    "TotalBillingWeight": {
      "UnitOfMeasurement": "LBS",
      "Weight": 54.0
    },
    "PackageResults": [
      {
        "Sequence": 1,
        "TrackingNumber": "1ZX2402221150301923678045",
        "BillingWeight": {
          "UnitOfMeasurement": "LBS",
          "Weight": 40.0
        },
        "Charge": {
          "CurrencyCode": "USD",
          "MonetaryValue": "29.64"
        }
      }
    ]
  },
  "ResponseStatus": {
    "Code": 200,
    "Description": "Success",
    "Error": null,
    "Message": null
  }
}
```

---

### 3. Package Tracking
Retrieves tracking events and real-time status details for a package.

* **Method**: `GET`
* **Route**: `/v2/shipments/package-tracking`
* **Headers**:
  * `Token`: `{{epicHubToken}}`
* **Query Parameters**:
  * `TrackingNumber` (String, Required): e.g. `1Z99999999999`
* **Response**:
  ```json
  {
    "ResponseResults": {
      "TrackingNumber": "1Z99999999999",
      "CurrentStatus": {
        "Code": "9E",
        "Condition": "FIN",
        "Description": "DELIVERED ",
        "Type": "D"
      },
      "Destination": {
        "City": "SAN DIEGO",
        "StateProvinceCode": "CA",
        "CountryCode": "US"
      },
      "Origin": {
        "City": "CYPRESS",
        "StateProvinceCode": "CA",
        "CountryCode": "US"
      },
      "Activity": [
        {
          "EventTime": "02/22/2024 11:42:05",
          "Location": "SAN DIEGO CA US",
          "Status": {
            "Code": "9E",
            "Description": "DELIVERED ",
            "Type": "D"
          }
        }
      ]
    },
    "ResponseStatus": {
      "Code": 200,
      "Description": "Success",
      "Error": null,
      "Message": null
    }
  }
  ```

---

### 4. Print Labels
Fetches compiled shipping labels as a PDF (base64 encoded or binary).

* **Method**: `GET`
* **Route**: `/v2/shipments/label-print`
* **Headers**:
  * `Token`: `{{epicHubToken}}`
* **Query Parameters**:
  * `TrackingNumber` (String, Conditional): Required if printing a single label by its tracking code.
  * `RequestId` (String, Conditional): Required if printing all labels associated with a bulk request ID.
  * `Encoded` (Boolean, Optional): `true` (Default, returns base64 string) or `false` (returns direct binary file).
  * `EmailLabel` (Boolean, Optional): `true` sends the label to the sender's email.
  * `ShipFromNotificationEmail` (String, Optional): Sets a custom email recipient for the label.
  * `NotifyShipping` (Boolean, Optional): Sends email to receiver upon shipping.
  * `NotifyDelivery` (Boolean, Optional): Sends email to receiver upon delivery.
  * `ShipToNotificationEmail` (String, Optional): Custom receiver email for tracking updates.

#### Response Body (Base64 Mode)
```json
{
  "ResponseStatus": {
    "Code": 200,
    "Description": "Success",
    "Error": null,
    "Message": null
  },
  "ResponseResults": {
    "EncodedLabel": "JVBERi0xLjUKJeLjz9MKMyAwIG9iago8PC9Db2xvclNwYWNl..."
  }
}
```

---

### 5. Inquiry Price
Calculates shipping rate estimations without generating active tracking labels.

* **Method**: `POST`
* **Route**: `/v2/shipments/price-inquiry`
* **Headers**:
  * `Token`: `{{epicHubToken}}`
  * `Content-Type`: `application/json`
* **Request Body**:
  * Similar to Create Shipping Label, but `ServiceCode` is optional (passing `null` or omitting it queries rates across **all** active carrier services).
* **Response**:
  ```json
  {
    "ResponseStatus": {
      "Code": 200,
      "Description": "Success",
      "Error": null,
      "Message": null
    },
    "ResponseResults": [
      {
        "ServiceCode": "03",
        "ResidentialAddressIndicator": null,
        "TotalCharges": {
          "CurrencyCode": "USD",
          "MonetaryValue": 31.28
        },
        "TotalBillingWeight": {
          "UnitOfMeasurement": "LBS",
          "Weight": 25.0
        },
        "PackageResults": [
          {
            "BillingWeight": {
              "UnitOfMeasurement": "LBS",
              "Weight": 15.0
            },
            "Charge": {
              "CurrencyCode": "USD",
              "MonetaryValue": "17.22"
            }
          }
        ]
      }
    ]
  }
  ```

---

### 6. Inquiry Balance
Returns the current monetary balance in the Clutch Shipper account.

* **Method**: `GET`
* **Route**: `/v2/reports/balance`
* **Headers**:
  * `Token`: `{{epicHubToken}}`
* **Response**:
  ```json
  {
    "ResponseStatus": {
      "Code": 200,
      "Description": "Success",
      "Error": null,
      "Message": null
    },
    "ResponseResults": {
      "Balance": {
        "MonetaryValue": 100.26,
        "CurrencyCode": "USD"
      }
    }
  }
  ```

---

### 7. Void Labels
Cancels a previously generated label. Note that labels can **only** be voided if their tracking status is `"Created"` (i.e. not yet in transit).

* **Method**: `PUT`
* **Route**: `/v2/shipments/void`
* **Headers**:
  * `Token`: `{{epicHubToken}}`
  * `Content-Type`: `application/json`
* **Request Body**:
  ```json
  {
    "TrackingNumber": "1Z000000000000"
  }
  ```
* **Response**:
  ```json
  {
    "ResponseStatus": {
      "Code": 200,
      "Description": "Success",
      "Error": null,
      "Message": null
    },
    "ResponseResults": {
      "VoidedTrackingNumber": "1Z000000000000"
    }
  }
  ```

---

### 8. Change Password
Changes the account's password. Requires credentials verification and password policy compliance (Min 8 characters, uppercase, lowercase, number, and symbols from `{@, #, $, !, %, &}`).

* **Method**: `PUT`
* **Route**: `/v2/accounts/password`
* **Headers**:
  * `Authorization`: Basic Authentication (`Basic <base64(username:old_password)>`)
  * `Token`: The current session token (Required).
  * `NewPassword`: The new password string (sent as a header value, not in the body).
* **Response**:
  ```json
  {
    "ResponseStatus": {
      "Code": 200,
      "Description": "Success",
      "Error": null,
      "Message": "The password has been successfully changed."
    },
    "ResponseResults": null
  }
  ```
