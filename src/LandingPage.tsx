import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

interface Table3DButtonProps {
  number: number;
  isSelected: boolean;
  onClick: () => void;
  position: {
    x: number;
    y: number;
    rotate?: number;
  };
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("restaurants");
  const [scrollY, setScrollY] = useState(0);
  const [selectedTable, setSelectedTable] = useState(3);
  const navigate = useNavigate();
  
  // Track scroll position for animations
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Logo component (keeping original)
  const DineInGoLogo = ({ size = "large", color = "black", yellowColor = "#facc15" }) => {
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

  // Feature card with animation
  const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ scale: 1.03 }}
      style={{
        background: `linear-gradient(135deg, ${color}10, ${color}30)`,
        borderRadius: "16px",
        padding: "24px",
        height: "100%",
        border: `1px solid ${color}20`,
        boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          background: color,
          width: "50px",
          height: "50px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          boxShadow: `0 6px 12px ${color}40`,
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: "1.5rem", marginBottom: "10px", color: "#333" }}>{title}</h3>
      <p style={{ color: "#555", lineHeight: "1.5", margin: 0 }}>{description}</p>
    </motion.div>
  );

  // 3D Button for table selection
  const Table3DButton: React.FC<Table3DButtonProps> = ({ number, isSelected, onClick, position }) => (
    <motion.div
      whileHover={{ scale: 1.08, y: -5 }}
      onClick={onClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: isSelected ? -10 : 0,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 17,
        delay: number * 0.1 
      }}
      style={{
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: "60px",
        height: "60px",
        cursor: "pointer",
        transform: `perspective(800px) rotateX(30deg) rotateZ(${position.rotate || 0}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Top surface */}
      <motion.div
        animate={{
          boxShadow: isSelected 
            ? [
                "0 15px 25px rgba(0,0,0,0.2), 0 0 15px rgba(0, 242, 157, 0.6)",
                "0 15px 25px rgba(0,0,0,0.2), 0 0 25px rgba(0, 242, 157, 0.4)",
                "0 15px 25px rgba(0,0,0,0.2), 0 0 15px rgba(0, 242, 157, 0.6)"
              ]
            : "0 10px 20px rgba(0,0,0,0.15)"
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
          backgroundColor: isSelected ? "#00F29D" : "#fff",
          border: isSelected ? "2px solid #00F29D" : "1px solid rgba(0,0,0,0.1)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          fontWeight: "bold",
          color: isSelected ? "#fff" : "#333",
          zIndex: 2,
          transformStyle: "preserve-3d",
        }}
      >
        T{number}
      </motion.div>

      {/* Side surfaces for 3D effect */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "12px",
          bottom: "-10px",
          left: "0",
          backgroundColor: isSelected ? "#00ba78" : "#e0e0e0",
          borderRadius: "0 0 10px 10px",
          transformOrigin: "top",
          transform: "rotateX(-90deg)",
          zIndex: 1,
        }}
      />
      
      {/* Pulse animation for selected table */}
      {isSelected && (
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 0, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "12px",
            backgroundColor: "#00F29D",
            zIndex: 0,
          }}
        />
      )}
    </motion.div>
  );

  // Table layout positions
  const tablePositions = [
    { x: 15, y: 20, rotate: -5 },
    { x: 45, y: 15, rotate: 5 },
    { x: 75, y: 20, rotate: -5 },
    { x: 20, y: 60, rotate: 5 },
    { x: 50, y: 65, rotate: -5 },
    { x: 80, y: 60, rotate: 5 },
  ];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      {/* Hero Section with Parallax and Doodle Art */}
      <div 
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          position: "relative",
          background: "linear-gradient(135deg, #f6f9ff 0%, #ffffff 100%)",
          overflow: "hidden",
        }}
      >
        {/* Decorative Doodles in Hero */}
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

        {/* Header */}
        <header style={{ 
          padding: "20px 5%", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          position: "absolute", 
          top: 0, 
          width: "90%", 
          zIndex: 10 
        }}>
          <DineInGoLogo size="small" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: "#facc15",
              padding: "10px 24px",
              fontSize: "1rem",
              fontWeight: "bold",
              borderRadius: "999px",
              border: "none",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              cursor: "pointer",
            }}
          >
            Sign In
          </motion.button>
        </header>

        {/* Main Hero Content with Scroll Animation */}
        <div style={{ 
          display: "flex", 
          flexDirection: "row", 
          height: "100vh",
          position: "relative",
        }}>
          {/* Left Side: Text Content */}
          <div style={{ 
            flex: "1",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 5%",
            position: "relative",
            zIndex: 5,
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
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{
                fontSize: "2.2rem",
                fontWeight: "600",
                marginTop: "20px",
                marginBottom: "24px",
                maxWidth: "90%",
                transform: `translateY(${scrollY * 0.05}px)`,
              }}
            >
              The future of dining and event reservations is here
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              style={{
                fontSize: "1.1rem",
                color: "#555",
                maxWidth: "90%",
                marginBottom: "40px",
              }}
            >
              Select exact tables at restaurants or specific seats at events with our interactive booking platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/login')}
                style={{
                  backgroundColor: "#facc15",
                  padding: "14px 32px",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 8px 20px rgba(250, 204, 21, 0.3)",
                  cursor: "pointer",
                }}
              >
                Get Started
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  const featuresSection = document.querySelector('[data-section="features"]');
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{
                  backgroundColor: "#00F29D",
                  padding: "14px 32px",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 8px 20px rgba(0, 242, 157, 0.3)",
                  cursor: "pointer",
                }}
              >
                Learn More
              </motion.button>
            </motion.div>
          </div>

          {/* Right Side: NEW 3D Interactive Table Selection Interface */}
          <div style={{ 
            flex: "1",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* New 3D Interactive Floating Interface */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) perspective(1000px) rotateX(${10 + scrollY * 0.01}deg) rotateY(${-5 + scrollY * 0.005}deg)`,
                width: "90%",
                height: "80%",
              }}
            >
              {/* Main Floating Card */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "24px",
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 30px rgba(0, 242, 157, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  padding: "30px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transformStyle: "preserve-3d",
                  transform: "translateZ(0px)",
                }}
              >
                {/* Restaurant Name and Info Bar */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "25px",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "24px", margin: 0, color: "#333" }}>Coastal Breeze Restaurant</h3>
                    <div style={{ fontSize: "14px", color: "#666", display: "flex", alignItems: "center", gap: "15px", marginTop: "5px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        Downtown
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"/>
                          <path d="M12 6v6l4 2"/>
                        </svg>
                        Open now
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    background: "#facc15", 
                    borderRadius: "14px",
                    padding: "6px 12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.2 6.6h7.1l-5.7 4.2 2.2 6.6-5.8-4.2-5.8 4.2 2.2-6.6-5.7-4.2h7.1z"/>
                    </svg>
                    4.8 (238)
                  </div>
                </motion.div>
                
                {/* 3D Floor Plan Title */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  style={{
                    marginBottom: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ 
                    fontSize: "18px", 
                    fontWeight: "600", 
                    color: "#333",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
                      <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                      <line x1="12" y1="9" x2="12" y2="21"/>
                    </svg>
                    Select Your Table
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{
                      background: "rgba(0, 242, 157, 0.1)",
                      padding: "6px 14px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      color: "#00F29D",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 8l4 4-4 4M8 12h8"/>
                    </svg>
                    3D View
                  </motion.div>
                </motion.div>
                
                {/* Floor Plan Area with 3D Tables */}
                <div style={{ 
                  flex: 1, 
                  position: "relative",
                  background: "linear-gradient(180deg, rgba(245, 247, 255, 0.6) 0%, rgba(240, 247, 255, 0.9) 100%)",
                  borderRadius: "16px",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  overflow: "hidden",
                }}>
                  {/* Floor decoration - grid lines */}
                  <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.2 }}>
                    <defs>
                      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#5B8CD7" strokeWidth="0.5" />
                      </pattern>
                      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <rect width="100" height="100" fill="url(#smallGrid)" />
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#5B8CD7" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  
                  {/* Decorative Elements */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    style={{
                      position: "absolute",
                      bottom: "10%",
                      right: "10%",
                      width: "180px",
                      height: "25px",
                      background: "rgba(0, 242, 157, 0.2)",
                      borderRadius: "20px",
                      transform: "perspective(800px) rotateX(60deg)",
                      border: "1px solid rgba(0, 242, 157, 0.3)",
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                    style={{
                      position: "absolute",
                      top: "15%",
                      left: "15%",
                      width: "150px",
                      height: "25px",
                      background: "rgba(250, 204, 21, 0.2)",
                      borderRadius: "20px",
                      transform: "perspective(800px) rotateX(60deg)",
                      border: "1px solid rgba(250, 204, 21, 0.3)",
                    }}
                  />
                  
                  {/* Interactive 3D table buttons */}
                  {tablePositions.map((pos, i) => (
                    <Table3DButton
                      key={i}
                      number={i + 1}
                      isSelected={selectedTable === i + 1}
                      onClick={() => setSelectedTable(i + 1)}
                      position={pos}
                    />
                  ))}
                </div>
                
                {/* Bottom Action Bar */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  style={{
                    marginTop: "25px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "16px", color: "#333" }}>
                    <span style={{ fontWeight: "600" }}>Selected:</span> Table {selectedTable}
                    <span style={{ marginLeft: "8px", color: "#00a36c", fontWeight: "500" }}>
                      (Window View)
                    </span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      backgroundColor: "#00F29D",
                      color: "white",
                      fontWeight: "600",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 8px 16px rgba(0, 242, 157, 0.3)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Book This Table
                  </motion.button>
                </motion.div>
                
                {/* Glossy reflection overlay */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "30%",
                  background: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)",
                  borderRadius: "24px 24px 0 0",
                  pointerEvents: "none",
                }} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      {/* Interactive Feature Tabs Section with Scroll Animations */}
      <div 
        data-section="features"
        style={{
          padding: "80px 5%",
          background: "linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative doodles */}
        <Doodle type="chair" style={{ position: "absolute", bottom: "20%", right: "5%", opacity: 0.3 }} />
        <Doodle type="ticket" style={{ position: "absolute", top: "15%", left: "7%", opacity: 0.3 }} />
        
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

        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{
              fontSize: "2.5rem",
              textAlign: "center",
              marginBottom: "50px",
              position: "relative",
            }}
          >
            Explore DineInGo Features
            <motion.div
              style={{
                height: "4px",
                width: "80px",
                background: "linear-gradient(to right, #facc15, #00F29D)",
                borderRadius: "2px",
                margin: "16px auto 0",
              }}
              initial={{ width: 0 }}
              whileInView={{ width: "80px" }}
              transition={{ delay: 0.2, duration: 0.8 }}
              viewport={{ once: true }}
            />
          </motion.h2>

          {/* Tab Navigation with Scroll Animation */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "40px",
              gap: "20px",
            }}
          >
            {[
              { id: "restaurants", label: "Restaurants" },
              { id: "events", label: "Events" },
              { id: "premium", label: "Premium" }
            ].map(tab => (
              <motion.button
                key={tab.id}
                whileHover={{ y: -5 }}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? "#facc15" : "transparent",
                  border: activeTab === tab.id ? "none" : "1px solid #ddd",
                  padding: "12px 24px",
                  borderRadius: "30px",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.id ? "600" : "normal",
                  boxShadow: activeTab === tab.id ? "0 8px 15px rgba(250, 204, 21, 0.2)" : "none",
                }}
              >
                {tab.label}
              </motion.button>
            ))}
          </motion.div>

          {/* Feature Cards with Staggered Animation */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "30px",
            marginTop: "30px",
          }}>
            {activeTab === "restaurants" && (
              <>
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="12" y1="4" x2="12" y2="20" /></svg>}
                  title="Choose Your Table"
                  description="Browse restaurant floor plans and select your preferred table location."
                  color="#facc15"
                />
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17c-5 0-8-2.5-8-7 0-3 2-5 5-5 4 0 8 3 9 8"/><path d="M17 17c-5 0-8-2.5-8-7 0-3 2-5 5-5 4 0 8 3 9 8"/></svg>}
                  title="Read Real Reviews"
                  description="See what others thought about specific tables and views."
                  color="#00F29D"
                />
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                  title="Real-Time Availability"
                  description="See instantly which tables are available at your preferred time."
                  color="#f59e0b"
                />
              </>
            )}
            
            {activeTab === "events" && (
              <>
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                  title="Upcoming Events"
                  description="Browse and book tickets for concerts, shows, and sporting events."
                  color="#00F29D"
                />
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>}
                  title="Interactive Seating"
                  description="View the stage from your seat before booking with our 3D previews."
                  color="#facc15"
                />
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>}
                  title="Group Bookings"
                  description="Book adjacent seats for your entire group with one simple reservation."
                  color="#f59e0b"
                />
              </>
            )}
            
            {activeTab === "premium" && (
              <>
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>}
                  title="VIP Access"
                  description="Unlock premium tables and seats with our VIP membership."
                  color="#facc15"
                />
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>}
                  title="Priority Booking"
                  description="Book before public release dates and secure the best spots."
                  color="#00F29D"
                />
                <FeatureCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
                  title="Special Offers"
                  description="Exclusive deals and discounts on premium experiences."
                  color="#f59e0b"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action Section with Scroll Animation */}
      <div style={{
        padding: "80px 5%",
        background: "linear-gradient(135deg, #facc1510, #00F29D20)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative doodles */}
        <Doodle type="fork" style={{ position: "absolute", bottom: "15%", right: "10%", opacity: 0.25, transform: "rotate(20deg)" }} />
        <Doodle type="plate" style={{ position: "absolute", top: "20%", left: "8%", opacity: 0.25 }} />
        
        {/* Moving doodle based on scroll */}
        <motion.div 
          style={{ 
            position: "absolute", 
            bottom: "30%", 
            left: "50%", 
            y: (scrollY - 1000) * -0.1,
            opacity: 0.3,
          }}
        >
          <Doodle type="wave" style={{}} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          style={{ maxWidth: "700px", margin: "0 auto" }}
        >
          <h2 style={{ fontSize: "2.5rem", marginBottom: "24px" }}>Ready to transform your booking experience?</h2>
          <p style={{ fontSize: "1.1rem", color: "#555", marginBottom: "40px" }}>
            Join thousands of users enjoying seat-specific bookings for restaurants and events.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: "#facc15",
              padding: "16px 40px",
              fontSize: "1.2rem",
              fontWeight: "bold",
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              cursor: "pointer",
            }}
          >
            Get Started Now
          </motion.button>
        </motion.div>
      </div>

      {/* Simple Footer */}
      <footer style={{
        backgroundColor: "#333",
        color: "white",
        padding: "40px 5%",
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <DineInGoLogo size="small" color="white" yellowColor="#facc15" />
          
          <div style={{ fontSize: "0.9rem", marginTop: "20px" }}>
          <p>© 2025 DineInGo | Made with ❤️ by Putta Sujith, K Vikas Aneesh Reddy, E Yashas Kumar, Karnati Mokshith, A Rohail</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
