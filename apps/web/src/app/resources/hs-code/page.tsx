"use client";

import { trpc } from "@web/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronRight,
  Info,
  Search,
  X,
} from "lucide-react";
import NextLink from "next/link";
import React, { useEffect, useRef, useState } from "react";

const HexagonPattern = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.04]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='%230f798c' fill-opacity='1' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l11 6.35 11-6.35V17.9L14 11.55 3 17.9z'/%3E%3C/svg%3E")`,
      backgroundSize: "28px 49px",
    }}
  />
);

interface TariffRow {
  heading: string;
  description: string;
  unit: string;
  general: string;
  special: string;
  indent: number;
  hasChildren: boolean;
}

function flattenHeadingTree(node: any, indent = 0): TariffRow[] {
  if (!node) return [];

  const rows: TariffRow[] = [];

  rows.push({
    heading: node.code,
    description: node.description,
    unit: node.unit || "",
    general: node.generalRate || "",
    special: node.specialRate || "",
    indent,
    hasChildren: node.children && node.children.length > 0,
  });

  if (node.children) {
    node.children.forEach((child: any) => {
      rows.push(...flattenHeadingTree(child, indent + 1));
    });
  }

  return rows;
}

const popularSuggestions = [
  {
    code: "7601.10.30.00",
    description: "Of uniform cross section throughout its length, unwrought aluminum",
    generalRate: "2.60%",
  },
  { code: "0101.21.00.00", description: "Purebred breeding animals", generalRate: "Free" },
  {
    code: "8517.13.00.00",
    description: "Smartphones and handheld wireless devices",
    generalRate: "Free",
  },
  { code: "9403.60.80.81", description: "Wooden Home Furniture", generalRate: "3.20%" },
  {
    code: "0901.21.00.00",
    description: "Roasted Coffee Beans, not decaffeinated",
    generalRate: "12.00%",
  },
];

interface TreeNodeData {
  code: string;
  description: string;
  children?: TreeNodeData[];
}

interface SidebarTreeNodeProps {
  node: TreeNodeData;
  level: number;
  selectedCode: string;
  expandedNodes: Record<string, boolean>;
  onSelectCode: (code: string) => void;
  onToggleExpand: (code: string) => void;
}

function SidebarTreeNode({
  node,
  level,
  selectedCode,
  expandedNodes,
  onSelectCode,
  onToggleExpand,
}: SidebarTreeNodeProps) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = Boolean(expandedNodes[node.code]);
  const isSelected = selectedCode === node.code;

  const displayDesc = node.description.startsWith(node.code)
    ? node.description
    : `${node.code} ${node.description}`;

  const paddingLeftPx = 12 + level * 14;

  return (
    <div className="flex flex-col border-b border-[#dadada]/30 last:border-none">
      <div
        onClick={() => {
          onSelectCode(node.code);
          if (hasChildren && !isExpanded) {
            onToggleExpand(node.code);
          }
        }}
        style={{ paddingLeft: `${paddingLeftPx}px` }}
        className={`w-full min-h-[42px] pr-2 py-2 flex items-start gap-1.5 text-left cursor-pointer transition-all duration-150 ${
          isSelected
            ? "bg-[#C9FFF9] text-[#232323] font-bold rounded-md my-0.5"
            : "text-[#232323] hover:bg-slate-50 font-normal"
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.code);
            }}
            className="p-1 hover:bg-black/5 rounded cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0 mt-0.5"
          >
            <ChevronRight
              className={`w-4 h-4 text-[#232323] opacity-60 shrink-0 transition-transform duration-200 ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <span className="w-6 shrink-0 inline-block" />
        )}

        <span className="text-[13px] leading-snug py-0.5">{displayDesc}</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children?.map((child) => (
            <SidebarTreeNode
              key={child.code}
              node={child}
              level={level + 1}
              selectedCode={selectedCode}
              expandedNodes={expandedNodes}
              onSelectCode={onSelectCode}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HSCodePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const handleToggleExpandNode = (code: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. tRPC query for flat chapters tree
  const { data: chaptersData, isLoading: isChaptersLoading } =
    trpc.public.hscode.getTree.useQuery();

  // Active selections
  const [expandedChapter, setExpandedChapter] = useState<string>("01");
  const [selectedSubChapter, setSelectedSubChapter] = useState<string>("01");

  // 2. tRPC query to lazy load headings under expanded chapter (if code length is 2)
  const { data: expandedChapterDetails, isLoading: isChapterLoading } =
    trpc.public.hscode.getDetail.useQuery(
      { code: expandedChapter },
      { enabled: !!expandedChapter && expandedChapter.length === 2, retry: false },
    );

  // 3. tRPC query for Heading detailed notes and child subtree
  const { data: headingDetailData, isLoading: isDetailLoading } =
    trpc.public.hscode.getDetail.useQuery(
      { code: selectedSubChapter },
      { enabled: !!selectedSubChapter, retry: false },
    );

  // 4. tRPC queries for calculator drop-downs (countries and transport modes)
  const { data: countriesData } = trpc.public.hscode.getCountries.useQuery();
  const { data: transportModesData } = trpc.public.hscode.getTransportModes.useQuery();

  // Calculator Form State
  const [shipmentValue, setShipmentValue] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("Vietnam");
  const [modeOfTransport, setModeOfTransport] = useState("Ocean");

  // 5. tRPC query for live tariff calculation if selectedRate is present
  const valueNum = parseFloat(shipmentValue.replace(/,/g, "")) || 0;
  const isCalculable = !!headingDetailData?.selectedRate && valueNum > 0 && !!modeOfTransport;

  const { data: calcResult, isLoading: isCalculating } = trpc.public.hscode.calculate.useQuery(
    {
      code: headingDetailData?.selectedRate?.code || "",
      value: valueNum,
      mode: modeOfTransport,
      country: countryOfOrigin,
    },
    {
      enabled: isCalculable,
      retry: false,
    },
  );

  // tRPC query for search auto-complete
  const { data: searchResultsData } = trpc.public.hscode.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );

  // Sync default form selects when metadata is loaded
  useEffect(() => {
    if (countriesData && countriesData.length > 0) {
      const hasVN = countriesData.find((c) => c.name.toLowerCase() === "vietnam");
      setCountryOfOrigin(hasVN ? hasVN.name : countriesData[0]?.name || "Vietnam");
    }
  }, [countriesData]);

  useEffect(() => {
    if (transportModesData && transportModesData.length > 0) {
      const hasOcean = transportModesData.find((m) => m.name.toLowerCase() === "ocean");
      setModeOfTransport(hasOcean ? hasOcean.name : transportModesData[0]?.name || "Ocean");
    }
  }, [transportModesData]);

  // Set default chapter selections
  useEffect(() => {
    if (chaptersData && chaptersData.length > 0 && chaptersData[0]) {
      setExpandedChapter(chaptersData[0].code);
    }
  }, [chaptersData]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (item: any) => {
    setSearchQuery(item.code);
    setDropdownOpen(false);
    navigateToCode(item.code);
  };

  const navigateToCode = (code: string) => {
    if (selectedSubChapter !== code) {
      setHistoryStack((prev) => [...prev, selectedSubChapter]);
      setSelectedSubChapter(code);

      const chapterPrefix = code.substring(0, 2);
      setExpandedChapter(chapterPrefix);

      // Auto-expand parent node prefixes in sidebar tree
      const clean = code.replace(/\./g, "").trim();
      const newExpanded: Record<string, boolean> = {};
      if (clean.length >= 4) {
        newExpanded[clean.substring(0, 4)] = true;
      }
      if (clean.length >= 6) {
        newExpanded[`${clean.substring(0, 4)}.${clean.substring(4, 6)}`] = true;
      }
      if (clean.length >= 8) {
        newExpanded[`${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6, 8)}`] =
          true;
      }
      setExpandedNodes((prev) => ({ ...prev, ...newExpanded }));
      setShipmentValue("");
    }
  };

  const handleBack = () => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((prevStack) => prevStack.slice(0, -1));
      if (prev) {
        setSelectedSubChapter(prev);
        const chapterPrefix = prev.substring(0, 2);
        setExpandedChapter(chapterPrefix);
      }
    }
  };

  // Flatten subtree hierarchy or rates list for table rows
  let tariffRows: TariffRow[] = [];
  if (headingDetailData?.children && headingDetailData.children.length > 0) {
    tariffRows = headingDetailData.children.flatMap((child: any) => flattenHeadingTree(child, 0));
  } else if (headingDetailData?.rates && headingDetailData.rates.length > 0) {
    tariffRows = headingDetailData.rates.map((rate: any) => ({
      heading: rate.code,
      description: rate.description,
      unit: rate.unit || "",
      general: rate.generalRate || "",
      special: rate.specialRate || "",
      indent: 0,
      hasChildren: false,
    }));
  } else if (headingDetailData?.selectedRate) {
    const sr = headingDetailData.selectedRate;
    tariffRows = [
      {
        heading: sr.code,
        description: sr.description,
        unit: sr.unit || "",
        general: sr.generalRate || "",
        special: sr.specialRate || "",
        indent: 0,
        hasChildren: false,
      },
    ];
  }

  const displaySearchResults =
    searchQuery.trim().length > 0 ? searchResultsData || [] : popularSuggestions;

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* CSS Styles injection for custom HTML notes from BE */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .note_section .note_title {
          font-weight: 700;
          text-decoration: underline;
          margin-bottom: 6px;
          margin-top: 14px;
          color: #232323;
          font-size: 15px;
        }
        .note_section .note_content {
          font-size: 14px;
          line-height: 1.6;
          color: #232323;
          margin-bottom: 12px;
        }
        .note_section .note_content br {
          margin-bottom: 4px;
        }
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: #f5f5f5;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: #d4d4d4;
          border-radius: 9999px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a3a3a3;
        }
      `,
        }}
      />

      {/* First Block - Title & Search (Figma 165:898) */}
      <section className="w-full bg-white relative z-20">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] pt-[60px] pb-10 flex flex-col gap-[36px] border-b border-[#dadada]">
          <HexagonPattern />

          <div className="flex flex-col relative z-10">
            <h1 className="text-[36px] md:text-[48px] font-semibold text-[#232323] leading-tight border-b-[6px] border-[#0f798c] pb-3 w-fit tracking-tight">
              HS Codes
            </h1>
          </div>

          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8 relative z-10 w-full">
            <p className="text-[#232323] text-[15px] md:text-[16px] leading-relaxed max-w-[638px]">
              HS Code is required to classify goods and determine applicable customs duties. If you
              have your HS Code ready, proceed to our Tariff Simulation page:{" "}
              <NextLink
                href="/resources/tariff-simulator"
                className="text-[#0f798c] font-semibold underline hover:text-[#0b5c6b] transition-colors"
              >
                Click here
              </NextLink>
            </p>

            <div ref={dropdownRef} className="w-full lg:w-[716px] h-[56px] relative shrink-0">
              <div
                className="w-full h-full flex items-center border border-[#dadada] bg-white px-4 justify-between cursor-text"
                onClick={() => setDropdownOpen(true)}
              >
                <div className="flex items-center gap-3 flex-grow">
                  <Search className="w-5 h-5 text-[#8d8d8d] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDropdownOpen(true);
                    }}
                    placeholder="Search Commodities"
                    className="w-full h-full text-[#232323] text-[16px] outline-none placeholder:text-[#8d8d8d] bg-transparent border-none p-0"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDropdownOpen(false);
                    }}
                    className="text-[#232323] opacity-60 hover:opacity-100 transition-opacity border-none bg-transparent p-0 cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <ChevronDown className="w-5 h-5 text-[#232323] opacity-60 shrink-0" />
              </div>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadada] shadow-lg z-50 max-h-[300px] overflow-y-auto">
                  {displaySearchResults.length > 0 ? (
                    displaySearchResults.map((item) => (
                      <div
                        key={item.code}
                        onClick={() => handleSelectItem(item)}
                        className="px-4 py-3 hover:bg-[#C9FFF9] cursor-pointer transition-colors border-b border-slate-50 last:border-none flex flex-col gap-0.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-[#0F798C] text-[14px]">
                            {item.code}
                          </span>
                          <span className="text-[12px] bg-slate-100 px-2 py-0.5 text-[#7A7A7A]">
                            Commodity
                          </span>
                        </div>
                        <span className="text-[#232323] text-[14px] truncate">
                          {item.description}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-[#7A7A7A] text-[14px]">
                      No commodities found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Second Block - Two-Panel Explorer (Figma 165:757) with standalone borders & gap-8 spacing */}
      <section className="w-full bg-white pb-20">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] pt-10 flex flex-col lg:flex-row gap-8">
          {/* Left Panel Sidebar (Standalone border card) */}
          <div className="w-full lg:w-[320px] shrink-0 border border-[#dadada] flex flex-col bg-white rounded-none h-fit">
            <div className="flex flex-col overflow-y-auto max-h-[750px] sidebar-scrollbar">
              {isChaptersLoading ? (
                <div className="p-8 text-center text-slate-400 text-[14px]">Loading catalog...</div>
              ) : (
                chaptersData?.map((chap) => {
                  const isExpanded = expandedChapter === chap.code;
                  const isSelected = selectedSubChapter === chap.code;
                  return (
                    <div
                      key={chap.code}
                      className="flex flex-col border-b border-[#dadada] last:border-none"
                    >
                      <div
                        onClick={() => {
                          setSelectedSubChapter(chap.code);
                          if (!isExpanded) {
                            setExpandedChapter(chap.code);
                          }
                        }}
                        className={`w-full min-h-[52px] pl-3 pr-2 py-3 flex items-center gap-1.5 text-[14px] font-medium transition-colors text-left cursor-pointer rounded-none ${
                          isSelected
                            ? "bg-[#C9FFF9] text-[#232323] font-bold"
                            : "text-[#232323] hover:bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedChapter(isExpanded ? "" : chap.code);
                          }}
                          className="p-1 hover:bg-black/5 rounded cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0"
                        >
                          <ChevronRight
                            className={`w-4 h-4 text-[#232323] opacity-60 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>
                        <span>
                          {chap.code} {chap.description}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="flex flex-col bg-slate-50/20 border-t border-[#dadada]/40">
                          {isChapterLoading ? (
                            <div className="p-4 text-center text-[12px] text-slate-400">
                              Loading...
                            </div>
                          ) : (
                            expandedChapterDetails?.children?.map((sub: any) => (
                              <SidebarTreeNode
                                key={sub.code}
                                node={sub}
                                level={1}
                                selectedCode={selectedSubChapter}
                                expandedNodes={expandedNodes}
                                onSelectCode={setSelectedSubChapter}
                                onToggleExpand={handleToggleExpandNode}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel Main Content (Standalone border card, table sits flush to left/right margins) */}
          <div className="flex-grow border border-[#dadada] bg-white flex flex-col rounded-none min-w-0">
            {isDetailLoading ? (
              <div className="flex-grow flex items-center justify-center p-12 text-center text-slate-400">
                Loading details...
              </div>
            ) : headingDetailData ? (
              <div className="flex flex-col w-full">
                {/* Header Row with Back navigation button if stack exists */}
                {historyStack.length > 0 && (
                  <div className="px-8 pt-6 flex items-center gap-4">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F798C] hover:text-[#0b5a68] border-none bg-transparent cursor-pointer rounded-none"
                    >
                      <ArrowLeft className="w-4 h-4"/>
                      Back
                    </button>
                  </div>
                )}

                {/* Chapter Notes Section (Only display for level 1 parent chapters, e.g. 01, 02) */}
                {selectedSubChapter.replace(/\./g, "").trim().length === 2 && (
                  <div className="bg-[#C9FFF9] p-6 md:p-8 border-b border-[#dadada] flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-bold text-[#0F798C] uppercase tracking-wider">
                        CHAPTER {parseInt(headingDetailData.chapter.code)}
                      </span>
                      <h2 className="text-[28px] font-semibold text-[#232323] leading-snug">
                        {headingDetailData.chapter.name}
                      </h2>
                    </div>

                    {headingDetailData.chapter.notesHtml && (
                      <div
                        className="prose max-w-none text-[#232323] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: headingDetailData.chapter.notesHtml }}
                      />
                    )}
                  </div>
                )}

                {/* Directory Tree View (Always display U.S. Tariff Rates table for all levels) */}
                <div className="flex flex-col w-full pt-6 md:pt-8">
                  <h3 className="text-[20px] font-semibold text-[#232323] tracking-tight px-4 md:px-5 mb-4">
                    U.S. Tariff Rates
                  </h3>

                  <div className="w-full overflow-x-auto border-t border-[#dadada]">
                    <table className="w-full border-collapse text-left text-[14px]">
                      <thead>
                      <tr className="border-b border-[#dadada] font-semibold text-[#232323] h-12">
                        <th className="pl-4 md:pl-5 pr-4 py-2 font-bold w-[160px]">
                          Heading / Subheading
                        </th>
                        <th className="px-4 py-2 font-bold">Article Description</th>
                        <th className="px-4 py-2 font-bold w-[140px]">Unit of Quantity</th>
                        <th className="px-4 py-2 font-bold w-[100px]">General</th>
                        <th className="pl-4 pr-4 md:pr-5 py-2 font-bold w-[180px]">Special</th>
                      </tr>
                      </thead>
                      <tbody>
                      {tariffRows.map((tariff: TariffRow, index: number) => (
                        <tr
                          key={index}
                          onClick={() => navigateToCode(tariff.heading)}
                          className="border-b border-[#dadada]/60 last:border-b-0 hover:bg-[#C9FFF9]/10 transition-colors h-[50px] cursor-pointer"
                        >
                          <td
                            className="pl-4 md:pl-5 pr-4 py-2.5 text-[#232323] font-normal whitespace-nowrap align-middle">
                            {tariff.heading}
                          </td>
                          <td className="px-4 py-2.5 text-[#232323] align-middle">
                            <span className="inline-block">{tariff.description}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[#232323] align-middle">
                            {tariff.unit}
                          </td>
                          <td className="px-4 py-2.5 text-[#232323] font-normal align-middle">
                            {tariff.general}
                          </td>
                          <td
                            className="pl-4 pr-4 md:pr-5 py-2.5 text-[13px] text-slate-700 leading-normal max-w-[200px] break-words align-middle">
                            {tariff.special}
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-[#7A7A7A]">
                <Info className="w-8 h-8 text-[#0F798C] mb-2"/>
                Select a chapter on the left to inspect detailed HS Code tariff rates.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
