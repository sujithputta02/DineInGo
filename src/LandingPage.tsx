import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SEO from "./components/SEO";
import { useLanguage } from "./contexts/LanguageContext";
import DineInGoIntro from "./components/DineInGoIntro";

interface DoodleProps {
  type: 'plate' | 'fork' | 'star' | 'chair' | 'wave' | 'ticket';
  style: React.CSSProperties;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

interface SectionHeadingProps {
  tagline: string;
  title: string;
  highlight: string;
  glassStyles: any;
  centered?: boolean;
}

interface Table3DButtonProps {
  number: number;
  isSelected: boolean;
  onClick: () => void;
  position: {
    x: number;
    y: number;
    rotate?: number;
    seats?: number;
    view?: string;
    type?: string;
    price?: string;
  };
  is3DMode?: boolean;
}

// Design Tokens - Light Emerald Refined V3 (Polished for Accessibility)
const glassStyles = {
  card: {
    background: "rgba(255, 255, 255, 0.45)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow: `
      0 12px 40px 0 rgba(31, 38, 135, 0.06),
      inset 0 0.5px 0.5px rgba(255, 255, 255, 0.5)
    `,
    borderRadius: "32px",
  },
  button: {
    borderRadius: "50px",
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  colors: {
    primary: "#047857", // High contrast Emerald 700 (passes 4.5:1 with white text)
    primaryLight: "#10b981", // Emerald 500
    primaryDeep: "#065f46", // Deep Emerald 800
    gold: "#d97706", // Darker amber/gold for better white/light-gray contrast
    black: "#111827",
    gray: "#27272a", // Zinc 800 for high-contrast typography
    bg: "#f9fafb"
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 22
    }
  }
};

// Logo component
const DineInGoLogo = ({ size = "large", color = "black", yellowColor = "#facc15" }: { size?: "small" | "large", color?: string, yellowColor?: string }) => {
  const fontSize = size === "large" ? "4rem" : "2rem";
  const dotSize = size === "large" ? "15px" : "8px";
  const dotTop = size === "large" ? "22px" : "11px";

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <h1
        style={{
          fontSize: fontSize,
          fontWeight: "bold",
          letterSpacing: "0.05em",
          display: "flex",
          alignItems: "center",
          margin: 0,
          textShadow: size === "large" ? "3px 3px 6px rgba(0, 0, 0, 0.3)" : "none",
        }}
      >
        <span style={{ color: color }}>D</span>
        <span style={{ color: color, position: "relative" }}>
          i
          <span
            style={{
              position: "absolute",
              top: dotTop,
              left: "40%",
              transform: "translateX(-50%)",
              width: dotSize,
              height: dotSize,
              backgroundColor: "red",
              borderRadius: "50%",
              boxShadow: "0 0 4px rgba(255, 0, 0, 0.5)",
            }}
          ></span>
        </span>
        <span style={{ color: color }}>n</span>
        <span style={{ color: color }}>e</span>
        <span style={{ color: color }}>I</span>
        <span style={{ color: color }}>n</span>
        <span style={{ color: yellowColor }}>G</span>
        <span style={{ color: yellowColor }}>o</span>
      </h1>
    </div>
  );
};

// Modern Typography Section Heading (Polished for consistent vertical spacing)
const SectionHeading: React.FC<SectionHeadingProps & { glassStyles: any }> = ({ tagline, title, highlight, glassStyles, centered = true }) => (
  <div style={{
    textAlign: centered ? "center" : "left",
    marginBottom: "clamp(40px, 8vw, 70px)",
    maxWidth: centered ? "900px" : "100%",
    margin: centered ? "0 auto clamp(40px, 8vw, 70px)" : "0 0 clamp(40px, 8vw, 70px)"
  }}>
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{
        color: glassStyles.colors.primary,
        fontSize: "0.85rem",
        fontWeight: "900",
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        display: "block",
        marginBottom: "16px"
      }}
    >
      {tagline}
    </motion.span>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      style={{
        fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
        fontWeight: "900",
        color: glassStyles.colors.black,
        lineHeight: "1.15",
        letterSpacing: "-0.05em",
        margin: 0
      }}
    >
      {title} <br />
      <span style={{
        color: glassStyles.colors.primary,
        fontStyle: "italic",
        background: `linear-gradient(120deg, ${glassStyles.colors.primary}, ${glassStyles.colors.primaryDeep})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block"
      }}>
        {highlight}
      </span>
    </motion.h2>
  </div>
);

// Doodle component for decorative elements
const Doodle: React.FC<DoodleProps> = ({ type, style }) => {
  const doodles = {
    plate: (
      <motion.img
        src="/images/cakedodle.png"
        alt="Plate doodle"
        style={{ width: "80px", height: "80px", ...style }}
        animate={{
          y: [0, -10, 0],
          rotate: [0, 5, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ),
    fork: (
      <motion.img
        src="/images/nooddodle.png"
        alt="Fork doodle"
        style={{ width: "60px", height: "120px", ...style }}
        animate={{
          y: [0, -15, 0],
          rotate: [-5, 5, -5]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ),
    star: (
      <motion.img
        src="/images/eventdodle.png"
        alt="Star doodle"
        style={{ width: "70px", height: "70px", ...style }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ),
    chair: (
      <motion.img
        src="/images/tabledodle.png"
        alt="Chair doodle"
        style={{ width: "60px", height: "60px", ...style }}
        animate={{
          y: [0, -8, 0],
          rotate: [0, -5, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ),
    wave: (
      <motion.img
        src="/images/dodle.png"
        alt="Wave doodle"
        style={{ width: "150px", height: "40px", ...style }}
        animate={{
          x: [-10, 10, -10],
          y: [0, -5, 0]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ),
    ticket: (
      <motion.img
        src="/images/guiterdodle.png"
        alt="Ticket doodle"
        style={{ width: "80px", height: "40px", ...style }}
        animate={{
          y: [0, -12, 0],
          rotate: [-3, 3, -3]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    )
  };

  return doodles[type] || null;
};

// 3D Button for table selection (Polished for keyboard accessibility & responsive design)
const Table3DButton: React.FC<Table3DButtonProps & { glassStyles: any }> = ({
  number,
  isSelected,
  onClick,
  position,
  glassStyles,
  is3DMode = true
}) => {
  const seatsCount = position.seats || (number % 2 === 0 ? 4 : 2);

  return (
    <motion.div
      whileHover={{ scale: 1.1, y: -4 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Table ${number}, ${position.view || 'Standard'}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: isSelected ? -6 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 20,
        delay: number * 0.08
      }}
      style={{
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: "clamp(46px, 12vw, 54px)",
        height: "clamp(46px, 12vw, 54px)",
        cursor: "pointer",
        transform: is3DMode
          ? `perspective(800px) rotateX(32deg) rotateZ(${position.rotate || 0}deg)`
          : "rotate(0deg)",
        transformStyle: "preserve-3d",
        transition: "transform 0.4s ease",
        zIndex: isSelected ? 12 : 2,
      }}
    >
      {/* Seat dots around table */}
      <div style={{ position: "absolute", inset: "-7px", pointerEvents: "none" }}>
        {/* Top & Bottom Seats */}
        <span style={{ position: "absolute", top: "0", left: "50%", transform: "translateX(-50%)", width: "10px", height: "4px", background: isSelected ? glassStyles.colors.primary : "#94A3B8", borderRadius: "3px" }} />
        <span style={{ position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)", width: "10px", height: "4px", background: isSelected ? glassStyles.colors.primary : "#94A3B8", borderRadius: "3px" }} />
        {seatsCount >= 4 && (
          <>
            <span style={{ position: "absolute", left: "0", top: "50%", transform: "translateY(-50%)", width: "4px", height: "10px", background: isSelected ? glassStyles.colors.primary : "#94A3B8", borderRadius: "3px" }} />
            <span style={{ position: "absolute", right: "0", top: "50%", transform: "translateY(-50%)", width: "4px", height: "10px", background: isSelected ? glassStyles.colors.primary : "#94A3B8", borderRadius: "3px" }} />
          </>
        )}
      </div>

      {/* Main Table Surface */}
      <motion.div
        animate={{
          boxShadow: isSelected
            ? [
              `0 12px 28px rgba(0,0,0,0.15), 0 0 20px ${glassStyles.colors.primary}70`,
              `0 12px 28px rgba(0,0,0,0.15), 0 0 32px ${glassStyles.colors.primary}50`,
              `0 12px 28px rgba(0,0,0,0.15), 0 0 20px ${glassStyles.colors.primary}70`
            ]
            : "0 6px 14px rgba(0,0,0,0.08)"
        }}
        transition={{
          repeat: isSelected ? Infinity : 0,
          duration: 2
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.78)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: isSelected ? glassStyles.colors.primaryDeep : "#1E293B",
          border: isSelected ? `2.5px solid ${glassStyles.colors.primary}` : "1.5px solid rgba(255,255,255,0.7)",
          transform: is3DMode ? "translateZ(8px)" : "none",
          boxShadow: isSelected ? `0 10px 25px ${glassStyles.colors.primary}50` : "0 4px 12px rgba(0,0,0,0.06)",
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: "900", lineHeight: "1" }}>{number}</span>
        <span style={{ fontSize: "9px", fontWeight: "700", color: isSelected ? glassStyles.colors.primaryDeep : "#64748B", marginTop: "1px" }}>
          {seatsCount}P
        </span>
      </motion.div>

      {/* 3D Side depth effect (visible in 3D mode) */}
      {is3DMode && (
        <>
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "10px",
              bottom: "-8px",
              left: "0",
              backgroundColor: isSelected ? glassStyles.colors.primaryDeep : "#CBD5E1",
              borderRadius: "0 0 8px 8px",
              transformOrigin: "top",
              transform: "rotateX(-90deg)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: isSelected ? glassStyles.colors.primary : "#94A3B8",
              borderRadius: "14px",
              transform: "translateZ(0)",
              zIndex: 0,
            }}
          />
        </>
      )}

      {/* Pulse ring animation for selected table */}
      {isSelected && (
        <motion.div
          animate={{
            scale: [1, 1.35, 1],
            opacity: [0.6, 0, 0.6]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "14px",
            backgroundColor: glassStyles.colors.primary,
            zIndex: -1,
          }}
        />
      )}
    </motion.div>
  );
};

// Feature card with animation
const FeatureCard: React.FC<FeatureCardProps & { glassStyles: any }> = ({ icon, title, description, color, glassStyles }) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ scale: 1.02, y: -8 }}
    style={{
      ...glassStyles.card,
      padding: "40px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    }}
  >
    <div
      style={{
        background: `linear-gradient(135deg, ${color}, ${glassStyles.colors.primary})`,
        width: "60px",
        height: "60px",
        borderRadius: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "24px",
        boxShadow: `0 12px 24px ${color}15`,
        color: "white"
      }}
    >
      {icon}
    </div>
    <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "14px", color: glassStyles.colors.black, letterSpacing: "-0.01em" }}>{title}</h3>
    <p style={{ color: glassStyles.colors.gray, lineHeight: "1.75", margin: 0, fontSize: "1.05rem", fontWeight: "500" }}>{description}</p>
  </motion.div>
);

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const [activeTab, setActiveTab] = useState("restaurants");
  const [scrollY, setScrollY] = useState(0);
  const [selectedTable, setSelectedTable] = useState(3);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Track window width for responsiveness
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;



  const [is3DView, setIs3DView] = useState(true);

  // Table layout positions & metadata
  const tablePositions = [
    { id: 1, x: 10, y: 14, rotate: -3, seats: 2, view: "Garden View", type: "Standard", price: "₹1,200" },
    { id: 2, x: 42, y: 10, rotate: 3, seats: 4, view: "Central Lounge", type: "Booth", price: "₹2,500" },
    { id: 3, x: 72, y: 14, rotate: -3, seats: 4, view: "Corner VIP", type: "VIP", price: "₹3,200" },
    { id: 4, x: 12, y: 55, rotate: 3, seats: 2, view: "Window View", type: "Window", price: "₹1,800" },
    { id: 5, x: 44, y: 58, rotate: -3, seats: 6, view: "Family Lounge", type: "Large", price: "₹4,000" },
    { id: 6, x: 74, y: 55, rotate: 3, seats: 4, view: "Terrace View", type: "Terrace", price: "₹2,800" },
  ];

  const currentSelectedTableInfo = tablePositions.find(t => t.id === selectedTable) || tablePositions[3];

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro && (
          <DineInGoIntro onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>
      <motion.div
        initial={showIntro ? { opacity: 0 } : { opacity: 1 }}
        animate={showIntro ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", backgroundColor: glassStyles.colors.bg, color: glassStyles.colors.black, overflow: "hidden" }}
      >
        <SEO
          title="DineInGo - India's First Real-Time Table & Event Selector"
          description="DineInGo - The ultimate platform for effortless dining and event reservations in India. Book exact tables with real-time floor plans, manage waitlists, and discover top restaurants."
          keywords="DineInGo, restaurant reservations India, book exact table, real-time floor plan, event booking app, table booking Mumbai, table booking Bangalore, interactive restaurant map"
        />
        {/* Hero Section with Parallax and Liquid Glass Theme */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            position: "relative",
            background: glassStyles.colors.bg,
            overflow: "hidden",
            padding: 0,
          }}
        >
          {/* Organic Background Blobs */}
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "10%",
              left: "60%",
              width: "500px",
              height: "500px",
              background: `radial-gradient(circle, ${glassStyles.colors.primary}15 0%, transparent 70%)`,
              filter: "blur(60px)",
              zIndex: 0
            }}
          />
          <motion.div
            animate={{
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              bottom: "10%",
              left: "5%",
              width: "400px",
              height: "400px",
              background: `radial-gradient(circle, ${glassStyles.colors.gold}10 0%, transparent 70%)`,
              filter: "blur(60px)",
              zIndex: 0
            }}
          />
          {/* Decorative Doodles in Hero */}
          {!isMobile && (
            <>
              <Doodle type="plate" style={{ position: "absolute", top: "15%", right: "10%", opacity: 0.5 }} />
              <Doodle type="fork" style={{ position: "absolute", bottom: "10%", left: "5%", opacity: 0.3, transform: "rotate(-15deg)" }} />
              <Doodle type="star" style={{ position: "absolute", top: "25%", left: "12%", opacity: 0.4 }} />

              {/* Moving doodle based on scroll */}
              <motion.div
                style={{
                  position: "absolute",
                  top: "40%",
                  right: "15%",
                  opacity: 0.4,
                  y: scrollY * -0.2,
                }}
              >
                <Doodle type="wave" style={{}} />
              </motion.div>
            </>
          )}

          {/* Header */}
          <header style={{
            padding: isMobile ? "12px 20px" : "clamp(12px, 4vw, 24px) clamp(24px, 5vw, 60px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            width: "100%",
            zIndex: 100,
            background: scrollY > 50 || mobileMenuOpen ? "rgba(255, 255, 255, 0.9)" : "transparent",
            backdropFilter: scrollY > 50 || mobileMenuOpen ? "blur(20px) saturate(180%)" : "none",
            WebkitBackdropFilter: scrollY > 50 || mobileMenuOpen ? "blur(20px) saturate(180%)" : "none",
            borderBottom: scrollY > 50 ? "1px solid rgba(255, 255, 255, 0.3)" : "none",
            transition: "all 0.3s ease",
            minHeight: isMobile ? "70px" : "clamp(60px, 15vw, 80px)",
            gap: "clamp(8px, 3vw, 20px)",
            boxSizing: "border-box"
          }}>
            <div style={{ flex: "0 0 auto" }}>
              <DineInGoLogo size={isMobile ? "small" : "small"} />
            </div>

            {!isMobile ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                style={{
                  ...glassStyles.button,
                  backgroundColor: glassStyles.colors.gold,
                  padding: "12px 28px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  border: "none",
                  boxShadow: "0 4px 14px rgba(250, 204, 21, 0.3)",
                  cursor: "pointer",
                  color: glassStyles.colors.black,
                  whiteSpace: "nowrap",
                  flex: "0 0 auto"
                }}
              >
                {t('signIn', 'Sign In')}
              </motion.button>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: glassStyles.colors.black,
                  padding: "8px",
                  zIndex: 101
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {mobileMenuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}

            {/* Mobile Menu Overlay */}
            {isMobile && mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "white",
                  padding: "20px 20px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  zIndex: 99,
                  boxSizing: "border-box"
                }}
              >
                <button
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                  style={{
                    ...glassStyles.button,
                    backgroundColor: glassStyles.colors.gold,
                    padding: "15px",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    border: "none",
                    cursor: "pointer",
                    color: glassStyles.colors.black,
                    textAlign: "center"
                  }}
                >
                  {t('signIn', 'Sign In')}
                </button>
                <nav style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "10px 0" }}>
                  <button
                    onClick={() => { document.querySelector('[data-section="features"]')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
                    style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "600", fontSize: "1.1rem", color: glassStyles.colors.black, padding: "8px 0" }}
                  >
                    Features
                  </button>
                  <button
                    onClick={() => { /* TODO: Navigate to About Us */ setMobileMenuOpen(false); }}
                    style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "600", fontSize: "1.1rem", color: glassStyles.colors.black, padding: "8px 0" }}
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => { /* TODO: Navigate to Contact */ setMobileMenuOpen(false); }}
                    style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "600", fontSize: "1.1rem", color: glassStyles.colors.black, padding: "8px 0" }}
                  >
                    Contact
                  </button>
                </nav>
              </motion.div>
            )}
          </header>

          {/* Main Hero Content with Scroll Animation */}
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            minHeight: "100vh",
            position: "relative",
            alignItems: "center",
            padding: isMobile ? "90px 20px 40px" : "0 clamp(24px, 5vw, 60px)",
            boxSizing: "border-box",
            textAlign: isMobile ? "center" : "left",
          }}>
            {/* Left Side: Text Content */}
            <div style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: isMobile ? "center" : "flex-start",
              position: "relative",
              zIndex: 5,
              maxWidth: isMobile ? "100%" : "600px",
            }}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  transform: `translateY(${scrollY * 0.1}px)`,
                }}
              >
                <DineInGoLogo size="large" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: isMobile ? 0 : -30, y: isMobile ? 20 : 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{
                  fontSize: "clamp(2.2rem, 8vw, 4rem)",
                  fontWeight: "900",
                  marginTop: "20px",
                  marginBottom: "24px",
                  maxWidth: isMobile ? "100%" : "90%",
                  color: glassStyles.colors.black,
                  letterSpacing: "-0.05em",
                  lineHeight: "1.15",
                  transform: `translateY(${scrollY * 0.05}px)`,
                }}
              >
                {t('theFutureOf', 'The future of')} <br />
                <span style={{
                  fontStyle: "italic",
                  background: `linear-gradient(120deg, ${glassStyles.colors.primary}, ${glassStyles.colors.primaryDeep})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>{t('diningAndEvents', 'dining & events')}</span> <br />
                {t('isFinallyHere', 'is finally here.')}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{
                  fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
                  color: glassStyles.colors.gray,
                  maxWidth: isMobile ? "100%" : "90%",
                  marginBottom: isMobile ? "30px" : "40px",
                  fontWeight: "500",
                  lineHeight: "1.75"
                }}
              >
                {t('heroDescription', "Select exact tables or specific seats with India's first truly interactive booking platform.")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  justifyContent: isMobile ? "center" : "flex-start",
                  width: "100%"
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -4, boxShadow: `0 12px 28px ${glassStyles.colors.primary}40` }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/login')}
                  style={{
                    ...glassStyles.button,
                    backgroundColor: glassStyles.colors.primary,
                    padding: "clamp(14px, 3.5vw, 20px) clamp(28px, 6vw, 48px)",
                    fontSize: "clamp(0.9rem, 2vw, 1.15rem)",
                    fontWeight: "900",
                    border: "none",
                    cursor: "pointer",
                    color: "white"
                  }}
                >
                  {t('reserveNow', 'Reserve Your Perfect Table')}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const featuresSection = document.querySelector('[data-section="features"]');
                    if (featuresSection) {
                      featuresSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  style={{
                    ...glassStyles.button,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(10px)",
                    padding: "clamp(12px, 3vw, 16px) clamp(24px, 5vw, 36px)",
                    fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
                    fontWeight: "700",
                    border: "1px solid rgba(0,0,0,0.05)",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    color: glassStyles.colors.black
                  }}
                >
                  Learn More
                </motion.button>
              </motion.div>
            </div>

            {/* Right Side: Interactive Table Selection Card */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-20px" }}
              style={{
                flex: "1",
                width: "100%",
                maxWidth: isMobile ? "100%" : "480px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 4,
                marginTop: isMobile ? "32px" : "0",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: "relative",
                  width: "100%",
                  transform: is3DView
                    ? `perspective(1000px) rotateX(${isMobile ? 2 : 5 + scrollY * 0.003}deg) rotateY(${isMobile ? -1 : -3 + scrollY * 0.002}deg)`
                    : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
                  transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Main Floating Glass Card */}
                <motion.div
                  animate={{
                    y: [0, -6, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: "100%",
                    borderRadius: "24px",
                    background: "rgba(255, 255, 255, 0.88)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1), 0 0 30px rgba(0, 242, 157, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.8)",
                    padding: isMobile ? "16px" : "22px",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    transformStyle: "preserve-3d",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Header Info */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "14px",
                    gap: "10px",
                  }}>
                    <div style={{ flex: 1, minWidth: "140px" }}>
                      <h3 style={{ fontSize: isMobile ? "17px" : "19px", fontWeight: "800", margin: 0, color: glassStyles.colors.black, lineHeight: "1.2" }}>
                        Coastal Breeze Restaurant
                      </h3>
                      <div style={{ fontSize: "12px", color: glassStyles.colors.gray, display: "flex", alignItems: "center", gap: "10px", marginTop: "5px", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          Downtown
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#059669", fontWeight: "700" }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10B981", display: "inline-block" }}></span>
                          Open Now
                        </span>
                      </div>
                    </div>
                    <div style={{
                      background: glassStyles.colors.gold,
                      borderRadius: "11px",
                      padding: "6px 11px",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: glassStyles.colors.black,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 3px 8px rgba(250, 204, 21, 0.2)",
                      whiteSpace: "nowrap"
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.2 6.6h7.1l-5.7 4.2 2.2 6.6-5.8-4.2-5.8 4.2 2.2-6.6-5.7-4.2h7.1z" />
                      </svg>
                      4.8
                    </div>
                  </div>

                  {/* Interactive Title & 3D/2D Toggle */}
                  <div style={{
                    marginBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <div style={{
                      fontSize: isMobile ? "14px" : "15px",
                      fontWeight: "700",
                      color: "#1E293B",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={glassStyles.colors.primaryDeep} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                        <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
                        <line x1="12" y1="9" x2="12" y2="21" />
                      </svg>
                      Interactive Floorplan
                    </div>

                    {/* 3D / 2D Mode Switcher Button */}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setIs3DView(!is3DView)}
                      style={{
                        background: is3DView ? "rgba(0, 242, 157, 0.15)" : "rgba(30, 41, 59, 0.06)",
                        border: is3DView ? "1px solid rgba(0, 242, 157, 0.4)" : "1px solid rgba(0, 0, 0, 0.08)",
                        padding: "5px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: is3DView ? "#047857" : "#475569",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      {is3DView ? "3D Mode" : "2D Plan"}
                    </motion.button>
                  </div>

                  {/* Floor Plan Area with Tables */}
                  <div style={{
                    position: "relative",
                    background: "linear-gradient(180deg, rgba(241, 245, 249, 0.8) 0%, rgba(234, 242, 250, 0.95) 100%)",
                    borderRadius: "16px",
                    border: "1px solid rgba(0, 0, 0, 0.06)",
                    overflow: "hidden",
                    height: isMobile ? "290px" : "340px",
                    width: "100%",
                  }}>
                    {/* Floor Grid */}
                    <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.25 }}>
                      <defs>
                        <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#64748B" strokeWidth="0.5" />
                        </pattern>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                          <rect width="100" height="100" fill="url(#smallGrid)" />
                          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#64748B" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Floor Ambient Lighting & Zones */}
                    <div style={{
                      position: "absolute",
                      top: "8px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "3px 10px",
                      background: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(4px)",
                      borderRadius: "12px",
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "#64748B",
                      letterSpacing: "0.05em",
                      border: "1px solid rgba(255, 255, 255, 0.8)",
                      pointerEvents: "none",
                      textTransform: "uppercase"
                    }}>
                      🪟 Scenic Window Zone
                    </div>

                    <div style={{
                      position: "absolute",
                      bottom: "8px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "3px 10px",
                      background: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(4px)",
                      borderRadius: "12px",
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "#64748B",
                      letterSpacing: "0.05em",
                      border: "1px solid rgba(255, 255, 255, 0.8)",
                      pointerEvents: "none",
                      textTransform: "uppercase"
                    }}>
                      🚪 Entrance & Terrace Access
                    </div>

                    {/* Interactive Table Buttons */}
                    {tablePositions.map((pos) => (
                      <Table3DButton
                        key={pos.id}
                        number={pos.id}
                        isSelected={selectedTable === pos.id}
                        onClick={() => setSelectedTable(pos.id)}
                        position={pos}
                        glassStyles={glassStyles}
                        is3DMode={is3DView}
                      />
                    ))}
                  </div>

                  {/* Bottom Action Bar */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "center",
                      gap: isMobile ? "12px" : "16px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ fontSize: "14px", color: glassStyles.colors.black, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "700", color: "#1E293B" }}>Selected:</span>
                        <span style={{ fontWeight: "800", color: glassStyles.colors.primaryDeep }}>Table {selectedTable}</span>
                        <span style={{
                          background: "rgba(0, 242, 157, 0.15)",
                          color: "#047857",
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "6px"
                        }}>
                          {currentSelectedTableInfo.view}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>👤 {currentSelectedTableInfo.seats} Guests Capacity</span>
                        <span>•</span>
                        <span style={{ fontWeight: "700", color: "#0F172A" }}>{currentSelectedTableInfo.price} min</span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => navigate('/login')}
                      style={{
                        ...glassStyles.button,
                        backgroundColor: glassStyles.colors.primary,
                        color: "white",
                        fontWeight: "800",
                        padding: "12px 24px",
                        border: "none",
                        borderRadius: "14px",
                        boxShadow: `0 8px 24px ${glassStyles.colors.primary}40`,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Book Table {selectedTable}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        {/* Interactive Feature Tabs Section */}
        <motion.div
          data-section="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          variants={containerVariants}
          style={{
            padding: isMobile ? "80px 20px" : "120px clamp(24px, 5vw, 60px)",
            background: glassStyles.colors.bg,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Blobs for depth */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            style={{
              position: "absolute",
              top: "20%",
              left: "-10%",
              width: "600px",
              height: "600px",
              background: `radial-gradient(circle, ${glassStyles.colors.primary} 0%, transparent 70%)`,
              filter: "blur(80px)",
              zIndex: 0
            }}
          />

          {/* Decorative doodles */}
          {!isMobile && (
            <>
              <Doodle type="chair" style={{ position: "absolute", bottom: "20%", right: "5%", opacity: 0.2 }} />
              <Doodle type="ticket" style={{ position: "absolute", top: "15%", left: "7%", opacity: 0.2 }} />

              {/* Parallax doodle */}
              <motion.div
                style={{
                  position: "absolute",
                  right: "20%",
                  top: "50%",
                  y: (scrollY - 500) * -0.1,
                }}
              >
                <Doodle type="star" style={{ opacity: 0.4 }} />
              </motion.div>
            </>
          )}

          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <SectionHeading
              tagline="Our Vision"
              title="Experience"
              highlight="Excellence"
              glassStyles={glassStyles}
            />

            {/* Tab Navigation with Scroll Animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              style={{
                ...glassStyles.card,
                padding: "6px",
                display: "flex",
                justifyContent: isMobile ? "flex-start" : "center",
                marginBottom: "50px",
                gap: "4px",
                maxWidth: isMobile ? "100%" : "fit-content",
                margin: isMobile ? "0 0 50px" : "0 auto 50px",
                background: "rgba(255, 255, 255, 0.4)",
                overflowX: isMobile ? "auto" : "visible",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {[
                { id: "restaurants", label: "Restaurants" },
                { id: "events", label: "Events" },
                { id: "premium", label: "Premium" }
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: activeTab === tab.id ? "white" : "transparent",
                    border: "none",
                    padding: isMobile ? "10px 20px" : "12px 28px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: isMobile ? "0.9rem" : "1rem",
                    fontWeight: activeTab === tab.id ? "700" : "500",
                    color: activeTab === tab.id ? glassStyles.colors.black : glassStyles.colors.gray,
                    boxShadow: activeTab === tab.id ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    flex: isMobile ? "0 0 auto" : "1"
                  }}
                >
                  {tab.label}
                </motion.button>
              ))}
            </motion.div>

            {/* Feature Cards with Staggered Animation */}
            <motion.div
              key={activeTab}
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "24px",
                marginTop: "30px",
              }}
            >
              {activeTab === "restaurants" && [
                <FeatureCard
                  key="r1"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="12" y1="4" x2="12" y2="20" /></svg>}
                  title="Choose Your Table"
                  description="Browse restaurant floor plans and select your preferred table location."
                  color="#facc15"
                  glassStyles={glassStyles}
                />,
                <FeatureCard
                  key="r2"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17c-5 0-8-2.5-8-7 0-3 2-5 5-5 4 0 8 3 9 8" /><path d="M17 17c-5 0-8-2.5-8-7 0-3 2-5 5-5 4 0 8 3 9 8" /></svg>}
                  title="Read Real Reviews"
                  description="See what others thought about specific tables and views."
                  color={glassStyles.colors.primary}
                  glassStyles={glassStyles}
                />,
                <FeatureCard
                  key="r3"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                  title="Real-Time Availability"
                  description="See instantly which tables are available at your preferred time."
                  color="#fbbf24"
                  glassStyles={glassStyles}
                />
              ]}

              {activeTab === "events" && [
                <FeatureCard
                  key="e1"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                  title="Upcoming Events"
                  description="Browse and book tickets for concerts, shows, and sporting events."
                  color={glassStyles.colors.primary}
                  glassStyles={glassStyles}
                />,
                <FeatureCard
                  key="e2"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>}
                  title="Interactive Seating"
                  description="View the stage from your seat before booking with our 3D previews."
                  color="#facc15"
                  glassStyles={glassStyles}
                />,
                <FeatureCard
                  key="e3"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>}
                  title="Group Bookings"
                  description="Book adjacent seats for your entire group with one simple reservation."
                  color="#fbbf24"
                  glassStyles={glassStyles}
                />
              ]}

              {activeTab === "premium" && [
                <FeatureCard
                  key="p1"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>}
                  title="VIP Access"
                  description="Unlock premium tables and seats with our VIP membership."
                  color="#facc15"
                  glassStyles={glassStyles}
                />,
                <FeatureCard
                  key="p2"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>}
                  title="Priority Booking"
                  description="Book before public release dates and secure the best spots."
                  color={glassStyles.colors.primary}
                  glassStyles={glassStyles}
                />,
                <FeatureCard
                  key="p3"
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
                  title="Special Offers"
                  description="Exclusive deals and discounts on premium experiences."
                  color="#fbbf24"
                  glassStyles={glassStyles}
                />
              ]}
            </motion.div>
          </div>
        </motion.div>

        {/* Call to Action Section with Layered Wavy Footer */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
          variants={containerVariants}
          style={{
            padding: isMobile ? "80px 20px 0" : "clamp(80px, 15vw, 160px) clamp(24px, 5vw, 60px) 0",
            background: `linear-gradient(180deg, ${glassStyles.colors.bg} 0%, white 100%)`,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Layered Animated Waves */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            zIndex: 1,
            lineHeight: 0
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: "100%", height: "220px", opacity: 0.3 }}>
              <path fill={glassStyles.colors.primary} fillOpacity="1"
                d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
                <animate attributeName="d" dur="18s" repeatCount="indefinite"
                  values="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z; M0,192L48,176C96,160,192,128,288,128C384,128,480,160,576,176C672,192,768,192,864,176C960,160,1056,128,1152,128C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z; M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
              </path>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: "100%", height: "200px", position: "absolute", bottom: 0, left: 0 }}>
              <path fill={glassStyles.colors.primary} fillOpacity="1"
                d="M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
                <animate attributeName="d" dur="15s" repeatCount="indefinite"
                  values="M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z; M0,128L48,154.7C96,181,192,235,288,245.3C384,256,480,224,576,192C672,160,768,128,864,144C960,160,1056,224,1152,245.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z; M0,96L48,122.7C96,149,192,203,288,213.3C384,224,480,192,576,160C672,128,768,96,864,112C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
              </path>
            </svg>
          </div>

          <motion.div
            variants={itemVariants}
            style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 10, paddingBottom: "100px" }}
          >
            <SectionHeading
              tagline="Join Today"
              title="The future is"
              highlight="personal."
              glassStyles={glassStyles}
            />
            <motion.button
              whileHover={{ scale: 1.05, y: -8, boxShadow: `0 25px 50px -12px ${glassStyles.colors.primary}40` }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              style={{
                ...glassStyles.button,
                backgroundColor: glassStyles.colors.black,
                color: "white",
                padding: isMobile ? "20px 48px" : "26px 72px",
                fontSize: isMobile ? "1.1rem" : "1.3rem",
                fontWeight: "900",
                border: "none",
                cursor: "pointer",
                boxShadow: `0 20px 40px -10px ${glassStyles.colors.black}50`
              }}
            >
              Get Early Access Pass
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Modern Responsive Footer */}
        <footer style={{
          backgroundColor: glassStyles.colors.primary,
          color: glassStyles.colors.black,
          padding: isMobile ? "40px 20px" : "clamp(40px, 8vw, 60px) clamp(24px, 5vw, 60px)",
          position: "relative",
          zIndex: 5
        }}>
          <div style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(24px, 4vw, 32px)",
            textAlign: "center"
          }}>
            {/* Responsive Logo */}
            <div>
              <DineInGoLogo size="small" color={glassStyles.colors.black} yellowColor="white" />
            </div>

            {/* Responsive Navigation Links */}
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "clamp(16px, 3vw, 40px)",
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                fontWeight: "600",
                alignItems: "center",
                width: "100%",
                maxWidth: isMobile ? "100%" : "600px"
              }}
            >
              <span
                onClick={() => navigate('/privacy')}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: "8px 12px",
                  borderRadius: "8px"
                }}
              >
                Privacy Policy
              </span>
              <span
                onClick={() => navigate('/terms')}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: "8px 12px",
                  borderRadius: "8px"
                }}
              >
                Terms of Service
              </span>
              <span
                onClick={() => navigate('/support')}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: "8px 12px",
                  borderRadius: "8px"
                }}
              >
                Contact Support
              </span>
            </div>

            {/* Responsive Copyright Text */}
            <div
              style={{
                fontSize: "clamp(0.8rem, 1.8vw, 0.9rem)",
                opacity: 0.6,
                lineHeight: "1.6",
                maxWidth: isMobile ? "100%" : "600px"
              }}
            >
              <p style={{ margin: 0 }}>
                © 2026 DineInGo. All rights reserved.
                {!isMobile && <br />}
                {isMobile && " "}
                Designed for the elite dining experience.
              </p>
            </div>
          </div>
        </footer>
      </motion.div>
    </>
  );
}
