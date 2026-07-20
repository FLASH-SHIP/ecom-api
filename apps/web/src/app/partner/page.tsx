"use client";

import React from "react";

const HexagonPattern = () => (
  <div 
    className="absolute inset-0 pointer-events-none opacity-[0.04]" 
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='%230f798c' fill-opacity='1' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l11 6.35 11-6.35V17.9L14 11.55 3 17.9z'/%3E%3C/svg%3E")`,
      backgroundSize: "28px 49px"
    }} 
  />
);

const partnerData = {
  marketplace: [
    {
      title: "Amazon",
      desc: "Amazon Global Selling Fast-track your store setup with support from dedicated Amazon account managers.",
      image: "/partner-assets/amazon.png"
    },
    {
      title: "Etsy",
      desc: "Showcase and sell your unique, handmade, and vintage goods to a global community of passionate buyers.",
      image: "/partner-assets/etsy.png"
    },
    {
      title: "Ebay",
      desc: "Tap into a massive global marketplace with dynamic auction-style and fixed-price selling options.",
      image: "/partner-assets/ebay.png"
    },
    {
      title: "Shopify",
      desc: "Build, customize, and scale your independent online brand with powerful e-commerce tools and total control.",
      image: "/partner-assets/shopify.png"
    },
    {
      title: "Tiktok",
      desc: "Turn viral moments into direct sales by showcasing products right within the entertainment feed.",
      image: "/partner-assets/tiktok.png"
    },
    {
      title: "Walmart",
      desc: "Expand your reach by listing products on one of the world's largest and most trusted retail marketplaces.",
      image: "/partner-assets/walmart.png"
    }
  ],
  payment: [
    {
      title: "Pingpong",
      desc: "Optimize your cross-border profits with low-cost international receiving accounts and fast supplier payouts.",
      image: "/partner-assets/pingpong.png"
    },
    {
      title: "Payoneer",
      desc: "Streamline your global business growth with flexible multi-currency accounts and seamless marketplace payouts.",
      image: "/partner-assets/payoneer.png"
    },
    {
      title: "Paypal",
      desc: "Boost checkout conversion rates globally by offering customers a highly trusted, secure, and familiar way to pay.",
      image: "/partner-assets/paypal.png"
    }
  ]
};

export default function PartnerPage() {
  const [activeTab, setActiveTab] = React.useState<"marketplace" | "payment">("marketplace");

  return (
    <section className="w-full bg-[#f8fafc] border-b border-[#dadada] overflow-hidden">
      <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] py-[60px] flex flex-col gap-[40px] overflow-hidden">
        <HexagonPattern />
        
        {/* Title Block */}
        <div className="flex flex-col relative z-10">
          <h1 className="text-[36px] md:text-[48px] font-semibold text-[#232323] leading-tight border-b-[6px] border-[#0f798c] pb-3 w-fit tracking-tight">
            Partner
          </h1>
        </div>

        {/* Tab Selector Pills (Centered in Figma) */}
        <div className="w-full flex justify-center relative z-10">
          <div className="bg-[#C9FFF9] rounded-none p-[6px] flex items-center gap-2 w-full max-w-[388px] overflow-x-auto scrollbar-none border-none outline-none">
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`h-11 w-[184px] rounded-none text-[15px] md:text-[16px] font-bold transition-all duration-300 shrink-0 cursor-pointer border-none outline-none flex items-center justify-center ${
                activeTab === "marketplace"
                  ? "bg-[#0F798C] text-white"
                  : "bg-transparent text-[#232323] hover:text-[#0F798c]"
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`h-11 w-[184px] rounded-none text-[15px] md:text-[16px] font-bold transition-all duration-300 shrink-0 cursor-pointer border-none outline-none flex items-center justify-center ${
                activeTab === "payment"
                  ? "bg-[#0F798C] text-white"
                  : "bg-transparent text-[#232323] hover:text-[#0F798c]"
              }`}
            >
              Payment solution
            </button>
          </div>
        </div>

        {/* Grid of Partners */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full relative z-10">
          {partnerData[activeTab].map((card, idx) => (
            <div
              key={idx}
              className="group flex flex-col border border-[#DADADA] bg-white h-[376px] relative rounded-none hover:border-[#0F798C] transition-all duration-300 overflow-hidden"
            >
              {/* Image */}
              <div className="relative w-full h-[200px] overflow-hidden shrink-0">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Content and Button Box */}
              <div className="flex flex-col px-6 pt-5 pb-6 flex-grow justify-between">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[20px] font-medium text-[#232323] leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[14px] text-[#7A7A7A] leading-relaxed line-clamp-2">
                    {card.desc}
                  </p>
                </div>

                {/* Explore Full-width light-gray Button */}
                <button className="flex items-center justify-center gap-2 w-full h-12 bg-[#eeeeee] hover:bg-[#e0e0e0] border border-[#dadada] text-[#232323] font-bold text-[16px] transition-all duration-300 rounded-none cursor-pointer outline-none shrink-0">
                  Explore
                  <svg
                    className="w-4.5 h-4.5 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
