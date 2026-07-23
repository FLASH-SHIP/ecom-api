"use client";

import { trpc } from "@web/lib/trpc";
import { ArrowRight, Calculator, Calendar, Check, Info, Search, Send, X } from "lucide-react";
import NextLink from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";

const HexagonPattern = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.04]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='%230f798c' fill-opacity='1' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l11 6.35 11-6.35V17.9L14 11.55 3 17.9z'/%3E%3C/svg%3E")`,
      backgroundSize: "28px 49px",
    }}
  />
);

export default function TariffSimulatorPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [topDropdownOpen, setTopDropdownOpen] = useState(false);
  const [formDropdownOpen, setFormDropdownOpen] = useState(false);

  // Calculator Form State
  const [htsCode, setHtsCode] = useState("");
  const [shipmentValue, setShipmentValue] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("Vietnam");
  const [modeOfTransport, setModeOfTransport] = useState("Ocean");
  const [entryDate, setEntryDate] = useState("06/18/2026");
  const [dateOfLoading, setDateOfLoading] = useState("06/18/2026");

  const [sendSuccess, setSendSuccess] = useState(false);

  const topSearchRef = useRef<HTMLDivElement>(null);
  const formSearchRef = useRef<HTMLDivElement>(null);

  // tRPC query to get supported countries list
  const { data: countriesData } = trpc.public.hscode.getCountries.useQuery();

  // tRPC query to get supported transport modes
  const { data: transportModesData } = trpc.public.hscode.getTransportModes.useQuery();

  // tRPC query for top search auto-complete
  const { data: topSearchResults } = trpc.public.hscode.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );

  // tRPC query for form search auto-complete
  const { data: formSearchResults } = trpc.public.hscode.search.useQuery(
    { query: htsCode },
    { enabled: htsCode.trim().length > 0 && !formDropdownOpen }, // search suggestions as they type HTS code
  );

  // Parse numerical shipment value
  const valueNum = parseFloat(shipmentValue.replace(/,/g, "")) || 0;
  const isCalculable = htsCode.trim().length > 0 && valueNum > 0 && !!modeOfTransport;

  // tRPC query for live tariff calculation
  const { data: calcResult, isLoading: isCalculating } = trpc.public.hscode.calculate.useQuery(
    {
      code: htsCode,
      value: valueNum,
      mode: modeOfTransport,
      country: countryOfOrigin,
      entryDate,
      loadingDate: dateOfLoading,
    },
    {
      enabled: isCalculable,
      retry: false,
    },
  );

  // Reset all fields to initial defaults
  const handleResetAll = () => {
    setHtsCode("");
    setShipmentValue("");
    setCountryOfOrigin(countriesData?.[0]?.name || "Vietnam");
    setModeOfTransport(transportModesData?.[0]?.name || "Ocean");
    setEntryDate("06/18/2026");
    setDateOfLoading("06/18/2026");
    setSendSuccess(false);
  };

  const handleSendResults = () => {
    setSendSuccess(true);
    setTimeout(() => {
      setSendSuccess(false);
    }, 3000);
  };

  // Sync default form values when metadata is loaded
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

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topSearchRef.current && !topSearchRef.current.contains(event.target as Node)) {
        setTopDropdownOpen(false);
      }
      if (formSearchRef.current && !formSearchRef.current.contains(event.target as Node)) {
        setFormDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTopItem = (item: any) => {
    setHtsCode(item.code);
    setSearchQuery(item.code);
    setTopDropdownOpen(false);
  };

  const handleSelectFormItem = (item: any) => {
    setHtsCode(item.code);
    setFormDropdownOpen(false);
  };

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* First Block - Title & Description & Search (Figma 170:285) */}
      <section className="w-full bg-white relative z-20">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] pt-[60px] pb-10 flex flex-col gap-[36px] overflow-hidden">
          <HexagonPattern />

          {/* Title Block */}
          <div className="flex flex-col relative z-10">
            <h1 className="text-[36px] md:text-[48px] font-semibold text-[#232323] leading-tight border-b-[6px] border-[#0f798c] pb-3 w-fit tracking-tight">
              Tariff simulator
            </h1>
          </div>

          {/* Description & Search Bar (Two Columns on Desktop) */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8 relative z-10 w-full">
            {/* Description Text */}
            <p className="text-[#232323] text-[15px] md:text-[16px] leading-relaxed max-w-[638px]">
              Get instant insights on how tariffs affect your imports. Search by product name or
              upload HTS codes to see real-time duty calculations
            </p>

            {/* Search Input Box */}
            <div ref={topSearchRef} className="w-full lg:w-[716px] h-[56px] relative shrink-0">
              <div
                className="w-full h-full flex items-center border border-[#dadada] bg-white px-4 justify-between cursor-text"
                onClick={() => setTopDropdownOpen(true)}
              >
                <div className="flex items-center gap-3 flex-grow">
                  <Search className="w-5 h-5 text-[#8d8d8d] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setTopDropdownOpen(true);
                    }}
                    placeholder="Enter HS Code"
                    className="w-full h-full text-[#232323] text-[16px] outline-none placeholder:text-[#8d8d8d] bg-transparent border-none p-0"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setTopDropdownOpen(false);
                    }}
                    className="text-[#232323] opacity-60 hover:opacity-100 transition-opacity border-none bg-transparent p-0 cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {topDropdownOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadada] shadow-lg z-50 max-h-[300px] overflow-y-auto">
                  {topSearchResults && topSearchResults.length > 0 ? (
                    topSearchResults.map((item) => (
                      <div
                        key={item.code}
                        onClick={() => handleSelectTopItem(item)}
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

      {/* Second Block - Tariff Updates (Figma 170:515) */}
      <section className="w-full bg-white">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] pt-10 pb-[60px] flex flex-col border-b border-[#dadada]">
          <div className="w-full bg-[#EBFAEF] border border-[#c5e6ce] p-6 md:p-8 flex flex-col gap-6">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-[#232323] text-[14px] uppercase tracking-wider">
                  TARIFF UPDATES
                </span>
                <span className="bg-[#0F798C] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  LAST UPDATE: JUN 3, 2026
                </span>
              </div>
              <NextLink
                href="/resources/tariff-simulator/updates"
                className="text-[#0f798c] font-bold text-[14px] underline hover:text-[#0c6271] self-start sm:self-auto"
              >
                View All Update
              </NextLink>
            </div>

            {/* Content List */}
            <div className="flex flex-col text-[14px] leading-relaxed text-[#232323]">
              {/* Item 1 */}
              <div className="py-4 first:pt-2 flex flex-col gap-1 border-b border-[#c5e6ce]/60 last:border-none last:pb-2">
                <p className="text-slate-800">
                  Jun 3: Applied further adjustments to Section 232 tariffs on Aluminum, Copper, and
                  Steel as per the{" "}
                  <NextLink
                    href="#"
                    className="text-[#0f798c] font-bold underline hover:text-[#0c6271]"
                  >
                    Presidential Proclamation published on June 1
                  </NextLink>
                </p>
                <span className="text-[13px] text-slate-500 font-medium">
                  Effective: from June 8, 2026
                </span>
              </div>

              {/* Item 2 */}
              <div className="py-4 flex flex-col gap-1 border-b border-[#c5e6ce]/60 last:border-none last:pb-2">
                <p className="text-slate-800">
                  May 28: Implemented tariff changes from the newly announced US-Taiwan Trade and
                  Security Agreement as outlined in{" "}
                  <NextLink
                    href="#"
                    className="text-[#0f798c] font-bold underline hover:text-[#0c6271]"
                  >
                    Federal Register notice 2026-10571
                  </NextLink>
                </p>
                <span className="text-[13px] text-slate-500 font-medium">
                  Effective: retroactively from May 1, 2026
                </span>
              </div>

              {/* Item 3 */}
              <div className="py-4 flex flex-col gap-1 border-b border-[#c5e6ce]/60 last:border-none last:pb-2">
                <p className="text-slate-800">
                  Apr 27: Applied technical corrections to Section 232 tariffs as{" "}
                  <em>noted in Federal Register notice 2026-08297</em>, scheduled for publication on
                  April 29
                </p>
                <span className="text-[13px] text-slate-500 font-medium">
                  Effective: retroactively from Apr 6, 2026
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Third Block - Two bordered cards (Figma 170:298) */}
      <section className="w-full bg-white">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] pt-10 pb-16 flex flex-col lg:flex-row gap-8 lg:gap-[56px]">
          {/* Left Card - Calculator Inputs */}
          <div className="w-full lg:w-[544px] shrink-0 border border-[#dadada] bg-white p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-[22px] font-semibold text-[#232323]">Calculator</h2>
              <button
                onClick={handleResetAll}
                className="text-[#0f798c] hover:text-[#0c6271] font-bold text-[14px] flex items-center gap-1.5 border-none bg-transparent cursor-pointer"
              >
                Reset All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs Form */}
            <div className="flex flex-col gap-5 text-[15px]">
              {/* Product or HTS Code */}
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                  <span className="font-semibold text-[#555555]">Product or HTS Code</span>
                  <div ref={formSearchRef} className="w-full sm:w-[300px] h-[48px] relative">
                    <input
                      type="text"
                      value={htsCode}
                      onChange={(e) => {
                        setHtsCode(e.target.value);
                        setFormDropdownOpen(true);
                      }}
                      onFocus={() => setFormDropdownOpen(true)}
                      placeholder="Enter HTS Code (e.g. 7601.10.30.00)"
                      className="w-full h-full border border-[#dadada] bg-white px-4 text-[#232323] outline-none text-[15px]"
                    />
                    {htsCode && (
                      <button
                        onClick={() => {
                          setHtsCode("");
                          setFormDropdownOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none p-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Autocomplete for Form HTS Code */}
                    {formDropdownOpen && htsCode.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadada] shadow-lg z-50 max-h-[220px] overflow-y-auto w-full">
                        {formSearchResults && formSearchResults.length > 0 ? (
                          formSearchResults.map((item) => (
                            <div
                              key={item.code}
                              onClick={() => handleSelectFormItem(item)}
                              className="px-4 py-3 hover:bg-[#C9FFF9] cursor-pointer transition-colors border-b border-slate-50 last:border-none flex flex-col gap-0.5"
                            >
                              <span className="font-semibold text-[#0F798C] text-[13px]">
                                {item.code}
                              </span>
                              <span className="text-[#232323] text-[12px] truncate">
                                {item.description}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-[#7A7A7A] text-[13px]">
                            No matches
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-1">
                  <NextLink
                    href="/resources/hs-code"
                    className="text-[#0f798c] font-bold text-[13px] flex items-center gap-1 hover:underline"
                  >
                    Go to Search HS Code
                    <ArrowRight className="w-3.5 h-3.5" />
                  </NextLink>
                </div>
              </div>

              {/* Shipment Value (USD) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                <span className="font-semibold text-[#555555]">Shipment Value (USD)</span>
                <div className="w-full sm:w-[300px] h-[48px] relative">
                  <input
                    type="text"
                    value={shipmentValue}
                    onChange={(e) => setShipmentValue(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter Value"
                    className="w-full h-full border border-[#dadada] bg-white px-4 text-[#232323] outline-none text-[15px]"
                  />
                  {shipmentValue && (
                    <button
                      onClick={() => setShipmentValue("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none p-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Country of Origin */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                <span className="font-semibold text-[#555555]">Country of Origin</span>
                <div className="w-full sm:w-[300px] h-[48px] relative">
                  <select
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    className="w-full h-full border border-[#dadada] bg-white px-4 text-[#232323] outline-none text-[15px] appearance-none cursor-pointer pr-10"
                  >
                    {countriesData?.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    )) || <option value="Vietnam">Vietnam</option>}
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#232323] opacity-60 pointer-events-none" />
                </div>
              </div>

              {/* Mode of Transport */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                <span className="font-semibold text-[#555555]">Mode of Transport</span>
                <div className="w-full sm:w-[300px] h-[48px] relative">
                  <select
                    value={modeOfTransport}
                    onChange={(e) => setModeOfTransport(e.target.value)}
                    className="w-full h-full border border-[#dadada] bg-white px-4 text-[#232323] outline-none text-[15px] appearance-none cursor-pointer pr-10"
                  >
                    {transportModesData?.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    )) || <option value="Ocean">Ocean</option>}
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#232323] opacity-60 pointer-events-none" />
                </div>
              </div>

              {/* Entry Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                <span className="font-semibold text-[#555555]">Entry Date</span>
                <div className="w-full sm:w-[300px] h-[48px] relative">
                  <input
                    type="text"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full h-full border border-[#dadada] bg-white px-4 text-[#232323] outline-none text-[15px]"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Date of Loading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                <span className="font-semibold text-[#555555]">Date of Loading</span>
                <div className="w-full sm:w-[300px] h-[48px] relative">
                  <input
                    type="text"
                    value={dateOfLoading}
                    onChange={(e) => setDateOfLoading(e.target.value)}
                    className="w-full h-full border border-[#dadada] bg-white px-4 text-[#232323] outline-none text-[15px]"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Card - Results Display */}
          <div className="flex-grow border border-[#dadada] bg-white p-6 md:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-[22px] font-semibold text-[#232323]">Results</h2>
              {isCalculable && calcResult && (
                <button
                  onClick={handleSendResults}
                  className="border border-[#dadada] bg-white hover:bg-slate-50 px-5 py-2 flex items-center gap-2 text-[15px] font-bold text-[#232323] transition-colors cursor-pointer"
                >
                  {sendSuccess ? (
                    <>
                      <Check className="w-4.5 h-4.5 text-green-500" />
                      Results Sent!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Results
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Calculations Breakdown (Two-panel design from Figma 170:1055) */}
            {isCalculating ? (
              <div className="flex-grow flex items-center justify-center p-12 text-slate-400">
                Calculating duties...
              </div>
            ) : isCalculable && calcResult ? (
              <div className="flex flex-col xl:flex-row gap-6 w-full mt-2">
                {/* Left Turquoise Panel */}
                <div className="flex-1 bg-[#C9FFF9] p-6 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <span className="text-[22px] font-semibold text-[#232323] block mb-2">
                      Duty rate
                    </span>
                    <span className="text-[64px] font-bold text-[#0f798c] leading-none tracking-tight block">
                      {calcResult.dutyRate}
                    </span>
                  </div>
                  <div className="border-t border-[#0f798c]/30 pt-4 flex justify-between items-center w-full mt-4">
                    <span className="text-[15px] text-[#232323] font-medium">Total Duties</span>
                    <span className="text-[20px] font-bold text-[#0f798c]">
                      $
                      {calcResult.totalDuties.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Right Breakdown Panel */}
                <div className="flex-1 border border-[#dadada] p-6 flex flex-col justify-between min-h-[220px] bg-white">
                  <div>
                    <span className="text-[15px] font-bold text-[#232323] block mb-4 tracking-wider uppercase">
                      COST BREAKDOWN
                    </span>
                    <div className="flex flex-col gap-3 text-[14px]">
                      <div className="flex justify-between text-[#232323]">
                        <span className="text-[#555555]">Base Cost</span>
                        <span className="font-semibold">
                          $
                          {calcResult.baseCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#232323]">
                        <span className="text-[#555555]">Total Duties</span>
                        <span className="font-semibold">
                          $
                          {calcResult.totalDuties.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#232323]">
                        <span className="text-[#555555]">Harbor Maintenance Fee (HMF)</span>
                        <span className="font-semibold">
                          $
                          {calcResult.hmf.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#232323]">
                        <span className="text-[#555555]">Merchandise Processing Fee (MPF)</span>
                        <span className="font-semibold">
                          $
                          {calcResult.mpf.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-[#dadada] pt-4 flex justify-between items-center w-full mt-4">
                    <span className="text-[15px] font-bold text-[#232323]">Total Cost</span>
                    <span className="text-[20px] font-bold text-[#0F798C]">
                      $
                      {calcResult.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-[#7A7A7A] text-center">
                <Info className="w-8 h-8 text-[#0F798C] mb-2" />
                Add a commodity code and shipment value to calculate import duties
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Chevron Down Icon
function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
