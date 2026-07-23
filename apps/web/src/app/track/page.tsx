"use client";

import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  MapPin,
  Package,
  Plane,
  Search,
} from "lucide-react";
import NextLink from "next/link";
import type React from "react";
import { useState } from "react";

export default function TrackTracePage() {
  const [trackingNumber, setTrackingNumber] = useState("1ZB86780DA01972838");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber || "1ZB86780DA01972838");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* Merged Track & Trace Page Box */}
      <section className="w-full bg-white relative z-20">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] pt-[60px] pb-16 flex flex-col gap-12">
          {/* First Block - Title & Search Input (Figma 156:169) */}
          <div className="flex flex-col gap-8 w-full relative z-10">
            {/* Title Block */}
            <div className="flex flex-col">
              <h1 className="text-[36px] md:text-[48px] font-semibold text-[#232323] leading-tight border-b-[6px] border-[#0f798c] pb-3 w-fit tracking-tight">
                Track a Package
              </h1>
            </div>

            {/* Search Input Box Frame */}
            <form
              onSubmit={handleTrack}
              className="flex w-full max-w-[676px] h-[56px] items-center"
            >
              <div className="flex-1 h-full relative flex items-center border border-[#dadada] border-r-0 bg-transparent">
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter your tracking number"
                  className="w-full h-full px-4 text-[#232323] text-[16px] outline-none placeholder:text-[#8d8d8d] bg-transparent rounded-none border-none"
                />
              </div>
              <button
                type="submit"
                className="bg-[#232323] text-white font-bold text-[16px] w-[100px] h-full hover:bg-slate-800 active:bg-black transition-all duration-300 shrink-0 rounded-none flex items-center justify-center cursor-pointer border-none outline-none"
              >
                Track
              </button>
            </form>
          </div>

          {/* Second Block - Detail Package (Figma 161:467) */}
          <div className="flex flex-col gap-8 w-full relative z-10 mt-2">
            {/* Section 2 Title */}
            <div className="flex flex-col">
              <h2 className="text-[28px] font-semibold text-[#232323] leading-tight border-b-[6px] border-[#0f798c] pb-3 w-fit tracking-tight">
                Detail Package
              </h2>
            </div>

            {/* Cards Layout Side-by-Side */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-[40px] items-stretch w-full mt-2">
              {/* Left Card */}
              <div className="flex-1 border border-[#dadada] flex flex-col bg-white overflow-hidden">
                {/* Top Banner (Light Green/Mint background) */}
                <div className="bg-[#EBFAEF] border-b border-[#dadada] px-4 md:px-[60px] py-[24px] flex flex-col gap-2">
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[22px] font-semibold text-[#144D22]">Delivered</span>
                      <CheckCircle2 className="w-6 h-6 text-[#144D22]" />
                    </div>
                    <div className="flex items-center gap-2 text-[14px]">
                      <span className="text-[#232323] font-mono font-medium">
                        {trackingNumber || "1ZB86780DA01972838"}
                      </span>
                      <button
                        onClick={handleCopyTracking}
                        className="text-[#232323] opacity-60 hover:opacity-100 border-none bg-transparent p-1 cursor-pointer flex items-center justify-center shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4.5 h-4.5 text-green-600" />
                        ) : (
                          <Copy className="w-4.5 h-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <span className="text-[#144D22] text-[14px] font-medium block">
                    Import fees have already been paid for this shipment
                  </span>
                </div>

                <div className="px-4 md:px-[60px] py-[32px] flex-grow flex flex-col">
                  <div className="text-[24px] md:text-[32px] font-medium leading-snug text-[#232323] mb-6">
                    Wednesday, June 17{" "}
                    <span className="text-[18px] md:text-[24px] text-[#7A7A7A] font-normal">
                      Handed to Receiver at
                    </span>{" "}
                    10:36 A.M.
                  </div>

                  {/* Delivered To & Received By columns (No dividers as per Figma) */}
                  <div className="flex flex-col sm:flex-row gap-8 sm:gap-24 mt-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] text-[#7A7A7A] font-normal">Delivered To</span>
                      <span className="text-[15px] font-semibold text-[#232323]">
                        SANTA FE SPRINGS, CA US
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16px] text-[#7A7A7A] font-normal">Received By</span>
                      <span className="text-[15px] font-semibold text-[#232323]">MARTIN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card */}
              <div className="w-full lg:w-[350px] shrink-0 border border-[#dadada] bg-white p-6 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-5 justify-center h-full">
                  {/* Row 1 */}
                  <div className="flex gap-4 items-start">
                    <MapPin className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-[#232323]">Delivered To</span>
                      <span className="text-[14px] text-[#7A7A7A] mt-0.5">
                        SANTA FE SPRINGS, CA US
                      </span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex gap-4 border-t border-[#dadada]/40 pt-4 items-start">
                    <Plane className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-[#232323]">Service</span>
                      <span className="text-[14px] text-[#7A7A7A] mt-0.5">
                        UPS Worldwide Express Saver®
                      </span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="flex gap-4 border-t border-[#dadada]/40 pt-4 items-start">
                    <Package className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-[#232323]">
                        Shipment Category
                      </span>
                      <span className="text-[14px] text-[#7A7A7A] mt-0.5">Package</span>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="flex gap-4 border-t border-[#dadada]/40 pt-4 items-start">
                    <Calendar className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-[#232323]">
                        Shipped / Billed On
                      </span>
                      <span className="text-[14px] text-[#7A7A7A] mt-0.5">06/15/2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Timeline Block */}
            {expanded && (
              <div className="flex flex-col gap-10 mt-10 border-t border-[#dadada] pt-10 w-full relative z-10">
                <div className="flex flex-col gap-8">
                  {/* Row 1 */}
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12 items-start">
                    <div className="flex flex-row md:flex-col shrink-0 w-full md:w-[150px] text-[15px] text-[#7A7A7A] gap-2 md:gap-1">
                      <span className="text-[#232323] font-medium">06/16/2026</span>
                      <span>2:25 P.M.</span>
                    </div>
                    <div className="flex-grow text-[15px] text-[#232323] leading-relaxed">
                      Import charges are due and payable at delivery.
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12 items-start border-t border-slate-100 pt-8">
                    <div className="flex flex-row md:flex-col shrink-0 w-full md:w-[150px] text-[15px] text-[#7A7A7A] gap-2 md:gap-1">
                      <span className="text-[#232323] font-medium">06/16/2026</span>
                      <span>12:46 A.M.</span>
                    </div>
                    <div className="flex-grow text-[15px] text-[#232323] leading-relaxed">
                      Export Scan <br />
                      Ho Chi Minh, Viet Nam
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12 items-start border-t border-slate-100 pt-8">
                    <div className="flex flex-row md:flex-col shrink-0 w-full md:w-[150px] text-[15px] text-[#7A7A7A] gap-2 md:gap-1">
                      <span className="text-[#232323] font-medium">06/15/2026</span>
                      <span>9:50 P.M.</span>
                    </div>
                    <div className="flex-grow text-[15px] text-[#232323] leading-relaxed">
                      The package is at the clearing agency awaiting final release.
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12 items-start border-t border-slate-100 pt-8">
                    <div className="flex flex-row md:flex-col shrink-0 w-full md:w-[150px] text-[15px] text-[#7A7A7A] gap-2 md:gap-1">
                      <span className="text-[#232323] font-medium">06/15/2026</span>
                      <span>7:26 A.M.</span>
                    </div>
                    <div className="flex-grow flex flex-col gap-1 text-[15px]">
                      <h4 className="font-semibold text-[#232323] text-[16px]">
                        We Have Your Package
                      </h4>
                      <p className="text-[#232323] leading-relaxed">
                        Arrived at Facility <br />
                        Ho Chi Minh City, Viet Nam
                      </p>
                    </div>
                  </div>

                  {/* Row 5 */}
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12 items-start border-t border-slate-100 pt-8">
                    <div className="flex flex-row md:flex-col shrink-0 w-full md:w-[150px] text-[15px] text-[#7A7A7A] gap-2 md:gap-1">
                      <span className="text-[#232323] font-medium">06/15/2026</span>
                      <span>9:02 P.M.</span>
                    </div>
                    <div className="flex-grow flex flex-col gap-1 text-[15px]">
                      <h4 className="font-semibold text-[#232323] text-[16px]">Label Created</h4>
                      <p className="text-[#232323] leading-relaxed">
                        Shipper created a label, UPS has not received the package yet. <br />
                        Viet Nam
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show/Hide Details Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[#0f798c] hover:text-[#0c6271] font-bold text-[14px] flex items-center gap-1.5 border-none bg-transparent cursor-pointer"
              >
                {expanded ? "Hide Details" : "Show Details"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
