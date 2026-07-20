"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, Calculator, Info, ArrowLeft, ArrowRight, X } from "lucide-react";
import NextLink from "next/link";
import { trpc } from "@web/lib/trpc";

const HexagonPattern = () => (
  <div 
    className="absolute inset-0 pointer-events-none opacity-[0.04]" 
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='%230f798c' fill-opacity='1' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l11 6.35 11-6.35V17.9L14 11.55 3 17.9z'/%3E%3C/svg%3E")`,
      backgroundSize: "28px 49px"
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
    hasChildren: node.children && node.children.length > 0
  });

  if (node.children) {
    node.children.forEach((child: any) => {
      rows.push(...flattenHeadingTree(child, indent + 1));
    });
  }
  
  return rows;
}

const popularSuggestions = [
  { code: "7601.10.30.00", description: "Of uniform cross section throughout its length, unwrought aluminum", generalRate: "2.60%" },
  { code: "0101.21.00.00", description: "Purebred breeding animals", generalRate: "Free" },
  { code: "8517.13.00.00", description: "Smartphones and handheld wireless devices", generalRate: "Free" },
  { code: "9403.60.80.81", description: "Wooden Home Furniture", generalRate: "3.20%" },
  { code: "0901.21.00.00", description: "Roasted Coffee Beans, not decaffeinated", generalRate: "12.00%" }
];

export default function HSCodePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. tRPC query for flat chapters tree
  const { data: chaptersData, isLoading: isChaptersLoading } = trpc.public.v1.hscode.getTree.useQuery();

  // Active selections
  const [expandedChapter, setExpandedChapter] = useState<string>("01");
  const [selectedSubChapter, setSelectedSubChapter] = useState<string>("0101");

  // 2. tRPC query to lazy load headings under expanded chapter (if code length is 2)
  const { data: expandedChapterDetails, isLoading: isChapterLoading } = trpc.public.v1.hscode.getDetail.useQuery(
    { code: expandedChapter },
    { enabled: !!expandedChapter && expandedChapter.length === 2, retry: false }
  );

  // 3. tRPC query for Heading detailed notes and child subtree
  const { data: headingDetailData, isLoading: isDetailLoading } = trpc.public.v1.hscode.getDetail.useQuery(
    { code: selectedSubChapter },
    { enabled: !!selectedSubChapter, retry: false }
  );

  // 4. tRPC queries for calculator drop-downs (countries and transport modes)
  const { data: countriesData } = trpc.public.v1.hscode.getCountries.useQuery();
  const { data: transportModesData } = trpc.public.v1.hscode.getTransportModes.useQuery();

  // Calculator Form State
  const [shipmentValue, setShipmentValue] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("Vietnam");
  const [modeOfTransport, setModeOfTransport] = useState("Ocean");

  // 5. tRPC query for live tariff calculation if selectedRate is present
  const valueNum = parseFloat(shipmentValue.replace(/,/g, "")) || 0;
  const isCalculable = !!headingDetailData?.selectedRate && valueNum > 0 && !!modeOfTransport;

  const { data: calcResult, isLoading: isCalculating } = trpc.public.v1.hscode.calculate.useQuery(
    {
      code: headingDetailData?.selectedRate?.code || "",
      value: valueNum,
      mode: modeOfTransport,
      country: countryOfOrigin,
    },
    {
      enabled: isCalculable,
      retry: false,
    }
  );

  // tRPC query for search auto-complete
  const { data: searchResultsData } = trpc.public.v1.hscode.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 0 }
  );

  // Sync default form selects when metadata is loaded
  useEffect(() => {
    if (countriesData && countriesData.length > 0) {
      const hasVN = countriesData.find(c => c.name.toLowerCase() === "vietnam");
      setCountryOfOrigin(hasVN ? hasVN.name : (countriesData[0]?.name || "Vietnam"));
    }
  }, [countriesData]);

  useEffect(() => {
    if (transportModesData && transportModesData.length > 0) {
      const hasOcean = transportModesData.find(m => m.name.toLowerCase() === "ocean");
      setModeOfTransport(hasOcean ? hasOcean.name : (transportModesData[0]?.name || "Ocean"));
    }
  }, [transportModesData]);

  // Set default chapter selections
  useEffect(() => {
    if (chaptersData && chaptersData.length > 0 && chaptersData[0]) {
      setExpandedChapter(chaptersData[0].code);
    }
  }, [chaptersData]);

  // Set default heading under chapter once loaded
  useEffect(() => {
    if (expandedChapterDetails && expandedChapterDetails.children && expandedChapterDetails.children.length > 0) {
      const firstChild = expandedChapterDetails.children[0];
      if (firstChild) {
        setSelectedSubChapter(firstChild.code);
      }
    }
  }, [expandedChapterDetails]);

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
      setHistoryStack(prev => [...prev, selectedSubChapter]);
      setSelectedSubChapter(code);
      
      const chapterPrefix = code.substring(0, 2);
      setExpandedChapter(chapterPrefix);
      setShipmentValue("");
    }
  };

  const handleBack = () => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack(prevStack => prevStack.slice(0, -1));
      if (prev) {
        setSelectedSubChapter(prev);
        const chapterPrefix = prev.substring(0, 2);
        setExpandedChapter(chapterPrefix);
      }
    }
  };

  // Flatten subtree hierarchy for table rows
  const tariffRows = headingDetailData?.children
    ? headingDetailData.children.flatMap((child: any) => flattenHeadingTree(child, 0))
    : [];

  const displaySearchResults = searchQuery.trim().length > 0
    ? (searchResultsData || [])
    : popularSuggestions;

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* CSS Styles injection for custom HTML notes from BE */}
      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />

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
              HS Code is required to classify goods and determine applicable customs duties. If you have your HS Code ready, proceed to our Tariff Simulation page:{" "}
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
                    displaySearchResults.map(item => (
                      <div
                        key={item.code}
                        onClick={() => handleSelectItem(item)}
                        className="px-4 py-3 hover:bg-[#C9FFF9] cursor-pointer transition-colors border-b border-slate-50 last:border-none flex flex-col gap-0.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-[#0F798C] text-[14px]">{item.code}</span>
                          <span className="text-[12px] bg-slate-100 px-2 py-0.5 text-[#7A7A7A]">Commodity</span>
                        </div>
                        <span className="text-[#232323] text-[14px] truncate">{item.description}</span>
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
            <div className="flex flex-col overflow-y-auto max-h-[750px]">
              {isChaptersLoading ? (
                <div className="p-8 text-center text-slate-400 text-[14px]">Loading catalog...</div>
              ) : (
                chaptersData?.map(chap => {
                  const isExpanded = expandedChapter === chap.code;
                  return (
                    <div key={chap.code} className="flex flex-col border-b border-[#dadada] last:border-none">
                      <button
                        onClick={() => {
                          setExpandedChapter(isExpanded ? "" : chap.code);
                          if (!isExpanded) {
                            setSelectedSubChapter(chap.code);
                          }
                        }}
                        className="w-full min-h-[52px] pl-3 pr-2 py-3 flex items-center gap-1.5 text-[14px] font-medium text-[#232323] hover:bg-slate-50 transition-colors text-left border-none outline-none cursor-pointer rounded-none"
                      >
                        <ChevronRight className={`w-4 h-4 text-[#232323] opacity-60 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        <span>{chap.description}</span>
                      </button>

                      {isExpanded && (
                        <div className="flex flex-col bg-slate-50/20 border-t border-[#dadada]/40">
                          {isChapterLoading ? (
                            <div className="p-4 text-center text-[12px] text-slate-400">Loading...</div>
                          ) : (
                            expandedChapterDetails?.children?.map((sub: any) => {
                              const isSelected = selectedSubChapter === sub.code;
                              return (
                                <button
                                  key={sub.code}
                                  onClick={() => setSelectedSubChapter(sub.code)}
                                  className={`w-full min-h-[46px] pl-6 pr-2 py-2.5 flex items-center gap-1.5 text-left text-[13px] font-medium border-none outline-none cursor-pointer border-b border-[#dadada]/40 last:border-none transition-all duration-200 rounded-none ${
                                    isSelected 
                                      ? "bg-[#C9FFF9] text-[#232323] font-bold" 
                                      : "text-[#555555] hover:bg-[#C9FFF9]/20 hover:text-[#232323]"
                                  }`}
                                >
                                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#232323] opacity-60" />
                                  <span>{sub.code} {sub.description}</span>
                                </button>
                              );
                            })
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
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                )}

                {/* Chapter Notes Section (Turquoise box sits flush inside the panel card) */}
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

                {/* Prominent Leaf Calculator (when selectedRate !== null) */}
                {headingDetailData.selectedRate ? (
                  <div className="p-6 md:p-8 flex flex-col gap-8">
                    {/* Product Card */}
                    <div className="border border-[#dadada] p-6 bg-slate-50 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-[#dadada]/60 pb-3">
                        <span className="text-[20px] font-bold text-[#0F798C]">
                          {headingDetailData.selectedRate.code}
                        </span>
                        <span className="text-[12px] bg-slate-200 px-3 py-1 font-bold text-slate-600 rounded">
                          LEAF COMMODITY
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-[15px]">
                        <span className="font-semibold text-slate-500">Article Description</span>
                        <span className="text-[#232323] font-medium leading-relaxed">
                          {headingDetailData.selectedRate.description}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2 text-[14px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-500">Unit of Quantity</span>
                          <span className="font-bold text-[#232323]">{headingDetailData.selectedRate.unit || "No."}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-500">General Import Rate</span>
                          <span className="font-bold text-[#0F798C]">{headingDetailData.selectedRate.generalRate || "Free"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-500">Special Import Rate</span>
                          <span className="font-bold text-slate-700">
                            {headingDetailData.selectedRate.specialRate || "None"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Twin-panel Landed Cost Simulator Form */}
                    <div className="flex flex-col lg:flex-row gap-6 w-full">
                      {/* Inputs Card */}
                      <div className="flex-1 border border-[#dadada] p-6 flex flex-col gap-5 text-[14px]">
                        <h4 className="font-bold text-[#232323] border-b border-[#dadada]/60 pb-2">DUTY ESTIMATOR</h4>
                        
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[#555555]">Shipment Value (USD)</span>
                          <input
                            type="text"
                            value={shipmentValue}
                            onChange={(e) => setShipmentValue(e.target.value.replace(/[^0-9.]/g, ""))}
                            placeholder="Enter Value (e.g. 10000)"
                            className="h-10 px-3 border border-[#dadada] bg-white outline-none w-full text-[14px]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[#555555]">Country of Origin</span>
                          <select
                            value={countryOfOrigin}
                            onChange={(e) => setCountryOfOrigin(e.target.value)}
                            className="h-10 px-3 border border-[#dadada] bg-white outline-none w-full text-[14px] cursor-pointer"
                          >
                            {countriesData?.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[#555555]">Mode of Transport</span>
                          <select
                            value={modeOfTransport}
                            onChange={(e) => setModeOfTransport(e.target.value)}
                            className="h-10 px-3 border border-[#dadada] bg-white outline-none w-full text-[14px] cursor-pointer"
                          >
                            {transportModesData?.map(m => (
                              <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Cost Breakdown Panel */}
                      <div className="flex-1 bg-[#C9FFF9]/40 border border-[#dadada] p-6 flex flex-col justify-between min-h-[220px]">
                        {isCalculating ? (
                          <div className="flex-grow flex items-center justify-center text-slate-400 text-[14px]">
                            Calculating tariffs...
                          </div>
                        ) : calcResult ? (
                          <div className="flex flex-col justify-between h-full w-full">
                            <div className="flex flex-col gap-3 text-[14px]">
                              <div className="flex justify-between border-b border-[#dadada]/60 pb-2">
                                <span className="font-bold text-[#0F798C] uppercase">ESTIMATED LANDED COST</span>
                                <span className="font-bold text-[#0f798c]">{calcResult.dutyRate} Rate</span>
                              </div>
                              <div className="flex justify-between text-[13px] text-slate-600">
                                <span>Base Cost</span>
                                <span className="font-semibold">${calcResult.baseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-[13px] text-slate-600">
                                <span>Customs Duty</span>
                                <span className="font-semibold">${calcResult.totalDuties.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-[13px] text-slate-600">
                                <span>HMF (Ocean)</span>
                                <span className="font-semibold">${calcResult.hmf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-[13px] text-slate-600 border-b border-dashed border-[#dadada]/60 pb-2">
                                <span>MPF (Processing)</span>
                                <span className="font-semibold">${calcResult.mpf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center w-full pt-3 mt-2 border-t border-[#dadada]">
                              <span className="font-bold text-[#232323] text-[14px]">Total Cost</span>
                              <span className="text-[20px] font-bold text-[#0F798C]">
                                  ${calcResult.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 text-[14px]">
                            <Info className="w-6 h-6 text-[#0F798C] mb-1.5" />
                            Enter shipment value to calculate duties live.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Directory Tree View (when selectedRate === null) */
                  <div className="flex flex-col w-full pt-6 md:pt-8">
                    <h3 className="text-[20px] font-semibold text-[#232323] tracking-tight px-4 md:px-5 mb-4">
                      U.S. Tariff Rates
                    </h3>

                    <div className="w-full overflow-x-auto border-t border-[#dadada]">
                      <table className="w-full border-collapse text-left text-[14px]">
                        <thead>
                          <tr className="border-b border-[#dadada] font-semibold text-[#232323] h-12">
                            <th className="pl-4 md:pl-5 pr-4 py-2 font-bold w-[160px]">Heading / Subheading</th>
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
                              <td className="pl-4 md:pl-5 pr-4 py-2.5 text-[#232323] font-normal whitespace-nowrap align-middle">
                                {tariff.heading}
                              </td>
                              <td className="px-4 py-2.5 text-[#232323] align-middle">
                                <span className="inline-block">
                                  {tariff.description}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-[#232323] align-middle">
                                {tariff.unit}
                              </td>
                              <td className="px-4 py-2.5 text-[#232323] font-normal align-middle">
                                {tariff.general}
                              </td>
                              <td className="pl-4 pr-4 md:pr-5 py-2.5 text-[13px] text-slate-700 leading-normal max-w-[200px] break-words align-middle">
                                {tariff.special}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-[#7A7A7A]">
                <Info className="w-8 h-8 text-[#0F798C] mb-2" />
                Select a chapter on the left to inspect detailed HS Code tariff rates.
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
