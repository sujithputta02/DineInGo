import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SEO from "./components/SEO";

export default function BusinessLandingPage() {
    const [scrollY, setScrollY] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // DineInGo Logo Component
    const DineInGoLogo = ({ size = "large", color = "black", yellowColor = "#facc15" }) => {
        const fontSize = size === "large" ? "4rem" : size === "medium" ? "3rem" : "2rem";
        const dotSize = size === "large" ? "15px" : size === "medium" ? "12px" : "8px";
        const dotTop = size === "large" ? "22px" : size === "medium" ? "18px" : "11px";
        const businessFontSize = size === "large" ? "1.8rem" : size === "medium" ? "1.2rem" : "0.9rem";
        const businessMarginTop = size === "large" ? "4px" : size === "medium" ? "3px" : "2px";

        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h1
                    style={{
                        fontSize: fontSize,
                        fontWeight: "bold",
                        letterSpacing: "0.05em",
                        display: "flex",
                        alignItems: "center",
                        margin: 0,
                        textShadow: size === "large" ? "3px 3px 6px rgba(0, 0, 0, 0.1)" : "none",
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
                                boxShadow: "0 0 8px rgba(255, 0, 0, 0.6)",
                            }}
                        ></span>
                    </span>
                    <span style={{ color: color }}>ne</span>
                    <span style={{ color: color }}>I</span>
                    <span style={{ color: color }}>n</span>
                    <span style={{ color: yellowColor }}>G</span>
                    <span style={{ color: yellowColor }}>o</span>
                </h1>
                <div
                    style={{
                        marginTop: businessMarginTop,
                        fontSize: businessFontSize,
                        fontWeight: "700",
                        letterSpacing: "0.3em",
                        color: "#00F29D",
                        fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    BUSINESS
                </div>
            </div>
        );
    };

    // Animated Doodle Component
    const AnimatedDoodle = ({ src, alt, style, animation }: any) => (
        <motion.img
            src={src}
            alt={alt}
            style={style}
            animate={animation || { y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
    );

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
            <SEO 
                title="DineInGo for Business - Scale Your Restaurant with Smart Bookings"
                description="Empower your restaurant with DineInGo's smart reservations, interactive floor plans, and real-time analytics. Join 500+ partners to boost bookings and revenue."
                keywords="restaurant management software, waitlist system for restaurants, digital table management, boost restaurant revenue, restaurant analytics India, digital floor plan builder"
                url="https://dine-in-go.vercel.app/business"
            />
            {/* Hero Section */}
            <section
                style={{
                    minHeight: "100vh",
                    position: "relative",
                    background: "linear-gradient(135deg, #ffffff 0%, #f6f9ff 50%, #fff5e6 100%)",
                    overflow: "hidden",
                }}
            >
                {/* Floating Doodles */}
                <AnimatedDoodle
                    src="/images/cakedodle.png"
                    alt="Cake"
                    style={{ position: "absolute", top: "12%", right: "8%", width: "100px", height: "100px", opacity: 0.4 }}
                    animation={{ y: [0, -20, 0], rotate: [0, 8, 0] }}
                />
                <AnimatedDoodle
                    src="/images/nooddodle.png"
                    alt="Noodles"
                    style={{ position: "absolute", bottom: "20%", left: "5%", width: "90px", height: "130px", opacity: 0.35 }}
                    animation={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
                />
                <AnimatedDoodle
                    src="/images/eventdodle.png"
                    alt="Event"
                    style={{ position: "absolute", top: "35%", left: "8%", width: "85px", height: "85px", opacity: 0.3 }}
                    animation={{ scale: [1, 1.15, 1], rotate: [0, 12, 0] }}
                />
                <AnimatedDoodle
                    src="/images/tabledodle.png"
                    alt="Table"
                    style={{ position: "absolute", bottom: "30%", right: "10%", width: "75px", height: "75px", opacity: 0.35 }}
                    animation={{ y: [0, -12, 0], x: [0, 8, 0] }}
                />
                <AnimatedDoodle
                    src="/images/guiterdodle.png"
                    alt="Guitar"
                    style={{ position: "absolute", top: "55%", right: "18%", width: "95px", height: "50px", opacity: 0.3 }}
                    animation={{ y: [0, -15, 0], rotate: [-3, 3, -3] }}
                />
                <AnimatedDoodle
                    src="/images/hotdogdodle.png"
                    alt="Food"
                    style={{ position: "absolute", top: "65%", left: "12%", width: "80px", height: "80px", opacity: 0.35 }}
                    animation={{ rotate: [0, -8, 0], scale: [1, 1.1, 1] }}
                />

                {/* Header */}
                <header
                    style={{
                        padding: "20px 5%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "relative",
                        zIndex: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <DineInGoLogo size="small" />
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/business/businessLogin')}
                            style={{
                                backgroundColor: "transparent",
                                border: "2px solid #00F29D",
                                color: "#00F29D",
                                padding: "clamp(8px, 2vw, 10px) clamp(16px, 4vw, 24px)",
                                fontSize: "clamp(0.85rem, 2vw, 1rem)",
                                fontWeight: "bold",
                                borderRadius: "999px",
                                cursor: "pointer",
                            }}
                        >
                            Sign In
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/business/businessSignup')}
                            style={{
                                backgroundColor: "#facc15",
                                padding: "clamp(8px, 2vw, 10px) clamp(16px, 4vw, 24px)",
                                fontSize: "clamp(0.85rem, 2vw, 1rem)",
                                fontWeight: "bold",
                                borderRadius: "999px",
                                border: "none",
                                cursor: "pointer",
                                color: "#000",
                                boxShadow: "0 4px 12px rgba(250, 204, 21, 0.3)",
                            }}
                        >
                            Get Started
                        </motion.button>
                    </div>
                </header>

                {/* Hero Content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "calc(100vh - 120px)",
                        textAlign: "center",
                        padding: "40px 5%",
                        position: "relative",
                        zIndex: 5,
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <DineInGoLogo size="large" />
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        style={{
                            fontSize: "clamp(1.8rem, 6vw, 3.2rem)",
                            fontWeight: "800",
                            marginTop: "30px",
                            marginBottom: "24px",
                            maxWidth: "900px",
                            color: "#1a1a2e",
                            lineHeight: "1.2",
                        }}
                    >
                        Grow Your Restaurant Business with{" "}
                        <span style={{ color: "#00F29D" }}>Smart Reservations</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        style={{
                            fontSize: "clamp(1rem, 3vw, 1.3rem)",
                            color: "#555",
                            maxWidth: "700px",
                            marginBottom: "50px",
                            lineHeight: "1.7",
                        }}
                    >
                        Join the future of dining with interactive table selection, real-time analytics, and seamless event management for your restaurant
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        style={{
                            display: "flex",
                            gap: "20px",
                            flexWrap: "wrap",
                            justifyContent: "center",
                        }}
                    >
                        <motion.button
                            whileHover={{ scale: 1.08, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/business/businessSignup')}
                            style={{
                                backgroundColor: "#00F29D",
                                padding: "clamp(14px, 3vw, 18px) clamp(28px, 5vw, 40px)",
                                fontSize: "clamp(0.95rem, 2vw, 1.2rem)",
                                fontWeight: "700",
                                borderRadius: "16px",
                                border: "none",
                                cursor: "pointer",
                                color: "#fff",
                                boxShadow: "0 10px 30px rgba(0, 242, 157, 0.3)",
                            }}
                        >
                            Start Free Trial
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.08, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                document.querySelector('[data-section="features"]')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            style={{
                                backgroundColor: "#fff",
                                padding: "clamp(14px, 3vw, 18px) clamp(28px, 5vw, 40px)",
                                fontSize: "clamp(0.95rem, 2vw, 1.2rem)",
                                fontWeight: "700",
                                borderRadius: "16px",
                                border: "2px solid #facc15",
                                cursor: "pointer",
                                color: "#000",
                                boxShadow: "0 10px 30px rgba(250, 204, 21, 0.2)",
                            }}
                        >
                            See How It Works
                        </motion.button>
                    </motion.div>

                    {/* Stats Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        style={{
                            display: "flex",
                            gap: "clamp(30px, 5vw, 60px)",
                            marginTop: "80px",
                            flexWrap: "wrap",
                            justifyContent: "center",
                        }}
                    >
                        {[
                            { value: "500+", label: "Partner Restaurants", color: "#00F29D" },
                            { value: "1M+", label: "Monthly Bookings", color: "#facc15" },
                            { value: "98%", label: "Customer Satisfaction", color: "#FF6B6B" },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                style={{ textAlign: "center" }}
                            >
                                <div
                                    style={{
                                        fontSize: "clamp(2rem, 5vw, 3rem)",
                                        fontWeight: "900",
                                        color: stat.color,
                                    }}
                                >
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: "clamp(0.85rem, 2vw, 1rem)", color: "#666", marginTop: "8px", fontWeight: "500" }}>
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section
                data-section="features"
                style={{
                    padding: "120px 5%",
                    background: "linear-gradient(180deg, #f6f9ff 0%, #ffffff 100%)",
                    position: "relative",
                }}
            >
                <AnimatedDoodle
                    src="/images/meatdodle.png"
                    alt="Meat"
                    style={{ position: "absolute", top: "8%", right: "5%", width: "90px", height: "90px", opacity: 0.25 }}
                />
                <AnimatedDoodle
                    src="/images/pioanododle.png"
                    alt="Piano"
                    style={{ position: "absolute", bottom: "8%", left: "5%", width: "110px", height: "75px", opacity: 0.25 }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    style={{ textAlign: "center", marginBottom: "80px" }}
                >
                    <h2
                        style={{
                            fontSize: "clamp(2rem, 5vw, 3rem)",
                            fontWeight: "800",
                            color: "#1a1a2e",
                            marginBottom: "16px",
                            lineHeight: "1.1",
                        }}
                    >
                        Everything You Need to <span style={{ color: "#00F29D" }}>Succeed</span>
                    </h2>
                    <p
                        style={{
                            fontSize: "clamp(1rem, 2vw, 1.2rem)",
                            color: "#666",
                            maxWidth: "600px",
                            margin: "0 auto",
                            lineHeight: "1.5",
                        }}
                    >
                        Powerful features designed for modern restaurants and event venues
                    </p>
                </motion.div>

                {/* Feature Cards */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "24px sm:40px",
                        maxWidth: "1400px",
                        margin: "0 auto",
                    }}
                >
                    {[
                        {
                            icon: "🪑",
                            title: "Interactive Floor Plans",
                            description: "Let customers choose their exact table with beautiful, interactive floor plan visualization",
                            color: "#00F29D",
                        },
                        {
                            icon: "📊",
                            title: "Real-Time Analytics",
                            description: "Track bookings, revenue, and customer insights with powerful dashboard analytics",
                            color: "#facc15",
                        },
                        {
                            icon: "🎫",
                            title: "Event Management",
                            description: "Host events with seat-by-seat booking and automated ticketing systems",
                            color: "#FF6B6B",
                        },
                        {
                            icon: "💳",
                            title: "Secure Payments",
                            description: "Accept deposits and payments seamlessly with integrated payment processing",
                            color: "#9D4EDD",
                        },
                        {
                            icon: "📱",
                            title: "Mobile Optimized",
                            description: "Your customers can book from any device with our responsive design",
                            color: "#06B6D4",
                        },
                        {
                            icon: "🔔",
                            title: "Smart Notifications",
                            description: "Automated SMS and email notifications keep everyone informed",
                            color: "#F59E0B",
                        },
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            whileHover={{ y: -10, boxShadow: `0 20px 40px ${feature.color}30` }}
                            style={{
                                background: "#fff",
                                borderRadius: "20px",
                                padding: "40px",
                                border: `2px solid ${feature.color}20`,
                                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
                                transition: "all 0.3s ease",
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "3.5rem",
                                    marginBottom: "20px",
                                    filter: `drop-shadow(0 4px 8px ${feature.color}40)`,
                                }}
                            >
                                {feature.icon}
                            </div>
                            <h3
                                style={{
                                    fontSize: "1.6rem",
                                    fontWeight: "700",
                                    color: "#1a1a2e",
                                    marginBottom: "12px",
                                }}
                            >
                                {feature.title}
                            </h3>
                            <p
                                style={{
                                    fontSize: "1.05rem",
                                    color: "#666",
                                    lineHeight: "1.6",
                                }}
                            >
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* How It Works Section */}
            <section
                style={{
                    padding: "120px 5%",
                    background: "linear-gradient(180deg, #ffffff 0%, #fff5e6 100%)",
                    position: "relative",
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: "center", marginBottom: "80px" }}
                >
                    <h2
                        style={{
                            fontSize: "3rem",
                            fontWeight: "800",
                            color: "#1a1a2e",
                            marginBottom: "20px",
                        }}
                    >
                        Get Started in <span style={{ color: "#facc15" }}>3 Simple Steps</span>
                    </h2>
                    <p
                        style={{
                            fontSize: "1.3rem",
                            color: "#666",
                            maxWidth: "600px",
                            margin: "0 auto",
                        }}
                    >
                        Launch your digital reservation system in minutes
                    </p>
                </motion.div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "60px",
                        maxWidth: "1000px",
                        margin: "0 auto",
                    }}
                >
                    {[
                        {
                            step: "01",
                            title: "Create Your Floor Plan",
                            description: "Upload your restaurant layout or use our intuitive drag-and-drop builder to design your space",
                            color: "#00F29D",
                            doodle: "/images/tabledodle.png",
                        },
                        {
                            step: "02",
                            title: "Configure & Customize",
                            description: "Set up tables, assign capacities, pricing, and create your unique booking experience",
                            color: "#facc15",
                            doodle: "/images/eventdodle.png",
                        },
                        {
                            step: "03",
                            title: "Go Live & Grow",
                            description: "Share your booking link and start accepting reservations with real-time updates",
                            color: "#FF6B6B",
                            doodle: "/images/cakedodle.png",
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "50px",
                                flexDirection: i % 2 === 0 ? "row" : "row-reverse",
                                background: "#fff",
                                borderRadius: "24px",
                                padding: "40px",
                                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: "5rem",
                                        fontWeight: "900",
                                        color: item.color,
                                        marginBottom: "20px",
                                        opacity: 0.15,
                                        lineHeight: 1,
                                    }}
                                >
                                    {item.step}
                                </div>
                                <h3
                                    style={{
                                        fontSize: "2rem",
                                        fontWeight: "700",
                                        color: "#1a1a2e",
                                        marginBottom: "16px",
                                    }}
                                >
                                    {item.title}
                                </h3>
                                <p
                                    style={{
                                        fontSize: "1.15rem",
                                        color: "#666",
                                        lineHeight: "1.7",
                                    }}
                                >
                                    {item.description}
                                </p>
                            </div>
                            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                                <AnimatedDoodle
                                    src={item.doodle}
                                    alt={item.title}
                                    style={{ width: "180px", height: "180px", opacity: 0.7 }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section
                style={{
                    padding: "100px 5%",
                    background: "linear-gradient(135deg, #00F29D 0%, #facc15 100%)",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <AnimatedDoodle
                    src="/images/dodle.png"
                    alt="Wave"
                    style={{ position: "absolute", top: "25%", left: "5%", width: "140px", height: "45px", opacity: 0.25 }}
                />
                <AnimatedDoodle
                    src="/images/teacrosdod.png"
                    alt="Tea"
                    style={{ position: "absolute", bottom: "25%", right: "5%", width: "90px", height: "90px", opacity: 0.25 }}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    style={{
                        textAlign: "center",
                        position: "relative",
                        zIndex: 5,
                    }}
                >
                    <h2
                        style={{
                            fontSize: "3.5rem",
                            fontWeight: "900",
                            color: "#000",
                            marginBottom: "24px",
                        }}
                    >
                        Ready to Transform Your Business?
                    </h2>
                    <p
                        style={{
                            fontSize: "1.4rem",
                            color: "rgba(0, 0, 0, 0.7)",
                            marginBottom: "40px",
                            maxWidth: "700px",
                            margin: "0 auto 40px",
                        }}
                    >
                        Join hundreds of restaurants already using DineInGo to boost their reservations
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.1, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/business/businessSignup')}
                        style={{
                            backgroundColor: "#000",
                            color: "#fff",
                            padding: "20px 50px",
                            fontSize: "1.3rem",
                            fontWeight: "700",
                            borderRadius: "16px",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 15px 40px rgba(0, 0, 0, 0.3)",
                        }}
                    >
                        Start Your Free Trial →
                    </motion.button>
                    <p
                        style={{
                            marginTop: "20px",
                            fontSize: "1rem",
                            color: "rgba(0, 0, 0, 0.6)",
                            fontWeight: "500",
                        }}
                    >
                        No credit card required • 14-day free trial • Cancel anytime
                    </p>
                </motion.div>
            </section>

            {/* Footer */}
            <footer
                style={{
                    padding: "60px 5%",
                    background: "#1a1a2e",
                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "30px",
                    }}
                >
                    <DineInGoLogo size="small" color="white" />
                    <div
                        style={{
                            display: "flex",
                            gap: "40px",
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "1rem",
                        }}
                    >
                        <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                            About
                        </a>
                        <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                            Features
                        </a>
                        <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                            Pricing
                        </a>
                        <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                            Contact
                        </a>
                    </div>
                    <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.9rem" }}>
                        © 2026 DineInGo. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
