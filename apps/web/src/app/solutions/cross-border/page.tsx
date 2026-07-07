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

const firstBlockFeatures = [
  {
    title: "Free Pickup Service",
    desc: "One-stop pickup available in 80+ cities in China, optimizing your first-mile logistics cost.",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: "Real-Time Tracking",
    desc: "Full-process, end-to-end shipment visibility for peace of mind and operational excellence.",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    title: "Versatile Shipping Options",
    desc: "Specialized lanes for apparel, cosmetics, and electronics with customized packaging support.",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    title: "Global Platform Partner",
    desc: "Recognized by major global e-commerce platforms as a top-tier recommended logistics provider.",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  }
];

const tabData = {
  speed: [
    {
      title: "Ecom Express Priority",
      desc: "Fastest delivery for time-critical goods. 3-5 business days average transit.",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth={2.5} />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5V17M10.5 17.5h3" />
        </svg>
      )
    },
    {
      title: "Ecom Express Standard",
      desc: "Balanced speed and cost for volume shipments. 6-10 days transit.",
      image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth={2.5} />
          <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth={2.5} />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 17h2m10 0h2m-4 0H9m-4-1v-5h10v6m4-5v5m0-5h-4v-5H5v5" />
        </svg>
      )
    },
    {
      title: "Ecom Express Economy",
      desc: "Cost-effective shipping without compromising reliability. 10-14 days transit.",
      image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth={2.5} />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V17m-6-4.5A6 6 0 0012 19a6 6 0 006-6M6 12.5h2m8 0h2" />
        </svg>
      )
    }
  ],
  category: [
    {
      title: "Special Apparel Lane",
      desc: "Optimized logistics for fashion and garments, featuring moisture protection and hanger support.",
      image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    },
    {
      title: "Cosmetics & Liquids Lane",
      desc: "Certified safe transit for liquid, powder, and sensitive beauty products under strict global standards.",
      image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      title: "High-Value Electronics Lane",
      desc: "Secure, anti-static, and fully-insured shipping lanes for consumer electronics and components.",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    }
  ],
  island: [
    {
      title: "Japan Direct Priority",
      desc: "Premium direct air cargo routes to Tokyo and Osaka, ensuring delivery within 3-4 business days.",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V8a2 2 0 00-2-2h-1a2 2 0 00-2-2v-.065M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      )
    },
    {
      title: "Taiwan Express Delivery",
      desc: "Fast-track sea and air freight connection to Taiwan with full import customs clearance support.",
      image: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9-2-9-18-9 18 9 2zm0 0v-8" />
        </svg>
      )
    },
    {
      title: "UK & European Hubs",
      desc: "Direct shipping to the UK and European gateways with integrated customs duty payment (DDP).",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ]
};

export default function CrossBorderPage() {
  const [activeTab, setActiveTab] = React.useState<"speed" | "category" | "island">("speed");

  return (
    <div className="flex flex-col w-full">
      {/* Block 1: Intro Cards */}
      <section className="w-full bg-[#f8fafc] border-b border-[#dadada] overflow-hidden">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] py-[60px] flex flex-col gap-[40px] overflow-hidden">
          <HexagonPattern />
          
          {/* Title Block */}
          <div className="flex flex-col relative z-10">
            <h1 className="text-[36px] md:text-[48px] font-semibold text-[#232323] leading-tight border-b-[6px] border-[#0f798c] pb-3 w-fit tracking-tight">
              Cross border Ecommerce
            </h1>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full relative z-10">
            {firstBlockFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="group flex flex-col gap-5 p-8 bg-white border border-[#DADADA] hover:bg-[#C9FFF9] hover:border-[#0F798C] transition-all duration-300 min-h-[224px] h-full cursor-pointer rounded-none"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#C9FFF9] group-hover:bg-[#0F798C] transition-all duration-300 shrink-0">
                  {feature.icon("w-6 h-6 text-[#0F798C] group-hover:text-white transition-all duration-300")}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-[20px] font-medium text-[#232323] leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-[14px] md:text-[16px] text-[#7A7A7A] leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Block 2: Logistics Solutions with Interactive Tabs */}
      <section className="w-full bg-[#f8fafc] border-b border-[#dadada] overflow-hidden">
        <div className="custom-container relative lg:border-x lg:border-[#dadada] bg-white !pl-4 !pr-4 md:!pl-[60px] md:!pr-[60px] py-[80px] flex flex-col gap-[40px] overflow-hidden">
          
          {/* Header text */}
          <div className="flex flex-col items-center text-center gap-3">
            <h2 className="text-[32px] md:text-[40px] font-semibold text-[#232323] leading-tight tracking-tight">
              Our Logistics Solutions
            </h2>
            <p className="text-[16px] md:text-[20px] text-[#7A7A7A] max-w-[700px] leading-relaxed font-normal">
              Tailored delivery services designed for global e-commerce scalability
            </p>
          </div>

          {/* Tab Selector Pills */}
          <div className="w-full flex justify-center">
            <div className="bg-[#C9FFF9] rounded-none p-[6px] flex items-center gap-3 w-full max-w-[580px] border-none outline-none">
              <button
                onClick={() => setActiveTab("speed")}
                className={`flex-1 h-11 px-2 whitespace-nowrap rounded-none text-[15px] md:text-[16px] font-bold transition-all duration-300 shrink-0 cursor-pointer border-none outline-none ${
                  activeTab === "speed"
                    ? "bg-[#0F798C] text-white"
                    : "bg-transparent text-[#232323] hover:text-[#0F798c]"
                }`}
              >
                Speed
              </button>
              <button
                onClick={() => setActiveTab("category")}
                className={`flex-1 h-11 px-2 whitespace-nowrap rounded-none text-[15px] md:text-[16px] font-bold transition-all duration-300 shrink-0 cursor-pointer border-none outline-none ${
                  activeTab === "category"
                    ? "bg-[#0F798C] text-white"
                    : "bg-transparent text-[#232323] hover:text-[#0F798c]"
                }`}
              >
                Category-Specific
              </button>
              <button
                onClick={() => setActiveTab("island")}
                className={`flex-1 h-11 px-2 whitespace-nowrap rounded-none text-[15px] md:text-[16px] font-bold transition-all duration-300 shrink-0 cursor-pointer border-none outline-none ${
                  activeTab === "island"
                    ? "bg-[#0F798C] text-white"
                    : "bg-transparent text-[#232323] hover:text-[#0F798c]"
                }`}
              >
                Island-Specific
              </button>
            </div>
          </div>

          {/* Solutions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {tabData[activeTab].map((card, idx) => (
              <div
                key={idx}
                className="group flex flex-col border border-[#DADADA] bg-white h-[450px] relative rounded-none hover:border-[#0F798C] transition-all duration-300"
              >
                {/* Image & badge */}
                <div className="relative w-full h-[200px] overflow-hidden shrink-0">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Floating round icon badge */}
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md absolute top-4 right-4 z-10 border border-[#FAFDFE]">
                    {card.icon("w-5 h-5 text-[#0F798C]")}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col p-6 flex-grow justify-between">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[20px] font-medium text-[#232323] leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-[14px] text-[#7A7A7A] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  {/* Details Button */}
                  <div className="flex justify-end w-full">
                    <button className="flex items-center gap-2 text-[16px] font-bold text-[#0F798C] hover:text-[#0b5c6b] transition-colors bg-transparent border-none outline-none cursor-pointer">
                      Details
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
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
