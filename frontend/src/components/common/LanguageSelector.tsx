import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import type { SupportedLanguage } from "../../i18n/types";

interface LanguageSelectorProps {
  variant?: "header" | "compact" | "pill";
  style?: React.CSSProperties;
}

export function LanguageSelector({ variant = "header", style }: LanguageSelectorProps) {
  const { language, setLanguage, currentOption, availableLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-block",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Select Language"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: variant === "compact" ? "0.35rem 0.65rem" : "0.45rem 0.85rem",
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          color: "#0f172a",
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          transition: "all 0.15s ease",
        }}
      >
        <Globe size={16} color="#2563eb" />
        <span>{currentOption.nativeName}</span>
        <ChevronDown size={14} color="#64748b" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: "0.35rem",
            minWidth: "180px",
            zIndex: 1000,
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          <div style={{ padding: "0.35rem 0.65rem", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            Select Language
          </div>
          {availableLanguages.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isSelected ? "#eff6ff" : "transparent",
                  color: isSelected ? "#1d4ed8" : "#1e293b",
                  fontSize: "0.85rem",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s",
                }}
              >
                <div>
                  <div style={{ fontWeight: isSelected ? 700 : 600 }}>{opt.nativeName}</div>
                  <div style={{ fontSize: "0.7rem", color: isSelected ? "#3b82f6" : "#64748b" }}>{opt.name}</div>
                </div>
                {isSelected && <Check size={16} color="#2563eb" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
