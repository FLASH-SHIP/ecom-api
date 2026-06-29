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
