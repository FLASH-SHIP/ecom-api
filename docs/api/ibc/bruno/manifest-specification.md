# IBC Manifest - Đặc tả cấu trúc dữ liệu và hướng dẫn sử dụng

Tài liệu này hướng dẫn chi tiết về cấu trúc dòng, cột và cách sử dụng 2 file mẫu trong thư mục `docs/api/ibc/example` để tích hợp với hệ thống Manifest của đối tác IBC.

---

## 1. Phân biệt mục đích sử dụng của 2 file mẫu

| Tên File | Định dạng | Mục đích sử dụng | Khi nào dùng? |
| :--- | :--- | :--- | :--- |
| **`shipment_manifest.v14.xls`** | Excel (`.xls`) | **Biểu mẫu trống (Template)** chứa sẵn các tiêu đề cột chuẩn của IBC để nhập liệu. | Dùng cho bộ phận Vận hành (Operations/Logistics) để nhập dữ liệu lô hàng thủ công một cách trực quan. Trước khi gửi API, file này cần được lưu dưới dạng **CSV (Comma delimited) (\*.csv)**. |
| **`aams-manifest-sample.csv`** | CSV (`.csv`) | **Dữ liệu mẫu thực tế (Sample)** chứa thông tin hoàn chỉnh của 17 lô hàng (HAWB) đã được nhập sẵn. | Dùng cho lập trình viên để tham khảo định dạng text thực tế, copy nội dung dán trực tiếp vào JSON body (`manifest_data`) khi test API trên Bruno/Postman. |

---

## 2. Quy tắc sắp xếp các dòng (Row Types) trong một file Manifest

Một file manifest gửi đi là một tập hợp các dòng text CSV, được phân tích theo thứ tự dòng từ trên xuống dưới. Các dòng được nhận diện bằng cột đầu tiên (`record_type`):

1. **Dòng Email (`email`)**: Cấu hình các email nhận báo cáo kết quả từ hệ thống IBC (Thành công/Lỗi). **Bắt buộc ít nhất 1 dòng và phải nằm ở đầu file**.
2. **Dòng MAWB (`mawb`)**: Chứa thông tin tổng đợt gom hàng (Master Air Waybill) như số chuyến bay, ngày bay, sân bay đi/đến. **Bắt buộc 1 dòng duy nhất** nằm ngay sau các dòng email.
3. **Dòng HAWB (`hawb`)**: Chứa thông tin chi tiết từng đơn hàng lẻ (House Air Waybill) gồm người gửi, người nhận, cân nặng, giá trị hàng, mô tả hàng. **Có thể có nhiều dòng hawb** tiếp theo sau dòng `mawb`.

---

## 3. Đặc tả chi tiết từng cột theo loại dòng

### A. Dòng Cấu hình Email (`email`)
Dòng này gồm **4 cột** dùng để nhận thông báo xử lý từ hệ thống IBC.

| Số cột | Tên cột (Excel/CSV) | Kiểu dữ liệu | Bắt buộc? | Mô tả / Giá trị mẫu |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `record_type` | char | Có | Luôn điền giá trị cố định là: **`email`** |
| 2 | `record_version` | integer | Có | Luôn điền giá trị cố định là: **`1`** |
| 3 | `address_type` | char | Có | Loại thông báo nhận qua email:<br>- `all`: Nhận cả báo cáo thành công và lỗi (Khuyên dùng).<br>- `error`: Chỉ nhận email khi có lỗi.<br>- `success`: Chỉ nhận email khi thành công. |
| 4 | `email_address` | char | Có | Địa chỉ email của bạn nhận thông báo (Ví dụ: `status1@example.com`). |

---

### B. Dòng Master Air Waybill (`mawb`)
Dòng này gồm **8 cột** chứa thông tin vận chuyển chung của cả lô hàng gom lớn.

| Số cột | Tên cột (Excel/CSV) | Kiểu dữ liệu | Bắt buộc? | Mô tả / Giá trị mẫu |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `record_type` | char | Có | Luôn điền giá trị cố định là: **`mawb`** |
| 2 | `record_version` | integer | Có | Luôn điền giá trị cố định là: **`1`** |
| 3 | `manifest_code` | char(15) | Không | Mã định danh duy nhất cho manifest này (Ví dụ: `OBGBA100016602`). |
| 4 | `manifest_date` | char(8) | Có | Ngày chuyến bay khởi hành từ nước xuất khẩu. Định dạng: **`YYYYMMDD`** (Ví dụ: `20191218`). Không được quá khứ quá 7 ngày hoặc tương lai quá 4 ngày. |
| 5 | `manifest_origin` | char(3) | Có | Mã IATA 3 ký tự viết hoa của sân bay xuất phát (Ví dụ: `HKG` - Hong Kong, `SZX` - Shenzhen). |
| 6 | `manifest_destination` | char(3) | Có | Mã IATA 3 ký tự viết hoa của sân bay đích tại Mỹ (Ví dụ: `JFK`, `LAX`, `ORD`). |
| 7 | `flight` | char(20) | Có | Tên hãng bay và số hiệu chuyến bay (Ví dụ: `VS0045`, `CX 086`). |
| 8 | `mawb` | char(11) | Có | Số Master Air Waybill gồm 11 chữ số (Ví dụ: `932-57321784`). Lưu ý phải đúng chữ số kiểm tra mod-7 của hãng hàng không. |

---

### C. Dòng House Air Waybill (`hawb`)
Mỗi dòng đại diện cho một đơn hàng lẻ của khách hàng. Dòng này gồm **54 cột**. 
*(Lưu ý: Hầu hết các cột phụ có thể để trống bằng cách đặt hai dấu phẩy sát nhau `, ,` trong file CSV).*

#### Nhóm 1: Thông tin cấu hình dòng và mã vận đơn lẻ (Cột 1 - 7)
*   **Cột 1 (`record_type`):** Bắt buộc. Luôn điền là **`hawb`**.
*   **Cột 2 (`record_version`):** Bắt buộc. Điền **`14`** (Phiên bản đặc tả hiện tại).
*   **Cột 3 (`profile_key`):** Không bắt buộc. Thường để trống.
*   **Cột 4 (`hawb`):** Bắt buộc. Số House Air Waybill (vận đơn lẻ) đầy đủ của bạn (Ví dụ: `BD202656446`). *Lưu ý: IBC sẽ định danh dựa trên 11 chữ số cuối của mã này, do đó 11 số cuối phải là duy nhất trong cùng 1 MAWB.*
*   **Cột 5 (`reference` / `ship_ref_num`):** Không bắt buộc. Mã tham chiếu đơn hàng của khách hàng.
*   **Cột 6 (`internal_reference`):** Không bắt buộc. Thường để trống.
*   **Cột 7 (`vend_ref_num`):** Không bắt buộc. Mã vận đơn của đối tác chặng cuối (nếu có).

#### Nhóm 2: Thông tin vận chuyển và hàng hóa (Cột 8 - 27)
*   **Cột 8 (`origin`):** Bắt buộc. Mã IATA 3 ký tự của sân bay đi của đơn lẻ (Ví dụ: `HKG`).
*   **Cột 9 (`final_destination`):** Bắt buộc. Mã sân bay đích hoặc mã quốc gia `USA`.
*   **Cột 10 - 13 (`outlying`, `service_provider`, `dsl_station`, `dls_final_destination`):** Không bắt buộc. Để trống.
*   **Cột 14 (`num_pieces`):** Bắt buộc. Số lượng kiện/thùng của đơn lẻ này (Ví dụ: `1`).
*   **Cột 15 (`weight`):** Bắt buộc. Trọng lượng thực tế của đơn hàng (Ví dụ: `0.21`).
*   **Cột 16 (`weight_units` / `weight_unit`):** Bắt buộc. Đơn vị cân nặng: `K` (Kilograms) hoặc `L` (Pounds).
*   **Cột 17 (`contents`):** Bắt buộc. Phân loại hàng hóa: `DOC` (Chứng từ - Không thuế) hoặc `APX` (Hàng hóa chịu thuế).
*   **Cột 18 (`currency_code`):** Không bắt buộc. Loại tiền tệ (Ví dụ: `USD`, `GBP`). Nếu để trống mặc định là `USD`.
*   **Cột 19 (`declared_value`):** Bắt buộc đối với hàng `APX`. Giá trị khai báo của hàng hóa tính theo USD (Ví dụ: `29`).
*   **Cột 20 (`insurance_amount`):** Không bắt buộc. Để trống.
*   **Cột 21 (`description`):** Bắt buộc đối với hàng `APX`. Mô tả chi tiết mặt hàng bằng **tiếng Anh** (Ví dụ: `Collectible Toy`, `Shoes`, `Swimwear`). Không viết chung chung kiểu "Gift" hay "Goods".
*   **Cột 22 (`hs_code` / `hts_code`):** Bắt buộc đối với loại hình thông quan Formal (01) và Informal (11). Mã HS 10 chữ số (Ví dụ: `9503000090`).
*   **Cột 23 - 27 (`fda_prior_notice`, `terms`, `packaging` (mặc định dùng `B` cho Box/Thùng), `service_type` (để trống hoặc `ST`), `collect_amount`):** Điền theo hướng dẫn của bộ phận nghiệp vụ hoặc để trống.

#### Nhóm 3: Thông tin người gửi - Shipper (Cột 28 - 39)
*   **Cột 32 (`shipper_name`):** Bắt buộc. Tên công ty/người gửi (Ví dụ: `Gsocpai`).
*   **Cột 33 (`shipper_address1`):** Bắt buộc. Địa chỉ người gửi dòng 1.
*   **Cột 34 (`shipper_address2`):** Không bắt buộc. Địa chỉ dòng 2.
*   **Cột 35 (`shipper_city`):** Bắt buộc. Thành phố người gửi (Ví dụ: `SHENZHEN`).
*   **Cột 36 (`shipper_state`):** Không bắt buộc. Bang/Tỉnh.
*   **Cột 37 (`shipper_zip`):** Không bắt buộc. Mã bưu điện người gửi.
*   **Cột 38 (`shipper_country`):** Bắt buộc. Mã quốc gia 2 ký tự của người gửi (Ví dụ: `CN` - Trung Quốc, `HK` - Hong Kong).
*   **Cột 39 (`shipper_phone`):** Không bắt buộc. SĐT người gửi.

#### Nhóm 4: Thông tin người nhận - Consignee (Cột 40 - 50)
*   **Cột 40 (`consignee_person`) & Cột 41 (`consignee_company`):** Bắt buộc phải điền ít nhất 1 trong 2 cột này (Tên người nhận hoặc tên công ty nhận).
*   **Cột 42 (`consignee_street_1`):** Bắt buộc. Số nhà, tên đường người nhận (Ví dụ: `2277 KGNAIQGTU TKAZWI MK`).
*   **Cột 43 (`consignee_street_2`):** Không bắt buộc. Căn hộ/Phòng/Dòng 2.
*   **Cột 44 (`consignee_city`):** Bắt buộc. Thành phố người nhận (Ví dụ: `MELBOURNE`, `CATONSVILLE`).
*   **Cột 45 (`consignee_state`):** Bắt buộc đối với vận chuyển tới Mỹ/Canada. Mã viết tắt của Bang nhận (Ví dụ: `FL`, `MD`, `NJ`).
*   **Cột 46 (`consignee_postal_code`):** Bắt buộc đối với vận chuyển tới Mỹ/Canada. Mã Zip/Postal code của người nhận (Ví dụ: `32904-8056`, `21228-5044`).
*   **Cột 47 (`consignee_country`):** Bắt buộc. Mã quốc gia 2 ký tự của người nhận (Ví dụ: `US`).
*   **Cột 48 - 50 (`consignee_phone`, `consignee_email`, `consignee_tax_id`):** Điền nếu có yêu cầu hải quan đặc biệt hoặc để trống.

#### Nhóm 5: Các thông tin bổ sung hải quan (Cột 51 - 54)
*   **Cột 51 (`comment` / `comments`):** Không bắt buộc.
*   **Cột 52 (`goods_coo` / `goods_country_of_origin`):** Bắt buộc khai báo. Mã quốc gia xuất xứ của hàng hóa (Ví dụ: `CN`).
*   **Cột 53 (`incoming_container` / `container_id`):** Không bắt buộc. Mã container/bao gom.
*   **Cột 54 (`mid`):** Mã định danh nhà sản xuất (Manufacturer ID), bắt buộc nếu hàng đi theo diện CFS T11 (Ví dụ: `CNOZR92MEL`).

---

## 4. Quy trình vận hành Live & Phản hồi hệ thống (Live Production Workflow)

Khi chạy chính thức (live production), việc gửi manifest và tiếp nhận phản hồi lỗi được thực hiện qua cơ chế không đồng bộ (Asynchronous):

### Bước 1: Gửi Manifest lên API Live
*   Gọi API `POST https://api.pactrak.com/manifests/upload` bằng định dạng **`multipart/form-data`** để tải trực tiếp file CSV/TXT lên hệ thống.
*   **Response nhận về từ API:** Trả về JSON chứa mã trạng thái (Ví dụ: `response_code: 0`, `is_error: false`). 
*   *Lưu ý:* Phản hồi JSON này **chỉ xác nhận việc tải file thành công lên cổng tiếp nhận**, chứ chưa phải là kết quả kiểm tra chất lượng manifest hay trạng thái thông quan thực tế.

### Bước 2: Nhận kết quả xử lý qua Email
*   Hệ thống Air AMS của IBC sẽ xử lý ngầm (background parsing) và gửi email phản hồi chính thức cho bạn **trong vòng 20 phút**.
*   **Địa chỉ nhận email:** Hệ thống sẽ gửi về các địa chỉ email được định nghĩa ở **các dòng `email` ở đầu file CSV/TXT** của bạn.
*   **Nếu có lỗi xảy ra:** Toàn bộ manifest bị từ chối (reject). Bạn sẽ nhận được email liệt kê chi tiết các dòng, các cột bị sai. Bạn cần sửa lại các lỗi này trên file gốc và gửi lại toàn bộ file.

> [!WARNING]
> Bạn bắt buộc phải nhận được email xác nhận xử lý thành công (**Success Email**) trước khi giao hàng cho hãng hàng không nhằm tránh các khoản phạt nặng từ Hải quan Mỹ (US CBP).

---

## 5. Các API tra cứu trạng thái tự động (Kênh hệ thống)

Sau khi manifest được gửi thành công, bạn có thể theo dõi và lấy trạng thái thông quan qua 3 API sau đã được cấu hình trong Bruno:

### A. Tra cứu sự kiện theo lô chặng hàng không (Air AMS Batch Events)
*   **Đường dẫn API:** `GET https://api.pactrak.com/batch/v1/events/aams`
*   **Mục đích:** Tải về hàng loạt các sự kiện trạng thái (Clearance, Held, v.v.) của tài khoản trong một khoảng thời gian cụ thể (tối đa 8 tiếng/lần gọi).
*   **Tham số truy vấn chính:**
    *   `start_dt`: Định dạng `YYYY-MM-DD HH:MM` (Bắt buộc).
    *   `end_dt`: Định dạng `YYYY-MM-DD HH:MM` (Bắt buộc).
    *   `key`: Key xác thực Base64 của tài khoản (Bắt buộc).
    *   `as` (Tùy chọn): Chọn định dạng đầu ra (`object` - JSON, `text` - Mảng, `csv` - Tải file CSV).

### B. Tra cứu sự kiện theo lô chặng giao hàng chặng cuối (Pactrak Final Mile Batch)
*   **Đường dẫn API:** `GET https://api.pactrak.com/batch/v1/events/pt`
*   **Mục đích:** Tải về hàng loạt sự kiện chặng cuối do đối tác giao hàng của IBC thực hiện.
*   **Tham số truy vấn:** Tương tự như API Air AMS Batch.

### C. Tra cứu hành trình đơn lẻ (Single Track History)
*   **Đường dẫn API:** `GET https://api.pactrak.com/ibctrack/v2/:track_number`
*   **Mục đích:** Tra cứu hành trình chi tiết của 1 mã vận đơn (HAWB) cụ thể.
*   **Tham số:**
    *   `:track_number` (Path param): Mã HAWB (ví dụ: `BD202656446`).
    *   `account` (Query param - Khuyên dùng): Mã tài khoản 4 chữ số của bạn.

---

## 6. Danh mục toàn bộ các dịch vụ API của IBC (REST Services Index)

Dưới đây là đặc tả chi tiết danh mục các API được cung cấp bởi hệ thống REST Services của IBC (Pactrak), phân loại theo mục đích sử dụng, thời điểm áp dụng và cách thức tích hợp:

### A. Nhóm dịch vụ bảo mật (Secured Services)
*Yêu cầu bắt buộc phải lấy Authority Token trước khi gọi.*

#### 1. Dịch vụ xác thực (Authority Service)
*   **Đường dẫn API:** `HEAD https://api.pactrak.com/authority/token`
*   **Mục đích sử dụng:** Cấp mã thông báo xác thực bảo mật (`Authority Token`) để truy cập các dịch vụ Secured khác.
*   **Sử dụng khi nào:** Phải gọi API này đầu tiên trong luồng xử lý tự động của hệ thống để lấy token trước khi thực hiện các yêu cầu in nhãn, cập nhật trạng thái đơn hàng hoặc cập nhật thông tin khách hàng Zipx.
*   **Cách sử dụng:**
    *   Tạo chuỗi credentials dạng `EMAIL|PASSWORD` (ngăn cách bởi dấu `|`) rồi mã hóa sang Base64.
    *   Gửi yêu cầu HTTP HEAD với header `IBCCredentials: [Chuỗi_Base64]`.
    *   Trích xuất token từ header `Authority` ở response trả về để đính kèm vào các request API Secured khác.

#### 2. Dịch vụ in nhãn vận chuyển (Label Service)
*   **Đường dẫn API:** `POST https://api.pactrak.com/shiplabel/docs`
*   **Mục đích sử dụng:** Tạo và xuất các nhãn dán vận chuyển (dưới dạng PDF/Zebra) cho các dịch vụ **SmartPost** hoặc **FedEx Ground**.
*   **Sử dụng khi nào:** Khi IBC đảm nhận vai trò là đối tác vận chuyển chặng cuối (Final Mile provider) của bạn tại Mỹ và hệ thống của bạn cần tự động tạo nhãn để dán lên gói hàng trước khi gửi đi.
*   **Cách sử dụng:** Gửi request chứa thông tin chi tiết người gửi, người nhận, trọng lượng đơn hàng và loại hình dịch vụ vận chuyển mong muốn kèm theo `Authority Token` đính kèm trong header.

#### 3. Dịch vụ cập nhật lô hàng (Shipment Update)
*   **Đường dẫn API:** `POST https://api.pactrak.com/shipment-update/record`
*   **Mục đích sử dụng:** Gửi thông tin cập nhật trạng thái đơn hàng (POD - Proof of Delivery, các ghi chú/comments, hoặc cập nhật mã phân bổ/disposition codes) lên hệ thống của IBC.
*   **Sử dụng khi nào:** Dùng khi bạn tự thực hiện một phần chặng giao hàng hoặc cần cập nhật thông tin xử lý (ví dụ: hàng bị giữ lại, giao hàng thành công,...) từ hệ thống của bạn sang hệ thống của đối tác IBC để đồng bộ trạng thái hai bên.
*   **Cách sử dụng:** Gửi kèm mã vận đơn và mã trạng thái tương ứng cùng với `Authority Token` xác thực.

#### 4. Quản lý địa chỉ khách hàng Zipx (Zipx Addresses)
*   **Đường dẫn API:** `POST https://api.pactrak.com/zipx/addresses`
*   **Mục đích sử dụng:** Đồng bộ và cập nhật cơ sở dữ liệu khách hàng thuộc các trạm Zipx của bạn lên hệ thống IBC.
*   **Sử dụng khi nào:** Chỉ áp dụng nếu bạn đang vận hành/sử dụng dịch vụ trạm nhận hàng Zipx của IBC và cần đăng ký thông tin khách hàng mới hoặc cập nhật thông tin khách hàng hiện tại để hệ thống của IBC nhận diện khi hàng về trạm.
*   **Cách sử dụng:** Gửi danh sách thông tin khách hàng (tên, mã số trạm, địa chỉ nhận hàng chặng cuối) kèm theo `Authority Token` trong header.

---

### B. Nhóm dịch vụ mở (Open Services)
*Không yêu cầu lấy Token bảo mật Secured, dùng cơ chế phân quyền thông thường.*

#### 5. Khai báo Manifest hàng không (Air AMS Manifest)
*   **Đường dẫn API:** `POST https://api.pactrak.com/manifests/upload`
*   **Mục đích sử dụng:** Gửi file dữ liệu manifest (CSV/TXT) của lô hàng gom lớn (MAWB) lên hệ thống tiếp nhận của IBC.
*   **Sử dụng khi nào:** Thực hiện ngay khi hoàn thành đóng gom lô hàng và chuẩn bị bàn giao hàng cho hãng bay đi Mỹ để IBC kịp thời truyền dữ liệu khai báo với Hải quan Mỹ (ACAS/Air AMS).
*   **Cách sử dụng:** Gửi file CSV (đã đặt tên theo quy định chứa tên email gán sẵn) bằng định dạng `multipart/form-data` qua key `data`.

#### 6. Tra cứu hành trình đơn lẻ (IBC Track)
*   **Đường dẫn API:** `GET https://api.pactrak.com/ibctrack/v2/:track_number`
*   **Mục đích sử dụng:** Lấy lịch sử hành trình, thông tin thông quan hải quan chi tiết của 1 mã vận đơn lẻ (HAWB).
*   **Sử dụng khi nào:** Khi khách hàng hoặc nhân viên hỗ trợ (Customer Service) cần kiểm tra trực tiếp trạng thái của một đơn hàng cụ thể trên giao diện website hoặc nội bộ.
*   **Cách sử dụng:** Thực hiện request GET truyền mã HAWB trực tiếp lên URL và kèm theo mã tài khoản 4 chữ số trong tham số `account`.

#### 7. Tra cứu hành trình theo lô (IBC Batch Track)
*   **Đường dẫn API:** `GET https://api.pactrak.com/batch/v1/events/aams` hoặc `/batch/v1/events/pt`
*   **Mục đích sử dụng:** Tải về hàng loạt toàn bộ các sự kiện thay đổi trạng thái vận đơn của tài khoản trong khoảng thời gian chỉ định (tối đa 8 tiếng/lần gọi).
*   **Sử dụng khi nào:** Dùng để chạy các job tự động (Cron job/Worker) đồng bộ trạng thái đơn hàng từ IBC về cơ sở dữ liệu của bạn định kỳ (ví dụ: mỗi 1-2 tiếng gọi 1 lần).
*   **Cách sử dụng:** Gửi request GET kèm theo `start_dt`, `end_dt` và mã `key` bảo mật của tài khoản để lấy dữ liệu dạng JSON hoặc CSV.

#### 8. Tra cứu vận đơn Zipx xuất khẩu (Zipx eTrack)
*   **Đường dẫn API:** `GET https://api.pactrak.com/ibcairbill/Zipx-eTrack-documentation.html`
*   **Mục đích sử dụng:** Tra cứu hành trình cho các lô hàng Zipx xuất khẩu (outbound).
*   **Sử dụng khi nào:** Dùng để theo dõi lộ trình của các đơn hàng xuất khẩu đi từ hệ thống trạm Zipx của bạn.
*   **Cách sử dụng:** Gọi API tra cứu dựa theo mã vận đơn của gói hàng xuất khẩu.

#### 9. Tra cứu đơn hàng Thương mại điện tử (MailPlus Track)
*   **Đường dẫn API:** `GET https://api.pactrak.com/mailplus/documentation.html`
*   **Mục đích sử dụng:** Tra cứu hành trình chuyên biệt dành riêng cho các lô hàng e-Commerce gửi qua dịch vụ MailPlus của IBC.
*   **Sử dụng khi nào:** Khi bạn sử dụng dịch vụ MailPlus của đối tác để gửi các đơn hàng thương mại điện tử nhỏ lẻ và cần cập nhật trạng thái giao hàng chặng cuối cho khách mua hàng trên website.
*   **Cách sử dụng:** Thực hiện API GET truyền mã tracking đơn hàng MailPlus.

#### 10. Gửi thông tin vận đơn Web (Web Airbill)
*   **Đường dẫn API:** `POST https://api.pactrak.com/ibcairbill/production`
*   **Mục đích sử dụng:** Truyền dữ liệu chi tiết của từng vận đơn đơn lẻ (Airwaybill data) lên hệ thống của IBC để lưu trữ và xử lý trước khi hàng đến.
*   **Sử dụng khi nào:** Sử dụng khi bạn muốn tạo trước thông tin vận đơn lẻ trên hệ thống của IBC trước khi xuất kho hoặc gom hàng lên MAWB.
*   **Cách sử dụng:** Gửi dữ liệu chi tiết của vận đơn dưới dạng JSON hoặc Form data theo đặc tả kỹ thuật của tài liệu.

#### 11. Liệt kê tài nguyên danh mục (IBC Resources)
*   **Đường dẫn API:** `GET https://api.pactrak.com/v1/res`
*   **Mục đích sử dụng:** Liệt kê các tài nguyên và danh mục chuẩn của IBC (Ví dụ: danh sách các mã sự kiện/disposition codes, mã sân bay, các trạm của IBC).
*   **Sử dụng khi nào:** Gọi khi bạn cần lấy hoặc đồng bộ danh sách mã trạng thái của IBC về hệ thống của mình để đối chiếu mã (mapping codes).
*   **Cách sử dụng:** Gọi GET lên các tài nguyên cụ thể (Ví dụ: `https://api.pactrak.com/v1/res/dispositioncodes?format=csv` để tải danh mục mã trạng thái).

#### 12. Tạo thông báo trước hàng về Zipx (Zipx Prealerts)
*   **Đường dẫn API:** `POST https://api.pactrak.com/v1/zipx-alerts.html`
*   **Mục đích sử dụng:** Đăng ký trước thông tin (pre-alert) cho gói hàng Zipx chuẩn bị gửi tới trạm nhận hàng.
*   **Sử dụng khi nào:** Dùng khi khách hàng của bạn đặt mua hàng online và khai báo thông tin gói hàng sắp được gửi tới địa chỉ kho Zipx của IBC để kho chuẩn bị tiếp nhận và phân loại nhanh chóng.
*   **Cách sử dụng:** Truyền thông tin mã tracking người bán cung cấp và mã khách hàng Zipx tương ứng lên API.


