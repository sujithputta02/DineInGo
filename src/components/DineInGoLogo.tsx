import React from "react";

interface LogoProps {
    size?: "small" | "medium" | "large";
    color?: string;
    yellowColor?: string;
    showEmblem?: boolean;
}

const DineInGoLogo: React.FC<LogoProps> = ({ 
    size = "large", 
    color = "black", 
    yellowColor = "#facc15",
    showEmblem = false 
}) => {
    let fontSize = "4rem";
    let dotSize = "15px";
    let dotTop = "22px";
    let emblemSize = 36;

    if (size === "small") {
        fontSize = "1.5rem";
        dotSize = "6px";
        dotTop = "9px";
        emblemSize = 20;
    } else if (size === "medium") {
        fontSize = "2.5rem";
        dotSize = "10px";
        dotTop = "14px";
        emblemSize = 28;
    }

    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {showEmblem && (
                <svg
                    width={emblemSize}
                    height={emblemSize}
                    viewBox="0 0 100 100"
                    style={{ overflow: "visible", flexShrink: 0 }}
                >
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#10B981" strokeWidth="3" />
                    <circle cx="50" cy="50" r="8" fill="#EF4444" />
                </svg>
            )}

            <h1
                style={{
                    fontSize: fontSize,
                    fontWeight: "bold",
                    letterSpacing: "0.03em",
                    display: "flex",
                    alignItems: "center",
                    margin: 0,
                    textShadow: size === "large" ? "2px 2px 4px rgba(0, 0, 0, 0.15)" : "none",
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
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
                            backgroundColor: "#EF4444",
                            borderRadius: "50%",
                            boxShadow: "0 0 4px rgba(239, 68, 68, 0.6)",
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

export default DineInGoLogo;
