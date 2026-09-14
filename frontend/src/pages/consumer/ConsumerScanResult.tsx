import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowLeft,
  ScanLine,
  Flag,
  HeartPulse,
  Tag,
  Scale,
  PhoneCall,
  Loader2,
  Download,
  Building2,
  Info,
  Check,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Sparkles,
} from "lucide-react";
import { consumerService, type ConsumerScanItem } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";

interface HealthCaution {
  id: string;
  type: "sugar" | "caffeine" | "additives" | "sodium" | "fat" | "allergen" | "expiry" | "general";
  title: string;
  value?: string;
  description: string;
  severity: "critical" | "warning" | "advisory";
}

function getHealthCautions(scan: ConsumerScanItem): HealthCaution[] {
  const cautions: HealthCaution[] = [];

  // 1. Expiry Caution
  if (scan.is_expired || scan.expiry_status === "EXPIRED") {
    cautions.push({
      id: "expired",
      type: "expiry",
      title: "PRODUCT EXPIRED",
      value: scan.expiry_date || scan.best_before || "Expired",
      description: "This product has passed its declared shelf-life date. Do not consume.",
      severity: "critical",
    });
  }

  // 2. High Sugar Caution
  const sugarVal = scan.nutrition_data?.sugars || scan.nutrition_data?.added_sugars;
  const sugarWarning = scan.warnings?.find((w) => /sugar/i.test(w));
  let isHighSugar = false;
  if (sugarVal) {
    const num = parseFloat(sugarVal.replace(/[^0-9.]/g, ""));
    if (!isNaN(num) && num >= 10.0) {
      isHighSugar = true;
    }
  }
  if (isHighSugar || sugarWarning) {
    cautions.push({
      id: "sugar",
      type: "sugar",
      title: "HIGH SUGAR CONTENT",
      value: sugarVal ? `${sugarVal} declared` : undefined,
      description:
        sugarWarning ||
        (sugarVal
          ? `Declared sugars of ${sugarVal} per 100g/serving. Monitor intake if managing diabetes, obesity, or caloric restriction.`
          : "High sugar content identified from package label."),
      severity: "warning",
    });
  }

  // 3. Caffeine / Stimulants Caution
  const caffeineWarning = scan.warnings?.find((w) => /caffeine|taurine|energy/i.test(w));
  const caffeineRec = scan.recommendations?.find(
    (r) => /caffeine/i.test(r.category) || /caffeine/i.test(r.text)
  );
  const hasCaffeineInIngredients = scan.ingredients?.some((i) =>
    /caffeine|coffee\s*extract|taurine|guarana/i.test(i.name)
  );
  if (caffeineWarning || caffeineRec || hasCaffeineInIngredients) {
    cautions.push({
      id: "caffeine",
      type: "caffeine",
      title: "CONTAINS CAFFEINE / STIMULANTS",
      value: "Detected in ingredients",
      description:
        caffeineWarning ||
        caffeineRec?.text ||
        "Caffeine or stimulating agents detected on product label. Not recommended for children, pregnant or nursing mothers, or individuals sensitive to caffeine.",
      severity: "warning",
    });
  }

  // 4. Additives, Artificial Colours & Preservatives Caution
  const additiveItems: string[] = [];
  scan.ingredients?.forEach((i) => {
    if (
      /\b(?:e\s*\d{3,4}[a-z]?|ins\s*\d{3,4}[a-z]?|caramel|preservative|colour|color|artificial\s*flavour|acidulant|emulsifier|stabilizer|thickener|acidity\s*regulator|aspartame|sucralose|acesulfame|msg|monosodium\s*glutamate)\b/i.test(
        i.name
      )
    ) {
      additiveItems.push(i.name);
    }
  });
  if (additiveItems.length > 0) {
    cautions.push({
      id: "additives",
      type: "additives",
      title: "ADDITIVES & PRESERVATIVES",
      value: `${additiveItems.length} identified`,
      description: `Declared on label: ${additiveItems.slice(0, 4).join(", ")}${
        additiveItems.length > 4 ? ` (+${additiveItems.length - 4} more)` : ""
      }. Review if sensitive to food additives or artificial colours.`,
      severity: "advisory",
    });
  }

  // 5. Sodium / Salt Caution
  const sodiumVal = scan.nutrition_data?.sodium;
  if (sodiumVal) {
    const num = parseFloat(sodiumVal.replace(/[^0-9.]/g, ""));
    const isGrams = /g\b/i.test(sodiumVal) && !/mg/i.test(sodiumVal);
    const inMg = isGrams ? num * 1000 : num;
    if (!isNaN(inMg) && inMg >= 400) {
      cautions.push({
        id: "sodium",
        type: "sodium",
        title: "HIGH SODIUM CONTENT",
        value: `${sodiumVal} declared`,
        description: `High sodium level of ${sodiumVal} declared. Consumers on low-sodium diets or managing hypertension should monitor intake.`,
        severity: "warning",
      });
    }
  }

  // 6. Trans Fat / Saturated Fat Caution
  const transFat = scan.nutrition_data?.trans_fat;
  const satFat = scan.nutrition_data?.saturated_fat;
  if (transFat && parseFloat(transFat.replace(/[^0-9.]/g, "")) > 0.2) {
    cautions.push({
      id: "trans_fat",
      type: "fat",
      title: "TRANS FAT DECLARED",
      value: `${transFat} per 100g/serving`,
      description: `Contains declared trans fat (${transFat}). Health authorities recommend minimizing trans fat intake.`,
      severity: "warning",
    });
  } else if (satFat && parseFloat(satFat.replace(/[^0-9.]/g, "")) >= 6.0) {
    cautions.push({
      id: "sat_fat",
      type: "fat",
      title: "SATURATED FAT ADVISORY",
      value: `${satFat} declared`,
      description: `Contains declared saturated fat (${satFat}). Moderate intake as part of a balanced diet.`,
      severity: "advisory",
    });
  }

  // 7. Allergen Caution
  if (scan.allergens && scan.allergens.length > 0) {
    cautions.push({
      id: "allergens",
      type: "allergen",
      title: "CONTAINS ALLERGENS",
      value: scan.allergens.join(", "),
      description: `Declared on packaging: ${scan.allergens.join(
        ", "
      )}. Individuals with specific food allergies must review ingredients carefully before consumption.`,
      severity: "warning",
    });
  }

  // 8. Any other warnings from scan.warnings not already mapped
  scan.warnings?.forEach((w, idx) => {
    if (!/sugar|caffeine|expired|infant|child/i.test(w)) {
      cautions.push({
        id: `extra_warn_${idx}`,
        type: "general",
        title: "PACKAGE ADVISORY",
        description: w,
        severity: "advisory",
      });
    }
  });

  return cautions;
}

interface ConsumerAgeWarningItem {
  id: string;
  severity: "critical" | "warning" | "advisory" | "suitable";
  title: string;
  badge?: string;
  description: string;
}

function getConsumerAndAgeGuidance(scan: ConsumerScanItem): {
  overallLevel: "danger" | "warning" | "suitable";
  headerTitle: string;
  items: ConsumerAgeWarningItem[];
} {
  const items: ConsumerAgeWarningItem[] = [];

  // --- 1. Check Product Expiration ---
  const isExpired = scan.is_expired || scan.expiry_status === "EXPIRED";
  if (isExpired) {
    items.push({
      id: "expired",
      severity: "critical",
      title: "PRODUCT EXPIRED — DO NOT CONSUME",
      badge: scan.expiry_date || scan.best_before || "Expired",
      description:
        "This product has passed its declared shelf-life date. Consumption is not recommended for any age group. Please check packaging and consider contacting the retailer or authority.",
    });
  }

  // --- 2. Check Explicit Package Warnings ---
  const explicitWarning = scan.warnings?.find((w) =>
    /not suitable for (?:infants|children|babies)|under (?:16|18|12) years|not recommended for children|pregnancy|pregnant/i.test(
      w
    )
  );
  const explicitRec = scan.recommendations?.find((r) =>
    /age|child|infant|baby|suitability|pregnancy/i.test(r.category)
  );
  if (explicitWarning) {
    items.push({
      id: "explicit_pkg_warning",
      severity: "critical",
      title: "EXPLICIT PACKAGE WARNING",
      badge: "Declared on Package",
      description: explicitWarning,
    });
  } else if (explicitRec && /not suitable|under \d+/i.test(explicitRec.text)) {
    items.push({
      id: "explicit_rec_warning",
      severity: "critical",
      title: "PACKAGE AGE ADVISORY",
      badge: explicitRec.category,
      description: explicitRec.text,
    });
  }

  // --- 3. Evaluate Caffeine / Stimulants ---
  const hasCaffeineInIngredients = scan.ingredients?.some((i) =>
    /\b(?:caffeine|coffee\s*extract|taurine|guarana|kola\s*nut)\b/i.test(i.name)
  );
  const caffeineInWarnings = scan.warnings?.some((w) =>
    /\b(?:caffeine|taurine|stimulating)\b/i.test(w)
  );
  const caffeineInRecs = scan.recommendations?.some((r) =>
    /\bcaffeine\b/i.test(r.category) || /\bcaffeine\b/i.test(r.text)
  );
  const hasCaffeine = Boolean(hasCaffeineInIngredients || caffeineInWarnings || caffeineInRecs);

  // --- 4. Evaluate Sugar Content ---
  const sugarVal = scan.nutrition_data?.sugars || scan.nutrition_data?.added_sugars;
  let sugarNum: number | null = null;
  if (sugarVal) {
    const parsed = parseFloat(sugarVal.replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed)) sugarNum = parsed;
  }
  const sugarInWarnings = scan.warnings?.some((w) => /high\s*sugar/i.test(w));
  const isHighSugar = (sugarNum !== null && sugarNum >= 10.0) || Boolean(sugarInWarnings);

  // --- 5. Child Caution (Combined Factors) ---
  if (hasCaffeine && isHighSugar) {
    items.push({
      id: "child_caution_caffeine_sugar",
      severity: "critical",
      title: "CAUTION FOR CHILDREN",
      badge: "High Sugar & Caffeine",
      description:
        "This product contains caffeine and a significant amount of added sugar. Children may want to avoid or limit consumption.",
    });
  } else if (hasCaffeine) {
    items.push({
      id: "child_caution_caffeine",
      severity: "warning",
      title: "CAUTION FOR CHILDREN",
      badge: "Caffeine Content",
      description:
        "Caffeine is present in the product. Children and adolescents may want to avoid or limit consumption.",
    });
  } else if (isHighSugar && sugarNum !== null && sugarNum >= 15.0) {
    items.push({
      id: "child_caution_sugar",
      severity: "warning",
      title: "MODERATION FOR CHILDREN",
      badge: `${sugarVal} declared`,
      description:
        "Contains a high amount of declared sugars. Frequent consumption by young children should be limited as part of balanced nutrition.",
    });
  }

  // --- 6. High Sugar Guidance ---
  if (isHighSugar) {
    items.push({
      id: "high_sugar_guidance",
      severity: "critical",
      title: "HIGH SUGAR",
      badge: sugarVal ? `${sugarVal} declared` : "Elevated Sugar",
      description:
        "The declared nutrition information indicates a high sugar content. Frequent consumption can contribute to excessive sugar intake. People trying to reduce sugar intake or managing blood glucose may want to limit consumption.",
    });
  }

  // --- 7. Caffeine Guidance ---
  if (hasCaffeine) {
    items.push({
      id: "caffeine_guidance",
      severity: "warning",
      title: "CAFFEINE",
      badge: "Stimulant Advisory",
      description:
        "Caffeine is present in the product. People sensitive to caffeine, children, pregnant individuals, or people advised to limit caffeine should exercise appropriate caution and follow advice from their healthcare professional.",
    });
  }

  // --- 8. High Sodium Guidance ---
  const sodiumVal = scan.nutrition_data?.sodium;
  let sodiumNum: number | null = null;
  if (sodiumVal) {
    const parsed = parseFloat(sodiumVal.replace(/[^0-9.]/g, ""));
    const isGrams = /g\b/i.test(sodiumVal) && !/mg/i.test(sodiumVal);
    const inMg = isGrams ? parsed * 1000 : parsed;
    if (!isNaN(inMg)) sodiumNum = inMg;
  }
  const isHighSodium = (sodiumNum !== null && sodiumNum >= 400) || Boolean(scan.warnings?.some((w) => /sodium|salt/i.test(w)));
  if (isHighSodium) {
    items.push({
      id: "high_sodium_guidance",
      severity: "critical",
      title: "HIGH SODIUM",
      badge: sodiumVal ? `${sodiumVal} declared` : "Elevated Sodium",
      description:
        "The declared sodium content is relatively high. People who need to limit sodium intake should consider limiting consumption and follow advice from their healthcare professional.",
    });
    items.push({
      id: "sodium_who_take_care",
      severity: "warning",
      title: "WHO SHOULD TAKE CARE?",
      description:
        "Individuals monitoring blood pressure, heart health, or adhering to low-sodium dietary advice should check serving sizes carefully.",
    });
  }

  // --- 9. Fat / Trans Fat Guidance ---
  const transFatVal = scan.nutrition_data?.trans_fat;
  const transFatNum = transFatVal ? parseFloat(transFatVal.replace(/[^0-9.]/g, "")) : 0;
  if (!isNaN(transFatNum) && transFatNum > 0.2) {
    items.push({
      id: "trans_fat_guidance",
      severity: "critical",
      title: "TRANS FAT DECLARED",
      badge: `${transFatVal} declared`,
      description:
        "Contains declared trans fat. Health authorities recommend minimizing trans fat intake as part of heart-healthy nutrition.",
    });
  }

  // --- 10. Allergen Caution ---
  if (scan.allergens && scan.allergens.length > 0) {
    items.push({
      id: "allergen_guidance",
      severity: "critical",
      title: "ALLERGEN CAUTION",
      badge: scan.allergens.join(", "),
      description: `Contains declared allergens: ${scan.allergens.join(
        ", "
      )}. People with an allergy to these ingredients should avoid the product unless they have confirmed it is suitable for them.`,
    });
  }

  // --- 11. Additives / Preservatives Notice ---
  const additiveCount =
    scan.ingredients?.filter((i) =>
      /\b(?:e\s*\d{3,4}[a-z]?|ins\s*\d{3,4}[a-z]?|caramel|preservative|colour|color|artificial|acidulant|aspartame|sucralose|msg)\b/i.test(
        i.name
      )
    ).length || 0;
  if (additiveCount > 2) {
    items.push({
      id: "additives_guidance",
      severity: "warning",
      title: "FOOD ADDITIVES IDENTIFIED",
      badge: `${additiveCount} identified`,
      description:
        "Multiple declared additives or artificial colours identified in ingredients. Sensitive consumers or those limiting ultra-processed formulations may wish to review.",
    });
  }

  // --- 12. General Guidance & Suitability Resolution ---
  const hasCritical = items.some((i) => i.severity === "critical");
  const hasWarning = items.some((i) => i.severity === "warning");

  if (hasCritical || hasWarning) {
    items.push({
      id: "general_adult_guidance",
      severity: "suitable",
      title: "GENERAL CONSUMER GUIDANCE",
      description:
        "Adults may consume the product in moderation as part of a balanced diet, subject to their individual dietary needs and personal health advice.",
    });

    return {
      overallLevel: hasCritical ? "danger" : "warning",
      headerTitle: hasCritical ? "CONSUMER & AGE WARNINGS" : "CONSUMER & AGE ADVISORY",
      items,
    };
  }

  // --- Clean / Natural / Low-Risk Product (e.g. Dates, Oats, Rice, Pulses, Milk) ---
  items.push({
    id: "generally_suitable",
    severity: "suitable",
    title: "GENERALLY SUITABLE",
    description:
      "No specific age-related restriction was identified from the analyzed product information.",
  });
  items.push({
    id: "age_guidance",
    severity: "suitable",
    title: "AGE GUIDANCE",
    description:
      "The product can generally be consumed across age groups, subject to individual dietary needs and allergies.",
  });
  items.push({
    id: "ingredient_profile",
    severity: "suitable",
    title: "INGREDIENT PROFILE",
    description:
      "No caffeine or specific ingredient-based age caution was identified in the analyzed information.",
  });

  return {
    overallLevel: "suitable",
    headerTitle: "CONSUMER & AGE GUIDANCE",
    items,
  };
}

export default function ConsumerScanResult() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ConsumerScanItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    setScan(null);
    setError(null);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await consumerService.getScanDetail(id);
        if (isMounted) setScan(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load product scan detail.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const cautions = useMemo(() => {
    return scan ? getHealthCautions(scan) : [];
  }, [scan]);

  const consumerGuidance = useMemo(() => {
    return scan ? getConsumerAndAgeGuidance(scan) : null;
  }, [scan]);

  const handleDownloadPdf = async () => {
    if (!scan || downloadingPdf) return;
    try {
      setDownloadingPdf(true);
      setDownloadSuccess(false);
      const blob = await consumerService.downloadConsumerReport(scan.id, language);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MetriScan_Consumer_Report_${scan.id.slice(0, 8)}_${language}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to download Consumer Report PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleToggleVoice = () => {
    if (!("speechSynthesis" in window) || !scan) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const langTagMap: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      mr: "mr-IN",
      te: "te-IN",
      ta: "ta-IN",
      kn: "kn-IN",
    };

    const parts: string[] = [];
    parts.push(scan.product_name);
    if (scan.brand && scan.brand !== scan.product_name) parts.push(`Brand: ${scan.brand}`);
    if (scan.mrp) parts.push(`MRP: ${scan.mrp}`);
    if (scan.net_quantity) parts.push(`Net Quantity: ${scan.net_quantity}`);

    if (scan.is_expired || scan.expiry_status === "EXPIRED") {
      parts.push(t("product.expiredWarning", "Warning: Product expired. Do not consume."));
    } else if (scan.expiry_status === "VALID") {
      parts.push(t("product.safeShelfLife", "Product is within stated shelf life."));
    } else {
      parts.push(t("product.expiryUndetermined", "Expiry status could not be determined."));
    }

    if (cautions.length > 0) {
      const cautionTexts = cautions.map((c) => `${c.title}. ${c.description}`).join(". ");
      parts.push(`Health and Consumer Cautions: ${cautionTexts}`);
    }

    if (consumerGuidance && consumerGuidance.items.length > 0) {
      const guidanceTexts = consumerGuidance.items.map((item) => `${item.title}: ${item.description}`).join(". ");
      parts.push(`Consumer and Age Guidance: ${guidanceTexts}`);
    }

    if (scan.ingredients && scan.ingredients.length > 0) {
      const ingList = scan.ingredients
        .map((i) => (i.percentage ? `${i.name} ${i.percentage}` : i.name))
        .join(", ");
      parts.push(`${t("ingredients.title", "Ingredients")}: ${ingList}`);
    }

    if (scan.nutrition_data && Object.keys(scan.nutrition_data).length > 0) {
      const nutList = Object.entries(scan.nutrition_data)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
        .join(", ");
      parts.push(`${t("nutrition.title", "Nutrition")}: ${nutList}`);
    }

    const textToSpeak = parts.join(". ");
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langTagMap[language] || "en-IN";
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const targetLang = utterance.lang.toLowerCase();
    const voice = voices.find(
      (v) => v.lang.toLowerCase() === targetLang || v.lang.toLowerCase().startsWith(language)
    );
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "5rem 1rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <Loader2
          size={36}
          className="spin"
          color="#059669"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "#475569" }}>
          {t("common.loading", "Loading product analysis...")}
        </span>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "3rem auto",
          textAlign: "center",
          backgroundColor: "#ffffff",
          padding: "2.5rem 2rem",
          borderRadius: "16px",
          border: "1px solid #fecaca",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <AlertOctagon size={44} color="#dc2626" style={{ margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
          Scan Record Not Found
        </h2>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#64748b" }}>
          {error || "Unable to locate this scan item."}
        </p>
        <Link
          to="/user/scan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.7rem 1.5rem",
            borderRadius: "10px",
            backgroundColor: "#059669",
            color: "#ffffff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <ScanLine size={16} />
          <span>{t("nav.scanProduct", "Scan Product")}</span>
        </Link>
      </div>
    );
  }

  const isExpired = scan.is_expired || scan.expiry_status === "EXPIRED";
  const isSafe = scan.expiry_status === "VALID" && !isExpired;

  return (
    <div
      style={{
        maxWidth: "1080px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        paddingBottom: "3rem",
      }}
    >
      {/* ============================================================ */}
      {/* TOP UTILITY ACTION BAR */}
      {/* ============================================================ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => navigate("/user/scans")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            backgroundColor: "transparent",
            border: "none",
            color: "#64748b",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          <span>{t("nav.myScans", "Back to My Scans")}</span>
        </button>

        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Accessibility Voice Read Aloud Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              backgroundColor: isSpeaking ? "#fee2e2" : "#ecfdf5",
              border: `1px solid ${isSpeaking ? "#fca5a5" : "#a7f3d0"}`,
              color: isSpeaking ? "#b91c1c" : "#047857",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.15s",
            }}
            title={isSpeaking ? t("voice.stopReading", "Stop Reading") : t("voice.readAloud", "Read Aloud")}
          >
            {isSpeaking ? <VolumeX size={15} color="#b91c1c" /> : <Volume2 size={15} color="#047857" />}
            <span>{isSpeaking ? t("voice.stopReading", "Stop Reading") : t("voice.readAloud", "Read Aloud")}</span>
          </button>

          {/* Download Consumer Report PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              backgroundColor: downloadSuccess ? "#f0fdf4" : "#ffffff",
              border: `1px solid ${downloadSuccess ? "#86efac" : "#cbd5e1"}`,
              color: downloadSuccess ? "#16a34a" : "#0f172a",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: downloadingPdf ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.15s",
            }}
          >
            {downloadingPdf ? (
              <Loader2 size={15} className="spin" style={{ animation: "spin 1s linear infinite" }} />
            ) : downloadSuccess ? (
              <Check size={15} color="#16a34a" />
            ) : (
              <Download size={15} color="#059669" />
            )}
            <span>
              {downloadingPdf
                ? t("report.generatingReport", "Generating...")
                : downloadSuccess
                ? t("report.downloadSuccess", "Downloaded!")
                : t("report.downloadReport", "Download PDF")}
            </span>
          </button>

          {/* Report Issue Button */}
          <Link
            to={`/user/report-issue?product_name=${encodeURIComponent(scan.product_name)}&scan_id=${scan.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Flag size={14} />
            <span>{t("common.reportIssue", "Report Issue")}</span>
          </Link>

          {/* Scan Another Product Button */}
          <Link
            to="/user/scan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              backgroundColor: "#059669",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(5,150,105,0.25)",
            }}
          >
            <ScanLine size={14} />
            <span>{t("nav.scanProduct", "Scan Another")}</span>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SINGLE VISUAL INFOGRAPHIC REPORT BOARD */}
      {/* ============================================================ */}
      <div
        className="consumer-infographic-poster"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          border: "1.5px solid #cbd5e1",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 1. INFOGRAPHIC BANNER HEADER */}
        <div
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%)",
            color: "#ffffff",
            padding: "1rem 1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            borderBottom: "3px solid #10b981",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}
            >
              <ShieldCheck size={24} color="#a7f3d0" />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                PRODUCT SAFETY & CONSUMER INFORMATION INFOGRAPHIC
              </div>
              <div style={{ fontSize: "0.76rem", color: "#d1fae5", marginTop: "2px" }}>
                Public Awareness & Packaged Commodity Verification • MetriScan Platform
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              backgroundColor: "rgba(255, 255, 255, 0.18)",
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "#ffffff",
            }}
          >
            <Sparkles size={13} color="#fde047" />
            <span>AI Verified from Package Label</span>
          </div>
        </div>

        {/* 2. PRODUCT SNAPSHOT & OVERALL STATUS ROW */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "1.35rem 1.75rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flex: 1, minWidth: "280px" }}>
            {scan.image_url ? (
              <img
                src={scan.image_url}
                alt={scan.product_name}
                style={{
                  width: "90px",
                  height: "90px",
                  objectFit: "contain",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  padding: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "12px",
                  backgroundColor: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  flexShrink: 0,
                }}
              >
                <Tag size={36} />
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#047857",
                    backgroundColor: "#ecfdf5",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "4px",
                    border: "1px solid #a7f3d0",
                    textTransform: "uppercase",
                  }}
                >
                  {scan.brand || "Packaged Product"}
                </span>

                <span
                  style={{
                    fontSize: "0.72rem",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  {scan.category || "Packaged Food"}
                </span>

                {scan.fssai_license && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      border: "1px solid #bfdbfe",
                      fontWeight: 600,
                    }}
                  >
                    FSSAI: {scan.fssai_license}
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 900,
                  color: "#0f172a",
                  margin: "0 0 0.35rem",
                  letterSpacing: "-0.015em",
                }}
              >
                {scan.product_name || "Packaged Commodity"}
              </h1>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1.1rem",
                  fontSize: "0.82rem",
                  color: "#64748b",
                }}
              >
                {scan.mrp && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Tag size={13} color="#059669" />
                    <span>
                      MRP: <strong style={{ color: "#0f172a" }}>{scan.mrp}</strong>
                    </span>
                  </span>
                )}
                {scan.net_quantity && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Scale size={13} color="#059669" />
                    <span>
                      Net Qty: <strong style={{ color: "#0f172a" }}>{scan.net_quantity}</strong>
                    </span>
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Calendar size={13} />
                  <span>Scanned: {new Date(scan.created_at).toLocaleDateString()}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Overall Status Badge */}
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "14px",
              backgroundColor: isExpired ? "#fef2f2" : isSafe ? "#f0fdf4" : "#f8fafc",
              border: `1.5px solid ${isExpired ? "#f87171" : isSafe ? "#86efac" : "#cbd5e1"}`,
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            {isExpired ? (
              <AlertOctagon size={28} color="#dc2626" />
            ) : isSafe ? (
              <CheckCircle2 size={28} color="#16a34a" />
            ) : (
              <Info size={28} color="#64748b" />
            )}
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                OVERALL STATUS
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 900,
                  color: isExpired ? "#b91c1c" : isSafe ? "#15803d" : "#334155",
                }}
              >
                {isExpired
                  ? "EXPIRED — DO NOT CONSUME"
                  : isSafe
                  ? "WITHIN SHELF LIFE"
                  : "SHELF LIFE UNDETERMINED"}
              </div>
            </div>
          </div>
        </div>

        {/* 3. MAIN INFOGRAPHIC 2-COLUMN GRID */}
        <div
          className="infographic-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "1.5rem",
            padding: "1.75rem",
            backgroundColor: "#ffffff",
          }}
        >
          {/* ============================================================ */}
          {/* COLUMN 1: EXTRACTED LABEL INFO, INGREDIENTS, NUTRITION */}
          {/* ============================================================ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* SECTION A: EXTRACTED LABEL INFORMATION */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.85rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1.5px solid #e2e8f0",
                }}
              >
                <FileText size={18} color="#059669" />
                <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  EXTRACTED LABEL INFORMATION
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <div style={{ padding: "0.55rem 0.75rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Net Quantity
                  </div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {scan.net_quantity || "Not detected"}
                  </div>
                </div>

                <div style={{ padding: "0.55rem 0.75rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Maximum Retail Price
                  </div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                    {scan.mrp || "Not detected"}
                  </div>
                </div>

                <div style={{ padding: "0.55rem 0.75rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Batch / Lot No.
                  </div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {scan.batch_number || "Not detected"}
                  </div>
                </div>

                <div style={{ padding: "0.55rem 0.75rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Mfg / Pkd Date
                  </div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {scan.manufacturing_date || scan.packed_on || "Not detected"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.55rem 0.75rem",
                    backgroundColor: isExpired ? "#fef2f2" : "#ffffff",
                    borderRadius: "8px",
                    border: `1px solid ${isExpired ? "#fca5a5" : "#e2e8f0"}`,
                  }}
                >
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Expiry / Best Before
                  </div>
                  <div
                    style={{
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: isExpired ? "#dc2626" : "#0f172a",
                      marginTop: "2px",
                    }}
                  >
                    {scan.expiry_date || scan.best_before || "Not detected"}
                  </div>
                </div>

                <div style={{ padding: "0.55rem 0.75rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Country of Origin
                  </div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {scan.country_of_origin || "India"}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION B: INGREDIENTS SECTION */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1.5px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Layers size={18} color="#059669" />
                  <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    INGREDIENTS & COMPOSITION
                  </h2>
                </div>

                {scan.ingredients && scan.ingredients.length > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                    {scan.ingredients.length} items detected
                  </span>
                )}
              </div>

              {/* Explicit percentage notice */}
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "#64748b",
                  fontStyle: "italic",
                  marginBottom: "0.75rem",
                  backgroundColor: "#f8fafc",
                  padding: "0.4rem 0.65rem",
                  borderRadius: "6px",
                  borderLeft: "3px solid #059669",
                }}
              >
                {scan.has_explicit_percentages
                  ? "Exact ingredient percentages explicitly declared on the package label are shown below."
                  : "Ingredient percentages were not explicitly declared on the package label."}
              </div>

              {/* Ingredients list */}
              {scan.ingredients && scan.ingredients.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {scan.ingredients.map((ing) => (
                    <div
                      key={ing.order}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.45rem 0.7rem",
                        borderRadius: "6px",
                        backgroundColor: ing.order === 1 ? "#ecfdf5" : "#f8fafc",
                        border: ing.order === 1 ? "1px solid #a7f3d0" : "1px solid #f1f5f9",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            color: ing.order === 1 ? "#059669" : "#94a3b8",
                            minWidth: "20px",
                          }}
                        >
                          #{ing.order}
                        </span>
                        <span
                          style={{
                            fontSize: "0.84rem",
                            fontWeight: ing.order === 1 ? 700 : 500,
                            color: "#1e293b",
                          }}
                        >
                          {ing.name}
                        </span>
                        {ing.order === 1 && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "4px",
                              fontWeight: 700,
                            }}
                          >
                            Primary
                          </span>
                        )}
                      </div>

                      {ing.percentage && (
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>
                          {ing.percentage}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
                  No ingredient list could be reliably extracted from the package label.
                </div>
              )}
            </div>

            {/* SECTION C: NUTRITION INFORMATION */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1.5px solid #e2e8f0",
                }}
              >
                <HeartPulse size={18} color="#059669" />
                <div>
                  <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    NUTRITIONAL INFORMATION
                  </h2>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    Declared Values (per 100g / per serving)
                  </span>
                </div>
              </div>

              {scan.nutrition_data && Object.keys(scan.nutrition_data).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <div style={{ borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#475569" }}>Nutrient Parameter</th>
                          <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Declared Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(scan.nutrition_data).map(([key, val], idx) => {
                          const isHighSugarRow = /sugar/i.test(key) && parseFloat(String(val).replace(/[^0-9.]/g, "")) >= 10.0;
                          return (
                            <tr
                              key={key}
                              style={{
                                borderBottom: idx !== Object.keys(scan.nutrition_data!).length - 1 ? "1px solid #f1f5f9" : "none",
                                backgroundColor: isHighSugarRow ? "#fffbeb" : idx % 2 === 0 ? "#ffffff" : "#fafafa",
                              }}
                            >
                              <td style={{ padding: "0.45rem 0.75rem", color: "#1e293b", fontWeight: 600, textTransform: "capitalize" }}>
                                {key.replace(/_/g, " ")}
                                {isHighSugarRow && (
                                  <span style={{ marginLeft: "0.4rem", fontSize: "0.68rem", backgroundColor: "#fef3c7", color: "#b45309", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                                    High
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "0.45rem 0.75rem", textAlign: "right", fontWeight: 700, color: isHighSugarRow ? "#b45309" : "#0f172a" }}>
                                {val}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.74rem",
                      color: "#64748b",
                      lineHeight: 1.4,
                    }}
                  >
                    <strong style={{ color: "#065f46" }}>Notice:</strong> Based on manufacturer declared nutrition panel. Refer to Recommended Daily Allowances (RDA).
                  </div>
                </div>
              ) : (
                <div style={{ padding: "1.25rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
                  No nutritional information was detected on the scanned package label.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* COLUMN 2: CAUTIONS, WARNINGS, SUITABILITY & CONTACT */}
          {/* ============================================================ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* SECTION D: POTENTIAL HEALTH CAUTIONS & ALERTS (VISUALLY HIGHLIGHTED) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: "1.5px solid #fed7aa",
                padding: "1.25rem",
                boxShadow: "0 2px 8px rgba(251, 146, 60, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.85rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1.5px solid #fed7aa",
                }}
              >
                <AlertTriangle size={19} color="#ea580c" />
                <div>
                  <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#9a3412" }}>
                    POTENTIAL HEALTH & CONSUMER CAUTIONS
                  </h2>
                  <span style={{ fontSize: "0.72rem", color: "#78716c" }}>
                    Important indicators identified from declared label contents
                  </span>
                </div>
              </div>

              {cautions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {cautions.map((c) => {
                    const isCrit = c.severity === "critical";
                    const isWarn = c.severity === "warning";
                    const cardBg = isCrit ? "#fef2f2" : isWarn ? "#fffbeb" : "#f8fafc";
                    const cardBorder = isCrit ? "#fca5a5" : isWarn ? "#fde68a" : "#e2e8f0";
                    const titleColor = isCrit ? "#991b1b" : isWarn ? "#92400e" : "#334155";
                    const badgeBg = isCrit ? "#fee2e2" : isWarn ? "#fef3c7" : "#f1f5f9";
                    const badgeColor = isCrit ? "#b91c1c" : isWarn ? "#b45309" : "#475569";

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "0.75rem 0.9rem",
                          borderRadius: "10px",
                          backgroundColor: cardBg,
                          border: `1.5px solid ${cardBorder}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.3rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {isCrit ? (
                              <AlertOctagon size={16} color="#dc2626" />
                            ) : isWarn ? (
                              <AlertTriangle size={16} color="#d97706" />
                            ) : (
                              <Info size={16} color="#059669" />
                            )}
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: titleColor }}>
                              {c.title}
                            </span>
                          </div>

                          {c.value && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                backgroundColor: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {c.value}
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.78rem",
                            color: "#475569",
                            lineHeight: 1.45,
                          }}
                        >
                          {c.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    color: "#16a34a",
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span>No high-sugar, caffeine, trans-fat, or allergen cautions identified on this label.</span>
                </div>
              )}
            </div>

            {/* SECTION E: CONSUMER & AGE WARNINGS & GUIDANCE */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: `1.5px solid ${
                  consumerGuidance?.overallLevel === "danger"
                    ? "#fca5a5"
                    : consumerGuidance?.overallLevel === "warning"
                    ? "#fed7aa"
                    : "#bbf7d0"
                }`,
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  marginBottom: "0.85rem",
                  paddingBottom: "0.6rem",
                  borderBottom: `1.5px solid ${
                    consumerGuidance?.overallLevel === "danger"
                      ? "#fee2e2"
                      : consumerGuidance?.overallLevel === "warning"
                      ? "#ffedd5"
                      : "#f0fdf4"
                  }`,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {consumerGuidance?.overallLevel === "danger" ? (
                    <ShieldAlert size={20} color="#dc2626" />
                  ) : consumerGuidance?.overallLevel === "warning" ? (
                    <AlertTriangle size={20} color="#ea580c" />
                  ) : (
                    <ShieldCheck size={20} color="#16a34a" />
                  )}
                  <h2
                    style={{
                      fontSize: "0.98rem",
                      fontWeight: 800,
                      margin: 0,
                      color:
                        consumerGuidance?.overallLevel === "danger"
                          ? "#991b1b"
                          : consumerGuidance?.overallLevel === "warning"
                          ? "#9a3412"
                          : "#166534",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {consumerGuidance?.overallLevel === "danger"
                      ? "🔴 CONSUMER & AGE WARNINGS"
                      : consumerGuidance?.overallLevel === "warning"
                      ? "🟠 CONSUMER & AGE ADVISORY"
                      : "🟢 CONSUMER & AGE GUIDANCE"}
                  </h2>
                </div>

                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                    backgroundColor:
                      consumerGuidance?.overallLevel === "danger"
                        ? "#fef2f2"
                        : consumerGuidance?.overallLevel === "warning"
                        ? "#fffbeb"
                        : "#f0fdf4",
                    color:
                      consumerGuidance?.overallLevel === "danger"
                        ? "#dc2626"
                        : consumerGuidance?.overallLevel === "warning"
                        ? "#c2410c"
                        : "#16a34a",
                    border: `1px solid ${
                      consumerGuidance?.overallLevel === "danger"
                        ? "#fca5a5"
                        : consumerGuidance?.overallLevel === "warning"
                        ? "#fed7aa"
                        : "#bbf7d0"
                    }`,
                  }}
                >
                  {consumerGuidance?.overallLevel === "danger"
                    ? "Important Cautions Active"
                    : consumerGuidance?.overallLevel === "warning"
                    ? "Moderate Caution Advised"
                    : "No Specific Age Restriction"}
                </span>
              </div>

              {consumerGuidance && consumerGuidance.items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {consumerGuidance.items.map((item) => {
                    const isCritical = item.severity === "critical";
                    const isWarning = item.severity === "warning";

                    const bg = isCritical ? "#fef2f2" : isWarning ? "#fffbeb" : "#f0fdf4";
                    const border = isCritical ? "#fecaca" : isWarning ? "#fed7aa" : "#bbf7d0";
                    const titleColor = isCritical ? "#991b1b" : isWarning ? "#9a3412" : "#166534";
                    const descColor = isCritical ? "#7f1d1d" : isWarning ? "#7c2d12" : "#14532d";
                    const badgeBg = isCritical ? "#fee2e2" : isWarning ? "#ffedd5" : "#dcfce7";
                    const badgeBorder = isCritical ? "#fca5a5" : isWarning ? "#fdba74" : "#86efac";
                    const iconEmoji = isCritical ? "🔴" : isWarning ? "🟠" : "🟢";

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "0.75rem 0.95rem",
                          borderRadius: "10px",
                          backgroundColor: bg,
                          border: `1.5px solid ${border}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "0.4rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontWeight: 800,
                              fontSize: "0.86rem",
                              color: titleColor,
                            }}
                          >
                            <span>{iconEmoji}</span>
                            <span>{item.title}</span>
                          </div>

                          {item.badge && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "6px",
                                backgroundColor: badgeBg,
                                color: titleColor,
                                border: `1px solid ${badgeBorder}`,
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.81rem",
                            color: descColor,
                            lineHeight: 1.48,
                          }}
                        >
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: "0.75rem 0.95rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "10px",
                    border: "1.5px solid #bbf7d0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, fontSize: "0.86rem", color: "#166534" }}>
                    <span>🟢</span>
                    <span>GENERALLY SUITABLE</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.81rem", color: "#14532d", lineHeight: 1.48 }}>
                    No specific age-related or ingredient-based caution was identified from the analyzed information. Subject to individual dietary needs and allergies.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION F: WHO MAY WANT TO CHECK THE LABEL CAREFULLY? */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1.5px solid #e2e8f0",
                }}
              >
                <Info size={18} color="#059669" />
                <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  WHO MAY WANT TO CHECK THE LABEL CAREFULLY?
                </h2>
              </div>

              {scan.recommendations && scan.recommendations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {scan.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        borderLeft: "3px solid #059669",
                        fontSize: "0.78rem",
                        color: "#334155",
                        lineHeight: 1.45,
                      }}
                    >
                      <strong style={{ color: "#065f46" }}>{rec.category}:</strong> {rec.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Standard consumer awareness guidelines apply. Refer to RDA guidelines.
                </div>
              )}
            </div>

            {/* SECTION G: MANUFACTURER & CONSUMER REDRESSAL CONTACT */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1.5px solid #e2e8f0",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Building2 size={18} color="#059669" />
                  <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    MANUFACTURER & CONSUMER CARE
                  </h2>
                </div>

                <Link
                  to={`/user/report-issue?product_name=${encodeURIComponent(scan.product_name)}&scan_id=${scan.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "6px",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Flag size={12} />
                  <span>Report Issue</span>
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem", color: "#334155" }}>
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Manufacturer / Packer
                  </div>
                  <div style={{ marginTop: "2px", fontWeight: 600 }}>
                    {scan.manufacturer || "Not detected on label"}
                  </div>
                </div>

                {scan.marketed_by && scan.marketed_by !== "Not Detected" && (
                  <div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Marketed By
                    </div>
                    <div style={{ marginTop: "2px", fontWeight: 600 }}>{scan.marketed_by}</div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Consumer Helpline
                  </div>
                  <div style={{ marginTop: "2px", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <PhoneCall size={13} color="#059669" />
                    <span>{scan.consumer_contact || "Refer to physical packaging"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. INFOGRAPHIC FOOTER & VERIFICATION WATERMARK */}
        <div
          style={{
            backgroundColor: "#f1f5f9",
            borderTop: "1px solid #e2e8f0",
            padding: "0.85rem 1.75rem",
            fontSize: "0.73rem",
            color: "#64748b",
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          METRIScan Citizen Awareness Infographic • Informational product safety verification based on OCR label extraction •
          Always consult healthcare professionals for specific medical or dietary guidance.
        </div>
      </div>

      {/* Floating Accessibility Voice Assistant Button */}
      <button
        type="button"
        onClick={handleToggleVoice}
        aria-label={isSpeaking ? t("voice.stopReading", "Stop Reading") : t("voice.readAloud", "Read Aloud")}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: isSpeaking ? "0.85rem 1.35rem" : "0.85rem 1.25rem",
          borderRadius: "9999px",
          backgroundColor: isSpeaking ? "#dc2626" : "#059669",
          color: "#ffffff",
          border: "none",
          boxShadow: isSpeaking
            ? "0 8px 24px rgba(220, 38, 38, 0.45)"
            : "0 8px 24px rgba(5, 150, 105, 0.4)",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: "translateZ(0)",
        }}
      >
        {isSpeaking ? (
          <>
            <VolumeX size={20} />
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{t("voice.stopReading", "Stop Reading")}</span>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                animation: "pulse 1.2s infinite",
              }}
            />
          </>
        ) : (
          <>
            <Volume2 size={20} />
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{t("voice.readAloud", "Voice Assistance")}</span>
          </>
        )}
      </button>
    </div>
  );
}
