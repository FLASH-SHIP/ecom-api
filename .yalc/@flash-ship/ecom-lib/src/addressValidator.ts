export interface PostalCodeRule {
  regex: RegExp;
  description: string;
  example: string;
}

export const COUNTRY_POSTAL_CODE_RULES: Record<string, PostalCodeRule> = {
  // 5.1 Hoa Kỳ (US)
  US: {
    regex: /^\d{5}(-\d{4})?$/,
    description: "Đúng 5 chữ số (VD: 98665) hoặc ZIP+4 (VD: 99665-7842)",
    example: "98665",
  },
  // 5.2 Nhật Bản (JP)
  JP: {
    regex: /^\d{3}-\d{4}$/,
    description: "7 chữ số dạng 100-0001",
    example: "100-0001",
  },
  // 5.3 Trung Quốc (CN)
  CN: {
    regex: /^\d{6}$/,
    description: "6 chữ số",
    example: "100000",
  },
  // 5.4 Singapore (SG) & Đài Loan (TW)
  SG: {
    regex: /^\d{6}$/,
    description: "6 chữ số",
    example: "018989",
  },
  TW: {
    regex: /^\d{6}$/,
    description: "6 chữ số",
    example: "100001",
  },
  // 5.5 Vương Quốc Anh (GB/UK)
  GB: {
    regex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    description: "Mã bưu chính Anh (VD: SW1A 1AA)",
    example: "SW1A 1AA",
  },
  UK: {
    regex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    description: "Mã bưu chính Anh (VD: SW1A 1AA)",
    example: "SW1A 1AA",
  },
  // 5.5 Pháp (FR), Đức (DE), Ý (IT), Tây Ban Nha (ES)
  FR: { regex: /^\d{5}$/, description: "5 chữ số liên tục", example: "75001" },
  DE: { regex: /^\d{5}$/, description: "5 chữ số liên tục", example: "10117" },
  IT: { regex: /^\d{5}$/, description: "5 chữ số liên tục", example: "00100" },
  ES: { regex: /^\d{5}$/, description: "5 chữ số liên tục", example: "28001" },
  PT: { regex: /^\d{4}-\d{3}$/, description: "Dạng 1000-001", example: "1000-001" },
  NL: { regex: /^\d{4}\s?[A-Z]{2}$/i, description: "Dạng 1012 AB", example: "1012 AB" },
  // 5.7 Nam Mỹ (Brazil, Argentina, Colombia, Ecuador)
  BR: { regex: /^\d{5}-\d{3}$/, description: "Dạng 22290-040", example: "22290-040" },
  AR: {
    regex: /^[A-Z]\d{4}[A-Z]{3}$/i,
    description: "8 ký tự chữ và số (VD: C1064AAM)",
    example: "C1064AAM",
  },
  CO: { regex: /^\d{6}$/, description: "6 chữ số", example: "110111" },
  EC: { regex: /^\d{6}$/, description: "6 chữ số", example: "170150" },
  // 5.8 Châu Á (Ấn Độ, Campuchia, Hàn Quốc, Việt Nam)
  IN: { regex: /^\d{6}$/, description: "6 chữ số", example: "282001" },
  KH: { regex: /^\d{6}$/, description: "6 chữ số", example: "120000" },
  KR: { regex: /^\d{5}$/, description: "5 chữ số", example: "06164" },
  VN: { regex: /^\d{5}$/, description: "5 chữ số", example: "70000" },
  // 5.9 Châu Phi (Nam Phi, Ai Cập, Algeria, Nigeria, Malawi, Tunisia)
  ZA: { regex: /^\d{4}$/, description: "4 chữ số", example: "8001" },
  TN: { regex: /^\d{4}$/, description: "4 chữ số", example: "1000" },
  EG: { regex: /^\d{5}$/, description: "5 chữ số", example: "12561" },
  DZ: { regex: /^\d{5}$/, description: "5 chữ số", example: "16000" },
  NG: { regex: /^\d{6}$/, description: "6 chữ số", example: "900001" },
  MW: { regex: /^\d{6}$/, description: "6 chữ số", example: "312100" },
  // 5.10 Châu Đại Dương (Úc, New Zealand, Papua New Guinea)
  AU: { regex: /^\d{4}$/, description: "4 chữ số", example: "2000" },
  NZ: { regex: /^\d{4}$/, description: "4 chữ số", example: "6011" },
  PG: { regex: /^\d{3}$/, description: "3 chữ số", example: "111" },
};

/**
 * Validate postal code / zip code dynamically according to country code.
 */
export function validatePostalCode(countryCode: string, zipCode: string): boolean {
  if (!zipCode || zipCode.trim() === "") return false;
  const cleanCountry = (countryCode || "").toUpperCase().trim();
  const rule = COUNTRY_POSTAL_CODE_RULES[cleanCountry];

  if (rule) {
    return rule.regex.test(zipCode.trim());
  }

  // Default fallback for unconfigured countries: 2 to 20 alphanumeric chars, spaces, or hyphens
  return /^[A-Za-z0-9\s-]{2,20}$/.test(zipCode.trim());
}

/**
 * Get human-readable format requirement description or example for a country's postal code.
 */
export function getPostalCodeRuleInfo(countryCode: string): PostalCodeRule | null {
  const cleanCountry = (countryCode || "").toUpperCase().trim();
  return COUNTRY_POSTAL_CODE_RULES[cleanCountry] || null;
}

/**
 * Validate State format according to Country.
 * US: Exactly 2 uppercase letters (e.g. CA, NY, WA)
 * Other countries: Max 50 characters
 */
export function validateReceiverState(
  countryCode: string,
  state: string,
): { valid: boolean; message?: string } {
  if (!state || state.trim() === "") {
    return { valid: false, message: "Vui lòng nhập/chọn State" };
  }
  const cleanCountry = (countryCode || "").toUpperCase().trim();
  const cleanState = state.trim();

  if (cleanCountry === "US") {
    if (!/^[A-Z]{2}$/.test(cleanState)) {
      return {
        valid: false,
        message: "Nếu quốc gia là Hoa Kỳ (US), State phải là mã 2 ký tự viết hoa (VD: CA, WA, NY)",
      };
    }
  } else {
    if (cleanState.length > 50) {
      return { valid: false, message: "State không được vượt quá 50 ký tự" };
    }
  }
  return { valid: true };
}

/**
 * Validate Receiver Name: Required, max 100 chars, no special characters.
 * Allows letters, numbers, spaces, Vietnamese/accented characters, hyphens, apostrophes, dots.
 */
export function validateReceiverName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim() === "") {
    return { valid: false, message: "Vui lòng nhập tên người nhận" };
  }
  const cleanName = name.trim();
  if (cleanName.length > 100) {
    return { valid: false, message: "Tên người nhận không được vượt quá 100 ký tự" };
  }
  // Regex allowing alphanumeric, accented characters, spaces, '.', '-', '\''
  const validPattern = /^[a-zA-Z0-9\s\u00C0-\u024F\u1EA0-\u1EF9'.-]+$/;
  if (!validPattern.test(cleanName)) {
    return { valid: false, message: "Tên người nhận không được chứa ký tự đặc biệt" };
  }
  return { valid: true };
}

/**
 * Validate Receiver Phone: Optional, max 15 chars.
 */
export function validateReceiverPhone(phone?: string | null): { valid: boolean; message?: string } {
  if (!phone || phone.trim() === "") {
    return { valid: true };
  }
  const cleanPhone = phone.trim();
  if (cleanPhone.length > 15) {
    return { valid: false, message: "Số điện thoại không được vượt quá 15 ký tự" };
  }
  return { valid: true };
}

/**
 * Validate Receiver Email: Optional, valid email format.
 */
export function validateReceiverEmail(email?: string | null): { valid: boolean; message?: string } {
  if (!email || email.trim() === "") {
    return { valid: true };
  }
  const cleanEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, message: "Email không đúng định dạng chuẩn (VD: example@domain.com)" };
  }
  return { valid: true };
}
