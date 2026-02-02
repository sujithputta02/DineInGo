import React from "react";

interface LogoProps {
    size?: "small" | "medium" | "large";
    color?: string;
    yellowColor?: string;
}

const DineInGoLogo: React.FC<LogoProps> = ({ size = "large", color = "black", yellowColor = "#facc15" }) => {
    let fontSize = "4rem";
    let dotSize = "15px";
    let dotTop = "22px";

    if (size === "small") {
        fontSize = "1.5rem";
        dotSize = "6px";
        dotTop = "9px";
    } else if (size === "medium") {
        fontSize = "2.5rem";
        dotSize = "10px";
        dotTop = "14px";
    }

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
                className="font-sans" // Ensure font matches system
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

export default DineInGoLogo;
