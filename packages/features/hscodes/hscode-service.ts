import fs from "fs";

export interface HSCodeItem {
  code: string;
  description: string;
  generalRate: string;
}

export interface ChapterTree {
  code: string;
  description: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  flag: string;
}

export interface TransportMode {
  id: number;
  code: string;
  name: string;
}

// Configurable External Backend API Base URL using Environment Variable
const BASE_EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || "https://dev-api.ecomexpress.vn/api/v1";

const countriesList: Country[] = [
  { id: 1, name: "Vietnam", code: "VN", flag: `${BASE_EXTERNAL_API_URL.replace("/api/v1", "")}/public/flags/vn.svg` },
  { id: 2, name: "China", code: "CN", flag: `${BASE_EXTERNAL_API_URL.replace("/api/v1", "")}/public/flags/cn.svg` },
  { id: 3, name: "United States", code: "US", flag: `${BASE_EXTERNAL_API_URL.replace("/api/v1", "")}/public/flags/us.svg` }
];

const transportModesList: TransportMode[] = [
  { id: 1, code: "ocean", name: "Ocean" },
  { id: 2, code: "air", name: "Air" },
  { id: 3, code: "rail", name: "Rail" },
  { id: 4, code: "truck", name: "Truck" }
];

// All 97 standard HS Code chapters (names matches standard naming, code prefix matches list)
const standardChaptersMap: Record<string, string> = {
  "01": "Live animals",
  "02": "Meat and edible meat offal",
  "03": "Fish and crustaceans, molluscs and other aquatic invertebrates",
  "04": "Dairy produce; birds' eggs; natural honey; edible products of origin",
  "05": "Products of animal origin, not elsewhere specified or included",
  "06": "Live trees and other plants; bulbs, roots; cut flowers",
  "07": "Edible vegetables and certain roots and tubers",
  "08": "Edible fruit and nuts; peel of citrus fruit or melons",
  "09": "Coffee, tea, maté and spices",
  "10": "Cereals",
  "11": "Products of the milling industry; malt; starches; gluten",
  "12": "Oil seeds and oleaginous fruits; miscellaneous grains",
  "13": "Lac; gums, resins and other vegetable saps and extracts",
  "14": "Vegetable plaiting materials; vegetable products",
  "15": "Animal or vegetable fats and oils and their cleavage products",
  "16": "Preparations of meat, of fish or of crustaceans",
  "17": "Sugars and sugar confectionery",
  "18": "Cocoa and cocoa preparations",
  "19": "Preparations of cereals, flour, starch or milk",
  "20": "Preparations of vegetables, fruit, nuts or other parts of plants",
  "21": "Miscellaneous edible preparations",
  "22": "Beverages, spirits and vinegar",
  "23": "Residues and waste from the food industries; animal fodder",
  "24": "Tobacco and manufactured tobacco substitutes",
  "25": "Salt; sulphur; earths and stone; plastering materials",
  "26": "Ores, slag and ash",
  "27": "Mineral fuels, mineral oils and products of their distillation",
  "28": "Inorganic chemicals; compounds of precious metals",
  "29": "Organic chemicals",
  "30": "Pharmaceutical products",
  "31": "Fertilizers",
  "32": "Tanning or dyeing extracts; tannins; dyes, pigments",
  "33": "Essential oils and resinoids; perfumery, cosmetic",
  "34": "Soap, organic surface-active agents, washing preparations",
  "35": "Albuminoidal substances; modified starches; glues; enzymes",
  "36": "Explosives; pyrotechnic products; matches; pyrophoric alloys",
  "37": "Photographic or cinematographic goods",
  "38": "Miscellaneous chemical products",
  "39": "Plastics and articles thereof",
  "40": "Rubber and articles thereof",
  "41": "Raw hides and skins and leather",
  "42": "Articles of leather; saddlery and harness; travel goods",
  "43": "Furskins and artificial fur; manufactures thereof",
  "44": "Wood and articles of wood; wood charcoal",
  "45": "Cork and articles of cork",
  "46": "Manufactures of straw, of esparto or of other plaiting materials",
  "47": "Pulp of wood or of other fibrous cellulosic material",
  "48": "Paper and paperboard; articles of paper pulp",
  "49": "Printed books, newspapers, pictures and other products",
  "50": "Silk",
  "51": "Wool, fine or coarse animal hair; horsehair yarn",
  "52": "Cotton",
  "53": "Other vegetable textile fibres; paper yarn",
  "54": "Man-made filaments; strip and the like",
  "55": "Man-made staple fibres",
  "56": "Wadding, felt and nonwovens; special yarns; twine",
  "57": "Carpets and other textile floor coverings",
  "58": "Special woven fabrics; tufted textile fabrics; lace",
  "59": "Impregnated, coated, covered or laminated textile fabrics",
  "60": "Knitted or crocheted fabrics",
  "61": "Articles of apparel and clothing accessories, knitted",
  "62": "Articles of apparel and clothing accessories, not knitted",
  "63": "Other made up textile articles; sets; worn clothing",
  "64": "Footwear, gaiters and the like; parts of such articles",
  "65": "Headgear and parts thereof",
  "66": "Umbrellas, sun umbrellas, walking-sticks, seat-sticks",
  "67": "Prepared feathers and down and articles made thereof",
  "68": "Articles of stone, plaster, cement, asbestos, mica",
  "69": "Ceramic products",
  "70": "Glass and glassware",
  "71": "Natural or cultured pearls, precious or semi-precious stones",
  "72": "Iron and steel",
  "73": "Articles of iron or steel",
  "74": "Copper and articles thereof",
  "75": "Nickel and articles thereof",
  "76": "Aluminum and articles thereof",
  "77": "Reserved for future use",
  "78": "Lead and articles thereof",
  "79": "Zinc and articles thereof",
  "80": "Tin and articles thereof",
  "81": "Other base metals; cermets; articles thereof",
  "82": "Tools, implements, cutlery, spoons and forks, of base metal",
  "83": "Miscellaneous articles of base metal",
  "84": "Nuclear reactors, boilers, machinery; parts thereof",
  "85": "Electrical machinery and equipment and parts thereof",
  "86": "Railway or tramway locomotives, rolling-stock; parts thereof",
  "87": "Vehicles other than railway or tramway rolling-stock",
  "88": "Aircraft, spacecraft, and parts thereof",
  "89": "Ships, boats and floating structures",
  "90": "Optical, photographic, cinematographic, medical instruments",
  "91": "Clocks and watches and parts thereof",
  "92": "Musical instruments; parts and accessories thereof",
  "93": "Arms and ammunition; parts and accessories thereof",
  "94": "Furniture; bedding, mattresses, cushions",
  "95": "Toys, games and sports requisites; parts thereof",
  "96": "Miscellaneous manufactured articles",
  "97": "Works of art, collectors' pieces and antiques"
};

// Generate flat Chapter list from standard chapters map (using "01 Live animals" style)
const chaptersTree: ChapterTree[] = Object.keys(standardChaptersMap).sort().map(code => ({
  code,
  description: `${code} ${standardChaptersMap[code]}`
}));

// Load Chapter 02 dynamic details from local file
let fileDetail: any = null;
try {
  if (fs.existsSync("D:/hscode_detail.txt")) {
    const raw = fs.readFileSync("D:/hscode_detail.txt", "utf-8");
    fileDetail = JSON.parse(raw).data;
  }
} catch (e) {
  console.error("Error reading D:/hscode_detail.txt:", e);
}

// Chapter 01 Legal Notes
const chapter01NotesHtml = `
<div class="note_section">
  <div class="note_title font-bold underline mb-2">Note</div>
  <div class="note_content text-[14px] leading-relaxed mb-4">
    1. This chapter covers all live animals except:<br/>
    (a) Fish and crustaceans, molluscs and other aquatic invertebrates, of heading 0301, 0306, 0307 or 0308;<br/>
    (b) Cultures of micro-organisms and other products of heading 3002; and<br/>
    (c) Animals of heading 9508.
  </div>
  <div class="note_title font-bold underline mb-2">Additional U.S. Notes</div>
  <div class="note_content text-[14px] leading-relaxed">
    1. The expression "purebred breeding animals" covers only animals certified to the U.S. Customs Service by the Department of Agriculture as being purebred of a recognized breed and duly registered in a book of record recognized by the Secretary of Agriculture for that breed, imported specially for breeding purposes, whether intended to be used by the importer himself or for sale for such purposes. The animal certificate of pure breeding is an obsolete form and can no longer be obtained from the U.S. Department of Agriculture. Consult U.S. Customs for additional information.<br/><br/>
    2. Certain special provisions applying to live animals are in chapter 98.
  </div>
</div>
`;

interface RateDetail {
  code: string;
  description: string;
  chapterCode: string;
  headingCode: string;
  unit: string;
  generalRate: string | null;
  specialRate: string | null;
}

const customRatesList: RateDetail[] = [
  // Chapter 01 (Live Animals)
  { code: "0101.21.00", description: "Purebred breeding animals", chapterCode: "01", headingCode: "0101", unit: "", generalRate: "Free", specialRate: null },
  { code: "0101.21.00.10", description: "Males", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "", specialRate: null },
  { code: "0101.21.00.20", description: "Females", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "", specialRate: null },
  { code: "0101.29.00", description: "Other", chapterCode: "01", headingCode: "0101", unit: "", generalRate: "Free", specialRate: null },
  { code: "0101.29.00.10", description: "Imported for immediate slaughter", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "", specialRate: null },
  { code: "0101.29.00.90", description: "Other", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "", specialRate: null },
  { code: "0101.30.00.00", description: "Asses", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "6.8%", specialRate: "Free (A+,AU,BH, CL, CO,D,E,IL, JO,KR, MA, OM,P,PA, PE,SG)" },
  { code: "0101.90", description: "Other", chapterCode: "01", headingCode: "0101", unit: "", generalRate: "", specialRate: null },
  { code: "0101.90.30.00", description: "Imported for immediate slaughter", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "Free", specialRate: null },
  { code: "0101.90.40.00", description: "Other", chapterCode: "01", headingCode: "0101", unit: "No.", generalRate: "4.5%", specialRate: "Free (A+,AU,BH, CL, CO,D,E,IL, JO,KR, MA, OM,P,PA, PE,SG)" }
];

// Chapter 01 Hierarchy Trees
const chapter01Hierarchy = [
  {
    code: "0101",
    description: "Live horses, asses, mules and hinnies",
    children: [
      {
        code: "0101.21.00",
        description: "Purebred breeding animals",
        generalRate: "Free",
        specialRate: null,
        unit: "",
        children: [
          { code: "0101.21.00.10", description: "Males", generalRate: "", specialRate: null, unit: "No.", children: [] },
          { code: "0101.21.00.20", description: "Females", generalRate: "", specialRate: null, unit: "No.", children: [] }
        ]
      },
      {
        code: "0101.29.00",
        description: "Other",
        generalRate: "Free",
        specialRate: null,
        unit: "",
        children: [
          { code: "0101.29.00.10", description: "Imported for immediate slaughter", generalRate: "", specialRate: null, unit: "No.", children: [] },
          { code: "0101.29.00.90", description: "Other", generalRate: "", specialRate: null, unit: "No.", children: [] }
        ]
      },
      {
        code: "0101.30.00.00",
        description: "Asses",
        generalRate: "6.8%",
        specialRate: "Free (A+,AU,BH, CL, CO,D,E,IL, JO,KR, MA, OM,P,PA, PE,S,SG)",
        unit: "No.",
        children: []
      },
      {
        code: "0101.90",
        description: "Other",
        generalRate: "",
        specialRate: null,
        unit: "",
        children: [
          { code: "0101.90.30.00", description: "Imported for immediate slaughter", generalRate: "Free", specialRate: null, unit: "No.", children: [] },
          { code: "0101.90.40.00", description: "Other", generalRate: "4.5%", specialRate: "Free (A+,AU,BH, CL, CO,D,E,IL, JO,KR, MA, OM,P,PA, PE,S,SG)", unit: "No.", children: [] }
        ]
      }
    ]
  },
  { code: "0102", description: "Live bovine animals", children: [] },
  { code: "0103", description: "Live swine", children: [] },
  { code: "0104", description: "Live sheep and goats", children: [] },
  { code: "0105", description: "Live poultry of the following kinds: Chickens, ducks, geese, turkeys and guineas", children: [] },
  { code: "0106", description: "Other live animals", children: [] }
];

export async function getTree(): Promise<ChapterTree[]> {
  try {
    const res = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/tree`);
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((chap: any) => ({
          code: chap.code,
          description: chap.description.startsWith(chap.code)
            ? chap.description
            : `${chap.code} ${chap.description}`
        }));
      }
    }
  } catch (e) {
    console.error("Failed to fetch tree from dev API, using local fallback", e);
  }
  return chaptersTree;
}

export async function getDetail(code: string) {
  const cleanedCode = code.replace(/\./g, "").trim();
  const chapterCode = cleanedCode.substring(0, 2);
  const headingCodePrefix = cleanedCode.substring(0, 4);

  // Try calling the live Dev API
  try {
    const res = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/detail?code=${cleanedCode}`);
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && json.data) {
        if (!json.data.chapter.notesHtml && cleanedCode.length > 2) {
          try {
            const chapRes = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/detail?code=${chapterCode}`);
            if (chapRes.ok) {
              const chapJson = await chapRes.json() as any;
              if (chapJson.success && chapJson.data?.chapter?.notesHtml) {
                json.data.chapter.notesHtml = chapJson.data.chapter.notesHtml;
              }
            }
          } catch (err) {
            console.error("Failed to fetch parent chapter notesHtml", err);
          }
        }
        if (!json.data.chapter.notesHtml) {
          if (chapterCode === "01") {
            json.data.chapter.notesHtml = chapter01NotesHtml;
          } else if (chapterCode === "02" && fileDetail) {
            json.data.chapter.notesHtml = fileDetail.chapter.notesHtml;
          }
        }
        return json.data;
      }
    }
  } catch (e) {
    console.error(`Failed to fetch detail for ${code} from dev API, using local fallback`, e);
  }

  // --- LOCAL FALLBACK ROUTE ---
  // --- CHAPTER 02 ROUTE (loads dynamically from local file) ---
  if (chapterCode === "02" && fileDetail) {
    if (cleanedCode.length === 2) {
      return fileDetail;
    }
    const headingDetail = fileDetail.rates.find((r: any) => r.code.replace(/\./g, "") === cleanedCode) || null;
    const findSubtree = (nodes: any[]): any[] => {
      for (const n of nodes) {
        if (n.code.replace(/\./g, "") === cleanedCode) {
          return n.children || [];
        }
        if (n.children && n.children.length > 0) {
          const res = findSubtree(n.children);
          if (res.length > 0 || nodesHasCode(n.children, cleanedCode)) {
            return res;
          }
        }
      }
      return [];
    };
    const nodesHasCode = (nodes: any[], target: string): boolean => {
      return nodes.some(n => n.code.replace(/\./g, "") === target || (n.children && nodesHasCode(n.children, target)));
    };
    const children = findSubtree(fileDetail.children || []);
    const rates = headingDetail 
      ? [headingDetail] 
      : fileDetail.rates.filter((r: any) => r.code.replace(/\./g, "").startsWith(cleanedCode));
    const headingMeta = fileDetail.children.find((h: any) => h.code === headingCodePrefix);
    
    return {
      chapter: {
        code: "02",
        name: fileDetail.chapter.name,
        notesHtml: fileDetail.chapter.notesHtml
      },
      heading: headingCodePrefix.length === 4 ? { code: headingCodePrefix, name: headingMeta ? headingMeta.description : `Heading ${headingCodePrefix}` } : null,
      selectedRate: headingDetail,
      rates,
      children
    };
  }

  // --- DEFAULT CHAPTER 01 ROUTE ---
  const chapterName = standardChaptersMap[chapterCode] || `Chapter ${chapterCode}`;
  const chapterNotes = chapterCode === "01" ? chapter01NotesHtml : `<h3>Chapter ${chapterCode} Legal Notes:</h3><p>Import guidelines and legal notes for ${chapterName}.</p>`;

  const chapter = {
    code: chapterCode,
    name: chapterName,
    notesHtml: chapterNotes
  };

  const headingMeta = chapter01Hierarchy.find(h => h.code === headingCodePrefix);
  const heading = headingCodePrefix.length === 4 ? { code: headingCodePrefix, name: headingMeta ? headingMeta.description : `Heading ${headingCodePrefix}` } : null;

  let selectedRate = customRatesList.find(r => r.code.replace(/\./g, "") === cleanedCode) || null;
  if (!selectedRate && cleanedCode.length === 10) {
    selectedRate = {
      code: code,
      description: `Import commodity details ${code}`,
      chapterCode: chapterCode,
      headingCode: headingCodePrefix,
      unit: "No.",
      generalRate: "Free",
      specialRate: null
    };
  }

  let children: any[] = [];
  if (chapterCode === "01") {
    if (cleanedCode.length === 2) {
      children = chapter01Hierarchy;
    } else {
      const findSubtree = (nodes: any[]): any[] => {
        for (const n of nodes) {
          if (n.code.replace(/\./g, "") === cleanedCode) {
            return n.children || [];
          }
          if (n.children && n.children.length > 0) {
            const res = findSubtree(n.children);
            if (res.length > 0 || nodesHasCode(n.children, cleanedCode)) {
              return res;
            }
          }
        }
        return [];
      };
      const nodesHasCode = (nodes: any[], target: string): boolean => {
        return nodes.some(n => n.code.replace(/\./g, "") === target || (n.children && nodesHasCode(n.children, target)));
      };
      children = findSubtree(chapter01Hierarchy);
    }
  } else {
    // Generate fallback subtree for other chapters
    if (cleanedCode.length === 2) {
      children = [
        {
          code: `${chapterCode}01`,
          description: `Commodities of heading ${chapterCode}01`,
          children: [
            {
              code: `${chapterCode}01.10.00.00`,
              description: `Product type ${chapterCode}01.10`,
              children: [
                { code: `${chapterCode}01.10.30.00`, description: `Special item ${chapterCode}01.10.30`, children: [] },
                { code: `${chapterCode}01.10.60.00`, description: `Standard item ${chapterCode}01.10.60`, children: [] }
              ]
            }
          ]
        }
      ];
    } else if (cleanedCode.length === 4) {
      children = [
        {
          code: `${cleanedCode}.10.00.00`,
          description: `Product type ${cleanedCode}.10`,
          children: [
            { code: `${cleanedCode}.10.30.00`, description: `Special item ${cleanedCode}.10.30`, children: [] },
            { code: `${cleanedCode}.10.60.00`, description: `Standard item ${cleanedCode}.10.60`, children: [] }
          ]
        }
      ];
    }
  }

  let rates = customRatesList.filter(r => r.code.replace(/\./g, "").startsWith(cleanedCode));
  if (selectedRate) {
    rates = [selectedRate];
  } else if (rates.length === 0 && chapterCode !== "01") {
    rates = [
      {
        code: `${cleanedCode.substring(0, 4)}.10.30.00`,
        description: `Imported commodity type A`,
        chapterCode,
        headingCode: headingCodePrefix,
        unit: "No.",
        generalRate: "4.00%",
        specialRate: null
      },
      {
        code: `${cleanedCode.substring(0, 4)}.10.60.00`,
        description: `Imported commodity type B`,
        chapterCode,
        headingCode: headingCodePrefix,
        unit: "No.",
        generalRate: "Free",
        specialRate: null
      }
    ];
  }

  return {
    chapter,
    heading,
    selectedRate,
    rates,
    children
  };
}

export async function search(query: string): Promise<HSCodeItem[]> {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  try {
    const res = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/search?query=${encodeURIComponent(lowerQuery)}`);
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (e) {
    console.error(`Failed to fetch search for ${query} from dev API, using local fallback`, e);
  }

  const allItems: HSCodeItem[] = customRatesList.map(r => ({
    code: r.code,
    description: r.description,
    generalRate: r.generalRate || "Free"
  }));
  
  // Add Chapter 02 items if fileDetail loaded
  if (fileDetail && fileDetail.rates) {
    fileDetail.rates.forEach((r: any) => {
      allItems.push({
        code: r.code,
        description: r.description,
        generalRate: r.generalRate || "Free"
      });
    });
  }

  return allItems.filter(
    item =>
      item.code.includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
  );
}

export async function getCountries(): Promise<Country[]> {
  try {
    const res = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/countries`);
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (e) {
    console.error("Failed to fetch countries from dev API, using local fallback", e);
  }
  return countriesList;
}

export async function getTransportModes(): Promise<TransportMode[]> {
  try {
    const res = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/transport-modes`);
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (e) {
    console.error("Failed to fetch transport modes from dev API, using local fallback", e);
  }
  return transportModesList;
}

export async function calculate(
  code: string,
  value: number,
  mode: string,
  country?: string,
  entryDate?: string,
  loadingDate?: string
) {
  try {
    const res = await fetch(`${BASE_EXTERNAL_API_URL}/hscodes/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, value, mode, country, entryDate, loadingDate })
    });
    if (res.ok) {
      const json = await res.json() as any;
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.error("Failed to call calculate from dev API, using local fallback", e);
  }

  const cleanedCode = code.replace(/\./g, "").trim();
  
  // 1. Determine base duty rate based on HS Code prefix
  let baseRate = 4.0; // default rate
  if (cleanedCode.startsWith("01")) {
    baseRate = 0.0;
  } else if (cleanedCode.startsWith("02")) {
    // Check if we can find exact rate in Chapter 2 fileDetail
    if (fileDetail && fileDetail.rates) {
      const match = fileDetail.rates.find((r: any) => r.code.replace(/\./g, "") === cleanedCode);
      if (match && match.generalRate) {
        const rateStr = match.generalRate.replace(/[^0-9.]/g, "");
        baseRate = parseFloat(rateStr) || 0.0;
      }
    }
  } else if (cleanedCode.startsWith("09")) {
    baseRate = 12.0;
  } else if (cleanedCode.startsWith("76")) {
    baseRate = 2.60;
  } else if (cleanedCode.startsWith("85")) {
    baseRate = 0.0;
  } else if (cleanedCode.startsWith("94")) {
    baseRate = 3.20;
  }

  // 2. Determine trade remedy additional tariffs (Section 301 / 232)
  let extraRate = 0.0;
  const isChina = country && (country.toLowerCase() === "china" || country.toUpperCase() === "CN");
  
  if (isChina) {
    if (cleanedCode.startsWith("76")) {
      extraRate = 75.0; // 25% Sec 301 + 50% Sec 232
    } else if (cleanedCode.startsWith("85") || cleanedCode.startsWith("94") || cleanedCode.startsWith("09")) {
      extraRate = 25.0; // Sec 301
    }
  }

  const totalRate = baseRate + extraRate;
  const customDuty = Math.round(((value * totalRate) / 100) * 100) / 100;

  // 3. Harbor Maintenance Fee (HMF): 0.125% of value, only for Ocean transport
  const isOcean = mode && mode.toLowerCase() === "ocean";
  const hmf = isOcean ? Math.round((value * 0.00125) * 100) / 100 : 0;

  // 4. Merchandise Processing Fee (MPF): 0.3464% of value, min $31.67, max $614.35 for values > 2500; else $2.22
  let mpf = 0;
  if (value > 0) {
    if (value > 2500) {
      const rawMpf = value * 0.003464;
      mpf = Math.max(31.67, Math.min(614.35, rawMpf));
    } else {
      mpf = 2.22;
    }
    mpf = Math.round(mpf * 100) / 100;
  }

  const total = Math.round((value + customDuty + hmf + mpf) * 100) / 100;

  return {
    dutyRate: `${totalRate.toFixed(2)}%`,
    baseCost: value,
    totalDuties: customDuty,
    hmf,
    mpf,
    total
  };
}
