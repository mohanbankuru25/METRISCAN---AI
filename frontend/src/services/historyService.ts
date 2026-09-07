import type { OCRComplianceResponse } from "../types/compliance";
import type { ScanHistoryItem, DashboardStats, ScanFilterOptions } from "../types/history";

const HISTORY_STORAGE_KEY = "sih_g_scan_history";

const SAMPLE_SCANS: ScanHistoryItem[] = [
  {
    id: "scan_sample_1",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    productName: "Amul Butter 500g",
    category: "Packaged Food",
    score: 95.0,
    status: "PASS",
    filename: "amul_butter.jpg",
    fullData: {
      filename: "amul_butter.jpg",
      text: ["Amul Pasteurised Butter", "Net Qty: 500g", "MRP Rs 275.00 incl. of all taxes", "Mfg Date: 15/08/2026", "Best Before 12 Months from Packaging", "FSSAI Lic No 10012021000071", "Packed by: Kaira District Co-operative Milk Producers Union Ltd, Anand 388001"],
      product_data: {
        product_name: "Amul Pasteurised Butter",
        product_category: "Packaged Food",
        net_quantity: "500 g",
        mrp: "₹275.00",
        batch_number: "B260815",
        date_of_manufacture: "15/08/2026",
        packed_on: "15/08/2026",
        best_before: "12 Months",
        use_by: null,
        expiry_date: null,
        manufacturer_or_packer: "Kaira District Co-operative Milk Producers Union Ltd",
        address: "Anand, Gujarat - 388001",
        consumer_contact: "1800 258 3333 / customercare@amul.coop",
        license_number: "10012021000071",
        ingredients: "Butter, Common Salt",
        country_of_origin: "India",
        marketed_by: "GCMMF Ltd, Anand"
      },
      compliance: {
        overall_status: "PASS",
        compliance_score: 95.0,
        score: 95.0,
        summary: { PASS: 14, FAIL: 0, REVIEW: 1, "NOT APPLICABLE": 3, "OUT OF SCOPE": 2 },
        results: [
          { rule_id: "RULE_6_1_A", rule_number: "Rule 6(1)(a)", rule_name: "Generic / Common Name", status: "PASS", applicable: true, expected: "Name of commodity clearly displayed", extracted: "Amul Pasteurised Butter", reason: "Product name clearly declared on front label.", rule_reference: "Legal Metrology (Packaged Commodities) Rules, 2011" },
          { rule_id: "RULE_6_1_B", rule_number: "Rule 6(1)(b)", rule_name: "Net Quantity Declaration", status: "PASS", applicable: true, expected: "Standard units (g/kg/ml/l/N)", extracted: "500 g", reason: "Net quantity declared in prescribed standard units.", rule_reference: "Rule 6(1)(b) & Schedule II" },
          { rule_id: "RULE_6_1_C", rule_number: "Rule 6(1)(c)", rule_name: "Retail Sale Price (MRP)", status: "PASS", applicable: true, expected: "MRP in Indian Rupees (inclusive of all taxes)", extracted: "₹275.00", reason: "MRP clearly declared with inclusive of taxes clause.", rule_reference: "Rule 6(1)(c)" },
          { rule_id: "RULE_6_1_D", rule_number: "Rule 6(1)(d)", rule_name: "Month & Year of Manufacture/Packaging", status: "PASS", applicable: true, expected: "Month and year of manufacture or packing", extracted: "15/08/2026", reason: "Manufacturing date declared in legible format.", rule_reference: "Rule 6(1)(d)" },
          { rule_id: "RULE_6_1_E", rule_number: "Rule 6(1)(e)", rule_name: "Manufacturer / Packer Name & Address", status: "PASS", applicable: true, expected: "Complete name and address of manufacturer or packer", extracted: "Kaira District Co-op Union Ltd, Anand", reason: "Complete manufacturer info present.", rule_reference: "Rule 6(1)(e)" },
          { rule_id: "RULE_6_1_F", rule_number: "Rule 6(1)(f)", rule_name: "Consumer Care Details", status: "PASS", applicable: true, expected: "Name, address, telephone/email for consumer grievances", extracted: "1800 258 3333 / customercare@amul.coop", reason: "Customer helpline number & email present.", rule_reference: "Rule 6(1)(f)" }
        ]
      }
    }
  },
  {
    id: "scan_sample_2",
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    productName: "Quaker Oats 1kg",
    category: "Packaged Food",
    score: 71.4,
    status: "REVIEW",
    filename: "quaker_oats.jpg",
    fullData: {
      filename: "quaker_oats.jpg",
      text: ["Quaker Rolled Oats", "Net Wt 1000g", "MRP ₹199", "Customer Care: care@pepsico.com"],
      product_data: {
        product_name: "Quaker Rolled Oats",
        product_category: "Packaged Food",
        net_quantity: "1000 g",
        mrp: "₹199.00",
        batch_number: null,
        date_of_manufacture: null,
        packed_on: "01/07/2026",
        best_before: "12 Months",
        use_by: null,
        expiry_date: null,
        manufacturer_or_packer: "PepsiCo India Holdings Pvt Ltd",
        address: "Gurugram, Haryana",
        consumer_contact: "care@pepsico.com",
        license_number: null,
        ingredients: "100% Natural Wholegrain Oats",
        country_of_origin: "India",
        marketed_by: null
      },
      compliance: {
        overall_status: "REVIEW",
        compliance_score: 71.4,
        score: 71.4,
        summary: { PASS: 10, FAIL: 0, REVIEW: 4, "NOT APPLICABLE": 4, "OUT OF SCOPE": 2 },
        results: [
          { rule_id: "RULE_6_1_A", rule_number: "Rule 6(1)(a)", rule_name: "Generic Name", status: "PASS", applicable: true, expected: "Generic name declared", extracted: "Quaker Rolled Oats", reason: "Generic name identified.", rule_reference: "Rule 6(1)(a)" },
          { rule_id: "RULE_6_1_B", rule_number: "Rule 6(1)(b)", rule_name: "Net Quantity", status: "PASS", applicable: true, expected: "Net weight in g/kg", extracted: "1000 g", reason: "Declared correctly.", rule_reference: "Rule 6(1)(b)" },
          { rule_id: "RULE_6_1_D", rule_number: "Rule 6(1)(d)", rule_name: "Date of Manufacture", status: "REVIEW", applicable: true, expected: "Month and Year required", extracted: "Not detected", reason: "Manufacturing date text low contrast or unverified.", suggestion: "Verify label manually for MFD statement.", rule_reference: "Rule 6(1)(d)" },
          { rule_id: "RULE_6_1_F", rule_number: "Rule 6(1)(f)", rule_name: "Consumer Contact Phone", status: "REVIEW", applicable: true, expected: "Telephone number required", extracted: "care@pepsico.com (Email only)", reason: "Telephone number missing from consumer contact declaration.", suggestion: "Ensure toll-free/phone number is printed.", rule_reference: "Rule 6(1)(f)" }
        ]
      }
    }
  },
  {
    id: "scan_sample_3",
    timestamp: new Date(Date.now() - 3600000 * 42).toISOString(),
    productName: "Nivea Soft Cream 100ml",
    category: "Cosmetics",
    score: 45.0,
    status: "FAIL",
    filename: "nivea_cream.jpg",
    fullData: {
      filename: "nivea_cream.jpg",
      text: ["Nivea Moisturiser", "100ml"],
      product_data: {
        product_name: "Nivea Moisturiser",
        product_category: "Cosmetics",
        net_quantity: "100 ml",
        mrp: null,
        batch_number: null,
        date_of_manufacture: null,
        packed_on: null,
        best_before: null,
        use_by: null,
        expiry_date: null,
        manufacturer_or_packer: null,
        address: null,
        consumer_contact: null,
        license_number: null,
        ingredients: null,
        country_of_origin: null,
        marketed_by: null
      },
      compliance: {
        overall_status: "FAIL",
        compliance_score: 45.0,
        score: 45.0,
        summary: { PASS: 4, FAIL: 5, REVIEW: 3, "NOT APPLICABLE": 5, "OUT OF SCOPE": 3 },
        results: [
          { rule_id: "RULE_6_1_C", rule_number: "Rule 6(1)(c)", rule_name: "MRP Declaration", status: "FAIL", applicable: true, expected: "Mandatory MRP declaration in ₹", extracted: "Not detected", reason: "MRP is missing from package outer declaration.", suggestion: "MRP is mandatory under Rule 6(1)(c).", rule_reference: "Rule 6(1)(c)" },
          { rule_id: "RULE_6_1_E", rule_number: "Rule 6(1)(e)", rule_name: "Manufacturer Address", status: "FAIL", applicable: true, expected: "Full address required", extracted: "Not detected", reason: "Manufacturer address missing.", suggestion: "Add registered address of packer/manufacturer.", rule_reference: "Rule 6(1)(e)" }
        ]
      }
    }
  }
];

export const historyService = {
  getScans(): ScanHistoryItem[] {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(SAMPLE_SCANS));
        return SAMPLE_SCANS;
      }
      return JSON.parse(stored);
    } catch {
      return SAMPLE_SCANS;
    }
  },

  getScanById(id: string): ScanHistoryItem | null {
    const scans = this.getScans();
    return scans.find((s) => s.id === id) || null;
  },

  saveScan(fullData: OCRComplianceResponse, previewUrl?: string): ScanHistoryItem {
    const scans = this.getScans();
    const productName =
      fullData.product_data?.product_name ||
      fullData.paddle_data?.product_name ||
      fullData.filename ||
      "Packaged Product";

    const category =
      fullData.product_data?.product_category ||
      fullData.paddle_data?.product_category ||
      "Packaged Commodity";

    const compliance = fullData.compliance;
    const rawScore = compliance?.compliance_score ?? compliance?.score ?? 0;
    const score = Math.round(rawScore * 10) / 10;
    const status = String(compliance?.overall_status || "REVIEW").toUpperCase();

    const newItem: ScanHistoryItem = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      productName,
      category,
      score,
      status,
      filename: fullData.filename,
      previewUrl,
      fullData,
    };

    const updated = [newItem, ...scans];
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not persist to localStorage:", e);
    }

    return newItem;
  },

  deleteScan(id: string): boolean {
    const scans = this.getScans();
    const filtered = scans.filter((s) => s.id !== id);
    if (filtered.length === scans.length) return false;
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not save after delete:", e);
    }
    return true;
  },

  getStats(): DashboardStats {
    const scans = this.getScans();
    const totalScans = scans.length;
    let passCount = 0;
    let failCount = 0;
    let reviewCount = 0;
    let scoreSum = 0;

    scans.forEach((scan) => {
      const st = String(scan.status).toUpperCase();
      if (st === "PASS") passCount++;
      else if (st === "FAIL") failCount++;
      else reviewCount++;

      scoreSum += scan.score || 0;
    });

    const averageScore = totalScans > 0 ? Math.round((scoreSum / totalScans) * 10) / 10 : 0;

    return {
      totalScans,
      passCount,
      failCount,
      reviewCount,
      averageScore,
    };
  },

  filterScans(options: ScanFilterOptions): ScanHistoryItem[] {
    let scans = this.getScans();

    if (options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      scans = scans.filter(
        (s) =>
          s.productName.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.filename.toLowerCase().includes(q)
      );
    }

    if (options.statusFilter && options.statusFilter !== "ALL") {
      scans = scans.filter((s) => String(s.status).toUpperCase() === options.statusFilter.toUpperCase());
    }

    if (options.categoryFilter && options.categoryFilter !== "ALL") {
      scans = scans.filter((s) => s.category.toLowerCase() === options.categoryFilter.toLowerCase());
    }

    scans.sort((a, b) => {
      if (options.sortBy === "oldest") {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (options.sortBy === "highest_score") {
        return b.score - a.score;
      }
      if (options.sortBy === "lowest_score") {
        return a.score - b.score;
      }
      // default: newest
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return scans;
  }
};
