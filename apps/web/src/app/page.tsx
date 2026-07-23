"use client";

import { trpc } from "@web/lib/trpc";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck,
  FileDown,
  FileText,
  Globe,
  LineChart,
  MapPin,
  MessageSquare,
  Search,
  Truck,
} from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";
import heroPlane from "./hero-plane.png";

function PostCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border">
      <div className="h-[180px] animate-pulse bg-muted" />
      <div className="flex-1 p-4">
        <div className="mb-2 h-6 w-4/5 animate-pulse rounded bg-muted" />
        <div className="mb-1 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

const partnerLogos = Array.from({ length: 14 }, (_, i) => `/partner-logos/logo-${i + 1}.png`);

export default function HomePage() {
  const pathname = usePathname();
  const { data: posts, isLoading } = trpc.public.blog.listPosts.useQuery({ page: 1, perPage: 6 });

  const [activeCategory, setActiveCategory] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const categories = [
    {
      title: "Apparel Manufacturing",
      desc: "Designer fashion with premium materials, optimized for the US market.",
      src: "/solutions/category-1.png",
    },
    {
      title: "Agricultural Products",
      desc: "Organic fruits, premium coffee, and sustainable agriculture exported globally.",
      src: "/solutions/category-2.png",
    },
    {
      title: "Electronics & Accessories",
      desc: "High-tech components, consumer electronics, and smart accessories shipped securely.",
      src: "/solutions/category-3.png",
    },
    {
      title: "Handicrafts & Decor",
      desc: "Artisan-crafted home decor, bamboo weave, and traditional pottery with modern designs.",
      src: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600",
    },
    {
      title: "Footwear & Leather",
      desc: "Premium leather shoes, athletic footwear, and high-performance manufacturing.",
      src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800",
    },
    {
      title: "Seafood & Foodstuffs",
      desc: "ISO-certified frozen seafood, processed food, and traditional dried delicacies.",
      src: "https://images.unsplash.com/photo-1534482421-64566f976cfa?q=80&w=800",
    },
  ];

  const handleCategoryScroll = (index: number) => {
    const nextIdx = (index + categories.length) % categories.length;
    setActiveCategory(nextIdx);
    if (carouselRef.current) {
      const items = carouselRef.current.children;
      const activeItem = items[nextIdx] as HTMLElement;
      if (activeItem) {
        carouselRef.current.scrollTo({
          left: activeItem.offsetLeft - 0,
          behavior: "smooth",
        });
      }
    }
  };

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  return (
    <>
      {/* Hero Section */}
      <section className="w-full bg-white overflow-hidden">
        <div className="custom-container flex flex-col lg:flex-row items-center justify-between py-10 lg:py-0 lg:h-[472px] gap-8 lg:gap-0 lg:border-l lg:border-r lg:border-[#dadada] relative">
          {/* Left Content */}
          <div className="w-full lg:w-[819px] lg:pl-[60px] flex flex-col text-left justify-center shrink-0">
            <h1 className="text-[#232323] font-semibold text-[48px] md:text-[64px] tracking-tight leading-none mb-10">
              Track & Trace
            </h1>

            {/* Search Input Box */}
            <div className="flex w-full max-w-[676px] h-[56px] items-center mb-10">
              <input
                type="text"
                placeholder="Enter your tracking nummber"
                className="flex-1 h-full px-4 border border-[#dadada] border-r-0 text-[#232323] text-[16px] outline-none placeholder:text-[#8d8d8d] bg-transparent rounded-none"
              />
              <button className="bg-[#232323] text-white font-bold text-[16px] w-[100px] h-full hover:bg-slate-800 active:bg-black transition-colors shrink-0 rounded-none">
                Track
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <button className="bg-[#0f798c] text-white font-bold text-[16px] w-[182px] h-[56px] hover:bg-[#0c6271] active:bg-[#094a55] transition-colors flex items-center justify-center rounded-none">
                Tariff Simulator
              </button>
              <button className="bg-[#eeeeee] border border-[#dadada] text-[#232323] font-bold text-[16px] w-[182px] h-[56px] hover:bg-slate-200 active:bg-slate-350 transition-colors flex items-center justify-center gap-2 rounded-none">
                Tariff Simulator <ArrowRight className="h-5 w-5 text-[#232323]" />
              </button>
            </div>
          </div>

          {/* Right Image */}
          <div className="w-full max-w-[547px] h-[300px] lg:h-[472px] relative rounded-none overflow-hidden shrink-0">
            <div
              className="absolute left-0 right-0 w-full h-[744px] animate-plane-wing"
              style={{ top: "-60px" }}
            >
              <Image
                src={heroPlane}
                alt="Track & Trace Airplane"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          {/* Bottom Divider Line strictly inside 1520px */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#dadada] hidden lg:block" />
        </div>
      </section>

      {/* Partner Logos Bar */}
      <section className="w-full h-[100px] bg-white border-b border-[#dadada] overflow-hidden">
        <div className="custom-container h-full flex items-center lg:border-l lg:border-r lg:border-[#dadada] overflow-hidden relative">
          <div className="w-full overflow-hidden relative flex items-center">
            {/* Gradient Fades on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee flex items-center gap-[15px]">
              {partnerLogos.map((src, i) => (
                <div
                  key={`set1-${i}`}
                  className="w-[140px] h-[50px] flex items-center justify-center shrink-0"
                >
                  <Image
                    src={src}
                    alt={`Partner Logo ${i + 1}`}
                    width={140}
                    height={50}
                    className="object-contain opacity-90 mix-blend-luminosity hover:opacity-100 hover:mix-blend-normal transition-all duration-300"
                    unoptimized
                  />
                </div>
              ))}
              {partnerLogos.map((src, i) => (
                <div
                  key={`set2-${i}`}
                  className="w-[140px] h-[50px] flex items-center justify-center shrink-0"
                >
                  <Image
                    src={src}
                    alt={`Partner Logo Duplicate ${i + 1}`}
                    width={140}
                    height={50}
                    className="object-contain opacity-90 mix-blend-luminosity hover:opacity-100 hover:mix-blend-normal transition-all duration-300"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Global Logistics Network */}
      <section className="w-full bg-[#f8fafc] border-b border-[#dadada] overflow-hidden">
        <div className="custom-container !pl-[60px] !pr-[60px] lg:!pl-[60px] lg:!pr-[60px] py-[80px] relative lg:border-l lg:border-r lg:border-[#dadada] bg-white overflow-hidden">
          {/* World Map Background (restricted to 1520px container) */}
          <div className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none">
            <Image
              src="/map-bg.png"
              alt="World Map Background"
              fill
              className="object-cover object-center"
              priority
              unoptimized
            />
          </div>

          <div className="text-left mb-12 relative z-10">
            <h2 className="text-[#232323] font-medium text-3xl md:text-[40px] tracking-tight leading-tight mt-2 text-center lg:text-left">
              Global Logistics Network: From <span className="text-[#0f798c]">Vietnam</span> to{" "}
              <span className="text-[#0f798c]">USA</span> (Nationwide Delivery)
            </h2>
          </div>

          <div className="relative w-full aspect-[1400/457] hidden lg:block z-10">
            {/* Left Locations List */}
            {/* Free pick-up cities */}
            <div className="absolute" style={{ left: "0px", top: "0px", width: "296px" }}>
              <div className="flex items-center w-[296px] h-[42px] border border-[#232323] bg-white p-1 mb-4 rounded-[6px]">
                <div className="w-[39px] h-[34px] bg-[#232323] flex items-center justify-center shrink-0 rounded-[6px]" />
                <span className="ml-3 text-[#232323] font-bold text-[14px]">Free pick-up city</span>
              </div>

              <div className="flex gap-4">
                {/* Left Column (Dark Box) */}
                <div className="w-[140px] bg-[#232323] rounded-[6px] p-4 flex flex-col text-white font-medium text-[13px] tracking-tight shadow-sm">
                  <div className="pb-2 border-b border-dashed border-white/20 text-white">
                    Ho Chi Minh
                  </div>
                  <div className="py-2 border-b border-dashed border-white/20 text-white">
                    Da Nang
                  </div>
                  <div className="py-2 border-b border-dashed border-white/20 text-white">
                    Binh Duong
                  </div>
                  <div className="pt-2 text-white">Dong Nai</div>
                </div>
                {/* Right Column (Dark Box) */}
                <div className="w-[140px] bg-[#232323] rounded-[6px] p-4 flex flex-col text-white font-medium text-[13px] tracking-tight h-fit shadow-sm">
                  <div className="pb-2 border-b border-dashed border-white/20 text-white">
                    Hanoi
                  </div>
                  <div className="pt-2 text-white">Bac Ninh</div>
                </div>
              </div>
            </div>

            {/* Shipping and pick-up location */}
            <div className="absolute" style={{ left: "0px", top: "266px", width: "296px" }}>
              <div className="flex items-center w-[296px] h-[42px] border border-[#232323] bg-white p-1 mb-4 rounded-[6px]">
                <div className="w-[39px] h-[34px] bg-[#0f798c] flex items-center justify-center shrink-0 rounded-[6px]" />
                <span className="ml-3 text-[#232323] font-bold text-[14px]">
                  Shiping and pick-up location
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center w-[140px] h-[42px] bg-[#0f798c] text-white font-bold text-[14px] rounded-[6px] shadow-sm">
                  Vietnam
                </div>
                <div className="flex items-center justify-center w-[140px] h-[42px] bg-[#0f798c] text-white font-bold text-[14px] rounded-[6px] shadow-sm">
                  USA
                </div>
              </div>
            </div>

            {/* Map Graphics */}
            {/* Vietnam Map */}
            <div
              className="absolute"
              style={{ left: "377px", top: "0px", width: "274.38px", height: "457.3px" }}
            >
              <Image
                src="/map-assets/vietnam.svg"
                alt="Vietnam Map"
                fill
                className="object-contain pointer-events-none"
                unoptimized
              />
            </div>

            {/* USA Map */}
            <div
              className="absolute"
              style={{ left: "751px", top: "0px", width: "649px", height: "457px" }}
            >
              <Image
                src="/map-assets/usa.svg"
                alt="USA Map"
                fill
                className="object-contain pointer-events-none"
                unoptimized
              />
            </div>

            {/* Dotted Curve Connecting Line with Mask Drawing Animation */}
            <div
              className="absolute"
              style={{ left: "602px", top: "169px", width: "248px", height: "22px" }}
            >
              <svg
                className="w-full h-full overflow-visible pointer-events-none"
                viewBox="0 0 250 22"
                fill="none"
              >
                <defs>
                  <mask id="curve-mask">
                    {/* Solid path inside mask that draws itself */}
                    <path
                      d="M 0 19 Q 125 -15 250 19"
                      fill="none"
                      stroke="white"
                      strokeWidth="24"
                      strokeLinecap="round"
                      className="animate-mask-draw"
                    />
                  </mask>
                </defs>

                {/* The exact Figma vector path of Node 119:4481 masked */}
                <g mask="url(#curve-mask)">
                  <path
                    d="M0.971926 18.0828L-0.000153546 18.3305L0.495287 20.2747L1.46737 20.027L1.21965 19.0549L0.971926 18.0828ZM250 19.0549L241.944 10.7316L238.764 21.8698L250 19.0549ZM6.15937 18.8377L7.13215 18.5928L6.64218 16.6472L5.66941 16.8922L5.91439 17.865L6.15937 18.8377ZM15.0821 14.5644L14.1071 14.8003L14.579 16.7503L15.554 16.5144L15.3181 15.5394L15.0821 14.5644ZM24.981 14.2944L25.959 14.071L25.5122 12.1151L24.5342 12.3385L24.7576 13.3165L24.981 14.2944ZM34.0378 10.2439L33.0564 10.4519L33.4726 12.4146L34.4539 12.2065L34.2458 11.2252L34.0378 10.2439ZM43.9239 10.2843L44.9087 10.0935L44.5272 8.12381L43.5424 8.31456L43.7331 9.2994L43.9239 10.2843ZM53.1197 6.55395L52.1314 6.7257L52.4749 8.70237L53.4632 8.53062L53.2915 7.54228L53.1197 6.55395ZM62.996 6.9731L63.9877 6.82153L63.6845 4.83827L62.6929 4.98984L62.8445 5.98147L62.996 6.9731ZM72.3238 3.62238L71.3291 3.7527L71.5898 5.74199L72.5844 5.61167L72.4541 4.61703L72.3238 3.62238ZM82.1939 4.45999L83.1912 4.35168L82.9746 2.35712L81.9773 2.46542L82.0856 3.4627L82.1939 4.45999ZM91.6436 1.52583L90.6442 1.61154L90.8156 3.61049L91.8151 3.52478L91.7294 2.52531L91.6436 1.52583ZM101.468 2.80875L102.469 2.74611L102.344 0.743735L101.343 0.806373L101.405 1.80756L101.468 2.80875ZM111.066 0.311806L110.064 0.351043L110.142 2.3558L111.145 2.31656L111.105 1.31419L111.066 0.311806ZM120.807 2.05176L121.81 2.03605L121.778 0.0300058L120.775 0.045712L120.791 1.04874L120.807 2.05176ZM130.49 0.00790985L129.487 6.27818e-06L129.471 2.00624L130.474 2.01414L130.482 1.01103L130.49 0.00790985ZM140.145 2.20419L141.148 2.23569L141.211 0.230384L140.208 0.198882L140.176 1.20153L140.145 2.20419ZM149.922 0.618222L148.92 0.563223L148.81 2.5665L149.812 2.6215L149.867 1.61986L149.922 0.618222ZM159.468 3.26474L160.468 3.34304L160.625 1.34287L159.625 1.26456L159.547 2.26465L159.468 3.26474ZM169.311 2.13571L168.313 2.03435L168.11 4.03037L169.108 4.13174L169.209 3.13372L169.311 2.13571ZM178.725 5.21963L179.72 5.34373L179.968 3.35284L178.973 3.22875L178.849 4.22419L178.725 5.21963ZM188.607 4.54017L187.614 4.39372L187.321 6.37852L188.314 6.52497L188.46 5.53257L188.607 4.54017ZM197.87 8.04379L198.859 8.21217L199.196 6.23434L198.207 6.06596L198.039 7.05487L197.87 8.04379ZM207.77 7.80174L206.785 7.61188L206.405 9.58191L207.39 9.77177L207.58 8.78675L207.77 7.80174ZM216.869 11.7043L217.85 11.9151L218.271 9.95367L217.291 9.74283L217.08 10.7236L216.869 11.7043ZM226.767 11.8844L225.791 11.6531L225.329 13.6053L226.305 13.8366L226.536 12.8605L226.767 11.8844ZM235.695 16.1638L236.666 16.4151L237.168 14.4727L236.197 14.2215L235.946 15.1926L235.695 16.1638ZM245.578 16.7491L244.612 16.4785L244.071 18.4104L245.037 18.681L245.308 17.7151L245.578 16.7491ZM1.21965 19.0549L1.46737 20.027C3.00721 19.6346 4.57118 19.2377 6.15937 18.8377L5.91439 17.865L5.66941 16.8922C4.07894 17.2927 2.51308 17.6901 0.971926 18.0828L1.21965 19.0549ZM15.3181 15.5394L15.554 16.5144C18.616 15.7733 21.7582 15.0306 24.981 14.2944L24.7576 13.3165L24.5342 12.3385C21.3019 13.0768 18.1511 13.8216 15.0821 14.5644L15.3181 15.5394ZM34.2458 11.2252L34.4539 12.2065C37.5431 11.5516 40.6998 10.9087 43.9239 10.2843L43.7331 9.2994L43.5424 8.31456C40.3059 8.9414 37.1377 9.58663 34.0378 10.2439L34.2458 11.2252ZM53.2915 7.54228L53.4632 8.53062C56.5824 7.98857 59.76 7.4677 62.996 6.9731L62.8445 5.98147L62.6929 4.98984C59.4429 5.48659 56.2518 6.00966 53.1197 6.55395L53.2915 7.54228ZM72.4541 4.61703L72.5844 5.61167C75.7358 5.19877 78.939 4.81346 82.1939 4.45999L82.0856 3.4627L81.9773 2.46542C78.7073 2.82054 75.4894 3.20761 72.3238 3.62238L72.4541 4.61703ZM91.7294 2.52531L91.8151 3.52478C94.9865 3.25282 98.2042 3.01296 101.468 2.80875L101.405 1.80756L101.343 0.806373C98.0632 1.01156 94.8301 1.25258 91.6436 1.52583L91.7294 2.52531ZM111.105 1.31419L111.145 2.31656C114.324 2.19213 117.544 2.10284 120.807 2.05176L120.791 1.04874L120.775 0.045712C117.497 0.0970457 114.261 0.186763 111.066 0.311806L111.105 1.31419ZM130.482 1.01103L130.474 2.01414C133.66 2.03924 136.883 2.10171 140.145 2.20419L140.176 1.20153L140.208 0.198882C136.931 0.0959099 133.691 0.0331334 130.49 0.00790985L130.482 1.01103ZM149.867 1.61986L149.812 2.6215C152.996 2.79634 156.215 3.00999 159.468 3.26474L159.547 2.26465L159.625 1.26456C156.356 1.0086 153.122 0.793915 149.922 0.618222L149.867 1.61986ZM169.209 3.13372L169.108 4.13174C172.282 4.45411 175.488 4.81608 178.725 5.21963L178.849 4.22419L178.973 3.22875C175.721 2.8233 172.5 2.45962 169.311 2.13571L169.209 3.13372ZM188.46 5.53257L188.314 6.52497C191.47 6.99078 194.656 7.49647 197.87 8.04379L198.039 7.05487L198.207 6.06596C194.978 5.51615 191.778 5.00814 188.607 4.54017L188.46 5.53257ZM207.58 8.78675L207.39 9.77177C210.523 10.3757 213.683 11.0193 216.869 11.7043L217.08 10.7236L217.291 9.74283C214.091 9.05485 210.917 8.40833 207.77 7.80174L207.58 8.78675ZM226.536 12.8605L226.305 13.8366C229.41 14.5725 232.54 15.3478 235.695 16.1638L235.946 15.1926L236.197 14.2215C233.029 13.402 229.886 12.6234 226.767 11.8844L226.536 12.8605Z"
                    fill="#232323"
                  />
                </g>
              </svg>
            </div>

            {/* Vietnam Location Pin */}
            <div
              className="absolute"
              style={{ left: "558px", top: "166px", width: "40px", height: "40px" }}
            >
              <Image
                src="/map-assets/pin-vn.svg"
                alt="Vietnam Location Pin"
                fill
                className="object-contain pointer-events-none"
                unoptimized
              />
            </div>

            {/* USA Location Pin */}
            <div
              className="absolute"
              style={{ left: "848px", top: "166px", width: "40px", height: "40px" }}
            >
              <Image
                src="/map-assets/pin-us.svg"
                alt="USA Location Pin"
                fill
                className="object-contain pointer-events-none"
                unoptimized
              />
            </div>
          </div>

          {/* Mobile Layout (Responsive stacked flex) */}
          <div className="block lg:hidden space-y-8 relative z-10">
            {/* Free pick-up cities */}
            <div className="space-y-4">
              <div className="flex items-center w-[296px] h-[42px] border border-[#232323] bg-white p-1 rounded-[6px]">
                <div className="w-[39px] h-[34px] bg-[#232323] flex items-center justify-center shrink-0 rounded-[6px]" />
                <span className="ml-3 text-[#232323] font-bold text-[14px]">Free pick-up city</span>
              </div>
              <div className="flex gap-4">
                <div className="w-[140px] bg-[#232323] rounded-[6px] p-4 flex flex-col text-white font-medium text-[13px] shadow-sm">
                  <div className="pb-2 border-b border-dashed border-white/20 text-white">
                    Ho Chi Minh
                  </div>
                  <div className="py-2 border-b border-dashed border-white/20 text-white">
                    Da Nang
                  </div>
                  <div className="py-2 border-b border-dashed border-white/20 text-white">
                    Binh Duong
                  </div>
                  <div className="pt-2 text-white">Dong Nai</div>
                </div>
                <div className="w-[140px] bg-[#232323] rounded-[6px] p-4 flex flex-col text-white font-medium text-[13px] h-fit shadow-sm">
                  <div className="pb-2 border-b border-dashed border-white/20 text-white">
                    Hanoi
                  </div>
                  <div className="pt-2 text-white">Bac Ninh</div>
                </div>
              </div>
            </div>

            {/* Shipping and pick-up location */}
            <div className="space-y-4">
              <div className="flex items-center w-[296px] h-[42px] border border-[#232323] bg-white p-1 rounded-[6px]">
                <div className="w-[39px] h-[34px] bg-[#0f798c] flex items-center justify-center shrink-0 rounded-[6px]" />
                <span className="ml-3 text-[#232323] font-bold text-[14px]">
                  Shiping and pick-up location
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center w-[140px] h-[42px] bg-[#0f798c] text-white font-bold text-[14px] rounded-[6px] shadow-sm">
                  Vietnam
                </div>
                <div className="flex items-center justify-center w-[140px] h-[42px] bg-[#0f798c] text-white font-bold text-[14px] rounded-[6px] shadow-sm">
                  USA
                </div>
              </div>
            </div>

            {/* Map Visuals (scaled aspect) */}
            <div className="relative w-full aspect-[700/400] bg-transparent mt-6 overflow-hidden border border-slate-100 rounded-lg p-4">
              {/* Vietnam */}
              <div
                className="absolute"
                style={{ left: "5%", top: "5%", width: "35%", height: "90%" }}
              >
                <Image
                  src="/map-assets/vietnam.svg"
                  alt="Vietnam Map"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {/* USA */}
              <div
                className="absolute"
                style={{ left: "48%", top: "15%", width: "48%", height: "70%" }}
              >
                <Image
                  src="/map-assets/usa.svg"
                  alt="USA Map"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {/* Curve */}
              <div
                className="absolute"
                style={{ left: "28%", top: "42%", width: "22%", height: "10%" }}
              >
                <Image
                  src="/map-assets/curve.svg"
                  alt="Curve"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {/* Pins */}
              <div
                className="absolute"
                style={{ left: "24%", top: "40%", width: "6%", height: "10%" }}
              >
                <Image
                  src="/map-assets/pin-vn.svg"
                  alt="Pin VN"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div
                className="absolute"
                style={{ left: "46%", top: "40%", width: "6%", height: "10%" }}
              >
                <Image
                  src="/map-assets/pin-us.svg"
                  alt="Pin US"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ecom Express */}
      <section className="w-full bg-white flex flex-col border-b border-[#dadada]">
        <div className="custom-container border-x border-solid border-[#dadada] flex flex-col bg-white w-full">
          {/* Title Row (49:486) */}
          <div className="text-center py-[40px] border-b border-solid border-[#dadada]">
            <h2 className="text-[#232323] font-semibold text-3xl md:text-[52px] md:leading-[72px] tracking-tight">
              Why <span className="text-[#0F798C]">Ecom Express</span>
            </h2>
          </div>

          {/* Cards Row (49:488) */}
          <div className="flex flex-col md:flex-row bg-white w-full">
            {/* Card 1 */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-[40px] px-[24px] border-b md:border-b-0 border-[#dadada] last:border-b-0">
              <span className="text-[#232323] font-medium text-3xl md:text-[40px] leading-[48px] mb-[20px]">
                1000+
              </span>
              <p className="text-[#7A7A7A] text-[15px] md:text-[20px] font-normal leading-[24px] tracking-[0.24px] max-w-[280px]">
                Processed shipments every single day
              </p>
            </div>
            {/* Card 2 */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-[40px] px-[24px] border-b md:border-b-0 border-[#dadada] last:border-b-0">
              <span className="text-[#232323] font-medium text-3xl md:text-[40px] leading-[48px] mb-[20px]">
                1.5M+
              </span>
              <p className="text-[#7A7A7A] text-[15px] md:text-[20px] font-normal leading-[24px] tracking-[0.24px] max-w-[280px]">
                Successful deliveries completed nationwide safely
              </p>
            </div>
            {/* Card 3 */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-[40px] px-[24px] border-b md:border-b-0 border-[#dadada] last:border-b-0">
              <span className="text-[#232323] font-medium text-3xl md:text-[40px] leading-[48px] mb-[20px]">
                9 Zones
              </span>
              <p className="text-[#7A7A7A] text-[15px] md:text-[20px] font-normal leading-[24px] tracking-[0.24px] max-w-[280px]">
                Comprehensive coverage across the U.S.
              </p>
            </div>
            {/* Card 4 */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-[40px] px-[24px]">
              <span className="text-[#232323] font-medium text-3xl md:text-[40px] leading-[48px] mb-[20px]">
                750+
              </span>
              <p className="text-[#7A7A7A] text-[15px] md:text-[20px] font-normal leading-[24px] tracking-[0.24px] max-w-[280px]">
                Trusted partners choose our services
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid of 3 Cards (Figma 119:1018) */}
      <section className="w-full bg-[#FAFDFE] flex flex-col border-b border-[#dadada]">
        <div className="custom-container border-x border-solid border-[#dadada] !px-[16px] md:!px-[82px] py-[60px] flex flex-col lg:flex-row justify-between bg-[#FAFDFE] w-full gap-10 lg:gap-0">
          {/* Column 1: 24/7 Dedicated Support */}
          <div className="max-w-[412px] w-full flex flex-col gap-[40px]">
            {/* Widget: Chat Box */}
            <div className="h-[240px] w-full bg-[#FDFFFF] border border-[#dadada] rounded-[12px] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group/chat">
              {/* User Chat Bubble */}
              <div className="flex items-start gap-3 justify-end transition-all duration-500">
                <div className="bg-[#232323] text-white text-[13px] md:text-[14px] leading-relaxed p-3 rounded-2xl rounded-tr-none max-w-[80%] font-normal shadow-sm">
                  Can you handle export procedures and taxes in Vietnam? 😗
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-gray-300">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80"
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Support Agent Chat Bubble */}
              <div className="flex items-start gap-3 justify-start transition-all duration-500 delay-200">
                <div className="w-8 h-8 rounded-full bg-[#232323] flex items-center justify-center text-white shrink-0 border border-gray-700 font-bold text-[11px]">
                  EE
                </div>
                <div className="bg-white text-[#232323] text-[13px] md:text-[14px] leading-relaxed p-3 rounded-2xl rounded-tl-none max-w-[80%] font-normal border border-[#dadada] shadow-sm">
                  Sure! We handle all export docs and tax filings, with 24/7 support. Shall we go
                  into the details?
                </div>
              </div>
            </div>

            {/* Text & Button */}
            <div className="flex flex-col gap-6">
              <h3 className="text-[#232323] font-medium text-2xl md:text-[32px] md:leading-[40px] tracking-tight">
                24/7 Dedicated Support
              </h3>
              <button className="bg-[#eeeeee] border border-[#dadada] text-[#232323] font-bold text-[16px] h-[56px] w-full md:w-[186px] transition-all duration-300 hover:bg-[#e0e0e0] flex items-center justify-center gap-2 shrink-0 group rounded-none">
                Contact us now{" "}
                <ArrowRight className="h-5 w-5 text-[#232323] group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Column 2: Fast & Reliable Shipping */}
          <div className="max-w-[412px] w-full flex flex-col gap-[40px]">
            {/* Widget: Overlapping Tracking Cards */}
            <div className="h-[240px] w-full relative group/track">
              {/* Main Card (Track & Trace) */}
              <div className="absolute left-0 top-0 w-[90%] md:w-[350px] bg-white border border-[#dadada] rounded-[12px] p-4 shadow-sm z-10 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-[#dadada] pb-2">
                  <span className="font-semibold text-[11px] text-[#232323] uppercase tracking-wider">
                    Track & Trace
                  </span>
                  <span className="text-[10px] text-[#0f798c] font-semibold hover:underline cursor-pointer">
                    View all
                  </span>
                </div>
                {/* Simulated Input */}
                <div className="flex items-center gap-2 border border-[#dadada] rounded-lg px-2.5 py-1.5 bg-[#fcfcfc]">
                  <span className="text-[10px] text-[#7A7A7A] flex-1 truncate">
                    Enter Tracking ID / AWB
                  </span>
                  <Search className="h-3.5 w-3.5 text-[#232323]" />
                </div>
                {/* List item */}
                <div className="flex items-start gap-2.5 text-[10px] text-[#232323]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 flex flex-col">
                    <span className="font-semibold">EEX12948579AN</span>
                    <div className="flex justify-between text-[#7A7A7A] mt-0.5">
                      <span className="text-emerald-600 font-medium">Delivered</span>
                      <span>May 27, 2026 | 02:45 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Overlapping Card (Performance) */}
              <div className="absolute right-0 bottom-0 w-[70%] md:w-[250px] bg-white border border-[#dadada] rounded-[12px] p-3 shadow-md z-20 flex flex-col gap-2 transition-all duration-300 group-hover/track:translate-x-1 group-hover/track:-translate-y-1">
                <div className="flex justify-between items-center border-b border-[#dadada] pb-1.5">
                  <span className="font-semibold text-[9px] text-[#232323] uppercase tracking-wider">
                    Performance
                  </span>
                  <span className="text-[9px] text-[#0f798c] font-semibold hover:underline cursor-pointer">
                    View all
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="flex flex-col bg-[#FAFDFE] p-1.5 border border-[#dadada] rounded">
                    <span className="text-[#7A7A7A] truncate">Avg Delivery Time</span>
                    <span className="font-bold text-[#232323] text-[11px] mt-0.5">1.62 Days</span>
                  </div>
                  <div className="flex flex-col bg-[#FAFDFE] p-1.5 border border-[#dadada] rounded">
                    <span className="text-[#7A7A7A] truncate">On-Time Rate</span>
                    <span className="font-bold text-[#232323] text-[11px] mt-0.5">93.75%</span>
                  </div>
                  <div className="flex flex-col bg-[#FAFDFE] p-1.5 border border-[#dadada] rounded">
                    <span className="text-[#7A7A7A] truncate">RTO Rate</span>
                    <span className="font-bold text-[#232323] text-[11px] mt-0.5">0.25%</span>
                  </div>
                  <div className="flex flex-col bg-[#FAFDFE] p-1.5 border border-[#dadada] rounded">
                    <span className="text-[#7A7A7A] truncate">Total COD</span>
                    <span className="font-bold text-[#232323] text-[11px] mt-0.5">$14,850</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text & Button */}
            <div className="flex flex-col gap-6">
              <h3 className="text-[#232323] font-medium text-2xl md:text-[32px] md:leading-[40px] tracking-tight">
                Fast & Reliable Shipping
              </h3>
              <button className="bg-[#eeeeee] border border-[#dadada] text-[#232323] font-bold text-[16px] h-[56px] w-full md:w-[188px] transition-all duration-300 hover:bg-[#e0e0e0] flex items-center justify-center gap-2 shrink-0 group rounded-none">
                Track and Trace{" "}
                <ArrowRight className="h-5 w-5 text-[#232323] group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Column 3: Compliant Export Process */}
          <div className="max-w-[412px] w-full flex flex-col gap-[40px]">
            {/* Widget: Verified Reports List */}
            <div className="h-[240px] w-full bg-white border border-[#dadada] rounded-[12px] flex flex-col shadow-sm relative overflow-hidden group/reports">
              {/* Header Bar */}
              <div className="bg-[#232323] text-white py-2 px-4 text-[12px] font-bold tracking-wider uppercase flex items-center justify-between">
                <span>Available Verified Reports</span>
              </div>
              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-[11px]">
                {[
                  "Official Declaration File (VN-EXD-2026-05)",
                  "Tax & Duty Paid Certificate",
                  "Commercial Documentation Package",
                  "Bill of Lading",
                  "Invoice",
                  "Packing List",
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#fcfcfc] border border-[#dadada] p-2 rounded hover:bg-[#FAFDFE] transition-colors group/item"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[85%]">
                      <FileCheck className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span className="text-[#232323] truncate font-medium">{doc}</span>
                    </div>
                    <Download className="h-3.5 w-3.5 text-[#0f798c] hover:scale-110 transition-transform cursor-pointer group-hover/item:translate-y-[1px]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Text & Button */}
            <div className="flex flex-col gap-6">
              <h3 className="text-[#232323] font-medium text-2xl md:text-[32px] md:leading-[40px] tracking-tight">
                Compliant Export Process
              </h3>
              <button className="bg-[#eeeeee] border border-[#dadada] text-[#232323] font-bold text-[16px] h-[56px] w-full md:w-[195px] transition-all duration-300 hover:bg-[#e0e0e0] flex items-center justify-center gap-2 shrink-0 group rounded-none">
                Visit us Resource{" "}
                <ArrowRight className="h-5 w-5 text-[#232323] group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions by Category (Figma 129:253) */}
      <section className="w-full bg-white flex flex-col border-b border-[#dadada]">
        <div className="custom-container border-x border-solid border-[#dadada] !px-[16px] md:!px-[82px] py-[60px] flex flex-col gap-10 bg-white w-full">
          {/* Header Row */}
          <div className="flex justify-between items-end w-full">
            <h2 className="text-[#232323] font-medium text-2xl md:text-[32px] md:leading-[40px] tracking-tight">
              Solutions by Category
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCategoryScroll(activeCategory - 1)}
                className="h-14 w-14 border border-[#dadada] bg-white flex items-center justify-center hover:bg-slate-50 text-[#232323] transition-colors rounded-none"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => handleCategoryScroll(activeCategory + 1)}
                className="h-14 w-14 border border-[#dadada] bg-white flex items-center justify-center hover:bg-slate-50 text-[#232323] transition-colors rounded-none"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto scrollbar-none w-full h-[460px] select-none scroll-smooth"
          >
            {categories.map((cat, idx) => (
              <img
                key={idx}
                src={cat.src}
                alt={cat.title}
                onClick={() => handleCategoryScroll(idx)}
                className={`h-[460px] w-auto rounded-[12px] border border-[#dadada] shadow-sm cursor-pointer transition-all duration-500 shrink-0 ${
                  activeCategory === idx
                    ? "opacity-100 scale-[1.01]"
                    : "opacity-60 hover:opacity-90"
                }`}
              />
            ))}
          </div>

          {/* Bottom Category Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end w-full gap-6 md:gap-0 mt-2">
            <div className="flex flex-col gap-2 max-w-[774px]">
              <h3 className="text-[#232323] font-medium text-2xl md:text-[32px] md:leading-[40px] tracking-tight transition-all duration-300">
                {categories[activeCategory]?.title}
              </h3>
              <p className="text-[#7A7A7A] text-[15px] md:text-[16px] font-normal leading-relaxed transition-all duration-300">
                {categories[activeCategory]?.desc}
              </p>
            </div>
            <button className="bg-[#eeeeee] border border-[#dadada] text-[#232323] font-bold text-[16px] h-[56px] w-full md:w-[138px] transition-all duration-300 hover:bg-[#e0e0e0] flex items-center justify-center gap-2 shrink-0 group rounded-none">
              More Info{" "}
              <ArrowRight className="h-5 w-5 text-[#232323] group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
