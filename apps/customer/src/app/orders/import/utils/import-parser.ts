export interface ExcelRow {
  [key: string]: unknown;
}

export interface OrderImportError {
  line: number;
  columnName: string;
  enteredValue: string;
  errorReason: string;
}

export interface ParsedProduct {
  description: string;
  quantity: number;
  value: number;
  sku: string | null;
  hsCode: string | null;
  originCountry: string | null;
  weight: number | null;
}

export interface ParsedOrder {
  excelRowNumbers: number[];
  shippingMethod: "EXPRESS" | "EPACKET";
  shippingOrigin: string;
  sellerOrderId: string;
  packagingCode: string;
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  senderAddress: string | null;
  senderCity: string | null;
  senderZipCode: string | null;
  senderCountry: string | null;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string | null;
  receiverAddress1: string;
  receiverAddress2: string | null;
  receiverCity: string;
  receiverState: string;
  receiverCountry: string;
  receiverZipCode: string;
  detailDescription: string;
  declaredWeight: number;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  declaredValue: number;
  products: ParsedProduct[];
}

/**
 * Parses raw Excel rows into structured order and product models,
 * grouping items belonging to the same order based on duplicate Seller Order IDs.
 */
export function parseExcelRows(
  rawRows: ExcelRow[],
  _currentLocale: string,
  onSampleDataDetected?: () => void,
): ParsedOrder[] {
  const ordersMap = new Map<string, ParsedOrder>();
  let sampleDetected = false;

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: High complexity from validation and nested product grouping
  rawRows.forEach((row, idx) => {
    const lineNum = idx + 2; // Line 1 is the header row

    // Find column values regardless of case, spaces, or language variants
    const getVal = (vietnameseTitle: string, englishTitle: string): string => {
      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "");
        if (
          cleanKey === vietnameseTitle.toLowerCase().replace(/\s+/g, "") ||
          cleanKey === englishTitle.toLowerCase().replace(/\s+/g, "") ||
          key.includes(vietnameseTitle) ||
          key.includes(englishTitle)
        ) {
          return String(val).trim();
        }
      }
      return "";
    };

    // Skip entirely empty rows
    const allVals = Object.values(row)
      .map((v) => String(v).trim())
      .filter((v) => v !== "");
    if (allVals.length === 0) return;

    const sellerOrderId =
      getVal("Mã đơn Seller", "sellerOrderId") || `EXCEL-TEMP-${Date.now()}-${idx}`;

    // Automatically filter out placeholder sample rows
    if (sellerOrderId === "SO-2026-001" || sellerOrderId === "SO-2026-002") {
      sampleDetected = true;
      return;
    }

    // Read item details
    const itemName = getVal("Sản phẩm chi tiết", "itemName");
    const itemQtyVal = getVal("Số lượng", "itemQty");
    const itemPriceVal = getVal("Đơn giá", "itemPrice");
    const itemSku = getVal("SKU", "itemSku");
    const itemHsCode = getVal("Mã HS Code SP", "itemHsCode");
    const itemOrigin = getVal("Xuất xứ SP", "itemOrigin");

    const itemQty = itemQtyVal ? parseInt(itemQtyVal, 10) : 1;
    const itemPrice = itemPriceVal ? parseFloat(itemPriceVal) : 0;

    const product: ParsedProduct = {
      description: itemName || "Goods Item",
      quantity: Number.isNaN(itemQty) ? 1 : itemQty,
      value: Number.isNaN(itemPrice) ? 0 : itemPrice,
      sku: itemSku || null,
      hsCode: itemHsCode || null,
      originCountry: itemOrigin || "VN",
      weight: null,
    };

    // Group products under the same sellerOrderId
    const existingOrder = ordersMap.get(sellerOrderId);
    if (existingOrder) {
      existingOrder.excelRowNumbers.push(lineNum);
      existingOrder.products.push(product);
    } else {
      const receiverName = getVal("Họ tên người nhận", "receiverName");
      const receiverPhone = getVal("SĐT nhận", "receiverPhone");
      const receiverEmail = getVal("Email nhận", "receiverEmail");
      const receiverAddress1 = getVal("Địa chỉ nhận 1", "receiverAddress1");
      const receiverAddress2 = getVal("Địa chỉ nhận 2", "receiverAddress2");
      const receiverCity = getVal("Thành phố nhận", "receiverCity");
      const receiverState = getVal("Bang/Tỉnh nhận", "receiverState");
      const receiverCountry = getVal("Quốc gia nhận", "receiverCountry") || "US";
      const receiverZipCode = getVal("Zip người nhận", "receiverZipCode");

      const senderName = getVal("Tên người gửi", "senderName");
      const senderPhone = getVal("SĐT gửi", "senderPhone");
      const senderEmail = getVal("Email gửi", "senderEmail");
      const senderAddress = getVal("Địa chỉ gửi", "senderAddress");
      const senderCity = getVal("Thành phố gửi", "senderCity");
      const senderZipCode = getVal("Zip người gửi", "senderZipCode");
      const senderCountry = getVal("Quốc gia gửi", "senderCountry");

      const shippingMethodVal = getVal("Dịch vụ", "shippingMethod").toUpperCase();
      const shippingOrigin = getVal("Kho gửi", "shippingOrigin") || "HAN";
      const packagingCode = getVal("Loại đóng gói", "packagingCode") || "cardboard_box";
      const detailDescription =
        getVal("Mô tả hàng hóa", "detailDescription") || "Ecom Shipping Box";
      const weightVal = getVal("Trọng lượng", "declaredWeight");
      const lengthVal = getVal("Chiều dài", "dimensionLength");
      const widthVal = getVal("Chiều rộng", "dimensionWidth");
      const heightVal = getVal("Chiều cao", "dimensionHeight");
      const declaredValueVal = getVal("Trị giá hàng", "declaredValue");

      const declaredWeight = weightVal ? parseInt(weightVal, 10) : 500;
      const dimensionLength = lengthVal ? parseFloat(lengthVal) : null;
      const dimensionWidth = widthVal ? parseFloat(widthVal) : null;
      const dimensionHeight = heightVal ? parseFloat(heightVal) : null;
      const declaredValue = declaredValueVal ? parseFloat(declaredValueVal) : 10;

      const shippingMethod =
        shippingMethodVal === "EXPRESS" || shippingMethodVal === "EPACKET"
          ? shippingMethodVal
          : "EXPRESS";

      ordersMap.set(sellerOrderId, {
        excelRowNumbers: [lineNum],
        shippingMethod,
        shippingOrigin,
        sellerOrderId,
        packagingCode,
        senderName: senderName || null,
        senderPhone: senderPhone || null,
        senderEmail: senderEmail || null,
        senderAddress: senderAddress || null,
        senderCity: senderCity || null,
        senderZipCode: senderZipCode || null,
        senderCountry: senderCountry || null,
        receiverName,
        receiverPhone,
        receiverEmail: receiverEmail || null,
        receiverAddress1,
        receiverAddress2: receiverAddress2 || null,
        receiverCity,
        receiverState,
        receiverCountry,
        receiverZipCode,
        detailDescription,
        declaredWeight: Number.isNaN(declaredWeight) ? 500 : declaredWeight,
        dimensionLength:
          dimensionLength === null || Number.isNaN(dimensionLength) ? null : dimensionLength,
        dimensionWidth:
          dimensionWidth === null || Number.isNaN(dimensionWidth) ? null : dimensionWidth,
        dimensionHeight:
          dimensionHeight === null || Number.isNaN(dimensionHeight) ? null : dimensionHeight,
        declaredValue: Number.isNaN(declaredValue) ? 10 : declaredValue,
        products: [product],
      });
    }
  });

  if (sampleDetected && onSampleDataDetected) {
    onSampleDataDetected();
  }

  return Array.from(ordersMap.values());
}

/**
 * Builds and downloads an Excel file containing list of validation errors
 * on the client-side using SheetJS.
 */
export async function exportErrorsToExcel(
  errors: OrderImportError[],
  fileName: string,
  sessionId: string | null,
  _currentLocale: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const dataRows = errors.map((e) => ({
    "Dòng (Row)": e.line,
    "Cột lỗi (Column)": e.columnName,
    "Giá trị đã nhập (Value)": e.enteredValue,
    "Chi tiết lỗi (Reason)": e.errorReason,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Validation Errors");

  // Autofit column widths
  const maxColWidth = [{ wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 60 }];
  worksheet["!cols"] = maxColWidth;

  XLSX.writeFile(workbook, `Import_Errors_${fileName}_Session_${sessionId || Date.now()}.xlsx`);
}
