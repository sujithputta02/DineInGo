import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DineInGoIntroProps {
  onComplete: () => void;
}

const DineInGoIntro: React.FC<DineInGoIntroProps> = ({ onComplete }) => {
  const [rippleActive, setRippleActive] = useState(false);
  const [dotLanded, setDotLanded] = useState(false);

  // Trigger ripple and land state after dot falls
  useEffect(() => {
    // Stagger for letters: 8 letters * 0.06s = 0.48s
    // Dot drops after that, say around 0.6s
    const landTimer = setTimeout(() => {
      setDotLanded(true);
      setRippleActive(true);
    }, 900); // 900ms corresponds to dot landing time

    // Keep ripple active briefly, then complete the full intro
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(landTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Letters of the logo
  const word1 = "DıneIn".split(""); // Using dotless 'ı' for custom animating dot
  const word2 = "Go".split("");

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 14,
      },
    },
  };

  // Dot transition animation
  const dotVariants = {
    hidden: { opacity: 0, y: -250, scale: 0.5 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: 0.6, // Start dropping after letters begin to appear
        type: "spring",
        stiffness: 200,
        damping: 10, // Nice bounce
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.03,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at center, #022c22 0%, #080d0b 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999, // Render on top of everything
        overflow: "hidden",
      }}
    >
      {/* Background ambient glow behind logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: "clamp(260px, 60vw, 500px)",
          height: "clamp(260px, 60vw, 500px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 5%" }}>
        {/* Animated Logo Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(2.5rem, 8vw, 6rem)", // Fluid typography for all ratios
            fontWeight: "bold",
            letterSpacing: "0.02em",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            textShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            userSelect: "none",
            position: "relative",
            lineHeight: 1, // Fix baseline so position absolute top works perfectly across browsers
          }}
        >
          {/* Word 1: DineIn (White) */}
          {word1.map((char, index) => {
            if (char === "ı") {
              // The dotless 'i' wrapper containing the custom animated red dot
              return (
                <motion.span
                  key={index}
                  variants={letterVariants}
                  style={{ color: "#ffffff", position: "relative", display: "inline-block" }}
                >
                  ı
                  {/* The Premium Animating Red Dot - responsive using em units */}
                  <motion.span
                    variants={dotVariants}
                    style={{
                      position: "absolute",
                      top: "0.22em", // Proportional top offset based on font-size
                      left: "50%",
                      marginLeft: "-0.115em", // Proportional center offset (half of width)
                      width: "0.23em", // Proportional width
                      height: "0.23em", // Proportional height
                      backgroundColor: "#ef4444", // Crimson Red
                      borderRadius: "50%",
                      boxShadow: "0 0 0.15em rgba(239, 68, 68, 0.8), 0 0 0.3em rgba(239, 68, 68, 0.4)",
                      zIndex: 2,
                    }}
                  />
                  
                  {/* Ripple pulse ring when dot lands - responsive using em units */}
                  <AnimatePresence>
                    {rippleActive && (
                      <motion.span
                        initial={{ opacity: 0.8, scale: 0.8 }}
                        animate={{ opacity: 0, scale: 3.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        style={{
                          position: "absolute",
                          top: "0.335em", // Centered with dotless 'i' dot center (top + half-height)
                          left: "50%",
                          marginLeft: "-0.115em",
                          marginTop: "-0.115em",
                          width: "0.23em",
                          height: "0.23em",
                          border: "0.03em solid #ef4444",
                          borderRadius: "50%",
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.span>
              );
            }

            return (
              <motion.span key={index} variants={letterVariants} style={{ color: "#ffffff" }}>
                {char}
              </motion.span>
            );
          })}

          {/* Word 2: Go (Gold) */}
          {word2.map((char, index) => (
            <motion.span key={index} variants={letterVariants} style={{ color: "#facc15" }}>
              {char}
            </motion.span>
          ))}
        </motion.div>

        {/* Minimalist Subtitle/Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={dotLanded ? { opacity: 0.65, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            marginTop: "1.5rem",
            fontSize: "clamp(0.6rem, 1.8vw, 0.9rem)",
            fontWeight: 600,
            color: "#e2e8f0",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            textAlign: "center",
            opacity: 0,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          India's First Real-Time Table & Event Selector
        </motion.p>
      </div>

      {/* Decorative premium corner lines to emphasize minimalistic luxury */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={dotLanded ? { opacity: 0.2 } : { opacity: 0 }}
        transition={{ duration: 1 }}
        style={{
          position: "absolute",
          top: "clamp(20px, 4vw, 40px)",
          left: "clamp(20px, 4vw, 40px)",
          width: "clamp(12px, 2vw, 20px)",
          height: "clamp(12px, 2vw, 20px)",
          borderTop: "2px solid white",
          borderLeft: "2px solid white",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={dotLanded ? { opacity: 0.2 } : { opacity: 0 }}
        transition={{ duration: 1 }}
        style={{
          position: "absolute",
          bottom: "clamp(20px, 4vw, 40px)",
          right: "clamp(20px, 4vw, 40px)",
          width: "clamp(12px, 2vw, 20px)",
          height: "clamp(12px, 2vw, 20px)",
          borderBottom: "2px solid white",
          borderRight: "2px solid white",
        }}
      />
    </motion.div>
  );
};

export default DineInGoIntro;
