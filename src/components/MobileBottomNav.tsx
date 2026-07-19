import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Globe, Star, Trophy, Settings, Sun, Moon, LogOut, MessageSquare, Camera
} from "lucide-react";
import { applyLiquidGlass } from "../utils/liquidGlass";
import { normalizeImageUrl } from "../services/api";
import { InitialsAvatar } from "./InitialsAvatar";

interface MobileBottomNavProps {
  activeSection: string;
  setActiveSection: (section: any) => void;
  unreadCount: number;
  userData: any;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  handleLogout: () => void;
  t: (key: string) => string;
  glassLevel?: number;
}

export function MobileBottomNav({
  activeSection,
  setActiveSection,
  unreadCount,
  userData,
  isDarkMode,
  toggleDarkMode,
  handleLogout,
  t,
  glassLevel = 100,
}: MobileBottomNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const activeIndicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mainLg: any = null;
    let indicatorLg: any = null;

    const computedBlur = 16 * (1 - glassLevel / 100);

    if (navRef.current) {
      mainLg = applyLiquidGlass(navRef.current, {
        scale: -110 * (glassLevel / 100),
        chroma: 5,
        border: 0.08,
        mapBlur: 14,
        blur: computedBlur,        // clear liquid glass refraction (no frosted blur)
        saturate: 1.6,
        radius: 35, // matches style border-radius
        fallbackBlur: computedBlur, // no frosted fallback blur
      });
    }

    if (activeIndicatorRef.current) {
      const baseScaleIndicator = isDarkMode ? -75 : -55;
      indicatorLg = applyLiquidGlass(activeIndicatorRef.current, {
        scale: baseScaleIndicator * (glassLevel / 100),
        chroma: isDarkMode ? 4 : 2,
        border: 0.08,
        mapBlur: 10,
        blur: computedBlur,    // clear liquid glass active lens
        saturate: isDarkMode ? 1.3 : 1.1,
        radius: 24, // half of 48px is 24px (perfect circle)
        fallbackBlur: computedBlur,
      });
    }

    return () => {
      if (mainLg) mainLg.destroy();
      if (indicatorLg) indicatorLg.destroy();
    };
  }, [isDarkMode, glassLevel]);

  const isProfileActive = !["home", "bookings", "restaurants", "ar-menu"].includes(activeSection);

  // Map active section to col index (0 to 4)
  const activeIndex = activeSection === "home" ? 0 :
                      activeSection === "bookings" ? 1 :
                      activeSection === "restaurants" ? 2 :
                      activeSection === "ar-menu" ? 3 : 4;

  const mainTabs = [
    {
      id: "home",
      icon: (isActive: boolean) => (
        <svg viewBox="0 0 24 24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      label: t("home"),
    },
    {
      id: "bookings",
      icon: (isActive: boolean) => (
        <svg viewBox="0 0 24 24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: t("bookings"),
    },
    {
      id: "restaurants",
      icon: (isActive: boolean) => (
        <svg viewBox="0 0 24 24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      label: t("restaurants"),
    },
    {
      id: "ar-menu",
      icon: (isActive: boolean) => (
        /* Shutter record button styling matching the user's camera/AR screenshot */
        <div className={`relative w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-full flex items-center justify-center bg-zinc-900 border-2 shadow-inner transition-all duration-300 ${
          isActive ? "border-emerald-400 scale-105" : "border-emerald-500/60 hover:border-emerald-500"
        }`}>
          <div className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] bg-white rounded-full shadow" />
        </div>
      ),
      label: t("arMenu"),
    },
  ];

  const handleMenuSelect = (section: string) => {
    setActiveSection(section);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Click outside backdrop for profile popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-[105] bg-black/10 dark:bg-black/30 backdrop-blur-[2px]"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Popover Sub-Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`fixed bottom-[84px] right-4 sm:right-6 z-[110] w-60 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border backdrop-blur-2xl p-2 flex flex-col gap-0.5 ${
              isDarkMode 
                ? "bg-gray-950/85 text-white border-white/10" 
                : "bg-white/90 text-gray-900 border-gray-200/50"
            }`}
          >
            {/* Popover Title */}
            <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b mb-1 flex items-center justify-between ${
              isDarkMode ? "text-gray-400 border-white/5" : "text-gray-500 border-gray-100"
            }`}>
              <span>Menu Options</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>

            {/* Messages tab inside drawer */}
            <button
              onClick={() => handleMenuSelect("messages")}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                activeSection === "messages" 
                  ? isDarkMode ? "bg-white/10 font-bold text-white" : "bg-emerald-50 font-bold text-emerald-600"
                  : isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/70 text-gray-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-[18px] h-[18px] stroke-[2]" />
                <span>{t("messages")}</span>
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white font-bold text-[9px] min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center border border-gray-950 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Events tab inside drawer */}
            <button
              onClick={() => handleMenuSelect("events")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                activeSection === "events" 
                  ? isDarkMode ? "bg-white/10 font-bold text-white" : "bg-emerald-50 font-bold text-emerald-600"
                  : isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/70 text-gray-600"
              }`}
            >
              <Globe className="w-[18px] h-[18px] stroke-[2]" />
              <span>{t("events")}</span>
            </button>

            <button
              onClick={() => handleMenuSelect("reviews")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                activeSection === "reviews" 
                  ? isDarkMode ? "bg-white/10 font-bold text-white" : "bg-emerald-50 font-bold text-emerald-600"
                  : isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/70 text-gray-600"
              }`}
            >
              <Star className="w-[18px] h-[18px] stroke-[2]" />
              <span>{t("myReviews")}</span>
            </button>

            <button
              onClick={() => handleMenuSelect("achievements")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                activeSection === "achievements" 
                  ? isDarkMode ? "bg-white/10 font-bold text-white" : "bg-emerald-50 font-bold text-emerald-600"
                  : isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/70 text-gray-600"
              }`}
            >
              <Trophy className="w-[18px] h-[18px] stroke-[2]" />
              <span>{t("achievements")}</span>
            </button>

            <button
              onClick={() => handleMenuSelect("settings")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                activeSection === "settings" 
                  ? isDarkMode ? "bg-white/10 font-bold text-white" : "bg-emerald-50 font-bold text-emerald-600"
                  : isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/70 text-gray-600"
              }`}
            >
              <Settings className="w-[18px] h-[18px] stroke-[2]" />
              <span>{t("settings")}</span>
            </button>

            <div className={`h-px my-1 ${isDarkMode ? "bg-white/5" : "bg-gray-100"}`} />

            <button
              onClick={() => {
                toggleDarkMode();
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 ${
                isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100/70 text-gray-600"
              }`}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-[18px] h-[18px] text-amber-400 stroke-[2]" />
                  <span>{t("lightMode")}</span>
                </>
              ) : (
                <>
                  <Moon className="w-[18px] h-[18px] text-indigo-500 stroke-[2]" />
                  <span>{t("darkMode")}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm hover:bg-rose-500/10 text-rose-500 font-semibold transition-all duration-200"
            >
              <LogOut className="w-[18px] h-[18px] stroke-[2]" />
              <span>{t("logout")}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Float Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-[100] lg:hidden flex justify-center pointer-events-none">
        <div
          ref={navRef}
          className="w-full max-w-md pointer-events-auto h-[64px] grid grid-cols-5 items-center px-2 relative lg-nav-bar"
          style={{
            borderRadius: "35px",
            background: isDarkMode
              ? "linear-gradient(180deg, rgba(20, 20, 25, 0.75), rgba(10, 10, 15, 0.9))"
              : "linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(245, 245, 250, 0.8))",
            boxShadow: isDarkMode
              ? `
                0 12px 40px rgba(0, 0, 0, 0.5),
                inset 0 1px 0px rgba(255, 255, 255, 0.35),
                inset 0 -4px 12px rgba(255, 255, 255, 0.04),
                inset 0 0 0 1px rgba(255, 255, 255, 0.1)
              `
              : `
                0 12px 40px rgba(0, 0, 0, 0.12),
                inset 0 1px 0px rgba(255, 255, 255, 0.8),
                inset 0 -4px 12px rgba(0, 0, 0, 0.01),
                inset 0 0 0 1px rgba(0, 0, 0, 0.08)
              `,
          }}
        >
          {/* Persistent Sliding Active Indicator Capsule */}
          <div className="absolute inset-x-2 top-0 bottom-0 pointer-events-none z-10">
            <motion.div
              className="absolute top-0 bottom-0 left-0 w-[20%] flex items-center justify-center"
              animate={{ x: `${activeIndex * 100}%` }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            >
              <div
                ref={activeIndicatorRef}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                style={{
                  background: isDarkMode 
                    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08))"
                    : "linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))",
                  boxShadow: isDarkMode
                    ? `
                      inset 0 1px 0px rgba(255, 255, 255, 0.5),
                      inset 0 0 0 1px rgba(255, 255, 255, 0.2),
                      0 4px 12px rgba(0, 0, 0, 0.3)
                    `
                    : `
                      inset 0 1px 0px rgba(255, 255, 255, 0.9),
                      inset 0 0 0 1px rgba(0, 0, 0, 0.08),
                      0 4px 12px rgba(0, 0, 0, 0.08)
                    `,
                }}
              />
            </motion.div>
          </div>

          {/* Main Buttons */}
          {mainTabs.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`relative flex items-center justify-center w-full h-12 rounded-full transition-all duration-300 z-20 ${
                  isActive 
                    ? isDarkMode ? "text-white scale-105" : "text-emerald-600 scale-105" 
                    : isDarkMode ? "text-white/60 hover:text-white/95" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                <div className="relative">
                  {tab.icon(isActive)}
                </div>
              </button>
            );
          })}

          {/* Profile / Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="relative flex items-center justify-center w-full h-12 rounded-full transition-all duration-300 z-20 hover:scale-102"
          >
            {/* Relative wrapper centering avatar and binding red dot */}
            <div className="relative">
              {/* Profile Avatar Wrapper */}
              <div className={`relative w-[28px] h-[28px] sm:w-[30px] sm:h-[30px] rounded-full overflow-hidden border-2 shadow-inner flex items-center justify-center ${
                isDarkMode ? "border-white/40 bg-gray-800" : "border-gray-200 bg-gray-100"
              }`}>
                {userData?.photoURL &&
                typeof userData.photoURL === "string" &&
                userData.photoURL.trim() !== "" ? (
                  <img
                    src={normalizeImageUrl(userData.photoURL as string)}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <InitialsAvatar
                    name={userData?.displayName ?? userData?.name ?? ""}
                    className="w-full h-full font-black text-[8px] sm:text-[9px]"
                  />
                )}
              </div>

              {/* Profile red dot notification */}
              {isMenuOpen ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-gray-950 shadow-md animate-ping" />
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-gray-950 shadow-sm" />
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
