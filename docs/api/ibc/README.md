# Hướng dẫn tích hợp IBC RESTful API
Phiên bản 1.0.0

Tài liệu này cung cấp các đặc tả kỹ thuật chi tiết để tích hợp API của đối tác **IBC (International Bonded Couriers)** vào hệ thống Ecom. API của IBC hỗ trợ các tính năng chính bao gồm: tạo nhãn vận chuyển (shipment labelling), tạo vận đơn (airbills), thông báo trước ZipX (ZipX prealerts), kiểm tra/gửi manifest và theo dõi hành trình đơn hàng.

---

## 1. Thông tin chung về API

* **Base URL**: `https://api.pactrak.com`
* **Content-Type**: `application/json` (Bắt buộc đối với các request body)

---

## 2. Luồng xác thực (Authentication Flow)

IBC sử dụng cơ chế xác thực thông qua **Authority Token**:
1. **Lấy Token**: Gửi một HTTP request có phương thức là `HEAD` tới `/authority/token` đi kèm header custom **`IBCCredentials`**.
   * Định dạng của `IBCCredentials`: Là chuỗi được mã hóa **Base64** của cặp `EMAIL_ADDRESS|PASSWORD` (cách nhau bởi dấu gạch đứng `|`).
   * *Ví dụ:* Nếu email là `me@myemail.com` và password là `mypassword`:
     1. Chuỗi kết hợp: `me@myemail.com|mypassword`
     2. Mã hóa Base64: `bWVAbXllbWFpbC5jb218bXlwYXNzd29yZA==`
     3. Đưa vào header: `IBCCredentials: bWVAbXllbWFpbC5jb218bXlwYXNzd29yZA==`
2. **Nhận Token**: Khi xác thực thành công (200 OK), mã Token sẽ được trả về trong Response Header của HTTP có tên là **`Authority`**.
3. **Gọi các API tiếp theo**: Đính kèm mã token này vào header hoặc tham số query tùy thuộc vào yêu cầu của từng endpoint:
   * Header: `Authorization: Bearer <authority_token>`
   * Tham số Query: `?token=<authority_token>`

---

## 3. Các dịch vụ & Endpoint chính

### A. Xác thực & Quản lý Token
* **Lấy Authority Token**: `HEAD /authority/token`
  * Header: `IBCCredentials: {{ibcCredentials}}`

### B. Nhãn dán & Vận chuyển (Shipping & Labels)
* **Tạo nhãn vận chuyển (Create Shipment Label)**: `POST /shiplabel/v1/:station_code/:service_code`
  * Tham số trên đường dẫn (Path Params):
    * `station_code`: Mã trạm hàng không (Ví dụ: `MIA`, `NYC`, `LAX`)
    * `service_code`: Loại dịch vụ (FedEx SmartPost `S`, FedEx Ground `G`, FedEx Express `E`, UNI `U`)
  * Header: `Authorization: Bearer {{ibcToken}}`
* **Xóa nhãn vận chuyển (Delete Shipment Label)**: `POST /shiplabel/v1/delete/:station_code`
  * Tham số Path: `station_code` (Ví dụ: `MIA`)
  * Header: `Authorization: Bearer {{ibcToken}}`
* **Tạo vận đơn Web Airbill**: `POST /airbill/v1/create`
  * Header: `Authorization: Bearer {{ibcToken}}`

### C. Dịch vụ ZipX (ZipX Services)
* **Tạo ZipX Prealert**: `POST /zipx/v1/prealert/create`
  * Header: `Authorization: Bearer {{ibcToken}}`
* **Lấy danh sách địa chỉ ZipX**: `GET /zipx/v1/addresses?token={{ibcToken}}`
* **Cập nhật địa chỉ ZipX**: `POST /zipx/v1/address/update?token={{ibcToken}}`

### D. Kiểm tra & Gửi dữ liệu Manifest
* **Xác thực dữ liệu Manifest (Validate Manifest JSON)**: `POST /manifest/v1/validate`
  * Header: `Authorization: Bearer {{ibcToken}}`
  * Dùng để kiểm tra định dạng và cấu trúc dữ liệu CSV/JSON của manifest trước khi gửi chính thức.
* **Gửi dữ liệu Manifest (Submit Manifest JSON)**: `POST /manifest/v1/submit`
  * Header: `Authorization: Bearer {{ibcToken}}`
  * Dùng để gửi nội dung Manifest CSV (nằm trong trường `manifest_data` của JSON body) lên hệ thống để xử lý.

### E. Tra cứu thông tin & Sự kiện (Tracking & Events)
* **Lấy chi tiết lô hàng (Get Shipment Details)**: `GET /shipment/v1/details?token={{ibcToken}}&hawb=<hawb_number>`
* **Lấy danh sách sự kiện hàng loạt (Get Batch Events)**: `GET /event/v1/batch` (Dùng để lấy các sự kiện cập nhật trạng thái đơn hàng hàng loạt)
* **Tra cứu hành trình đơn lẻ (Track Shipment)**: `GET /track/v1?hawb=<hawb_number>`

---

## 4. Tài liệu đặc tả & File mẫu

* Để nắm rõ cấu trúc chi tiết của file manifest CSV (quy định các cột cho dòng MAWB, dòng HAWB và dòng Email), vui lòng tham khảo [Đặc tả cấu trúc dữ liệu Manifest của IBC](./manifest-specification.md).
* Các file mẫu trực quan (.csv và .xls) có thể tìm thấy trong thư mục `docs/api/ibc/bruno/example/`.
