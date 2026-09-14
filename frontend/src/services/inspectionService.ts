const BACKEND_URL = "http://127.0.0.1:8000";

export interface Inspection {
    id: string;
    inspection_number: string;

    inspector_id?: string | null;

    product_id?: string | null;

    status: "PASS" | "FAIL" | "REVIEW";

    compliance_score?: number | null;

    total_rules?: number;
    passed_rules?: number;
    failed_rules?: number;
    review_rules?: number;
    not_applicable_rules?: number;
    out_of_scope_rules?: number;

    inspection_date: string;
    created_at: string;
    updated_at: string;

    products?: Product | null;
}

export interface Product {
    id: string;

    product_name?: string | null;
    category?: string | null;

    net_quantity?: string | null;
    mrp?: string | null;
    batch_number?: string | null;

    packed_on?: string | null;
    manufactured_on?: string | null;

    best_before?: string | null;
    use_by?: string | null;
    expiry_date?: string | null;

    manufacturer_or_packer?: string | null;

    address?: string | null;

    marketed_by?: string | null;

    consumer_contact?: string | null;

    country_of_origin?: string | null;

    fssai_license?: string | null;
}


export async function getInspectionHistory(
    inspectorId?: string
): Promise<Inspection[]> {

    const params = new URLSearchParams();

    if (inspectorId) {
        params.set(
            "inspector_id",
            inspectorId
        );
    }

    params.set("limit", "50");

    const response = await fetch(
        `${BACKEND_URL}/api/inspections/?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            "Failed to fetch inspection history"
        );
    }

    const result = await response.json();

    return result.data || [];
}


export async function getInspection(
    inspectionId: string
): Promise<Inspection> {

    const response = await fetch(
        `${BACKEND_URL}/api/inspections/${inspectionId}`
    );

    if (!response.ok) {
        throw new Error(
            "Failed to fetch inspection"
        );
    }

    const result = await response.json();

    return result.data;
}