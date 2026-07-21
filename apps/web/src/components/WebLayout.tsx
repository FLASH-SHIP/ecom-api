"use client";

import {
  ChevronDown,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  Package,
  User,
  X,
} from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { env } from "../env";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { label: "Solutions", href: "/solutions", hasDropdown: true },
  { label: "Ecom Ecosystem", href: "/ecosystem", hasDropdown: true },
  { label: "Track & Trace", href: "/track" },
  { label: "Resources", href: "/resources", hasDropdown: true, hasFlameIcon: true },
  { label: "Contact Us", href: "/contact" },
];

function Header({ isLoggedIn: loggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);
  const [ecosystemDropdownOpen, setEcosystemDropdownOpen] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const cleanPathname = pathname.startsWith(`/${currentLocale}/`)
    ? pathname.slice(currentLocale.length + 1)
    : pathname === `/${currentLocale}`
      ? "/"
      : pathname;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  const getCustomerHref = (href: string) => {
    return `${env.NEXT_PUBLIC_CUSTOMER_URL}${href === "/" ? "" : href}`;
  };

  function handleLogout() {
    setAvatarOpen(false);
    window.location.href = `${env.NEXT_PUBLIC_CUSTOMER_URL}/auth/logout`;
  }

  // Close avatar menu on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [avatarOpen]);

  return (
    <>
      {/* AppBar */}
      <header className="sticky top-0 z-50 border-b border-[#dadada] bg-white">
        <div className="custom-container flex h-[88px] items-center justify-between">
          {/* Left Block: Logo + Menu items */}
          <div className="flex items-center gap-[40px]">
            {/* Logo */}
            <NextLink
              href={getLocalizedHref("/")}
              className="flex shrink-0 items-center no-underline"
            >
              <svg width="132" height="60" viewBox="0 0 132 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[60px] w-[132px] shrink-0">
                <path d="M77.0552 26.2574V29.5127H64.2366V11.9834H76.7485V15.2386H68.044V19.0442H75.7306V22.2H68.044V26.2574H77.0552Z" fill="#0F798C"/>
                <path d="M78.8039 22.7767C78.8039 18.7193 81.7598 15.8386 85.9 15.8386C88.572 15.8386 90.6764 17.0651 91.5997 19.2696L88.7384 20.8972C88.0533 19.6209 87.0353 19.0441 85.8771 19.0441C84.0077 19.0441 82.5428 20.4232 82.5428 22.7767C82.5428 25.1303 84.0077 26.5093 85.8771 26.5093C87.0353 26.5093 88.0533 25.9591 88.7384 24.6563L91.5997 26.3104C90.6764 28.4651 88.572 29.7149 85.9 29.7149C81.7598 29.7149 78.8039 26.8342 78.8039 22.7767Z" fill="#0F798C"/>
                <path d="M92.6143 22.7767C92.6143 18.7193 95.5702 15.8386 99.6158 15.8386C103.661 15.8386 106.591 18.7193 106.591 22.7767C106.591 26.8342 103.658 29.7149 99.6158 29.7149C95.5735 29.7149 92.6143 26.8342 92.6143 22.7767ZM102.856 22.7767C102.856 20.4464 101.459 19.0441 99.6158 19.0441C97.7724 19.0441 96.3532 20.4464 96.3532 22.7767C96.3532 25.1071 97.7724 26.5093 99.6158 26.5093C101.459 26.5093 102.856 25.1071 102.856 22.7767Z" fill="#0F798C"/>
                <path d="M130.548 21.8022V29.516H126.858V22.4022C126.858 20.2243 125.935 19.2232 124.447 19.2232C122.793 19.2232 121.632 20.3503 121.632 22.7536V29.516H117.942V22.4022C117.942 20.2243 117.067 19.2232 115.531 19.2232C113.899 19.2232 112.741 20.3503 112.741 22.7536V29.516H109.051V16.0442H112.575V17.5956C113.521 16.442 114.94 15.842 116.571 15.842C118.346 15.842 119.86 16.5679 120.757 18.0464C121.775 16.6674 123.429 15.842 125.344 15.842C128.372 15.842 130.548 17.695 130.548 21.8022Z" fill="#0F798C"/>
                <path d="M1.41595 38.231V41.8641C1.41595 43.3194 2.17613 44.6685 3.41591 45.4011L23.8134 57.5105C25.0695 58.2564 26.6258 58.2564 27.8819 57.5105L48.2794 45.4011C49.5159 44.6652 50.2794 43.3194 50.2794 41.8641V38.231L25.8493 52.7138L1.41595 38.231Z" fill="#232323"/>
                <path d="M48.2794 14.0254L27.8819 1.91602C26.6258 1.17016 25.0695 1.17016 23.8134 1.91602L3.41591 14.0254C2.17939 14.7613 1.41595 16.1072 1.41595 17.5624V18.0564L25.846 32.5591L50.2761 18.0564V17.5624C50.2761 16.1072 49.5159 14.758 48.2761 14.0254H48.2794Z" fill="#232323"/>
                <path d="M8.25102 36.6331L1.41595 32.5757V24.4608L8.25102 28.5182V36.6331Z" fill="#0F798C"/>
                <path d="M49.5322 28.7536L41.0006 28.2265V29.8608L25.846 38.8574L10.6947 29.8608V37.979L25.8493 46.969V46.9724L41.0006 37.979V39.5403L49.5322 28.7536Z" fill="#0F798C"/>
                <path d="M64.2366 50.6884V36.8055H72.8628V38.0752H65.5677V43.0144H72.0732V44.2641H65.5677V49.4188H73.1336V50.6884H64.2366Z" fill="#232323"/>
                <path d="M74.282 50.6884L78.0209 45.3348L74.4614 40.2563H75.9002L78.7386 44.3403L81.5771 40.2563H82.98L79.4205 45.3348L83.1953 50.6884H81.7402L78.7386 46.3458L75.7208 50.6884H74.282Z" fill="#232323"/>
                <path d="M90.187 50.7878C89.4334 50.7878 88.7417 50.6088 88.1218 50.2508C87.4987 49.8928 86.9897 49.379 86.5949 48.7028V54.5337H85.3193V40.253H86.5427V42.3149C86.9277 41.6155 87.4367 41.0818 88.0696 40.7171C88.7058 40.3525 89.4105 40.1702 90.1903 40.1702C91.0875 40.1702 91.8933 40.3923 92.6078 40.8331C93.3191 41.2773 93.8802 41.8972 94.2881 42.6961C94.6959 43.495 94.8982 44.4199 94.8982 45.4641C94.8982 46.5083 94.6926 47.4464 94.2881 48.242C93.8802 49.0343 93.3191 49.6575 92.6078 50.105C91.8933 50.5558 91.0907 50.7779 90.1903 50.7779L90.187 50.7878ZM90.0957 49.5381C90.7677 49.5381 91.3648 49.3691 91.8933 49.0309C92.4186 48.6928 92.8395 48.2221 93.1494 47.6122C93.4594 47.0055 93.616 46.2895 93.616 45.4707C93.616 44.6519 93.4594 43.9558 93.1494 43.3492C92.8395 42.7425 92.4186 42.2652 91.8933 41.9204C91.3648 41.5757 90.7677 41.4033 90.0957 41.4033C89.4236 41.4033 88.8233 41.5757 88.2915 41.9204C87.7597 42.2652 87.3388 42.7392 87.0321 43.3492C86.7254 43.9558 86.5754 44.6652 86.5754 45.4707C86.5754 46.2762 86.7287 47.0055 87.0321 47.6122C87.3388 48.2221 87.7564 48.6928 88.2915 49.0309C88.8233 49.3691 89.4268 49.5381 90.0957 49.5381Z" fill="#232323"/>
                <path d="M97.5016 50.6884V40.2564H98.7251V42.2785C99.3352 40.8763 100.516 40.1768 102.265 40.1768V41.5459C102.206 41.5459 102.151 41.5459 102.102 41.5359C102.053 41.5293 102.007 41.526 101.958 41.526C100.963 41.526 100.183 41.8608 99.6223 42.5271C99.0579 43.1934 98.7773 44.1448 98.7773 45.3746V50.6884H97.5016Z" fill="#232323"/>
                <path d="M108.48 50.7879C107.498 50.7879 106.634 50.5591 105.893 50.105C105.149 49.6475 104.568 49.021 104.151 48.2221C103.733 47.4232 103.521 46.505 103.521 45.4741C103.521 44.4431 103.72 43.5282 104.125 42.726C104.526 41.9271 105.074 41.3006 105.769 40.8531C106.464 40.4022 107.253 40.1768 108.141 40.1768C109.028 40.1768 109.815 40.3989 110.503 40.8398C111.191 41.284 111.733 41.9039 112.128 42.7028C112.522 43.5017 112.721 44.4265 112.721 45.4707C112.721 45.537 112.718 45.6067 112.712 45.6796C112.705 45.7525 112.702 45.8288 112.702 45.9083H104.777C104.826 46.621 105.012 47.2542 105.342 47.8011C105.671 48.3514 106.108 48.7757 106.653 49.0807C107.198 49.3857 107.818 49.5381 108.513 49.5381C109.087 49.5381 109.625 49.4254 110.121 49.2C110.617 48.9746 111.048 48.6299 111.407 48.1691L112.124 49.0807C111.694 49.6343 111.165 50.0586 110.542 50.3503C109.919 50.642 109.231 50.7879 108.477 50.7879H108.48ZM104.797 44.8575H111.498C111.449 44.1713 111.276 43.568 110.976 43.0542C110.676 42.5404 110.281 42.1326 109.788 41.8343C109.296 41.5359 108.748 41.3868 108.134 41.3868C107.521 41.3868 106.976 41.5326 106.49 41.8243C106.004 42.116 105.612 42.5205 105.312 43.0442C105.012 43.568 104.839 44.1713 104.79 44.8575H104.797Z" fill="#232323"/>
                <path d="M117.86 50.7879C117.08 50.7879 116.346 50.6652 115.651 50.4199C114.956 50.1746 114.411 49.8697 114.017 49.4984L114.591 48.3879C114.963 48.7194 115.446 48.9978 116.046 49.2199C116.646 49.4453 117.279 49.5581 117.951 49.5581C118.849 49.5581 119.498 49.4023 119.893 49.0906C120.287 48.779 120.486 48.368 120.486 47.8509C120.486 47.4663 120.375 47.168 120.154 46.9492C119.932 46.7304 119.638 46.5647 119.273 46.452C118.907 46.3393 118.506 46.2431 118.069 46.1636C117.632 46.084 117.198 45.9912 116.767 45.8851C116.336 45.779 117.198 45.9912 116.767 45.8851C116.336 45.779 115.938 45.6232 115.573 45.4177C115.208 45.2122 114.914 44.9304 114.692 44.5757C114.47 44.2177 114.359 43.7437 114.359 43.147C114.359 42.2884 114.682 41.5757 115.328 41.0155C115.974 40.4553 116.898 40.1735 118.095 40.1735C118.705 40.1735 119.928 40.263 119.928 40.442C120.539 40.621 121.041 40.8564 121.439 41.1448L120.881 42.2752C120.46 41.9569 120.013 41.7282 119.534 41.5923C119.054 41.4531 118.575 41.3835 118.095 41.3835C117.243 41.3835 116.62 41.5492 116.225 41.8807C115.831 42.2122 115.632 42.6199 115.632 43.1105C115.619 43.5083 115.723 43.8166 115.945 44.042C116.167 44.2674 116.46 44.4431 116.826 44.5691C117.191 44.6951 117.592 44.7978 118.03 44.8774C118.467 44.9569 118.904 45.0531 119.341 45.1658C119.778 45.2785 120.18 45.431 120.545 45.6232C120.911 45.8155 121.204 46.0873 121.426 46.4354C121.648 46.7868 121.759 47.2442 121.759 47.8144Z" fill="#232323"/>
                <path d="M126.649 50.7879C125.87 50.7879 125.136 50.6652 124.441 50.4199C123.746 50.1746 123.201 49.8697 122.806 49.4984L123.38 48.3879C123.752 48.7194 124.235 48.9978 124.835 49.2199C125.436 49.4453 126.069 49.5581 126.741 49.5581C127.638 49.5581 128.287 49.4023 128.682 49.0906C129.077 48.779 129.276 48.368 129.276 47.8509C129.276 47.4663 129.165 47.168 128.943 46.9492C128.721 46.7304 128.427 46.5647 128.062 46.452C127.697 46.3393 127.295 46.2431 126.858 46.1636C126.421 46.084 125.987 45.9912 125.556 45.8851C125.126 45.779 124.728 45.6232 124.362 45.4177C123.997 45.2122 123.703 44.9304 123.481 44.5757C123.26 44.2177 123.149 43.7437 123.149 43.147C123.149 42.2884 123.472 41.5757 124.118 41.0155C124.764 40.4553 125.687 40.1735 126.884 40.1735C127.494 40.1735 128.108 40.263 128.718 40.442C129.328 40.621 129.83 40.8564 130.228 41.1448L129.671 42.2752C129.25 41.9569 128.803 41.7282 128.323 41.5923C127.843 41.4531 127.364 41.3835 126.884 41.3835C126.033 41.3835 125.41 41.5492 125.015 41.8807C124.62 42.2122 124.421 42.6199 124.421 43.1105C124.408 43.5083 124.512 43.8166 124.734 44.042C124.956 44.2674 125.25 44.4431 125.615 44.5691C125.981 44.6951 126.382 44.7978 126.819 44.8774C127.256 44.9569 127.693 45.0531 128.131 45.1658C128.568 45.2785 128.969 45.431 129.334 45.6232C129.7 45.8155 129.994 46.0873 130.215 46.4354C130.437 46.7868 130.548 47.2442 130.548 47.8144C130.548 47.8144 130.206 49.4354 129.524 49.9757C128.842 50.5161 127.883 50.7879 126.649 50.7879Z" fill="#232323"/>
              </svg>
            </NextLink>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-[30px] md:flex">
              {NAV_ITEMS.map((item) => {
                const active =
                  cleanPathname === item.href ||
                  (item.href !== "/" && cleanPathname.startsWith(item.href));
                
                if (item.label === "Solutions") {
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => setSolutionsDropdownOpen(true)}
                      onMouseLeave={() => setSolutionsDropdownOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
                        className={`flex items-center gap-1.5 px-1 py-1.5 text-[16px] font-medium transition-colors cursor-pointer ${
                          active || solutionsDropdownOpen
                            ? "text-[#0f798c] font-semibold"
                            : "text-[#232323] hover:text-[#0f798c]"
                        }`}
                      >
                        {item.label}
                        <ChevronDown className={`h-4 w-4 text-[#232323] opacity-60 transition-transform duration-300 ${
                          solutionsDropdownOpen ? "rotate-180 text-[#0f798c] opacity-100" : ""
                        }`} />
                      </button>

                      {/* pfh-navigation-menu solutions dropdown */}
                      <div className={`absolute top-full left-[-12px] pt-[6px] w-[210px] z-50 transition-all duration-300 origin-top-left ${
                        solutionsDropdownOpen 
                          ? "opacity-100 scale-100 visible" 
                          : "opacity-0 scale-95 invisible pointer-events-none"
                      }`}>
                        <div className="bg-white rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden py-0">
                          {[
                            { label: "Cross border Ecommerce", href: "/solutions/cross-border" },
                            { label: "B2B shipping solution", href: "/solutions/b2b-shipping" },
                            { label: "Fulfillment service", href: "/solutions/fulfillment" }
                          ].map((subItem) => (
                            <NextLink
                              key={subItem.label}
                              href={getLocalizedHref(subItem.href)}
                              onClick={() => setSolutionsDropdownOpen(false)}
                              className="w-full h-9 px-3 flex items-center text-[16px] font-medium text-[#232323] hover:bg-[#C9FFF9] transition-colors"
                            >
                              {subItem.label}
                            </NextLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (item.label === "Ecom Ecosystem") {
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => setEcosystemDropdownOpen(true)}
                      onMouseLeave={() => setEcosystemDropdownOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setEcosystemDropdownOpen(!ecosystemDropdownOpen)}
                        className={`flex items-center gap-1.5 px-1 py-1.5 text-[16px] font-medium transition-colors cursor-pointer ${
                          active || ecosystemDropdownOpen
                            ? "text-[#0f798c] font-semibold"
                            : "text-[#232323] hover:text-[#0f798c]"
                        }`}
                      >
                        {item.label}
                        <ChevronDown className={`h-4 w-4 text-[#232323] opacity-60 transition-transform duration-300 ${
                          ecosystemDropdownOpen ? "rotate-180 text-[#0f798c] opacity-100" : ""
                        }`} />
                      </button>

                      {/* pfh-navigation-menu ecosystem dropdown */}
                      <div className={`absolute top-full left-[-12px] pt-[6px] w-[202px] z-50 transition-all duration-300 origin-top-left ${
                        ecosystemDropdownOpen 
                          ? "opacity-100 scale-100 visible" 
                          : "opacity-0 scale-95 invisible pointer-events-none"
                      }`}>
                        <div className="bg-white rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden py-0">
                          {[
                            { label: "Flash POD", href: "/ecosystem/flash-pod" },
                            { label: "Partners", href: "/partner" }
                          ].map((subItem) => (
                            <NextLink
                              key={subItem.label}
                              href={getLocalizedHref(subItem.href)}
                              onClick={() => setEcosystemDropdownOpen(false)}
                              className="w-full h-9 px-3 flex items-center text-[16px] font-medium text-[#232323] hover:bg-[#C9FFF9] transition-colors"
                            >
                              {subItem.label}
                            </NextLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (item.label === "Resources") {
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => setResourcesDropdownOpen(true)}
                      onMouseLeave={() => setResourcesDropdownOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
                        className={`flex items-center gap-1.5 px-1 py-1.5 text-[16px] font-medium transition-colors cursor-pointer ${
                          active || resourcesDropdownOpen
                            ? "text-[#0f798c] font-semibold"
                            : "text-[#232323] hover:text-[#0f798c]"
                        }`}
                      >
                        {item.hasFlameIcon && (
                          <svg width="14" height="16" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                            <mask id="mask0_0_82" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="-4" y="0" width="24" height="24">
                              <rect x="-4" width="24" height="24" fill="#ECAC21"/>
                            </mask>
                            <g mask="url(#mask0_0_82)">
                              <path d="M0 11C0 9.25 0.416667 7.69167 1.25 6.325C2.08333 4.95833 3 3.80833 4 2.875C5 1.94167 5.91667 1.22917 6.75 0.7375L8 0V3.3C8 3.91667 8.20833 4.40417 8.625 4.7625C9.04167 5.12083 9.50833 5.3 10.025 5.3C10.3083 5.3 10.5792 5.24167 10.8375 5.125C11.0958 5.00833 11.3333 4.81667 11.55 4.55L12 4C13.2 4.7 14.1667 5.67083 14.9 6.9125C15.6333 8.15417 16 9.51667 16 11C16 12.4667 15.6417 13.8042 14.925 15.0125C14.2083 16.2208 13.2667 17.175 12.1 17.875C12.3833 17.475 12.6042 17.0375 12.7625 16.5625C12.9208 16.0875 13 15.5833 13 15.05C13 14.3833 12.875 13.7542 12.625 13.1625C12.375 12.5708 12.0167 12.0417 11.55 11.575L8 8.1L4.475 11.575C3.99167 12.0583 3.625 12.5917 3.375 13.175C3.125 13.7583 3 14.3833 3 15.05C3 15.5833 3.07917 16.0875 3.2375 16.5625C3.39583 17.0375 3.61667 17.475 3.9 17.875C2.73333 17.175 1.79167 16.2208 1.075 15.0125C0.358333 13.8042 0 12.4667 0 11ZM8 10.9L10.125 12.975C10.4083 13.2583 10.625 13.575 10.775 13.925C10.925 14.275 11 14.65 11 15.05C11 15.8667 10.7083 16.5625 10.125 17.1375C9.54167 17.7125 8.83333 18 8 18C7.16667 18 6.45833 17.7125 5.875 17.1375C5.29167 16.5625 5 15.8667 5 15.05C5 14.6667 5.075 14.2958 5.225 13.9375C5.375 13.5792 5.59167 13.2583 5.875 12.975L8 10.9Z" fill="#0F798C"/>
                            </g>
                          </svg>
                        )}
                        {item.label}
                        <ChevronDown className={`h-4 w-4 text-[#232323] opacity-60 transition-transform duration-300 ${
                          resourcesDropdownOpen ? "rotate-180 text-[#0f798c] opacity-100" : ""
                        }`} />
                      </button>

                      {/* pfh-navigation-menu resources dropdown */}
                      <div className={`absolute top-full left-[-12px] pt-[6px] w-[210px] z-50 transition-all duration-300 origin-top-left ${
                        resourcesDropdownOpen 
                          ? "opacity-100 scale-100 visible" 
                          : "opacity-0 scale-95 invisible pointer-events-none"
                      }`}>
                        <div className="bg-white rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden py-0">
                          {[
                            { label: "HS Code", href: "/resources/hs-code" },
                            { label: "Tariff Simulator", href: "/resources/tariff-simulator" }
                          ].map((subItem) => (
                            <NextLink
                              key={subItem.label}
                              href={getLocalizedHref(subItem.href)}
                              onClick={() => setResourcesDropdownOpen(false)}
                              className="w-full h-9 px-3 flex items-center text-[16px] font-medium text-[#232323] hover:bg-[#C9FFF9] transition-colors"
                            >
                              {subItem.label}
                            </NextLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <NextLink
                    key={item.href}
                    href={getLocalizedHref(item.href)}
                    className={`flex items-center gap-1.5 px-1 py-1.5 text-[16px] font-medium transition-colors ${
                      active
                        ? "text-[#0f798c] font-semibold"
                        : "text-[#232323] hover:text-[#0f798c]"
                    }`}
                  >
                    {item.hasFlameIcon && (
                      <svg width="14" height="16" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <mask id="mask0_0_82" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="-4" y="0" width="24" height="24">
                          <rect x="-4" width="24" height="24" fill="#ECAC21"/>
                        </mask>
                        <g mask="url(#mask0_0_82)">
                          <path d="M0 11C0 9.25 0.416667 7.69167 1.25 6.325C2.08333 4.95833 3 3.80833 4 2.875C5 1.94167 5.91667 1.22917 6.75 0.7375L8 0V3.3C8 3.91667 8.20833 4.40417 8.625 4.7625C9.04167 5.12083 9.50833 5.3 10.025 5.3C10.3083 5.3 10.5792 5.24167 10.8375 5.125C11.0958 5.00833 11.3333 4.81667 11.55 4.55L12 4C13.2 4.7 14.1667 5.67083 14.9 6.9125C15.6333 8.15417 16 9.51667 16 11C16 12.4667 15.6417 13.8042 14.925 15.0125C14.2083 16.2208 13.2667 17.175 12.1 17.875C12.3833 17.475 12.6042 17.0375 12.7625 16.5625C12.9208 16.0875 13 15.5833 13 15.05C13 14.3833 12.875 13.7542 12.625 13.1625C12.375 12.5708 12.0167 12.0417 11.55 11.575L8 8.1L4.475 11.575C3.99167 12.0583 3.625 12.5917 3.375 13.175C3.125 13.7583 3 14.3833 3 15.05C3 15.5833 3.07917 16.0875 3.2375 16.5625C3.39583 17.0375 3.61667 17.475 3.9 17.875C2.73333 17.175 1.79167 16.2208 1.075 15.0125C0.358333 13.8042 0 12.4667 0 11ZM8 10.9L10.125 12.975C10.4083 13.2583 10.625 13.575 10.775 13.925C10.925 14.275 11 14.65 11 15.05C11 15.8667 10.7083 16.5625 10.125 17.1375C9.54167 17.7125 8.83333 18 8 18C7.16667 18 6.45833 17.7125 5.875 17.1375C5.29167 16.5625 5 15.8667 5 15.05C5 14.6667 5.075 14.2958 5.225 13.9375C5.375 13.5792 5.59167 13.2583 5.875 12.975L8 10.9Z" fill="#0F798C"/>
                        </g>
                      </svg>
                    )}
                    {item.label}
                    {item.hasDropdown && <ChevronDown className="h-4 w-4 text-[#232323] opacity-60" />}
                  </NextLink>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-[16px]">
            {/* Language switcher */}
            <div className="hidden items-center gap-1 text-[16px] font-medium text-[#232323] cursor-pointer hover:text-[#0f798c] transition-colors md:flex">
              <span>ENG</span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </div>

            {loggedIn ? (
              <div className="relative hidden sm:block">
                <button
                  ref={avatarRef}
                  type="button"
                  onClick={() => setAvatarOpen((o) => !o)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f798c] text-sm font-semibold text-white"
                  aria-label="Tài khoản"
                >
                  M
                </button>
                {avatarOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-background py-1 shadow-xl"
                  >
                    <a
                      href={getCustomerHref("/dashboard")}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </a>
                    <a
                      href={getCustomerHref("/profile")}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <User className="h-4 w-4" /> Hồ sơ
                    </a>
                    <hr className="my-1 border-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href={getCustomerHref("/auth/login")}
                className="hidden rounded bg-[#0f798c] px-6 py-2.5 text-[16px] font-bold text-white transition-colors hover:bg-[#0c6271] md:block"
              >
                Log in
              </a>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 hover:bg-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer overlay */}
      {drawerOpen && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: click-away backdrop with role=presentation */}
          <div
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <aside className="fixed inset-y-0 right-0 z-[70] w-[260px] bg-background shadow-2xl">
            <div className="flex items-center justify-between p-4">
              <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Package className="h-5 w-5 text-slate-900" />
                <span className="font-extrabold uppercase tracking-wide">Ecom Express</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1 hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <hr className="border-border" />
            <nav className="py-2">
              {NAV_ITEMS.map((item) => {
                const active =
                  cleanPathname === item.href ||
                  (item.href !== "/" && cleanPathname.startsWith(item.href));
                return (
                  <NextLink
                    key={item.href}
                    href={getLocalizedHref(item.href)}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-slate-50 font-semibold text-slate-950"
                        : "text-slate-700 hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </NextLink>
                );
              })}
            </nav>
            <hr className="border-border" />
            <div className="flex flex-col gap-2 p-4">
              <LanguageSwitcher />
              {loggedIn ? (
                <>
                  <a
                    href={getCustomerHref("/dashboard")}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={getCustomerHref("/auth/login")}
                    className="flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Đăng nhập
                  </a>
                  <a
                    href={getCustomerHref("/auth/register")}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Đăng ký
                  </a>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function Footer() {
  const pathname = usePathname();
  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  return (
    <footer className="w-full bg-[#FEFCFA] flex flex-col mt-auto border-t border-[#dadada]">
      <div className="custom-container border-x border-solid border-[#dadada] !px-[16px] md:!px-[82px] py-[80px] flex flex-col bg-[#FEFCFA] w-full gap-[32px]">
        
        {/* Top Block: Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 w-full text-left">
          {/* Column 1: Solutions */}
          <div>
            <h4 className="text-[16px] font-bold text-[#232323] mb-4">Solution</h4>
            <ul className="flex flex-col">
              <li>
                <NextLink href={getLocalizedHref("/solutions/cross-border")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  Cross border Ecommerce
                </NextLink>
              </li>
              <li>
                <NextLink href={getLocalizedHref("/solutions/b2b-shipping")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  B2B shipping solution
                </NextLink>
              </li>
              <li>
                <NextLink href={getLocalizedHref("/solutions/fulfillment")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  Fulfillment service
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Column 2: Ecosystem */}
          <div>
            <h4 className="text-[16px] font-bold text-[#232323] mb-4">Ecom Ecosystem</h4>
            <ul className="flex flex-col">
              <li>
                <NextLink href={getLocalizedHref("/ecosystem/flash-pod")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  Flash POD
                </NextLink>
              </li>
              <li>
                <NextLink href={getLocalizedHref("/ecosystem/partners")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  Partner
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Column 3: Track & Trace */}
          <div>
            <h4 className="text-[16px] font-bold text-[#232323] mb-4">Track & Trace</h4>
            <ul className="flex flex-col">
              <li>
                <NextLink href={getLocalizedHref("/")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  Track & Trace search tool
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Column 4: Resource */}
          <div>
            <h4 className="text-[16px] font-bold text-[#232323] mb-4">Resource</h4>
            <ul className="flex flex-col">
              <li>
                <NextLink href={getLocalizedHref("/resources/hs-code")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  HS code
                </NextLink>
              </li>
              <li>
                <NextLink href={getLocalizedHref("/resources/tariff-simulator")} className="py-2 text-[15px] text-[#7A7A7A] hover:text-[#0F798C] transition-colors block">
                  Tariff simulation
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Column 5: Contact us */}
          <div>
            <h4 className="text-[16px] font-bold text-[#232323] mb-4">Contact us</h4>
            <ul className="flex flex-col text-[15px] text-[#7A7A7A]">
              <li className="py-2 font-semibold text-[#232323]">Hotline: 123-456-7890</li>
              <li className="py-2">Hanoi Office</li>
              <li className="py-2">Ho Chi Minh Office</li>
              <li className="py-2">USA Office</li>
            </ul>
          </div>
        </div>

        {/* Divider line */}
        <div className="w-full h-[1px] bg-[#dadada]" />

        {/* Bottom Block: Logo & Copyright */}
        <div className="flex flex-col md:flex-row items-center gap-6 w-full text-left">
          <NextLink href={getLocalizedHref("/")} className="flex shrink-0 items-center no-underline">
            <svg width="132" height="60" viewBox="0 0 132 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[60px] w-[132px] shrink-0">
              <path d="M77.0552 26.2574V29.5127H64.2366V11.9834H76.7485V15.2386H68.044V19.0442H75.7306V22.2H68.044V26.2574H77.0552Z" fill="#0F798C"/>
              <path d="M78.8039 22.7767C78.8039 18.7193 81.7598 15.8386 85.9 15.8386C88.572 15.8386 90.6764 17.0651 91.5997 19.2696L88.7384 20.8972C88.0533 19.6209 87.0353 19.0441 85.8771 19.0441C84.0077 19.0441 82.5428 20.4232 82.5428 22.7767C82.5428 25.1303 84.0077 26.5093 85.8771 26.5093C87.0353 26.5093 88.0533 25.9591 88.7384 24.6563L91.5997 26.3104C90.6764 28.4651 88.572 29.7149 85.9 29.7149C81.7598 29.7149 78.8039 26.8342 78.8039 22.7767Z" fill="#0F798C"/>
              <path d="M92.6143 22.7767C92.6143 18.7193 95.5702 15.8386 99.6158 15.8386C103.661 15.8386 106.591 18.7193 106.591 22.7767C106.591 26.8342 103.658 29.7149 99.6158 29.7149C95.5735 29.7149 92.6143 26.8342 92.6143 22.7767ZM102.856 22.7767C102.856 20.4464 101.459 19.0441 99.6158 19.0441C97.7724 19.0441 96.3532 20.4464 96.3532 22.7767C96.3532 25.1071 97.7724 26.5093 99.6158 26.5093C101.459 26.5093 102.856 25.1071 102.856 22.7767Z" fill="#0F798C"/>
              <path d="M130.548 21.8022V29.516H126.858V22.4022C126.858 20.2243 125.935 19.2232 124.447 19.2232C122.793 19.2232 121.632 20.3503 121.632 22.7536V29.516H117.942V22.4022C117.942 20.2243 117.067 19.2232 115.531 19.2232C113.899 19.2232 112.741 20.3503 112.741 22.7536V29.516H109.051V16.0442H112.575V17.5956C113.521 16.442 114.94 15.842 116.571 15.842C118.346 15.842 119.86 16.5679 120.757 18.0464C121.775 16.6674 123.429 15.842 125.344 15.842C128.372 15.842 130.548 17.695 130.548 21.8022Z" fill="#0F798C"/>
              <path d="M1.41595 38.231V41.8641C1.41595 43.3194 2.17613 44.6685 3.41591 45.4011L23.8134 57.5105C25.0695 58.2564 26.6258 58.2564 27.8819 57.5105L48.2794 45.4011C49.5159 44.6652 50.2794 43.3194 50.2794 41.8641V38.231L25.8493 52.7138L1.41595 38.231Z" fill="#232323"/>
              <path d="M48.2794 14.0254L27.8819 1.91602C26.6258 1.17016 25.0695 1.17016 23.8134 1.91602L3.41591 14.0254C2.17939 14.7613 1.41595 16.1072 1.41595 17.5624V18.0564L25.846 32.5591L50.2761 18.0564V17.5624C50.2761 16.1072 49.5159 14.758 48.2761 14.0254H48.2794Z" fill="#232323"/>
              <path d="M8.25102 36.6331L1.41595 32.5757V24.4608L8.25102 28.5182V36.6331Z" fill="#0F798C"/>
              <path d="M49.5322 28.7536L41.0006 28.2265V29.8608L25.846 38.8574L10.6947 29.8608V37.979L25.8493 46.969V46.9724L41.0006 37.979V39.5403L49.5322 28.7536Z" fill="#0F798C"/>
              <path d="M64.2366 50.6884V36.8055H72.8628V38.0752H65.5677V43.0144H72.0732V44.2641H65.5677V49.4188H73.1336V50.6884H64.2366Z" fill="#232323"/>
              <path d="M74.282 50.6884L78.0209 45.3348L74.4614 40.2563H75.9002L78.7386 44.3403L81.5771 40.2563H82.98L79.4205 45.3348L83.1953 50.6884H81.7402L78.7386 46.3458L75.7208 50.6884H74.282Z" fill="#232323"/>
              <path d="M90.187 50.7878C89.4334 50.7878 88.7417 50.6088 88.1218 50.2508C87.4987 49.8928 86.9897 49.379 86.5949 48.7028V54.5337H85.3193V40.253H86.5427V42.3149C86.9277 41.6155 87.4367 41.0818 88.0696 40.7171C88.7058 40.3525 89.4105 40.1702 90.1903 40.1702C91.0875 40.1702 91.8933 40.3923 92.6078 40.8331C93.3191 41.2773 93.8802 41.8972 94.2881 42.6961C94.6959 43.495 94.8982 44.4199 94.8982 45.4641C94.8982 46.5083 94.6926 47.4464 94.2881 48.242C93.8802 49.0343 93.3191 49.6575 92.6078 50.105C91.8933 50.5558 91.0907 50.7779 90.1903 50.7779L90.187 50.7878ZM90.0957 49.5381C90.7677 49.5381 91.3648 49.3691 91.8933 49.0309C92.4186 48.6928 92.8395 48.2221 93.1494 47.6122C93.4594 47.0055 93.616 46.2895 93.616 45.4707C93.616 44.6519 93.4594 43.9558 93.1494 43.3492C92.8395 42.7425 92.4186 42.2652 91.8933 41.9204C91.3648 41.5757 90.7677 41.4033 90.0957 41.4033C89.4236 41.4033 88.8233 41.5757 88.2915 41.9204C87.7597 42.2652 87.3388 42.7392 87.0321 43.3492C86.7254 43.9558 86.5754 44.6652 86.5754 45.4707C86.5754 46.2762 86.7287 47.0055 87.0321 47.6122C87.3388 48.2221 87.7564 48.6928 88.2915 49.0309C88.8233 49.3691 89.4268 49.5381 90.0957 49.5381Z" fill="#232323"/>
              <path d="M97.5016 50.6884V40.2564H98.7251V42.2785C99.3352 40.8763 100.516 40.1768 102.265 40.1768V41.5459C102.206 41.5459 102.151 41.5459 102.102 41.5359C102.053 41.5293 102.007 41.526 101.958 41.526C100.963 41.526 100.183 41.8608 99.6223 42.5271C99.0579 43.1934 98.7773 44.1448 98.7773 45.3746V50.6884H97.5016Z" fill="#232323"/>
              <path d="M108.48 50.7879C107.498 50.7879 106.634 50.5591 105.893 50.105C105.149 49.6475 104.568 49.021 104.151 48.2221C103.733 47.4232 103.521 46.505 103.521 45.4741C103.521 44.4431 103.72 43.5282 104.125 42.726C104.526 41.9271 105.074 41.3006 105.769 40.8531C106.464 40.4022 107.253 40.1768 108.141 40.1768C109.028 40.1768 109.815 40.3989 110.503 40.8398C111.191 41.284 111.733 41.9039 112.128 42.7028C112.522 43.5017 112.721 44.4265 112.721 45.4707C112.721 45.537 112.718 45.6067 112.712 45.6796C112.705 45.7525 112.702 45.8288 112.702 45.9083H104.777C104.826 46.621 105.012 47.2542 105.342 47.8011C105.671 48.3514 106.108 48.7757 106.653 49.0807C107.198 49.3857 107.818 49.5381 108.513 49.5381C109.087 49.5381 109.625 49.4254 110.121 49.2C110.617 48.9746 111.048 48.6299 111.407 48.1691L112.124 49.0807C111.694 49.6343 111.165 50.0586 110.542 50.3503C109.919 50.642 109.231 50.7879 108.477 50.7879H108.48ZM104.797 44.8575H111.498C111.449 44.1713 111.276 43.568 110.976 43.0542C110.676 42.5404 110.281 42.1326 109.788 41.8343C109.296 41.5359 108.748 41.3868 108.134 41.3868C107.521 41.3868 106.976 41.5326 106.49 41.8243C106.004 42.116 105.612 42.5205 105.312 43.0442C105.012 43.568 104.839 44.1713 104.79 44.8575H104.797Z" fill="#232323"/>
              <path d="M117.86 50.7879C117.08 50.7879 116.346 50.6652 115.651 50.4199C114.956 50.1746 114.411 49.8697 114.017 49.4984L114.591 48.3879C114.963 48.7194 115.446 48.9978 116.046 49.2199C116.646 49.4453 117.279 49.5581 117.951 49.5581C118.849 49.5581 119.498 49.4023 119.893 49.0906C120.287 48.779 120.486 48.368 120.486 47.8509C120.486 47.4663 120.375 47.168 120.154 46.9492C119.932 46.7304 119.638 46.5647 119.273 46.452C118.907 46.3393 118.506 46.2431 118.069 46.1636C117.632 46.084 117.198 45.9912 116.767 45.8851C116.336 45.779 117.198 45.9912 116.767 45.8851C116.336 45.779 115.938 45.6232 115.573 45.4177C115.208 45.2122 114.914 44.9304 114.692 44.5757C114.47 44.2177 114.359 43.7437 114.359 43.147C114.359 42.2884 114.682 41.5757 115.328 41.0155C115.974 40.4553 116.898 40.1735 118.095 40.1735C118.705 40.1735 119.928 40.263 119.928 40.442C120.539 40.621 121.041 40.8564 121.439 41.1448L120.881 42.2752C120.46 41.9569 120.013 41.7282 119.534 41.5923C119.054 41.4531 118.575 41.3835 118.095 41.3835C117.243 41.3835 116.62 41.5492 116.225 41.8807C115.831 42.2122 115.632 42.6199 115.632 43.1105C115.619 43.5083 115.723 43.8166 115.945 44.042C116.167 44.2674 116.46 44.4431 116.826 44.5691C117.191 44.6951 117.592 44.7978 118.03 44.8774C118.467 44.9569 118.904 45.0531 119.341 45.1658C119.778 45.2785 120.18 45.431 120.545 45.6232C120.911 45.8155 121.204 46.0873 121.426 46.4354C121.648 46.7868 121.759 47.2442 121.759 47.8144Z" fill="#232323"/>
              <path d="M126.649 50.7879C125.87 50.7879 125.136 50.6652 124.441 50.4199C123.746 50.1746 123.201 49.8697 122.806 49.4984L123.38 48.3879C123.752 48.7194 124.235 48.9978 124.835 49.2199C125.436 49.4453 126.069 49.5581 126.741 49.5581C127.638 49.5581 128.287 49.4023 128.682 49.0906C129.077 48.779 129.276 48.368 129.276 47.8509C129.276 47.4663 129.165 47.168 128.943 46.9492C128.721 46.7304 128.427 46.5647 128.062 46.452C127.697 46.3393 127.295 46.2431 126.858 46.1636C126.421 46.084 125.987 45.9912 125.556 45.8851C125.126 45.779 124.728 45.6232 124.362 45.4177C123.997 45.2122 123.703 44.9304 123.481 44.5757C123.26 44.2177 123.149 43.7437 123.149 43.147C123.149 42.2884 123.472 41.5757 124.118 41.0155C124.764 40.4553 125.687 40.1735 126.884 40.1735C127.494 40.1735 128.108 40.263 128.718 40.442C129.328 40.621 129.83 40.8564 130.228 41.1448L129.671 42.2752C129.25 41.9569 128.803 41.7282 128.323 41.5923C127.843 41.4531 127.364 41.3835 126.884 41.3835C126.033 41.3835 125.41 41.5492 125.015 41.8807C124.62 42.2122 124.421 42.6199 124.421 43.1105C124.408 43.5083 124.512 43.8166 124.734 44.042C124.956 44.2674 125.25 44.4431 125.615 44.5691C125.981 44.6951 126.382 44.7978 126.819 44.8774C127.256 44.9569 127.693 45.0531 128.131 45.1658C128.568 45.2785 128.969 45.431 129.334 45.6232C129.7 45.8155 129.994 46.0873 130.215 46.4354C130.437 46.7868 130.548 47.2442 130.548 47.8144C130.548 47.8144 130.206 49.4354 129.524 49.9757C128.842 50.5161 127.883 50.7879 126.649 50.7879Z" fill="#232323"/>
            </svg>
          </NextLink>
          <span className="text-[#232323] text-[15px] font-normal leading-relaxed">
            Copyright © 2025 Ecom Express | All rights reserved
          </span>
        </div>

      </div>
    </footer>
  );
}

export function WebLayout({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  return (
    <>
      <Header isLoggedIn={isLoggedIn} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
