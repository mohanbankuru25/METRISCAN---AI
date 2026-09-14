import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

def test_supabase_and_app():
    print("==================================================")
    print("METRISCAN - SYSTEM INTEGRITY VERIFICATION")
    print("==================================================")

    # 1. Test Supabase Client & Tables
    print("\n[1] Verifying Supabase Connectivity & Tables...")
    from app.services.supabase_service import SupabaseService
    
    # Check inspectors
    inspectors = SupabaseService.get_inspectors(limit=5)
    print(f"  [OK] public.profiles (inspectors): {len(inspectors)} records retrieved.")
    for ins in inspectors[:3]:
        print(f"       Officer: {ins.get('username')} ({ins.get('designation')}) - Active: {ins.get('is_active')}")

    # Check compliance_rules
    rules = SupabaseService.get_rules(limit=10)
    print(f"  [OK] public.compliance_rules: {len(rules)} records retrieved.")
    for r in rules[:3]:
        print(f"       Rule: {r.get('rule_code')} - {r.get('rule_name')} (Active: {r.get('active')})")

    # Check inspections
    inspections = SupabaseService.get_inspections_filtered(limit=5)
    print(f"  [OK] public.inspections: {len(inspections)} records retrieved.")

    # Check audit_logs
    logs = SupabaseService.get_audit_logs(limit=5)
    print(f"  [OK] public.audit_logs: {len(logs)} records retrieved.")

    # Check reports
    reports = SupabaseService.get_reports(limit=5)
    print(f"  [OK] public.reports: {len(reports)} records retrieved.")

    # Check analytics
    analytics = SupabaseService.get_admin_analytics()
    print(f"  [OK] Admin Analytics Aggregated: {analytics.get('total_inspections')} inspections, {analytics.get('total_inspectors')} officers, compliance rate: {analytics.get('average_compliance_score')}%")

    # 2. Test Dynamic Compliance Engine Evaluation
    print("\n[2] Testing Dynamic Statutory Compliance Evaluation Engine...")
    from app.services.compliance_engine import compliance_engine
    from app.services.applicability_engine import applicability_engine
    sample_product_data = {
        "mrp": "Rs. 250.00",
        "net_quantity": "500 g",
        "mfg_date": "01/2026",
        "expiry_date": "12/2026",
        "consumer_care": "care@brand.in / 1800-111-222",
        "country_of_origin": "India",
        "manufacturer_details": "Apex Foods Ltd, Industrial Estate, Mumbai",
    }
    app_res = applicability_engine.determine(sample_product_data)
    eval_result = compliance_engine.evaluate(sample_product_data, app_res, dynamic_rules=rules)
    print(f"  [OK] Evaluation Result: Status = {eval_result.get('overall_status')}, Score = {eval_result.get('compliance_score')}%")
    print(f"       Evaluated Rules Count: {len(eval_result.get('results', []))}")

    # 3. Test FastAPI App and Route Tree
    print("\n[3] Testing FastAPI App Route Registration...")
    from main import app
    routes = [r.path for r in app.routes if hasattr(r, 'path')]
    print(f"  [OK] Total Routes Registered: {len(routes)}")
    for route in sorted(routes):
        print(f"       -> {route}")

    print("\n==================================================")
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_supabase_and_app()
