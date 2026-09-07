import { Package, Calendar, Building2, PhoneCall } from "lucide-react";
import type { ProductData } from "../../types/ocr";

interface ProductInformationProps {
  data: ProductData | null;
}

export function ProductInformation({ data }: ProductInformationProps) {
  if (!data) {
    return (
      <div className="panel-card">
        <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
          No structured product data extracted.
        </div>
      </div>
    );
  }

  const renderValue = (val: string | null | undefined) => {
    if (!val || String(val).trim() === "" || String(val).trim() === "null") {
      return (
        <span style={{ color: "#94a3b8", fontStyle: "italic", fontWeight: 500 }}>
          Not detected
        </span>
      );
    }
    return <span style={{ fontWeight: 700, color: "#0f172a" }}>{val}</span>;
  };

  const sections = [
    {
      title: "Basic Commodity Information",
      icon: Package,
      fields: [
        { label: "Product Name", value: data.product_name },
        { label: "Product Category", value: data.product_category },
        { label: "Net Quantity", value: data.net_quantity },
        { label: "Retail Price (MRP)", value: data.mrp },
      ],
    },
    {
      title: "Traceability & Dates",
      icon: Calendar,
      fields: [
        { label: "Batch Number", value: data.batch_number },
        { label: "Date of Manufacture", value: data.date_of_manufacture },
        { label: "Packed On", value: data.packed_on },
        { label: "Best Before", value: data.best_before },
        { label: "Use By", value: data.use_by },
        { label: "Expiry Date", value: data.expiry_date },
      ],
    },
    {
      title: "Manufacturer & Regulatory",
      icon: Building2,
      fields: [
        { label: "Manufacturer / Packer", value: data.manufacturer_or_packer },
        { label: "Marketed By", value: data.marketed_by },
        { label: "FSSAI / License No", value: data.license_number },
        { label: "Country of Origin", value: data.country_of_origin },
      ],
    },
    {
      title: "Contact & Declaration Details",
      icon: PhoneCall,
      fields: [
        { label: "Manufacturer Address", value: data.address },
        { label: "Consumer Care Contact", value: data.consumer_contact },
        { label: "Ingredients Declaration", value: data.ingredients },
      ],
    },
  ];

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <Package size={18} color="#2563eb" />
          <span>Extracted Product Declarations (17 Fields)</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {sections.map((sec) => {
          const SectionIcon = sec.icon;
          return (
            <div key={sec.title} style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.65rem" }}>
                <SectionIcon size={14} color="#2563eb" />
                <span>{sec.title}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                {sec.fields.map((f) => (
                  <div
                    key={f.label}
                    style={{
                      padding: "0.65rem 0.85rem",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px"
                    }}
                  >
                    <div style={{ fontSize: "0.725rem", color: "#64748b", fontWeight: 600, marginBottom: "0.15rem" }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>
                      {renderValue(f.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
