const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ecom Express';
  workbook.lastModifiedBy = 'Ecom Express';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ----------------------------------------------------
  // SHEET 3: Reference Data (Danh mục tham chiếu)
  // ----------------------------------------------------
  const refSheet = workbook.addWorksheet('Reference Data');
  refSheet.state = 'hidden'; // Ẩn sheet này để tránh rối mắt người dùng

  // Cột A: Quốc gia
  refSheet.getColumn('A').values = ['CountryCode', 'US', 'GB', 'DE', 'CA', 'AU', 'VN', 'JP', 'KR'];
  // Cột B: Dịch vụ
  refSheet.getColumn('B').values = ['ServiceCode', 'EXPRESS', 'EPACKET'];

  // ----------------------------------------------------
  // SHEET 1: Import Template (Trang nhập liệu chính)
  // ----------------------------------------------------
  const templateSheet = workbook.addWorksheet('Import Template');
  templateSheet.views = [{ showGridLines: true }];

  // Định nghĩa các cột (32 cột khớp hoàn toàn với Single Order và DB)
  const headers = [
    // 1. Basic Info (Cột A - C)
    { header: 'Seller Order ID *\n(Mã đơn Seller)', key: 'sellerOrderId', width: 20 },
    { header: 'Shipping Method *\n(Dịch vụ)', key: 'shippingMethod', width: 18 },
    { header: 'Shipping Origin\n(Kho gửi)', key: 'shippingOrigin', width: 15 },

    // 2. Sender Info (Cột D - J)
    { header: 'Sender Name *\n(Tên người gửi)', key: 'senderName', width: 22 },
    { header: 'Sender Phone *\n(SĐT gửi)', key: 'senderPhone', width: 16 },
    { header: 'Sender Email\n(Email gửi)', key: 'senderEmail', width: 20 },
    { header: 'Sender Address *\n(Địa chỉ gửi)', key: 'senderAddress', width: 25 },
    { header: 'Sender City *\n(Thành phố gửi)', key: 'senderCity', width: 18 },
    { header: 'Sender Zip Code *\n(Zip người gửi)', key: 'senderZipCode', width: 16 },
    { header: 'Sender Country *\n(Quốc gia gửi)', key: 'senderCountry', width: 15 },

    // 3. Receiver Info (Cột K - S)
    { header: 'Receiver Name *\n(Họ tên người nhận)', key: 'receiverName', width: 22 },
    { header: 'Receiver Phone *\n(SĐT nhận)', key: 'receiverPhone', width: 16 },
    { header: 'Receiver Email\n(Email nhận)', key: 'receiverEmail', width: 20 },
    { header: 'Receiver Address 1 *\n(Địa chỉ nhận 1)', key: 'receiverAddress1', width: 25 },
    { header: 'Receiver Address 2\n(Địa chỉ nhận 2)', key: 'receiverAddress2', width: 20 },
    { header: 'Receiver City *\n(Thành phố nhận)', key: 'receiverCity', width: 16 },
    { header: 'Receiver State *\n(Bang/Tỉnh nhận)', key: 'receiverState', width: 15 },
    { header: 'Receiver Country *\n(Quốc gia nhận)', key: 'receiverCountry', width: 15 },
    { header: 'Receiver Zip Code *\n(Zip người nhận)', key: 'receiverZipCode', width: 16 },

    // 4. Package Info (Cột T - Z) - Packaging Code đã di chuyển về đây
    { header: 'Package Packaging Code\n(Loại đóng gói kiện hàng)', key: 'packagingCode', width: 22 },
    { header: 'Package Description *\n(Mô tả kiện hàng)', key: 'detailDescription', width: 24 },
    { header: 'Package Weight (g) *\n(Cân nặng kiện hàng)', key: 'declaredWeight', width: 18 },
    { header: 'Package Length (cm)\n(Dài kiện hàng)', key: 'dimensionLength', width: 16 },
    { header: 'Package Width (cm)\n(Rộng kiện hàng)', key: 'dimensionWidth', width: 16 },
    { header: 'Package Height (cm)\n(Cao kiện hàng)', key: 'dimensionHeight', width: 16 },
    { header: 'Package Declared Value (USD) *\n(Khai giá kiện hàng)', key: 'declaredValue', width: 22 },

    // 5. Product items (Cột AA - AF)
    { header: 'Item Name *\n(Sản phẩm chi tiết)', key: 'itemName', width: 22 },
    { header: 'Item Qty *\n(Số lượng)', key: 'itemQty', width: 12 },
    { header: 'Item Price *\n(Đơn giá)', key: 'itemPrice', width: 12 },
    { header: 'Item SKU\n(SKU)', key: 'itemSku', width: 15 },
    { header: 'Item HS Code *\n(Mã HS Code SP)', key: 'itemHsCode', width: 16 },
    { header: 'Item Origin *\n(Xuất xứ SP)', key: 'itemOrigin', width: 14 }
  ];

  templateSheet.columns = headers;

  // Định dạng dòng tiêu đề (Dòng 1)
  const headerRow = templateSheet.getRow(1);
  headerRow.height = 36;
  
  headerRow.eachCell((cell, colNumber) => {
    // Phân nhóm màu sắc cho tiêu đề
    let fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F798C' } // Mặc định: Xanh đậm Ecom (Basic & Receiver)
    };

    if (colNumber >= 4 && colNumber <= 10) {
      fill.fgColor.argb = 'FF4A6B82'; // Xám xanh Slate Blue cho thông tin người gửi (Sender)
    } else if (colNumber >= 20 && colNumber <= 26) {
      fill.fgColor.argb = 'FFD0721E'; // Cam cho kích thước & trọng lượng gói (Package Info)
    } else if (colNumber >= 27) {
      fill.fgColor.argb = 'FF2E8B57'; // Xanh lá cho thông tin mặt hàng chi tiết (Items)
    }

    cell.fill = fill;
    cell.font = {
      name: 'Segoe UI',
      family: 2,
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // Thêm dữ liệu mẫu thực tế
  const sampleData = [
    [
      'SO-2026-001', // A: Seller Order ID
      'EXPRESS',     // B: Shipping Method
      'HAN',         // C: Shipping Origin
      'Nguyen Van A', // D: Sender Name
      '0912345678',   // E: Sender Phone
      'sender@ecom.com', // F: Sender Email
      '123 Lang Ha',  // G: Sender Address
      'Hanoi',        // H: Sender City
      '100000',       // I: Sender Zip Code
      'VN',           // J: Sender Country
      'John Smith',   // K: Receiver Name
      '1234567890',   // L: Receiver Phone
      'john.smith@gmail.com', // M: Receiver Email
      '1600 Amphitheatre Pkwy', // N: Receiver Address 1
      'Suite 100',    // O: Receiver Address 2
      'Mountain View', // P: Receiver City
      'CA',           // Q: Receiver State
      'US',           // R: Receiver Country
      '94043',        // S: Receiver Zip Code
      'cardboard_box', // T: Packaging Code (Đã chuyển về đây)
      'Cotton T-Shirt & Phone Case', // U: Goods Description
      '650',          // V: Weight
      '20',           // W: Length
      '15',           // X: Width
      '5',            // Y: Height
      '25.00',        // Z: Value
      'Cotton Black T-Shirt', // AA: Item Name
      '1',            // AB: Item Qty
      '15.00',        // AC: Item Price
      'TSHIRT-BLK-M', // AD: Item SKU
      '6109.10',      // AE: Item HS Code
      'VN'            // AF: Item Origin
    ],
    [
      'SO-2026-001', // Dòng thứ 2 cùng mã đơn để gom sản phẩm chi tiết thứ 2
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Silicon Blue Phone Case', // AA: Item Name
      '2',                      // AB: Item Qty
      '5.00',                   // AC: Item Price
      'CASE-IPHONE-BLU',        // AD: Item SKU
      '3926.90',                // AE: Item HS Code
      'CN'                      // AF: Item Origin
    ],
    [
      'SO-2026-002', // Đơn hàng số 2
      'EPACKET',
      'HAN',
      'Nguyen Van A',
      '0912345678',
      'sender@ecom.com',
      '123 Lang Ha',
      'Hanoi',
      '100000',
      'VN',
      'Sarah Connor',
      '0987654321',
      'sarah.c@yahoo.com',
      '221B Baker St',
      '',
      'London',
      'England',
      'GB',
      'NW1 6XE',
      'cardboard_box',
      'Leather Backpack',
      '1200',
      '30',
      '25',
      '10',
      '45.00',
      'Brown Leather Backpack',
      '1',
      '45.00',
      'BP-LTHR-BRN',
      '4202.92',
      'CN'
    ]
  ];

  for (const rowData of sampleData) {
    templateSheet.addRow(rowData);
  }

  // Định dạng các dòng dữ liệu
  templateSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.height = 22;
    row.eachCell((cell) => {
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        color: { argb: 'FF333333' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        left: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        bottom: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        right: { style: 'thin', color: { argb: 'FFEAEAEA' } }
      };
    });
  });

  // Áp dụng Data Validation (Dropdowns) cho 100 dòng đầu tiên
  for (let i = 2; i <= 100; i++) {
    // Cột B: Shipping Method (EXPRESS, EPACKET)
    templateSheet.getCell(`B${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['\'Reference Data\'!$B$2:$B$3'],
      showErrorMessage: true,
      errorTitle: 'Dịch vụ không hợp lệ',
      error: 'Vui lòng chọn EXPRESS hoặc EPACKET từ danh sách.'
    };

    // Cột J: Sender Country (VN, US...)
    templateSheet.getCell(`J${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['\'Reference Data\'!$A$2:$A$9'],
      showErrorMessage: true,
      errorTitle: 'Quốc gia gửi không hợp lệ',
      error: 'Vui lòng chọn mã quốc gia gửi từ danh sách.'
    };

    // Cột R: Receiver Country (US, GB...)
    templateSheet.getCell(`R${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['\'Reference Data\'!$A$2:$A$9'],
      showErrorMessage: true,
      errorTitle: 'Quốc gia nhận không hợp lệ',
      error: 'Vui lòng chọn mã quốc gia nhận từ danh sách.'
    };
  }

  // ----------------------------------------------------
  // SHEET 2: Instructions (Hướng dẫn chi tiết)
  // ----------------------------------------------------
  const guideSheet = workbook.addWorksheet('Instructions');
  guideSheet.views = [{ showGridLines: true }];

  // Thêm tiêu đề trang hướng dẫn
  guideSheet.mergeCells('A1:E1');
  const titleCell = guideSheet.getCell('A1');
  titleCell.value = 'HƯỚNG DẪN ĐIỀN THÔNG TIN IMPORT ĐƠN HÀNG';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F798C' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  guideSheet.getRow(1).height = 40;

  // Tiêu đề cột hướng dẫn
  const guideHeaders = ['Tên cột', 'Tên tiếng Anh', 'Bắt buộc', 'Định dạng / Lựa chọn', 'Ý nghĩa & Lưu ý'];
  guideSheet.addRow(guideHeaders);
  const guideHeaderRow = guideSheet.getRow(2);
  guideHeaderRow.height = 26;
  guideHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F2F5' }
    };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F798C' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0C8CF' } },
      left: { style: 'thin', color: { argb: 'FFB0C8CF' } },
      bottom: { style: 'thin', color: { argb: 'FFB0C8CF' } },
      right: { style: 'thin', color: { argb: 'FFB0C8CF' } }
    };
  });

  const guideRows = [
    // Basic Info
    ['Seller Order ID', 'sellerOrderId', 'Có', 'Văn bản (Text)', 'Mã đơn hàng Seller. Dùng làm khóa để gom nhiều dòng sản phẩm vào cùng 1 đơn hàng.'],
    ['Shipping Method', 'shippingMethod', 'Có', 'EXPRESS hoặc EPACKET', 'Phương thức vận chuyển. Bắt buộc chọn từ dropdown.'],
    ['Shipping Origin', 'shippingOrigin', 'Không', 'Văn bản (Mặc định HAN)', 'Mã kho đi gửi hàng (Ví dụ: HAN, SGN). Mặc định là HAN.'],

    // Sender Info
    ['Sender Name', 'senderName', 'Có', 'Văn bản (Text)', 'Họ và tên người gửi hàng.'],
    ['Sender Phone', 'senderPhone', 'Có', 'Số điện thoại', 'SĐT liên lạc của người gửi hàng.'],
    ['Sender Email', 'senderEmail', 'Không', 'Email', 'Địa chỉ email người gửi (nếu có).'],
    ['Sender Address', 'senderAddress', 'Có', 'Văn bản (Text)', 'Địa chỉ chi tiết nơi gửi hàng đi.'],
    ['Sender City', 'senderCity', 'Có', 'Văn bản (Text)', 'Thành phố gửi đi.'],
    ['Sender Zip Code', 'senderZipCode', 'Có', 'Văn bản / Số', 'Mã bưu chính của nơi gửi đi.'],
    ['Sender Country', 'senderCountry', 'Có', 'Mã quốc gia ISO (Dropdown)', 'Mã quốc gia nơi gửi đi (Ví dụ: VN). Chọn từ dropdown.'],

    // Receiver Info
    ['Receiver Name', 'receiverName', 'Có', 'Văn bản (Text)', 'Họ và tên đầy đủ người nhận.'],
    ['Receiver Phone', 'receiverPhone', 'Có', 'Số điện thoại', 'SĐT người nhận hàng.'],
    ['Receiver Email', 'receiverEmail', 'Không', 'Email', 'Địa chỉ email người nhận.'],
    ['Receiver Address 1', 'receiverAddress1', 'Có', 'Văn bản (Text)', 'Địa chỉ chi tiết người nhận hàng.'],
    ['Receiver Address 2', 'receiverAddress2', 'Không', 'Văn bản (Text)', 'Địa chỉ bổ sung của người nhận (nếu có).'],
    ['Receiver City', 'receiverCity', 'Có', 'Văn bản (Text)', 'Thành phố nhận hàng.'],
    ['Receiver State', 'receiverState', 'Có', 'Văn bản (Text)', 'Tỉnh hoặc Bang nhận hàng (Mỹ điền mã 2 chữ cái như CA, NY).'],
    ['Receiver Country', 'receiverCountry', 'Có', 'Mã quốc gia ISO (Dropdown)', 'Mã quốc gia nhận hàng (Ví dụ: US, GB). Chọn từ dropdown.'],
    ['Receiver Zip Code', 'receiverZipCode', 'Có', 'Văn bản / Số', 'Mã bưu chính của người nhận.'],

    // Package Info
    ['Package Packaging Code', 'packagingCode', 'Không', 'Văn bản (Mặc định: cardboard_box)', 'Mã loại đóng gói của kiện hàng (Ví dụ: cardboard_box).'],
    ['Package Description', 'detailDescription', 'Có', 'Tiếng Anh (Text)', 'Mô tả chung của cả kiện hàng bằng tiếng Anh để làm thủ tục hải quan.'],
    ['Package Weight (g)', 'declaredWeight', 'Có', 'Số nguyên (> 0)', 'Cân nặng của kiện hàng, đơn vị tính bằng GRAM (Ví dụ: 1200).'],
    ['Package Length', 'dimensionLength', 'Không', 'Số dương', 'Chiều dài kiện hàng bằng cm.'],
    ['Package Width', 'dimensionWidth', 'Không', 'Số dương', 'Chiều rộng kiện hàng bằng cm.'],
    ['Package Height', 'dimensionHeight', 'Không', 'Số dương', 'Chiều cao kiện hàng bằng cm.'],
    ['Package Declared Value', 'declaredValue', 'Có', 'Số thập phân (> 0)', 'Tổng giá trị khai báo hải quan của cả kiện hàng bằng USD.'],

    // Product items
    ['Item Name', 'itemName', 'Có', 'Văn bản (Text)', 'Tên chi tiết của từng mặt hàng bên trong hộp.'],
    ['Item Qty', 'itemQty', 'Có', 'Số nguyên (>= 1)', 'Số lượng của mặt hàng tương ứng.'],
    ['Item Price', 'itemPrice', 'Có', 'Số thập phân', 'Đơn giá của từng mặt hàng bằng USD.'],
    ['Item SKU', 'itemSku', 'Không', 'Văn bản (Text)', 'Mã SKU quản lý kho của mặt hàng.'],
    ['Item HS Code', 'itemHsCode', 'Có', 'Văn bản (Text)', 'Mã phân loại hải quan của sản phẩm (Bắt buộc chặng cuối).'],
    ['Item Origin', 'itemOrigin', 'Có', 'Mã quốc gia ISO (2 ký tự)', 'Quốc gia sản xuất sản phẩm (Ví dụ: VN, CN).']
  ];

  for (const rowData of guideRows) {
    guideSheet.addRow(rowData);
  }

  // Định dạng các dòng hướng dẫn
  guideSheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    
    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 9.5 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 3 ? 'center' : 'left',
        wrapText: true
      };
      
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        left: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        bottom: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        right: { style: 'thin', color: { argb: 'FFEAEAEA' } }
      };

      if (colNumber === 3 && cell.value === 'Có') {
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFF0000' } };
      }
    });
  });

  // Thiết lập độ rộng cột cho sheet hướng dẫn
  guideSheet.getColumn(1).width = 24;
  guideSheet.getColumn(2).width = 24;
  guideSheet.getColumn(3).width = 12;
  guideSheet.getColumn(4).width = 22;
  guideSheet.getColumn(5).width = 65;

  // Ghi tệp tin xuất ra
  const destDir = path.join(__dirname, '..', 'public', 'templates');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const destFile = path.join(destDir, 'standard_template.xlsx');
  await workbook.xlsx.writeFile(destFile);
  console.log(`Successfully generated optimal template at: ${destFile}`);
}

main().catch((err) => {
  console.error('Error generating template:', err);
  process.exit(1);
});
