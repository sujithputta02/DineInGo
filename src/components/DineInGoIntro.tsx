import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DineInGoIntroProps {
  onComplete: () => void;
}

const DineInGoIntro: React.FC<DineInGoIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"orbit" | "converge" | "logo" | "complete">("orbit");
  const [dotLanded, setDotLanded] = useState(false);

  useEffect(() => {
    // Phase 1 -> 2: Icons pop & orbit (0.0s -> 0.75s)
    const convergeTimer = setTimeout(() => {
      setPhase("converge");
    }, 750);

    // Phase 2 -> 3: Swirl into logo & drop red dot (1.2s)
    const logoTimer = setTimeout(() => {
      setPhase("logo");
    }, 1200);

    // Red dot lands (1.75s)
    const landTimer = setTimeout(() => {
      setDotLanded(true);
    }, 1750);

    // Complete intro sequence (3.2s)
    const finishTimer = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(convergeTimer);
      clearTimeout(logoTimer);
      clearTimeout(landTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  // Letters of the logo
  const word1 = "DıneIn".split(""); // Using dotless 'ı' for animated red dot
  const word2 = "Go".split("");

  // Stagger container
  const textContainerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.1,
      },
    },
  };

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.4, 
      y: 30,
      rotateX: -45 
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 12,
      },
    },
  };

  // Red Dot spring drop
  const dotVariants = {
    hidden: { opacity: 0, y: -280, scale: 0.2 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: 0.55,
        type: "spring",
        stiffness: 280,
        damping: 10, // District-style snappy bounce
      },
    },
  };

  // District-style doodle icon definitions with Indian culture + dining + event motifs
  const districtIcons = [
    { id: "biryani", label: "Dining", x: "-26vw", y: "-22vh", color: "#D97706", delay: 0.0 },
    { id: "thali", label: "Thali", x: "26vw", y: "-20vh", color: "#B45309", delay: 0.08 },
    { id: "lotus", label: "Culture", x: "-32vw", y: "8vh", color: "#E11D48", delay: 0.16 },
    { id: "cocktail", label: "Nightlife", x: "32vw", y: "10vh", color: "#059669", delay: 0.24 },
    { id: "ticket", label: "Events", x: "-22vw", y: "24vh", color: "#7C3AED", delay: 0.32 },
    { id: "diya", label: "Festivals", x: "22vw", y: "25vh", color: "#D97706", delay: 0.40 },
    { id: "table", label: "Tables", x: "0vw", y: "-28vh", color: "#2563EB", delay: 0.12 },
    { id: "music", label: "Concerts", x: "0vw", y: "28vh", color: "#D97706", delay: 0.28 },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.04,
        filter: "blur(6px)",
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at center, #FDFBF7 0%, #F4EFE6 100%)", // District Creamy White Backdrop
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        overflow: "hidden",
      }}
    >
      {/* Radiant Champagne Gold Ambient Glow Core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.35, scale: [0.8, 1.1, 1] }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: "clamp(340px, 70vw, 700px)",
          height: "clamp(340px, 70vw, 700px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 166, 35, 0.3) 0%, rgba(217, 119, 6, 0.1) 45%, transparent 70%)",
          filter: "blur(65px)",
          pointerEvents: "none",
        }}
      />

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        whileHover={{ opacity: 1, scale: 1.05 }}
        onClick={onComplete}
        style={{
          position: "absolute",
          top: "clamp(18px, 3.5vw, 36px)",
          right: "clamp(18px, 3.5vw, 36px)",
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid rgba(217, 119, 6, 0.25)",
          color: "#334155",
          padding: "6px 18px",
          borderRadius: "20px",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
          zIndex: 100,
          transition: "all 0.2s ease",
        }}
      >
        SKIP
      </motion.button>

      {/* ========================================================================= */}
      {/* DISTRICT-STYLE ORBITING ICON POP-IN & SWIRL LAYER */}
      {/* ========================================================================= */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        {districtIcons.map((icon) => {
          const isConverging = phase === "converge" || phase === "logo" || phase === "complete";
          return (
            <motion.div
              key={icon.id}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 0, 
                rotate: -30 
              }}
              animate={
                isConverging
                  ? { 
                      x: icon.x, 
                      y: icon.y, 
                      scale: 0.88, 
                      opacity: 0.65, 
                      rotate: 0 
                    }
                  : { 
                      x: [0, icon.x], 
                      y: [0, icon.y], 
                      scale: [0, 1.25, 1], 
                      opacity: [0, 1, 0.9], 
                      rotate: [-20, 10, 0] 
                    }
              }
              transition={{
                duration: isConverging ? 0.8 : 0.6,
                delay: isConverging ? 0 : icon.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginLeft: "-24px",
                marginTop: "-24px",
                width: "48px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Clean Vector SVG Icon Cards */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.85)",
                  border: `1.5px solid ${icon.color}`,
                  boxShadow: `0 8px 20px rgba(0,0,0,0.06), 0 0 12px ${icon.color}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                }}
              >
                {icon.id === "biryani" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 13C4 13 3 15 3 17C3 19.5 7 21 12 21C17 21 21 19.5 21 17C21 15 20 13 18 13" />
                    <path d="M4 13C4 9.5 7.5 7 12 7C16.5 7 20 9.5 20 13" />
                    <path d="M12 3V7" />
                  </svg>
                )}
                {icon.id === "thali" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="9" cy="9" r="2" fill={icon.color} />
                    <circle cx="15" cy="9" r="2" fill={icon.color} />
                    <circle cx="12" cy="15" r="2.5" />
                  </svg>
                )}
                {icon.id === "lotus" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2">
                    <path d="M12 4C9 8 5 12 12 20C19 12 15 8 12 4Z" />
                    <path d="M5 14C3 16 7 19 12 20C8 17 6 15 5 14Z" />
                    <path d="M19 14C21 16 17 19 12 20C16 17 18 15 19 14Z" />
                  </svg>
                )}
                {icon.id === "cocktail" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2" strokeLinecap="round">
                    <path d="M8 22H16M12 15V22M5 4L12 15L19 4H5Z" />
                    <circle cx="12" cy="8" r="1.5" fill={icon.color} />
                  </svg>
                )}
                {icon.id === "ticket" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2">
                    <path d="M3 8V16C5 16 5 18 5 18H19C19 18 19 16 21 16V8C19 8 19 6 19 6H5C5 6 5 8 3 8Z" strokeDasharray="3 2" />
                    <path d="M9 12H15" />
                  </svg>
                )}
                {icon.id === "diya" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2">
                    <path d="M4 14C4 18 8 20 12 20C16 20 20 18 20 14H4Z" fill={`${icon.color}20`} />
                    <path d="M12 4C11 7 12 10 12 10C12 10 13 7 12 4Z" fill="#EF4444" stroke="#EF4444" />
                  </svg>
                )}
                {icon.id === "table" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2">
                    <rect x="4" y="6" width="16" height="4" rx="1" />
                    <path d="M6 10V18M18 10V18M12 10V18" />
                  </svg>
                )}
                {icon.id === "music" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2">
                    <path d="M9 18V5L18 3V16" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="15" cy="16" r="3" />
                  </svg>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MAIN DINEINGO BRAND LOGO & PUNCHY RED DOT DROP */}
      {/* ========================================================================= */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 5%", position: "relative", zIndex: 10 }}>
        
        {/* District Crest Ring Accent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
          animate={phase !== "orbit" ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "relative",
            width: "clamp(85px, 15vw, 120px)",
            height: "clamp(85px, 15vw, 120px)",
            marginBottom: "clamp(1rem, 2.5vw, 2rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 140 140" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {/* Rotating Outer Ticks */}
            <motion.circle
              cx="70"
              cy="70"
              r="62"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeDasharray="6 10"
              animate={{ rotate: 360 }}
              transition={{ duration: 22, ease: "linear", repeat: Infinity }}
              style={{ transformOrigin: "70px 70px" }}
            />
            {/* Inner Emerald Guide Ring */}
            <motion.circle
              cx="70"
              cy="70"
              r="50"
              fill="rgba(245, 166, 35, 0.08)"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              animate={{ rotate: -360 }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
              style={{ transformOrigin: "70px 70px" }}
            />
            {/* Location Pin & Flame Icon */}
            <g transform="translate(70, 68) scale(0.85)">
              <path
                d="M 0 -22 C -14 -22 -22 -14 -22 0 C -22 16 0 35 0 35 C 0 35 22 16 22 0 C 22 -14 14 -22 0 -22 Z"
                fill="url(#cinematicGold)"
                fillOpacity="0.15"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="0" cy="-4" r="6" fill="#EF4444" />
            </g>
          </svg>
        </motion.div>

        {/* DineInGo Typography */}
        <motion.div
          variants={textContainerVariants}
          initial="hidden"
          animate={phase !== "orbit" ? "visible" : "hidden"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(2.8rem, 9vw, 6.5rem)",
            fontWeight: 800,
            letterSpacing: "0.02em",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            userSelect: "none",
            position: "relative",
            lineHeight: 1,
          }}
        >
          {/* Word 1: DineIn (Deep Obsidian Charcoal) */}
          {word1.map((char, index) => {
            if (char === "ı") {
              return (
                <motion.span
                  key={index}
                  variants={letterVariants}
                  style={{
                    color: "#0F172A",
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  ı

                  {/* Target Reticle Crosshair SVG */}
                  <AnimatePresence>
                    {!dotLanded && (
                      <motion.svg
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 0.85, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.4 }}
                        transition={{ duration: 0.35 }}
                        viewBox="0 0 40 40"
                        style={{
                          position: "absolute",
                          top: "0.08em",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "0.5em",
                          height: "0.5em",
                          pointerEvents: "none",
                        }}
                      >
                        <circle cx="20" cy="20" r="14" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="20" y1="2" x2="20" y2="10" stroke="#EF4444" strokeWidth="1.5" />
                        <line x1="20" y1="30" x2="20" y2="38" stroke="#EF4444" strokeWidth="1.5" />
                        <line x1="2" y1="20" x2="10" y2="20" stroke="#EF4444" strokeWidth="1.5" />
                        <line x1="30" y1="20" x2="38" y2="20" stroke="#EF4444" strokeWidth="1.5" />
                      </motion.svg>
                    )}
                  </AnimatePresence>

                  {/* The Punchy Crimson Red Dot */}
                  <motion.span
                    variants={dotVariants}
                    style={{
                      position: "absolute",
                      top: "0.22em",
                      left: "50%",
                      marginLeft: "-0.115em",
                      width: "0.23em",
                      height: "0.23em",
                      backgroundColor: "#EF4444",
                      borderRadius: "50%",
                      boxShadow: "0 0 0.2em rgba(239, 68, 68, 0.9), 0 0 0.4em rgba(239, 68, 68, 0.5)",
                      zIndex: 3,
                    }}
                  />
                  
                  {/* District Multi-Layered Impact Ripples */}
                  <AnimatePresence>
                    {dotLanded && (
                      <>
                        <motion.span
                          initial={{ opacity: 0.9, scale: 0.7 }}
                          animate={{ opacity: 0, scale: 3.8 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.95, ease: "easeOut" }}
                          style={{
                            position: "absolute",
                            top: "0.335em",
                            left: "50%",
                            marginLeft: "-0.115em",
                            marginTop: "-0.115em",
                            width: "0.23em",
                            height: "0.23em",
                            border: "0.035em solid #EF4444",
                            borderRadius: "50%",
                            pointerEvents: "none",
                            boxShadow: "0 0 10px #EF4444",
                            zIndex: 1,
                          }}
                        />
                        <motion.span
                          initial={{ opacity: 0.7, scale: 0.5 }}
                          animate={{ opacity: 0, scale: 2.6 }}
                          transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
                          style={{
                            position: "absolute",
                            top: "0.335em",
                            left: "50%",
                            marginLeft: "-0.115em",
                            marginTop: "-0.115em",
                            width: "0.23em",
                            height: "0.23em",
                            border: "0.025em solid #D97706",
                            borderRadius: "50%",
                            pointerEvents: "none",
                            zIndex: 1,
                          }}
                        />
                      </>
                    )}
                  </AnimatePresence>
                </motion.span>
              );
            }

            return (
              <motion.span key={index} variants={letterVariants} style={{ color: "#0F172A" }}>
                {char}
              </motion.span>
            );
          })}

          {/* Word 2: Go (Rich Amber-Gold) */}
          {word2.map((char, index) => (
            <motion.span key={index} variants={letterVariants} style={{ color: "#D97706" }}>
              {char}
            </motion.span>
          ))}
        </motion.div>

        {/* District-Style Slogan Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={dotLanded ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            marginTop: "clamp(1.2rem, 3vw, 2.2rem)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid rgba(217, 119, 6, 0.25)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.05)",
            padding: "8px 24px",
            borderRadius: "30px",
            backdropFilter: "blur(12px)",
          }}
        >
          <span style={{ position: "relative", display: "flex", width: "8px", height: "8px" }}>
            <motion.span
              animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: "#10B981",
              }}
            />
            <span
              style={{
                position: "relative",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10B981",
                boxShadow: "0 0 8px #10B981",
              }}
            />
          </span>

          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.65rem, 1.8vw, 0.85rem)",
              fontWeight: 700,
              color: "#334155",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            India's First Real-Time Table & Event Selector
          </p>
        </motion.div>
      </div>

      {/* Futuristic Corner Accents */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={dotLanded ? { opacity: 0.35 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: "absolute",
          top: "clamp(20px, 4vw, 40px)",
          left: "clamp(20px, 4vw, 40px)",
          width: "clamp(14px, 2vw, 22px)",
          height: "clamp(14px, 2vw, 22px)",
          borderTop: "2px solid #D97706",
          borderLeft: "2px solid #D97706",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={dotLanded ? { opacity: 0.35 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: "absolute",
          bottom: "clamp(20px, 4vw, 40px)",
          right: "clamp(20px, 4vw, 40px)",
          width: "clamp(14px, 2vw, 22px)",
          height: "clamp(14px, 2vw, 22px)",
          borderBottom: "2px solid #10B981",
          borderRight: "2px solid #10B981",
        }}
      />
    </motion.div>
  );
};

export default DineInGoIntro;
