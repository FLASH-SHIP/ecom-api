# SBP RESTful API Integration Guide
Version 2.0.0

This guide provides technical specifications for integrating the **SBP (SB&P JSC / Saigon Cargo Express)** API into the Ecom platform. SBP's API is designed to handle orders, packaging, shipping consolidations (MAWB), and real-time webhook status updates.

---

## 1. General API Information

* **Development (Dev) Base URL**: `https://devapi.sbp.com.vn`
* **Production Base URL**: `https://api.sbp.com.vn`
* **Content-Type**: `application/json` (Required for all request bodies)

### Development & Testing Credentials

Use the following credentials to authenticate with SBP's APIs (both basic authentication for Swagger and token generation):

| Environment | Username | Password | Swagger URL |
| :--- | :--- | :--- | :--- |
| **Development (Dev)** | `ecomexpress` | `aKlXrhGWK9Aziju6` | `https://docs.sbp.com.vn/ecomexpress/` |

> [!WARNING]
> While the credentials above grant access to the Swagger documentation portal, they must be registered/active on the development API server (`devapi.sbp.com.vn`). If API requests return `"username không tồn tại"`, please verify with SBP support to ensure the account is provisioned in the database.

---

## 2. Authentication Flow

SBP API uses a **Basic Auth to JWT & Secret Key** exchange model:
1. Call `GET /auth/v2/external/api/login` using standard **HTTP Basic Authentication** (`Authorization: Basic <base64(username:password)>`).
2. SBP returns an `access_token` (JWT token, type `Bearer`) and a `secret` (Secret Key).
3. The `access_token` is valid for **7 days**.
4. For all subsequent requests, you must include two authentication headers:
   * `Authorization: Bearer <access_token>`
   * `secret: <secret_key>`
   * `lang: "en"` or `"vi"`

```
┌─────────────────┐                      ┌─────────────┐
│  Ecom Platform  │                      │   SBP API   │
└────────┬────────┘                      └──────┬──────┘
         │  GET /auth/v2/external/api/login     │
         │  (Authorization: Basic credentials)  │
         ├─────────────────────────────────────>│
         │                                      │
         │  Returns access_token + secret key   │
         │  (Valid for 7 days)                  │
         │<─────────────────────────────────────┤
         │                                      │
         │  Subsequent Requests:                │
         │  - Authorization: Bearer <token>     │
         │  - secret: <secret_key>              │
         ├─────────────────────────────────────>│
```

---

## 3. Common Header & Response Schema

### Common Request Headers (Authenticated Calls)
* `Authorization`: `Bearer <access_token>`
* `secret`: `<secret_key>`
* `lang`: `"en"` or `"vi"` (Controls response error message languages)
* `Content-Type`: `application/json`

### Standardized Response Envelope
All API responses follow a uniform container structure:
```json
{
  "requestId": "6932b6f3fdfc95001c2e3b9c",
  "code": "000",
  "message": "OK",
  "data": null,
  "meta": null
}
```

* **`requestId`** (String): A unique 24-character MongoDB Object ID string for server log tracing.
* **`code`** (String): System response code for business logic:
  * `"000"`: Success / OK
  * `"001"`: Data Exists
  * `"002"`: Failed
  * `"003"`: Exception Error
  * `"004"`: Not Found
* **`message`** (String): Human-readable feedback determined by the `lang` request header.
* **`data`** (Object/Array): Main payload containing the requested data.
* **`meta`** (Object/Null): Pagination metadata, containing `total`, `page`, `pageSize`, `sort`, and `order`.

---

## 4. Key Configurations & Settings

### A. Service and Sub-Service Codes

#### Core Services (`serviceCode`)
* `DOM_SHIP`: Domestic shipping.
* `INT_OB_SHIP`: International Outbound shipping (Export from Vietnam).
* `INT_IB_SHIP`: International Inbound shipping (Import to Vietnam).

#### Sub-Services (`subServiceCodes` array)
* `PUP_SCHEDULE`: Schedule a pickup at your package location.
* `PUP_DROPOFF`: Drop off package at an SBP location.
* `INT_SHIP`: International shipping.
* `CUS_CLEAR`: Customs clearance.
* `DELIVERY_RC`: Delivery to receiver.

---

### B. Hub and Partner Codes
* **Partner Code**: `SBP` (SB&P JSC)
* **Hub Codes (`hubCode`)**:
  * `SGN`: Ho Chi Minh Hub
  * `HAN`: Ha Noi Hub

---

## 5. SOP Export Procedure (Hanoi Branch)

Operations should align with the standard operating procedures (SOP) established with Saigon Cargo Express (SCE/SBP):

| Step | Vietnamese (Tiếng Việt) | English |
| :--- | :--- | :--- |
| **Step 1** | Khách hàng thông báo trước cho SBP/SCE về kế hoạch xuất hàng (ngày xuất dự kiến, lịch bay, số hiệu chuyến bay, hãng hàng không, chủng loại hàng hóa,...). | The customer shall provide SBP/SCE with advance notice of the planned export shipment (expected date, flight number, airline, cargo description, etc.). |
| **Step 2** | Khách hàng gửi vận đơn, danh sách hàng hóa (Manifest) cho SBP/SCE trước giờ cut off bay ít nhất 24 giờ để kiểm tra. | Customer is required to send the pre-alert, shipment Manifest (MNF) and AWB to SBP/SCE at least 24 hours prior to the airline’s cutoff time. |
| **Step 3** | SBP/SCE đến kho khách hàng lấy hàng trước 11:00 AM hàng ngày (hoặc theo ngày thỏa thuận trước 1 ngày). | SBP/SCE will pick up the goods from the customer’s warehouse before 11:00 AM daily, or on another mutually agreed date. |
| **Step 4** | SBP/SCE mở tờ khai làm thủ tục xuất hàng. | SBP/SCE will proceed with the export declaration. |
| **Step 5** | Đối với lô hàng > 5 triệu VND, SBP/SCE tự động khai nháp H21 và xác nhận thuế/phí với Khách hàng trước khi truyền tờ khai. | For shipments exceeding 5 Million VND, SBP/SCE will draft the export declaration and confirm taxes/fees before submission. |
| **Step 6** | Đối với lô hàng < 5 triệu VND, SBP/SCE tự động khai tờ khai MEC (B14) để thông quan. Hỗ trợ thủ tục HQ nếu rơi vào luồng Vàng/Đỏ. | For shipments under 5 million VND, SBP/SCE will automatically file MEC (B14) declarations. SBP will handle customs procedures if flagged yellow/red. |
| **Step 7** | Sau thông quan, SBP/SCE chuyển hàng và làm thủ tục xuất hàng tại kho hàng Sân Bay Nội Bài. | Once goods complete export procedures, SBP/SCE will transfer them and proceed with airport cargo terminal procedures (Noi Bai Airport). |

---

## 6. API Reference

### 1. Authentication
Exchanges basic auth credentials for a JWT token and secret key valid for 7 days.

* **Method**: `GET`
* **Route**: `/auth/v2/external/api/login`
* **Authentication**: HTTP Basic Auth (`Authorization: Basic <base64(username:password)>`)
* **Response `201`**:
  ```json
  {
    "requestId": "6932b6f3fdfc95001c2e3b9c",
    "code": "000",
    "message": "OK",
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "expire_in": "7 days",
      "secret": "your-secret-key-string",
      "token_type": "Bearer"
    }
  }
  ```

---

### 2. List Stations
Retrieves a list of available SCE/SBP stations to get the `stationCode` for checkout.

* **Method**: `GET`
* **Route**: `/tmm/v2/external/stations`
* **Response `200`**:
  ```json
  {
    "requestId": "6932b6f3fdfc95001c2e3b9c",
    "code": "000",
    "message": "OK",
    "data": [
      {
        "id": 23,
        "code": "HCM2",
        "name": "SCE 06 Thăng Long",
        "nameCompany": "SAIGON CARGO EXPRESS JOINT STOCK COMPANY",
        "address": "06 Thăng Long, Phường 4, Quận Tân Bình, TPHCM",
        "email": "globex.vietnam@gmail.com",
        "phone": "1800.545480",
        "displayName": "Tan Son Nhat Gateway"
      },
      {
        "id": 3,
        "code": "HCM1",
        "name": "85 Thăng Long",
        "nameCompany": "SAIGON CARGO EXPRESS JOINT STOCK COMPANY",
        "address": "85 Thăng Long, Phường 4, Quận Tân Bình, TPHCM",
        "email": "csr@sbplogistics.com",
        "phone": "84-8-39976399",
        "displayName": "Ho Chi Minh City Sorting Center"
      }
    ],
    "meta": {
      "total": 2,
      "page": 1,
      "pageSize": 10
    }
  }
  ```

---

### 3. Create Order
Creates a shipping order. Supports domestic, outbound, and inbound workflows.

* **Method**: `POST`
* **Route**: `/omm/v2/external/order_express`
* **Payload Examples**:

<details>
<summary><b>Domestic Order Request Example</b></summary>

```json
{
  "orderNumberClient": "ABC00001",
  "stationCode": "HCM2",
  "serviceCode": "DOM_SHIP",
  "subServiceCodes": ["PUP_SCHEDULE", "DELIVERY_RC"],
  "senderData": {
    "customerLastName": "D Amore",
    "customerPhone": "0345698123",
    "customerFullAddress": "85 Thang Long, P4, Tan Binh, HCM City, Vietnam",
    "countryCode": "VN",
    "provinceName": "Hồ Chí Minh",
    "districtName": "Tân Bình",
    "wardName": "04",
    "countryName": "Việt Nam"
  },
  "receiverData": {
    "customerLastName": "Nguyễn Văn A",
    "customerPhone": "0123456789",
    "customerFullAddress": "85 Thang Long, P4, Tan Binh, HCM City, Vietnam",
    "countryCode": "VN",
    "provinceName": "Hồ Chí Minh",
    "districtName": "Tân Bình",
    "wardName": "04",
    "countryName": "Việt Nam"
  },
  "partnerCode": "SBP",
  "weightType": "kg",
  "dimType": "cm",
  "packageDetails": [
    {
      "description": "Package 1",
      "weight": 3
    }
  ],
  "pcs": 1,
  "orderWeight": 3,
  "unitFee": "VND",
  "codAmount": 0
}
```
</details>

<details>
<summary><b>International Outbound Order Request Example</b></summary>

```json
{
  "orderNumberClient": "ABC00002",
  "stationCode": "HCM2",
  "serviceCode": "INT_OB_SHIP",
  "subServiceCodes": ["PUP_SCHEDULE", "CUS_CLEAR"],
  "senderData": {
    "customerLastName": "Nguyễn Văn A",
    "customerPhone": "0123456789",
    "customerFullAddress": "85 Thang Long, P4, Tan Binh, HCM City, Vietnam",
    "countryCode": "VN",
    "provinceName": "Hồ Chí Minh",
    "districtName": "Tân Bình",
    "wardName": "04",
    "countryName": "Việt Nam"
  },
  "receiverData": {
    "customerLastName": "Test 01",
    "customerPhone": "0345698123",
    "customerFullAddress": "456 International Parkway, Minooka, IL, USA",
    "countryCode": "US",
    "stateName": "Illinois",
    "cityName": "Minooka",
    "countryName": "USA"
  },
  "hubCode": "SGN",
  "partnerCode": "SBP",
  "orderWeight": 2,
  "dimType": "cm",
  "weightType": "kg",
  "unitFee": "VND",
  "unitAmount": "VND",
  "codAmount": 646000,
  "totalAmount": 300000,
  "orderDetails": [
    {
      "productName": "TEST 01",
      "hscode": "0000",
      "qty": 3,
      "weight": 0.9,
      "unitPrice": 2,
      "totalAmount": 100000
    }
  ],
  "packageDetails": [
    {
      "weight": 2,
      "long": 2,
      "width": 4,
      "height": 3
    }
  ]
}
```
</details>

* **Response `200`**:
  ```json
  {
    "requestId": "6932b6f3fdfc95001c2e3b9c",
    "code": "000",
    "message": "OK",
    "data": {
      "orderId": "3c748ff6-7d9a-4162-a64c-ee0cafe8fc1d",
      "orderNumber": "GB0000000001",
      "orderNumberClient": "ABC00001",
      "label": "http://devlabel.globex.vn/itemsOrderExpress/label/shipping?orderNumber=GB0000000001"
    }
  }
  ```

---

### 4. Update Order
Updates an existing order configuration. Only possible before check-in.

* **Method**: `PUT`
* **Route**: `/omm/v2/external/order_express/{orderNumber}`
* **Headers**: Standard Token + Secret
* **Response `200`**: Standard success envelope with updated status details.

---

### 5. Cancel Order
Cancels a created order before check-in.

* **Method**: `DELETE`
* **Route**: `/omm/v2/order_express/{orderNumber}`
* **Response `200`**:
  ```json
  {
    "requestId": "6932b6f3fdfc95001c2e3b9c",
    "code": "000",
    "message": "OK"
  }
  ```

---

### 6. Confirm and Check In
Confirms check-in for one or multiple order numbers.

* **Method**: `POST`
* **Route**: `/omm/v2/external/order_express/confirm_checkin`
* **Request Body**:
  ```json
  {
    "orderNumbers": ["GB0000000001", "GB0000000002"]
  }
  ```
* **Response `200`**: Standard success envelope.

---

### 7. Create Packaging (Boxes)
Groups checked-in orders into a shipping box (package). Only valid for orders at "Arriving at Facility" status.

* **Method**: `POST`
* **Route**: `/tmm/v2/external/boxes`
* **Request Body**:
  ```json
  {
    "boxNumber": "no.1",
    "orderNumbers": ["GB00000126130"],
    "weight": 2.5,
    "unitOfMass": "kg",
    "long": 20.0,
    "width": 30.5,
    "height": 12.0,
    "unitOfLength": "cm",
    "description": "This is description for the package"
  }
  ```
* **Response `200`**:
  ```json
  {
    "requestId": "6932b6f3fdfc95001cws34tr",
    "code": "000",
    "message": "OK",
    "data": {
      "boxCode": "VIR13251226005",
      "weight": "2.5",
      "phase": 26,
      "description": "This is description for the package",
      "unitOfMass": "kg",
      "unitOfLength": "cm",
      "height": "12",
      "width": "30.5",
      "long": "20",
      "boxNumber": "no.1",
      "logOrders": "GB00000126130",
      "phaseName": {
        "vi": "Đóng gói",
        "en": "Packed",
        "view": "Đóng gói"
      },
      "createdAt": "2025-12-26 09:13:54",
      "updatedAt": "2025-12-26 09:13:54"
    }
  }
  ```

---

### 8. Update Packaging (Box)
Updates the packing configurations, measurements, or orders grouped inside an active box.

* **Method**: `PUT`
* **Route**: `/tmm/v2/external/boxes/{boxCode}`
* **Response `200`**: Returns the updated box details.

---

### 9. Unpackaging (Delete Box)
Deletes a box structure and unpacks all orders inside it back to facility arrival status.

* **Method**: `DELETE`
* **Route**: `/tmm/v2/external/boxes/{boxCode}`
* **Response `200`**: Standard success envelope.

---

### 10. Create Shipment
Consolidates one or more packed box codes into a Master Air Waybill (MAWB) shipment record.

* **Method**: `POST`
* **Route**: `/tmm/v2/external/shipments`
* **Request Body**:
  ```json
  {
    "hubCode": "SGN",
    "boxCodes": ["VIR13251226005"],
    "MAWB": "111-22223333",
    "refNo": "TRACKCODE",
    "flightCode": "VJ185",
    "departureDate": "2025-12-06",
    "arrivalDate": "2025-12-08",
    "description": "This is a shipment"
  }
  ```
* **Response `200`**:
  ```json
  {
    "requestId": "6932b6f3fdfc95001cam9r3y",
    "code": "000",
    "message": "OK",
    "data": {
      "shipmentCode": "VIR1HCM23251226001",
      "MAWB": "111-22223333",
      "phaseName": {
        "vi": "Tạo mới MAWB",
        "en": "Create MAWB"
      },
      "createdAt": "2025-12-26 09:36:03"
    }
  }
  ```

---

### 11. Update Shipment
Updates shipment dates, flight details, or description. Only works when there is no order created in SBP's "Clearance System".

* **Method**: `PUT`
* **Route**: `/tmm/v2/external/shipments/package/{shipmentCode}`
* **Response `200`**: Standard success envelope with updated shipment structure.

---

### 12. Delete Shipment
Deletes a consolidated shipment record.

* **Method**: `DELETE`
* **Route**: `/tmm/v2/external/shipments/package/{shipmentCode}`
* **Response `200`**: Standard success envelope.

---

### 13. Add Package into Shipment
Appends new box codes to an existing shipment consolidation.

* **Method**: `PUT`
* **Route**: `/tmm/v2/external/shipments/package`
* **Request Body**:
  ```json
  {
    "shipmentCode": "SIN02HCMC21102700001080",
    "boxCodes": ["VIR13251226006"]
  }
  ```
* **Response `200`**: Standard success envelope.

---

### 14. Webhooks (Status Updates)
Registers or removes a partner webhook URL endpoint to receive real-time updates.

* **Method**: `POST`
* **Route**: `/tmm/v2/external/webhooks`
* **Request Body**:
  ```json
  {
    "endpoint": "https://my.host.com/webhooks/sbp",
    "token": "Bearer yourToken"
  }
  ```
  * *Note*: Set `endpoint` to `""` or `null` to remove/unregister the webhook.

#### Webhook Retries
All push notifications (webhooks) will be sent up to three times if the first delivery attempt to the partner is unsuccessful:
1. **1st attempt**: Immediately.
2. **2nd attempt**: 5 minutes after the first.
3. **3rd attempt**: 15 minutes after the second.

---

### 15. Webhook Test
Triggers a dummy mock notification to test your registered webhook endpoint.

* **Method**: `GET`
* **Route**: `/tmm/v2/webhooks/test`
* **Event Action Codes**:
  * `23`: Arrived at the facility
  * `34`: Departed from the facility
  * `28`: The cargo is cleared through customs
  * `36`: In international transit
  * `33`: Out for delivery
  * `38`: Delivery failed
  * `40`: Delivered
* **Response `200`**: Returns the test webhook payload sent to the endpoint.

---

## 7. Developer Implementation Notes

When developing the backend integration logic in Ecom features for SBP, keep the following in mind:

### 1. Authentication Expiration & Automatic Refresh
* The JWT `access_token` returned by `/auth/v2/external/api/login` is valid for **7 days**.
* If SBP returns a `419` status code (Token Expired) or `401` status code (Unauthorized), your integration should catch this error, trigger the authentication API again to fetch a new token, cache it in Redis/Database, and retry the failed request.

### 2. Address Handling Rules
* **Vietnam Shipments (`countryCode: "VN"`)**: The fields `provinceName`, `districtName`, and `wardName` are required. Ensure they align with Vietnamese standard administrative boundary spellings (e.g. `"Hồ Chí Minh"`, `"Tân Bình"`, etc.).
* **International Shipments (`countryCode != "VN"`)**: The fields `stateName` and `cityName` are required instead.

### 3. Packaging & Consolidations Workflow
* SBP follows a multi-stage tracking workflow:
  1. `Create Order` (Status: Initial)
  2. `Confirm and Check In` (Status: Checked-in at facility)
  3. `Create Packaging` (Status: Packed)
  4. `Create Shipment` (Status: Consolidated into MAWB)
* Note that **Update Order** and **Cancel Order** are only possible **before** Check-in (step 2).
* **Update Shipment** and **Delete Shipment** are only possible **before** the orders inside are processed by SBP's customs "Clearance System".
