import os
import re
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional

from app.services.supabase_service import supabase, SupabaseService, get_admin_client, create_auth_client
from app.services.ocr_service import ocr_service
from app.services.gemini_service import gemini_vision_service
from app.services.field_extraction import field_extractor
from app.services.extraction_fusion import extraction_fusion
from app.services.applicability_engine import applicability_engine
from app.services.compliance_engine import compliance_engine
from app.services.image_preprocessing import image_preprocessor
from app.services.ocr_field_recovery import ocr_field_recovery
from app.services.visual_compliance_analyzer import VisualComplianceAnalyzer

_RECENT_CONSUMER_SCANS: Dict[str, Dict[str, Any]] = {}
_RECENT_CONSUMER_ISSUES: Dict[str, Dict[str, Any]] = {}



class ConsumerService:
    """
    Dedicated service for the Consumer / Public User Portal.
    Completely separated from Inspector and Admin business workflows.
    Reuses existing OCR and compliance engines safely.
    """

    # ============================================================
    # AUTHENTICATION
    # ============================================================

    @staticmethod
    def signup_consumer(
        full_name: str,
        username: str,
        email: str,
        password: str,
        phone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Registers a new consumer user.
        Uses Supabase Auth and records profile in consumer_users table.
        """
        username = username.strip().lower()
        email = email.strip().lower()

        if not username or not full_name or not email or not password:
            raise ValueError("All required fields must be provided")

        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")

        # Disallow admin/inspector username suffixes for consumers
        if username.endswith(".admin") or username.endswith(".ins"):
            raise ValueError("Consumer username cannot end with .admin or .ins")

        # Check existing consumer username
        try:
            res = (
                supabase.table("consumer_users")
                .select("id")
                .eq("username", username)
                .limit(1)
                .execute()
            )
            if res.data:
                raise ValueError("Username is already taken")
        except ValueError:
            raise
        except Exception as e:
            print(f"Notice: consumer_users table check: {e}")

        # Create user in Supabase Auth via Admin API
        try:
            admin_client = get_admin_client()
            auth_user = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "username": username,
                    "full_name": full_name,
                    "role": "consumer",
                },
            })
            auth_id = auth_user.user.id if hasattr(auth_user, "user") else auth_user.get("id")
        except Exception as e:
            err_str = str(e)
            if "already registered" in err_str.lower() or "unique" in err_str.lower():
                # Attempt to get user or sign in if already exists
                try:
                    auth_client = create_auth_client()
                    login_res = auth_client.auth.sign_in_with_password({
                        "email": email,
                        "password": password,
                    })
                    auth_id = login_res.user.id
                except Exception:
                    raise ValueError("An account with this email already exists")
            else:
                raise ValueError(f"Account registration error: {err_str}")

        # Insert into consumer_users table
        consumer_record = {
            "auth_user_id": auth_id,
            "username": username,
            "full_name": full_name,
            "email": email,
            "phone": phone or "",
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "last_login_at": datetime.now().isoformat(),
        }

        try:
            ins_res = supabase.table("consumer_users").insert(consumer_record).execute()
            if ins_res.data:
                consumer_user = ins_res.data[0]
            else:
                consumer_user = consumer_record
                consumer_user["id"] = auth_id
        except Exception as e:
            print(f"Notice: consumer_users insert: {e}")
            consumer_user = consumer_record
            consumer_user["id"] = auth_id

        # Generate session
        try:
            auth_client = create_auth_client()
            session_res = auth_client.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
            access_token = session_res.session.access_token
        except Exception:
            access_token = f"consumer-token-{auth_id}"

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(consumer_user.get("id", auth_id)),
                "auth_user_id": auth_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "phone": phone,
                "role": "consumer",
            },
        }

    @staticmethod
    def login_consumer(username: str, password: str) -> Dict[str, Any]:
        """
        Authenticates a consumer by username + password.
        """
        username = username.strip().lower()
        if not username or not password:
            raise ValueError("Username and password are required")

        # Lookup email from consumer_users table
        user_email = None
        consumer_profile = None

        try:
            res = (
                supabase.table("consumer_users")
                .select("*")
                .eq("username", username)
                .limit(1)
                .execute()
            )
            if res.data:
                consumer_profile = res.data[0]
                user_email = consumer_profile.get("email")
        except Exception as e:
            print(f"Notice: consumer lookup: {e}")

        # If not found by username in consumer_users, check auth metadata or email
        if not user_email:
            if "@" in username:
                user_email = username
            else:
                try:
                    admin_client = get_admin_client()
                    all_users = admin_client.auth.admin.list_users()
                    user_list = all_users if isinstance(all_users, list) else getattr(all_users, "users", [])
                    for u in user_list:
                        meta = getattr(u, "user_metadata", {}) or {}
                        if meta.get("username", "").strip().lower() == username:
                            user_email = u.email
                            break
                except Exception as e:
                    print(f"Notice: auth admin user list fallback: {e}")

        if not user_email:
            raise ValueError("Invalid username or password")

        # Authenticate via Supabase Auth
        try:
            auth_client = create_auth_client()
            auth_res = auth_client.auth.sign_in_with_password({
                "email": user_email,
                "password": password,
            })
        except Exception as e:
            raise ValueError("Invalid username or password")

        auth_id = auth_res.user.id
        access_token = auth_res.session.access_token

        # If consumer profile was not found earlier, retrieve or create it
        if not consumer_profile:
            try:
                res = (
                    supabase.table("consumer_users")
                    .select("*")
                    .eq("auth_user_id", auth_id)
                    .limit(1)
                    .execute()
                )
                if res.data:
                    consumer_profile = res.data[0]
            except Exception:
                pass

        if not consumer_profile:
            consumer_profile = {
                "id": auth_id,
                "auth_user_id": auth_id,
                "username": username,
                "full_name": auth_res.user.user_metadata.get("full_name", username),
                "email": user_email,
                "phone": auth_res.user.user_metadata.get("phone"),
                "is_active": True,
            }

        # Update last_login_at
        try:
            supabase.table("consumer_users").update({
                "last_login_at": datetime.now().isoformat()
            }).eq("id", consumer_profile.get("id")).execute()
        except Exception:
            pass

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(consumer_profile.get("id", auth_id)),
                "auth_user_id": auth_id,
                "username": consumer_profile.get("username", username),
                "full_name": consumer_profile.get("full_name", username),
                "email": consumer_profile.get("email", user_email),
                "phone": consumer_profile.get("phone"),
                "role": "consumer",
            },
        }

    @staticmethod
    def get_consumer_from_token(token: str) -> Dict[str, Any]:
        """
        Resolves the authenticated consumer from a Bearer token.
        """
        try:
            auth_user = supabase.auth.get_user(token)
            if not auth_user or not auth_user.user:
                raise ValueError("Invalid session")
            auth_id = auth_user.user.id
        except Exception:
            raise ValueError("Session expired or invalid")

        try:
            res = (
                supabase.table("consumer_users")
                .select("*")
                .eq("auth_user_id", auth_id)
                .limit(1)
                .execute()
            )
            if res.data:
                profile = res.data[0]
                profile["role"] = "consumer"
                return profile
        except Exception:
            pass

        return {
            "id": auth_id,
            "auth_user_id": auth_id,
            "username": auth_user.user.user_metadata.get("username", "consumer"),
            "full_name": auth_user.user.user_metadata.get("full_name", "Consumer User"),
            "email": auth_user.user.email,
            "role": "consumer",
        }

    # ============================================================
    # PRODUCT SAFETY & NUTRITION ANALYSIS (MULTI-LANGUAGE)
    # ============================================================

    @staticmethod
    def extract_nutrition_and_ingredients(raw_text: str, product_data: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """
        Extracts structured nutrition facts, ingredient lists, allergens,
        and evidence-based consumer guidance from OCR and product data.
        Generates localized advisory in English, Hindi, Marathi, Telugu, Tamil, or Kannada.
        Never hallucinates: only returns values detected on the package label.
        """
        lang = language.lower() if language and language.lower() in ("hi", "mr", "te", "ta", "kn") else "en"

        loc_texts = {
            "en": {
                "expired_warn": "⚠ EXPIRED PRODUCT — Expiry Date: {exp}. Do not consume or use based on package expiry.",
                "expired_badge": "EXPIRED – DO NOT CONSUME",
                "valid_shelf": "Within stated shelf life",
                "undetermined_shelf": "Expiry status could not be determined from the scanned label.",
                "sugar_warn": "High Sugar Declaration: Label lists {val} sugars.",
                "sugar_cat": "Sugar Sensitive & Dietary Consideration",
                "sugar_rec": "This product contains a relatively higher amount of sugar per 100 g based on the package declaration. People managing blood sugar may wish to review the sugar content with a qualified healthcare professional.",
                "caffeine_warn": "Contains Caffeine / Stimulant declaration.",
                "caffeine_cat": "Stimulant Consideration",
                "caffeine_rec": "This product contains caffeine or stimulants. Caffeinated products may not be appropriate for young children.",
                "child_warn": "Explicit Child/Age Restriction printed on package label.",
                "child_cat": "Age Restriction",
                "child_rec": "Follow the manufacturer's declared age restriction printed on the package label.",
                "allergen_cat": "Allergen Awareness",
                "allergen_rec": "Contains package declarations for {allergens}. Individuals with specific food sensitivities should review carefully.",
                "general_cat": "Consumer Guidance",
                "general_rec": "Verify package seal integrity and expiry date prior to purchase. Check serving size against recommended daily allowances.",
                "ing_explicit": "Exact ingredient percentages explicitly declared on the package are shown below.",
                "ing_not_explicit": "Ingredient percentages were not explicitly declared on the scanned package.",
                "ing_none": "Ingredient information could not be reliably extracted from the scanned package.",
                "nutrition_none": "No reliable nutrition information could be extracted from the scanned package.",
                "no_age": "No specific age restriction was detected on the scanned label.",
            },
            "hi": {
                "expired_warn": "⚠ कालाबाह्य उत्पाद — समाप्ति तिथि: {exp}। पैकेज समाप्ति के आधार पर उपभोग न करें।",
                "expired_badge": "कालाबाह्य – उपभोग न करें (EXPIRED – DO NOT CONSUME)",
                "valid_shelf": "घोषित शेल्फ जीवन के भीतर (Within stated shelf life)",
                "undetermined_shelf": "स्कैन किए गए लेबल से समाप्ति स्थिति निर्धारित नहीं की जा सकी।",
                "sugar_warn": "अधिक चीनी घोषणा: लेबल पर {val} चीनी सूचीबद्ध है।",
                "sugar_cat": "शर्करा संवेदनशील एवं आहार विचार",
                "sugar_rec": "पैकेट की घोषणा के आधार पर इस उत्पाद में प्रति 100 ग्राम अपेक्षाकृत अधिक चीनी है। रक्त शर्करा नियंत्रित करने वाले लोग स्वास्थ्य विशेषज्ञ से परामर्श कर सकते हैं।",
                "caffeine_warn": "कैफीन / उत्तेजक तत्व की घोषणा मौजूद है।",
                "caffeine_cat": "कैफीन विचार",
                "caffeine_rec": "इस उत्पाद में कैफीन है। छोटे बच्चों या कैफीन-संवेदनशील व्यक्तियों के लिए अनुशंसित नहीं है।",
                "child_warn": "पैकेट पर स्पष्ट आयु या बाल प्रतिबंध निर्देश मौजूद है।",
                "child_cat": "आयु प्रतिबंध",
                "child_rec": "पैकेट लेबल पर मुद्रित निर्माता के आयु प्रतिबंध का पालन करें।",
                "allergen_cat": "एलर्जी जागरूकता",
                "allergen_rec": "{allergens} की घोषणा पाई गई है। यदि आपको एलर्जी है तो सावधानीपूर्वक जांच करें।",
                "general_cat": "उपभोक्ता मार्गदर्शन",
                "general_rec": "खरीदने से पहले पैकेज सील और समाप्ति तिथि की जांच करें। अनुशंसित दैनिक मात्रा (RDA) का ध्यान रखें।",
                "ing_explicit": "पैकेज पर स्पष्ट रूप से घोषित सामग्री प्रतिशत नीचे दिखाया गया है।",
                "ing_not_explicit": "स्कैन किए गए पैकेज पर सामग्री का प्रतिशत स्पष्ट रूप से घोषित नहीं किया गया था।",
                "ing_none": "स्कैन किए गए पैकेज से सामग्री की जानकारी विश्वसनीय रूप से प्राप्त नहीं की जा सकी।",
                "nutrition_none": "स्कैन किए गए पैकेज से कोई विश्वसनीय पोषण जानकारी प्राप्त नहीं की जा सकी।",
                "no_age": "स्कैन किए गए लेबल पर कोई विशिष्ट आयु प्रतिबंध नहीं पाया गया।",
            },
            "mr": {
                "expired_warn": "⚠ कालबाह्य उत्पादन — कालबाह्यता तारीख: {exp}. सेवन करू नका.",
                "expired_badge": "कालबाह्य – सेवन करू नका (EXPIRED – DO NOT CONSUME)",
                "valid_shelf": "विहित मुदतीच्या आत (Within stated shelf life)",
                "undetermined_shelf": "स्कॅन केलेल्या लेबलवरून मुदत संपल्याची स्थिती निश्चित करता आली नाही.",
                "sugar_warn": "अधिक साखर घोषणा: लेबलवर {val} साखर नोंदवली आहे.",
                "sugar_cat": "साखर नियंत्रण आणि आहार",
                "sugar_rec": "या उत्पादनात प्रति १०० ग्रॅम साखरेचे प्रमाण तुलनेने जास्त आहे. रक्तातील साखर नियंत्रित करणाऱ्यांनी डॉक्टरांचा सल्ला घ्यावा.",
                "caffeine_warn": "कॅफीन / उत्तेजक घटकांची घोषणा आढळली.",
                "caffeine_cat": "कॅफीन विचार",
                "caffeine_rec": "या उत्पादनात कॅफीन समाविष्ट आहे. लहान मुलांसाठी किंवा कॅफीन संवेदनशील व्यक्तींसाठी योग्य नाही.",
                "child_warn": "पॅकेटवर स्पष्ट वयोमर्यादा इशारा आढळला.",
                "child_cat": "वयोमर्यादा सूचना",
                "child_rec": "पॅकेटवर छापलेल्या वयोमर्यादा निर्देशांचे पालन करा.",
                "allergen_cat": "ऍलर्जी सूचना",
                "allergen_rec": "{allergens} घटक आढळले आहेत. ऍलर्जी असल्यास काळजीपूर्वक तपासा.",
                "general_cat": "ग्राहक मार्गदर्शन",
                "general_rec": "खरेदी करण्यापूर्वी पॅकेज सील आणि अंतिम तारीख तपासा. दैनिक प्रमाण (RDA) विचारात घ्या.",
                "ing_explicit": "पॅकेजवर छापलेली घटकांची घोषित टक्केवारी खाली दर्शविली आहे.",
                "ing_not_explicit": "स्कॅन केलेल्या पॅकेजवर घटकांची टक्केवारी स्पष्टपणे घोषित केलेली नाही.",
                "ing_none": "स्कॅन केलेल्या पॅकेजवरून घटकांची माहिती मिळवता आली नाही.",
                "nutrition_none": "स्कॅन केलेल्या पॅकेजवरून कोणतीही विश्वसनीय पोषण माहिती काढता आली नाही.",
                "no_age": "स्कॅन केलेल्या लेबलवर कोणतेही वयोमर्यादा निर्बंध आढळले नाहीत.",
            },
            "te": {
                "expired_warn": "⚠ గడువు ముగిసిన ఉత్పత్తి — గడువు తేదీ: {exp}. ఉపయోగించవద్దు.",
                "expired_badge": "గడువు ముగిసింది – ఉపయోగించవద్దు (EXPIRED – DO NOT CONSUME)",
                "valid_shelf": "నిర్దేశిత వినియోగ వ్యవధిలో ఉంది (Within stated shelf life)",
                "undetermined_shelf": "స్కాన్ చేసిన లేబుల్ నుండి గడువు స్థితిని నిర్ధారించలేకపోయాము.",
                "sugar_warn": "అధిక చక్కెర పరిమాణం: లేబుల్‌పై {val} చక్కెర నమోదు చేయబడింది.",
                "sugar_cat": "చక్కెర నియంత్రణ & ఆహార జాగ్రత్తలు",
                "sugar_rec": "లేబుల్ ప్రకారం ఈ ఉత్పత్తిలో చక్కెర శాతం ఎక్కువ. రక్తంలో చక్కెర స్థాయిలను నియంత్రించేవారు వైద్యుడిని సంప్రదించాలి.",
                "caffeine_warn": "కెఫిన్ లేదా ఉత్తేజిత పదార్థాలు ఉన్నాయి.",
                "caffeine_cat": "కెఫిన్ సమాచారం",
                "caffeine_rec": "ఈ ఉత్పత్తిలో కెఫిన్ ఉంది. చిన్న పిల్లలకు లేదా కెఫిన్ సున్నితత్వం ఉన్నవారికి సిఫార్సు చేయబడదు.",
                "child_warn": "లేబుల్‌పై వయస్సు పరిమితి హెచ్చరిక ఉంది.",
                "child_cat": "వయోపరిమితి మార్గదర్శకం",
                "child_rec": "తయారీదారు లేబుల్‌పై ముద్రించిన వయస్సు పరిమితిని పాటించండి.",
                "allergen_cat": "అలెర్జీ సమాచారం",
                "allergen_rec": "{allergens} పదార్థాలు ఉన్నాయి. అలెర్జీ సమస్యలు ఉన్నవారు జాగ్రత్త వహించండి.",
                "general_cat": "వినియోగదారుల మార్గదర్శకం",
                "general_rec": "కొనుగోలు చేయడానికి ముందు సీల్ మరియు గడువు తేదీని తనిఖీ చేయండి. RDA మార్గదర్శకాలను పాటించండి.",
                "ing_explicit": "ప్యాకేజీపై ప్రకటించిన పదార్థాల శాతాలు క్రింద ఇవ్వబడ్డాయి.",
                "ing_not_explicit": "స్కాన్ చేసిన ప్యాకేజీపై పదార్థాల శాతాలు స్పష్టంగా ప్రకటించబడలేదు.",
                "ing_none": "స్కాన్ చేసిన ప్యాకేజీ నుండి పదార్థాల వివరాలను సేకరించలేకపోయాము.",
                "nutrition_none": "స్కాన్ చేసిన ప్యాకేజీ నుండి ఎటువంటి విశ్వసనీయ పోషక సమాచారం లభించలేదు.",
                "no_age": "స్కాన్ చేసిన లేబుల్‌పై ఎటువంటి నిర్దిష్ట వయస్సు పరిమితులు లేవు.",
            },
            "ta": {
                "expired_warn": "⚠ காலாவதியான தயாரிப்பு — காலாவதி தேதி: {exp}. உட்கொள்ள வேண்டாம்.",
                "expired_badge": "காலாவதியானது – உட்கொள்ள வேண்டாம் (EXPIRED – DO NOT CONSUME)",
                "valid_shelf": "குறிப்பிட்ட பயன்பாட்டு காலத்திற்குள் உள்ளது (Within stated shelf life)",
                "undetermined_shelf": "ஸ்கேன் செய்யப்பட்ட லேபிளிலிருந்து காலாவதி நிலையைத் தீர்மானிக்க முடியவில்லை.",
                "sugar_warn": "அதிக சர்க்கரை அறிவிப்பு: லேபிளில் {val} சர்க்கரை குறிப்பிடப்பட்டுள்ளது.",
                "sugar_cat": "சர்க்கரை உணர்திறன் & உணவு வழிகாட்டல்",
                "sugar_rec": "இந்த தயாரிப்பில் சர்க்கரை அளவு அதிகம். இரத்த சர்க்கரையை கட்டுப்படுத்துபவர்கள் மருத்துவரிடம் ஆலோசனை பெறவும்.",
                "caffeine_warn": "காஃபின் அல்லது தூண்டுதல் பொருட்கள் உள்ளன.",
                "caffeine_cat": "காஃபின் எச்சரிக்கை",
                "caffeine_rec": "இந்த தயாரிப்பில் காஃபின் உள்ளது. சிறு குழந்தைகளுக்கு ஏற்றதல்ல.",
                "child_warn": "பேக்கேஜில் வெளிப்படையான வயது வரம்பு எச்சரிக்கை உள்ளது.",
                "child_cat": "வயது வரம்பு",
                "child_rec": "லேபிளில் அச்சிடப்பட்ட உற்பத்தியாளரின் வயது கட்டுப்பாட்டு வழிகாட்டுதலைப் பின்பற்றவும்.",
                "allergen_cat": "ஒவ்வாமை விழிப்புணர்வு",
                "allergen_rec": "{allergens} இருப்பதாக அறிவிக்கப்பட்டுள்ளது. ஒவ்வாமை உள்ளவர்கள் கவனமாக சரிபார்க்கவும்.",
                "general_cat": "நுகர்வோர் வழிகாட்டல்",
                "general_rec": "வாங்குவதற்கு முன் பேக்கிங் சீல் மற்றும் காலாவதி தேதியை சரிபார்க்கவும். RDA அளவுகளை கவனிக்கவும்.",
                "ing_explicit": "பேக்கேஜில் வெளிப்படையாக அறிவிக்கப்பட்ட மூலப்பொருள் சதவீதங்கள் கீழே காட்டப்பட்டுள்ளன.",
                "ing_not_explicit": "ஸ்கேன் செய்யப்பட்ட பேக்கேஜில் மூலப்பொருள் சதவீதங்கள் வெளிப்படையாக அறிவிக்கப்படவில்லை.",
                "ing_none": "ஸ்கேன் செய்யப்பட்ட பேக்கேஜிலிருந்து மூலப்பொருள் தகவல்களை நம்பகத்தன்மையுடன் பெற முடியவில்லை.",
                "nutrition_none": "ஸ்கேன் செய்யப்பட்ட பேக்கேஜிலிருந்து நம்பகமான ஊட்டச்சத்து தகவல்களைப் பெற முடியவில்லை.",
                "no_age": "ஸ்கேன் செய்யப்பட்ட லேபிளில் குறிப்பிட்ட வயது வரம்பு ஏதும் கண்டறியப்படவில்லை.",
            },
            "kn": {
                "expired_warn": "⚠ ಅವಧಿ ಮುಗಿದ ಉತ್ಪನ್ನ — ಮುಕ್ತಾಯ ದಿನಾಂಕ: {exp}. ಸೇವಿಸಬೇಡಿ.",
                "expired_badge": "ಅವಧಿ ಮೀರಿದೆ – ಸೇವಿಸಬೇಡಿ (EXPIRED – DO NOT CONSUME)",
                "valid_shelf": "ನಿಗದಿತ ಅವಧಿಯೊಳಗೆ ಇದೆ (Within stated shelf life)",
                "undetermined_shelf": "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಲೇಬಲ್‌ನಿಂದ ಅವಧಿ ಮುಕ್ತಾಯದ ಸ್ಥಿತಿಯನ್ನು ನಿರ್ಧರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
                "sugar_warn": "ಹೆಚ್ಚಿನ ಸಕ್ಕರೆ ಪ್ರಮಾಣ: ಲೇಬಲ್‌ನಲ್ಲಿ {val} ಸಕ್ಕರೆ ಘೋಷಿಸಲಾಗಿದೆ.",
                "sugar_cat": "ಸಕ್ಕರೆ ಸಂವೇದನಾಶೀಲತೆ ಮತ್ತು ಆಹಾರ ಕಾಳಜಿ",
                "sugar_rec": "ಈ ಉತ್ಪನ್ನದಲ್ಲಿ ಸಕ್ಕರೆ ಪ್ರಮಾಣ ಹೆಚ್ಚಾಗಿದೆ. ಮಧುಮೇಹ ಇರುವವರು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ ಪರಿಶೀಲಿಸುವುದು ಸೂಕ್ತ.",
                "caffeine_warn": "ಕೆಫೀನ್ ಅಥವಾ ಉತ್ತೇಜಕ ಪದಾರ್ಥಗಳ ಘೋಷಣೆ ಇದೆ.",
                "caffeine_cat": "ಕೆಫೀನ್ ಎಚ್ಚರಿಕೆ",
                "caffeine_rec": "ಈ ಉತ್ಪನ್ನದಲ್ಲಿ ಕೆಫೀನ್ ಇದೆ. ಸಣ್ಣ ಮಕ್ಕಳಿಗೆ ಶಿಫಾರಸು ಮಾಡುವುದಿಲ್ಲ.",
                "child_warn": "ಪ್ಯಾಕೇಜ್ ಮೇಲೆ ವಯಸ್ಸಿನ ಮಿತಿ ನಿರ್ಬಂಧ ಘೋಷಿಸಲಾಗಿದೆ.",
                "child_cat": "ವಯಸ್ಸಿನ ಮಿತಿ",
                "child_rec": "ಲೇಬಲ್‌ನಲ್ಲಿ ಮುದ್ರಿಸಲಾದ ತಯಾರಕರ ವಯಸ್ಸಿನ ನಿರ್ಬಂಧವನ್ನು ಅನುಸರಿಸಿ.",
                "allergen_cat": "ಅಲರ್ಜಿ ಮಾಹಿತಿ",
                "allergen_rec": "{allergens} ಪದಾರ್ಥಗಳು ಕಂಡುಬಂದಿವೆ. ಅಲರ್ಜಿ ಸಮಸ್ಯೆ ಇರುವವರು ಎಚ್ಚರಿಕೆಯಿಂದ ಪರಿಶೀಲಿಸಿ.",
                "general_cat": "ಗ್ರಾಹಕ ಮಾರ್ಗದರ್ಶನ",
                "general_rec": "ಖರೀದಿಸುವ ಮುನ್ನ ಸೀಲ್ ಮತ್ತು ಅವಧಿ ಮುಕ್ತಾಯ ದಿನಾಂಕವನ್ನು ಪರಿಶೀಲಿಸಿ. RDA ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಗಮನಿಸಿ.",
                "ing_explicit": "ಪ್ಯಾಕೇಜ್‌ನಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಘೋಷಿಸಲಾದ ಪದಾರ್ಥಗಳ ಶೇಕಡಾವಾರು ಪ್ರಮಾಣವನ್ನು ಕೆಳಗೆ ನೀಡಲಾಗಿದೆ.",
                "ing_not_explicit": "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಪ್ಯಾಕೇಜ್‌ನಲ್ಲಿ ಪದಾರ್ಥಗಳ ಶೇಕಡಾವಾರು ಪ್ರಮಾಣವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಘೋಷಿಸಲಾಗಿಲ್ಲ.",
                "ing_none": "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಪ್ಯಾಕೇಜ್‌ನಿಂದ ಪದಾರ್ಥಗಳ ಮಾಹಿತಿಯನ್ನು ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ ಹೊರತೆಗೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
                "nutrition_none": "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಪ್ಯಾಕೇಜ್‌ನಿಂದ ಯಾವುದೇ ವಿಶ್ವಾಸಾರ್ಹ ಪೌಷ್ಟಿಕಾಂಶದ ಮಾಹಿತಿಯನ್ನು ಹೊರತೆಗೆಯಲಾಗಿಲ್ಲ.",
                "no_age": "ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ ಲೇಬಲ್‌ನಲ್ಲಿ ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ವಯಸ್ಸಿನ ಮಿತಿ ಕಂಡುಬಂದಿಲ್ಲ.",
            },
        }
        L = loc_texts.get(lang, loc_texts["en"])

        raw_text_str = raw_text or ""
        lines = [line.strip() for line in raw_text_str.split("\n") if line.strip()]

        # --------------------------------------------------------
        # 1. INGREDIENT EXTRACTION (Robust Multi-Lingual & Multi-Line)
        # --------------------------------------------------------
        ingredients_list: List[Dict[str, Any]] = []
        highest_ingredient = None
        has_explicit_percentages = False

        ing_text = ""

        # Check if already extracted into product_data (e.g. from Gemini or fusion)
        preset_ing = product_data.get("ingredients")
        if isinstance(preset_ing, str) and len(preset_ing.strip()) > 3 and preset_ing.lower() not in ("null", "none", "not detected"):
            ing_text = preset_ing.strip()
        elif isinstance(preset_ing, list) and len(preset_ing) > 0:
            if isinstance(preset_ing[0], dict) and preset_ing[0].get("name"):
                ingredients_list = preset_ing
            elif isinstance(preset_ing[0], str):
                ing_text = ", ".join(preset_ing)

        # If not pre-set, search through OCR text
        if not ing_text and not ingredients_list:
            # Multi-lingual ingredient header keywords
            header_pattern = re.compile(
                r"\b(?:ingredients?|composition|contents?|सामग्री|घटक|ಸಮಗ್ರತ|సంఘటనలు|பொருட்கள்|பொருளடக்கம்|ಪದಾರ್ಥಗಳು)\b",
                re.IGNORECASE
            )
            # Boundary markers where ingredient lists terminate
            stop_pattern = re.compile(
                r"\b(?:nutrit(?:ion|ional)|mrp|m\.r\.p|mfg|manufactur|packed|pkd|batch|b\.no|net\s*(?:qty|weight)|customer|care|helpline|fssai|lic|store\s+in|allergen|best\s+before|use\s+by)\b",
                re.IGNORECASE
            )

            # Try strict single block regex first
            match = re.search(
                r"(?:ingredients?|composition|contents?|सामग्री|घटक)\s*[:\-]?\s*(.*?)(?=\b(?:nutrit|mrp|mfg|packed|batch|net qty|customer|store in|allergen|best before)\b|$)",
                raw_text_str,
                re.IGNORECASE | re.DOTALL
            )
            if match and len(match.group(1).strip()) > 3:
                ing_text = match.group(1).strip()
            else:
                # Multi-line state machine
                capturing = False
                captured_lines = []
                for line in lines:
                    if header_pattern.search(line):
                        capturing = True
                        # Strip the header word itself from this line
                        cleaned_line = header_pattern.sub("", line).strip(" :-–—")
                        if cleaned_line:
                            captured_lines.append(cleaned_line)
                        continue
                    if capturing:
                        if stop_pattern.search(line):
                            break
                        captured_lines.append(line)
                        if len(captured_lines) >= 8:  # Cap to prevent unbounded capture
                            break
                if captured_lines:
                    ing_text = " ".join(captured_lines)

        # Process parsed ingredient text if ingredients_list not already built
        if ing_text and not ingredients_list:
            # Clean up introductory labels
            ing_text_clean = re.sub(r"^(?:ingredients?|composition|contents?|सामग्री|घटक)[:\-]?\s*", "", ing_text, flags=re.IGNORECASE).strip()
            # Split on commas, semicolons, bullets, or newlines, but preserve percentages inside parentheses
            raw_items = re.split(r"[,;•·\n]+", ing_text_clean)
            idx = 1
            for item in raw_items:
                item_clean = item.strip()
                if not item_clean or len(item_clean) < 2 or len(item_clean) > 80:
                    continue
                # Skip pure header words
                if item_clean.lower() in ("ingredients", "ingredients:", "contains", "contents", "सामग्री", "घटक"):
                    continue

                # Detect explicitly printed percentage (e.g. "70%", "20.5 %")
                pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", item_clean)
                pct_val = None
                pct_str = None
                if pct_match:
                    has_explicit_percentages = True
                    try:
                        pct_val = float(pct_match.group(1))
                        pct_str = f"{pct_val}%"
                    except ValueError:
                        pass

                name_clean = re.sub(r"\(\s*\d+(?:\.\d+)?\s*%\s*\)", "", item_clean)
                name_clean = re.sub(r"\d+(?:\.\d+)?\s*%", "", name_clean).strip(" -:–—()")

                if name_clean and len(name_clean) >= 2:
                    entry = {
                        "order": idx,
                        "name": name_clean,
                        "percentage": pct_str,
                        "percentage_value": pct_val,
                    }
                    ingredients_list.append(entry)
                    idx += 1

        # Check explicit percentages status on ingredients_list
        if ingredients_list:
            pct_items = [i for i in ingredients_list if i.get("percentage_value") is not None]
            if pct_items:
                has_explicit_percentages = True
                highest_item = max(pct_items, key=lambda x: x["percentage_value"])
                highest_ingredient = f"{highest_item['name']} — {highest_item['percentage']}"

        # --------------------------------------------------------
        # 2. NUTRITION EXTRACTION (Per 100g / Per Serving Values)
        # --------------------------------------------------------
        nutrition: Dict[str, Any] = {}
        combined_text = raw_text_str + " " + str(product_data)

        nutri_patterns = {
            "energy": r"(?:energy|calories|kcal)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:kcal|kj)?)",
            "carbohydrates": r"(?:carbohydrates?|total carbs?|carbs?)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "sugars": r"(?:total\s+)?sugars?\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "added_sugars": r"(?:added\s+sugars?)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "protein": r"(?:protein)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "total_fat": r"(?:total\s+fat|fat)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "saturated_fat": r"(?:saturated\s+fat)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "trans_fat": r"(?:trans\s+fat)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "sodium": r"(?:sodium|salt)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:mg|g)?)",
            "dietary_fiber": r"(?:dietary\s+fiber|fiber|fibre)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:g|mg)?)",
            "calcium": r"(?:calcium)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:mg|g)?)",
            "iron": r"(?:iron)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:mg|g)?)",
        }

        for key, pat in nutri_patterns.items():
            m = re.search(pat, combined_text, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                if val:
                    nutrition[key] = val

        # --------------------------------------------------------
        # 3. STRICT DATE & SHELF LIFE EVALUATION
        # --------------------------------------------------------
        expiry_val = product_data.get("expiry_date") or product_data.get("use_by") or product_data.get("best_before")
        is_expired = False
        expiry_status = "UNDETERMINED"
        parsed_exp_date = None

        if expiry_val and str(expiry_val).lower() not in ("null", "none", "not detected", "not clearly printed", ""):
            date_patterns = [
                r"(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/-]+(\d{2,4})",
                r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})",
                r"([A-Za-z]{3,9})[\s/-]+(\d{2,4})",
                r"(\d{1,2})[.](\d{1,2})[.](\d{2,4})",
            ]
            month_map = {
                "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
                "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
                "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
                "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
            }
            today = date.today()

            for dp in date_patterns:
                dm = re.search(dp, str(expiry_val))
                if dm:
                    try:
                        groups = dm.groups()
                        if len(groups) == 3:
                            p1, p2, p3 = groups
                            year = int(p3) if len(p3) == 4 else int("20" + p3)
                            month = int(p2) if p2.isdigit() else month_map.get(p2.lower(), 1)
                            day = int(p1)
                            d_obj = date(year, month, day)
                            parsed_exp_date = d_obj.strftime("%d-%b-%Y")
                            if d_obj < today:
                                is_expired = True
                                expiry_status = "EXPIRED"
                            else:
                                is_expired = False
                                expiry_status = "VALID"
                            break
                        elif len(groups) == 2:
                            m_str, y_str = groups
                            year = int(y_str) if len(y_str) == 4 else int("20" + y_str)
                            month = month_map.get(m_str.lower(), 1)
                            d_obj = date(year, month, 28)
                            parsed_exp_date = f"{m_str.capitalize()} {year}"
                            if d_obj < today:
                                is_expired = True
                                expiry_status = "EXPIRED"
                            else:
                                is_expired = False
                                expiry_status = "VALID"
                            break
                    except Exception:
                        pass

        if not parsed_exp_date:
            parsed_exp_date = str(expiry_val) if (expiry_val and str(expiry_val).lower() not in ("null", "none", "not detected")) else None
            is_expired = False
            expiry_status = "UNDETERMINED"

        # --------------------------------------------------------
        # 4. ALLERGEN DETECTION
        # --------------------------------------------------------
        allergens_detected = []
        common_allergens = [
            "milk", "peanut", "peanuts", "tree nut", "tree nuts", "almond", "cashew",
            "walnut", "soy", "soya", "wheat", "gluten", "egg", "eggs", "fish", "shellfish", "sesame"
        ]
        allergen_section = re.search(r"(?:contains|allergen(?:s)?|may contain)\s*[:\-]?\s*([^\.\n]+)", combined_text, re.IGNORECASE)
        search_target = allergen_section.group(1).lower() if allergen_section else combined_text.lower()

        for a in common_allergens:
            if re.search(r"\b" + re.escape(a) + r"s?\b", search_target):
                base_name = a[:-1] if a.endswith("s") and not a.endswith("ss") else a
                name_fmt = base_name.capitalize()
                if name_fmt not in allergens_detected:
                    allergens_detected.append(name_fmt)

        # --------------------------------------------------------
        # 5. LOCALIZED WARNINGS & CONSUMER RECOMMENDATIONS
        # --------------------------------------------------------
        warnings: List[str] = []
        recommendations: List[Dict[str, str]] = []

        if is_expired and parsed_exp_date:
            warnings.append(L["expired_warn"].format(exp=parsed_exp_date))

        # Check for high sugar in nutrition
        sugar_str = nutrition.get("sugars") or nutrition.get("added_sugars")
        if sugar_str:
            num_m = re.search(r"(\d+(?:\.\d+)?)", sugar_str)
            if num_m and float(num_m.group(1)) >= 12.0:
                warnings.append(L["sugar_warn"].format(val=sugar_str))
                recommendations.append({
                    "category": L["sugar_cat"],
                    "text": L["sugar_rec"],
                })

        # Check for caffeine
        if re.search(r"\b(?:caffeine|caffeinated|taurine)\b", combined_text, re.IGNORECASE):
            warnings.append(L["caffeine_warn"])
            recommendations.append({
                "category": L["caffeine_cat"],
                "text": L["caffeine_rec"],
            })

        # Check for child restriction
        if re.search(r"\b(?:not suitable for (?:infants|children|babies))\b", combined_text, re.IGNORECASE):
            warnings.append(L["child_warn"])
            recommendations.append({
                "category": L["child_cat"],
                "text": L["child_rec"],
            })

        if allergens_detected:
            recommendations.append({
                "category": L["allergen_cat"],
                "text": L["allergen_rec"].format(allergens=", ".join(allergens_detected)),
            })

        recommendations.append({
            "category": L["general_cat"],
            "text": L["general_rec"],
        })

        # Set localized notes
        if not ingredients_list:
            ingredient_note = L["ing_none"]
        elif has_explicit_percentages:
            ingredient_note = L["ing_explicit"]
        else:
            ingredient_note = L["ing_not_explicit"]

        nutrition_note = L["nutrition_none"] if not nutrition else None

        return {
            "ingredients": ingredients_list,
            "has_explicit_percentages": has_explicit_percentages,
            "highest_ingredient": highest_ingredient,
            "ingredient_note": ingredient_note,
            "nutrition_data": nutrition,
            "nutrition_note": nutrition_note,
            "is_expired": is_expired,
            "expiry_status": expiry_status,
            "expiry_badge": L["expired_badge"] if is_expired else (L["valid_shelf"] if expiry_status == "VALID" else L["undetermined_shelf"]),
            "parsed_exp_date": parsed_exp_date,
            "allergens": allergens_detected,
            "warnings": warnings,
            "recommendations": recommendations,
        }

    # ============================================================
    # CONSUMER SCAN EXECUTION & PERSISTENCE
    # ============================================================

    @staticmethod
    def process_consumer_scan(
        consumer_user_id: str,
        image_bytes: bytes,
        filename: str,
        location: Optional[Dict[str, Any]] = None,
        barcode: Optional[str] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Executes OCR and compliance analysis, stores in consumer_scans,
        and automatically raises an alert in consumer_scan_issues IF and ONLY IF
        a confirmed, definite FAIL rule occurs. Does NOT alert on REVIEW.
        """
        scan_id = str(uuid.uuid4())
        today_str = datetime.now().strftime("%Y%m%d")

        # Check Analysis Cache for deterministic SHA-256 image match
        from app.services.analysis_cache_service import analysis_cache_service
        image_hash = analysis_cache_service.compute_image_hash(image_bytes)
        cached_analysis = analysis_cache_service.get_cached_analysis_sync(image_hash)
        is_cache_hit = False

        if cached_analysis:
            print(f"\n[CONSUMER SCAN - CACHE HIT] Reusing analysis for image hash: {image_hash[:12]}...")
            is_cache_hit = True
            extracted_text = cached_analysis.get("text", [])
            ocr_blocks = cached_analysis.get("ocr_details", [])
            raw_text = "\n".join(extracted_text)
            visual_analysis = cached_analysis.get("visual_analysis", {})
            paddle_fields = cached_analysis.get("paddle_data", {})
            gemini_data = cached_analysis.get("gemini_data", None)
            product_data = cached_analysis.get("product_data", {})
            applicability = cached_analysis.get("applicability", {})
            compliance_eval = cached_analysis.get("compliance", {})
            cached_proc_img = cached_analysis.get("processed_image")
            if cached_proc_img and os.path.exists(cached_proc_img):
                processed_path = cached_proc_img
            else:
                processed_path = temp_path
        else:
            # 1. Run existing Image Preprocessing & PaddleOCR pipeline
            temp_dir = os.path.join("uploads", "consumer_temp")
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, f"{scan_id}_{filename}")
            processed_path = temp_path

            with open(temp_path, "wb") as f:
                f.write(image_bytes)

            # Image preprocessing
            try:
                processed_path = image_preprocessor.process(temp_path)
            except Exception as pe:
                print(f"Notice: Image preprocessing fallback: {pe}")
                processed_path = temp_path

            # OCR extraction via PaddleOCR
            ocr_blocks: List[Dict[str, Any]] = []
            try:
                res_blocks = ocr_service.extract_text(processed_path)
                if isinstance(res_blocks, list):
                    ocr_blocks = res_blocks
            except Exception as e:
                print(f"Notice: OCR extract error: {e}")
                ocr_blocks = []

            extracted_text = [
                item.get("text", "")
                for item in ocr_blocks
                if isinstance(item, dict) and item.get("text")
            ]
            raw_text = "\n".join(extracted_text)

            # Visual compliance analysis
            visual_analysis = {}
            try:
                visual_analyzer = VisualComplianceAnalyzer()
                visual_analysis = visual_analyzer.analyze(
                    ocr_details=ocr_blocks,
                    image_path=processed_path,
                )
                if not isinstance(visual_analysis, dict):
                    visual_analysis = {}
            except Exception as ve:
                print(f"Notice: Visual analysis error: {ve}")
                visual_analysis = {}

            # 2. Extract fields via field_extractor & Gemini Vision
            paddle_fields: Dict[str, Any] = {}
            try:
                paddle_fields = field_extractor.extract(
                    extracted_text,
                    ocr_blocks,
                )
                if not isinstance(paddle_fields, dict):
                    paddle_fields = {}
            except Exception as fe:
                print(f"Notice: Field extractor error: {fe}")
                paddle_fields = {}

            gemini_data = None
            try:
                gemini_data = gemini_vision_service.extract_product_data(
                    image_path=temp_path,
                    ocr_results=ocr_blocks,
                )
            except Exception as ge:
                print(f"Notice: Gemini extract error: {ge}")

            # Extraction fusion (merge)
            product_data: Dict[str, Any] = {}
            try:
                product_data = extraction_fusion.merge(
                    paddle_data=paddle_fields,
                    gemini_data=gemini_data,
                )
                if not isinstance(product_data, dict):
                    product_data = paddle_fields or {}
            except Exception as me:
                print(f"Notice: Extraction fusion error: {me}")
                product_data = paddle_fields or {}

            # OCR field recovery
            try:
                recovered = ocr_field_recovery.recover(
                    product_data=product_data,
                    ocr_results=ocr_blocks,
                )
                if isinstance(recovered, dict):
                    product_data = recovered
            except Exception as re:
                print(f"Notice: OCR recovery error: {re}")

            # 3. Evaluate Legal Metrology compliance using existing engine (INTERNAL ONLY)
            applicability: Dict[str, Any] = {}
            try:
                applicability = applicability_engine.determine(
                    product_data=product_data,
                    ocr_text=extracted_text,
                )
                if not isinstance(applicability, dict):
                    applicability = {}
            except Exception as ae:
                print(f"Notice: Applicability error: {ae}")
                applicability = {}

            compliance_eval: Dict[str, Any] = {}
            try:
                compliance_eval = compliance_engine.evaluate(
                    product_data=product_data,
                    applicability_result=applicability,
                    ocr_results=ocr_blocks,
                    visual_analysis=visual_analysis,
                )
                if not isinstance(compliance_eval, dict):
                    compliance_eval = {}
            except Exception as ce:
                print(f"Notice: Compliance engine error: {ce}")
                compliance_eval = {}

            # Persist completed analysis to shared cache
            if compliance_eval and isinstance(compliance_eval, dict):
                try:
                    cache_payload = {
                        "text": extracted_text,
                        "ocr_details": ocr_blocks,
                        "visual_analysis": visual_analysis,
                        "paddle_data": paddle_fields,
                        "gemini_data": gemini_data,
                        "gemini_error": None,
                        "product_data": product_data,
                        "recovered_fields": [],
                        "applicability": applicability,
                        "compliance": compliance_eval,
                        "processed_image": processed_path,
                    }
                    product_name = (
                        product_data.get("product_name")
                        if isinstance(product_data, dict)
                        else None
                    )
                    analysis_cache_service.set_cached_analysis_sync(
                        image_hash=image_hash,
                        product_name=product_name,
                        analysis_data=cache_payload,
                    )
                except Exception as cache_err:
                    print(f"[CONSUMER CACHE WRITE NOTICE] {cache_err}")


        overall_status = compliance_eval.get("overall_status", "REVIEW")
        score = compliance_eval.get("compliance_score")
        if score is None:
            score = compliance_eval.get("score", 0.0)
        rules = compliance_eval.get("results", [])

        # 4. Extract consumer-specific nutrition, ingredients, expiry, warnings in requested language
        consumer_meta = ConsumerService.extract_nutrition_and_ingredients(raw_text, product_data, language=language)

        # 5. Upload image to Supabase Storage: consumer-scans/{consumer_user_id}/{scan_id}/original.jpg
        storage_path = f"{consumer_user_id}/{scan_id}/{filename}"
        image_url = ""
        try:
            image_url = SupabaseService.upload_file(
                bucket_name="consumer-scans",
                file_path=storage_path,
                content=image_bytes,
                content_type="image/jpeg",
            )
        except Exception as se:
            print(f"Notice: Supabase storage upload: {se}")
            image_url = f"/uploads/consumer_temp/{scan_id}_{filename}"

        # 6. Barcode & license extraction
        detected_barcode = barcode or product_data.get("barcode") or "Not Detected"
        fssai_license = product_data.get("fssai_license") or product_data.get("license_number") or "Not Detected"

        # 7. Persist to consumer_scans table
        pname = product_data.get("product_name") or "Packaged Commodity"
        pcategory = product_data.get("product_category") or product_data.get("category") or "Packaged Commodity"
        pcontact = product_data.get("consumer_contact") or product_data.get("consumer_care") or "Not Detected"
        pmarketed = product_data.get("marketed_by") or "Not Detected"
        porigin = product_data.get("country_of_origin") or "India"

        # Resolve foreign key: ensure consumer_user_id matches consumer_users(id)
        resolved_consumer_user_id = consumer_user_id
        try:
            u_res = supabase.table("consumer_users").select("id").eq("id", consumer_user_id).limit(1).execute()
            if not u_res.data:
                auth_res = supabase.table("consumer_users").select("id").eq("auth_user_id", consumer_user_id).limit(1).execute()
                if auth_res.data:
                    resolved_consumer_user_id = auth_res.data[0]["id"]
        except Exception as u_err:
            print(f"Notice: consumer user id verification: {u_err}")

        scan_record = {
            "id": scan_id,
            "consumer_user_id": resolved_consumer_user_id,
            "product_name": pname,
            "category": pcategory,
            "brand": product_data.get("brand") or product_data.get("manufacturer_or_packer") or "Not Detected",
            "barcode": detected_barcode,
            "manufacturer": product_data.get("manufacturer_or_packer") or "Not Detected",
            "marketed_by": pmarketed,
            "country_of_origin": porigin,
            "consumer_contact": pcontact,
            "manufacturing_date": product_data.get("manufactured_on") or product_data.get("date_of_manufacture") or "Not Detected",
            "packed_on": product_data.get("packed_on") or "Not Detected",
            "expiry_date": consumer_meta.get("parsed_exp_date") or "Not Detected",
            "best_before": product_data.get("best_before") or "Not Detected",
            "batch_number": product_data.get("batch_number") or "Not Detected",
            "mrp": product_data.get("mrp") or "Not Detected",
            "net_quantity": product_data.get("net_quantity") or "Not Detected",
            "ingredients": consumer_meta.get("ingredients", []),
            "has_explicit_percentages": consumer_meta.get("has_explicit_percentages", False),
            "ingredient_note": consumer_meta.get("ingredient_note"),
            "highest_ingredient": consumer_meta.get("highest_ingredient"),
            "nutrition_data": consumer_meta.get("nutrition_data", {}),
            "allergens": consumer_meta.get("allergens", []),
            "warnings": consumer_meta.get("warnings", []),
            "recommendations": consumer_meta.get("recommendations", []),
            "legal_compliance_status": overall_status,
            "compliance_score": score,
            "compliance_details": {
                "summary": compliance_eval.get("summary", {}),
                "total_rules": len(rules),
                "has_fail": overall_status == "FAIL",
                "allergens": consumer_meta.get("allergens", []),
                "expiry_status": consumer_meta.get("expiry_status"),
            },
            "image_storage_path": storage_path,
            "language": language,
            "created_at": datetime.now().isoformat(),
        }
        _RECENT_CONSUMER_SCANS[scan_id] = scan_record

        try:
            supabase.table("consumer_scans").insert(scan_record).execute()
        except Exception as e:
            print(f"Notice: consumer_scans table insert: {e}")

        # 8. NON-COMPLIANCE ALERT: ONLY if there are confirmed FAIL rules, create consumer_scan_issues record for Admin
        # Explicit Rule: Do NOT alert if status is REVIEW, NOT_APPLICABLE, OUT_OF_SCOPE, or PASS.
        failed_rules = [r for r in rules if str(r.get("status", "")).upper() == "FAIL"]
        has_definite_fail = len(failed_rules) > 0 or overall_status == "FAIL"

        if has_definite_fail and overall_status not in ("REVIEW", "NOT_APPLICABLE", "OUT_OF_SCOPE", "PASS"):
            priority = "HIGH"
            for fr in failed_rules:
                if "critical" in str(fr.get("severity", "")).lower() or fr.get("mandatory"):
                    priority = "CRITICAL"
                    break

            loc_lat = location.get("latitude") if location else None
            loc_lng = location.get("longitude") if location else None
            loc_acc = location.get("accuracy") if location else None
            loc_addr = location.get("address") if location else None

            issue_record = {
                "consumer_scan_id": scan_id,
                "consumer_user_id": resolved_consumer_user_id,
                "product_name": pname,
                "barcode": detected_barcode,
                "license_number": fssai_license,
                "manufacturer": product_data.get("manufacturer_or_packer") or "Not Detected",
                "rule_status": "FAIL",
                "failed_rules": failed_rules,
                "priority": priority,
                "location_latitude": loc_lat,
                "location_longitude": loc_lng,
                "location_accuracy": loc_acc,
                "location_address": loc_addr,
                "image_storage_path": storage_path,
                "status": "NEW",
                "admin_notes": "",
                "created_at": datetime.now().isoformat(),
            }

            try:
                supabase.table("consumer_scan_issues").insert(issue_record).execute()
                print("Internal Admin alert generated for non-compliant consumer scan:", scan_id)
            except Exception as ie:
                print(f"Notice: consumer_scan_issues insert: {ie}")

        # Clean up local temporary files safely
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if processed_path and processed_path != temp_path and os.path.exists(processed_path):
                os.remove(processed_path)
        except Exception:
            pass

        # Return consumer-facing result (enforcement metrics are hidden from Citizen)
        return {
            "id": scan_id,
            "product_name": pname,
            "category": pcategory,
            "brand": scan_record["brand"],
            "barcode": detected_barcode,
            "manufacturer": scan_record["manufacturer"],
            "marketed_by": pmarketed,
            "country_of_origin": porigin,
            "consumer_contact": pcontact,
            "manufacturing_date": scan_record["manufacturing_date"],
            "packed_on": scan_record["packed_on"],
            "expiry_date": scan_record["expiry_date"],
            "best_before": scan_record["best_before"],
            "batch_number": scan_record["batch_number"],
            "mrp": scan_record["mrp"],
            "net_quantity": scan_record["net_quantity"],
            "fssai_license": fssai_license,
            "expiry_status": consumer_meta.get("expiry_status"),
            "is_expired": consumer_meta.get("is_expired"),
            "ingredients": consumer_meta.get("ingredients"),
            "has_explicit_percentages": consumer_meta.get("has_explicit_percentages"),
            "ingredient_note": consumer_meta.get("ingredient_note"),
            "highest_ingredient": consumer_meta.get("highest_ingredient"),
            "nutrition_data": consumer_meta.get("nutrition_data"),
            "allergens": consumer_meta.get("allergens"),
            "warnings": consumer_meta.get("warnings"),
            "recommendations": consumer_meta.get("recommendations"),
            "image_url": image_url,
            "language": language,
            "created_at": scan_record["created_at"],
            "cached": is_cache_hit,
        }

    # ============================================================
    # CONSUMER SCANS QUERY
    # ============================================================

    @staticmethod
    def get_consumer_scans(consumer_user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Retrieves historical scans performed by the logged-in consumer.
        """
        try:
            res = (
                supabase.table("consumer_scans")
                .select("*")
                .eq("consumer_user_id", consumer_user_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            if res.data:
                return res.data
        except Exception as e:
            print(f"Notice: get_consumer_scans: {e}")

        # Fallback to in-memory scans
        matching = [
            s for s in _RECENT_CONSUMER_SCANS.values()
            if s.get("consumer_user_id") == consumer_user_id or consumer_user_id in (s.get("consumer_user_id"), "")
        ]
        return matching[offset:offset + limit]

    @staticmethod
    def get_consumer_scan_detail(scan_id: str, consumer_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a specific scan for the consumer with strict ownership check.
        """
        try:
            res = (
                supabase.table("consumer_scans")
                .select("*")
                .eq("id", scan_id)
                .limit(1)
                .execute()
            )
            if res.data:
                scan = res.data[0]
                # Enforce security: verify ownership
                owner_id = scan.get("consumer_user_id")
                if owner_id and owner_id != consumer_user_id:
                    print(f"Security block: consumer {consumer_user_id} attempted to view scan {scan_id} belonging to {owner_id}")
                    return None
                img_path = scan.get("image_storage_path")
                if img_path:
                    scan["image_url"] = SupabaseService.get_file_url("consumer-scans", img_path)
                return scan
        except Exception as e:
            print(f"Notice: get_consumer_scan_detail: {e}")

        # Fallback to in-memory cache
        if scan_id in _RECENT_CONSUMER_SCANS:
            mem_scan = _RECENT_CONSUMER_SCANS[scan_id]
            owner_id = mem_scan.get("consumer_user_id")
            if owner_id and owner_id != consumer_user_id:
                return None
            return mem_scan
        return None

    # ============================================================
    # CONSUMER ISSUE REPORTING
    # ============================================================

    @staticmethod
    def submit_issue(
        consumer_user_id: str,
        category: str = "GENERAL_COMPLAINT",
        product_name: str = "Packaged Product",
        description: str = "",
        photo_bytes: Optional[bytes] = None,
        photo_filename: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        audio_filename: Optional[str] = None,
        barcode: Optional[str] = None,
        lot_number: Optional[str] = None,
        location: Optional[Dict[str, Any]] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Stores user-reported issue with photo, voice note, and location.
        Initializes community confirmation tracking and priority.
        """
        issue_id = str(uuid.uuid4())
        photo_path = None
        audio_path = None
        photo_url = None
        audio_url = None

        if photo_bytes and photo_filename:
            photo_path = f"{consumer_user_id}/{issue_id}/evidence_{photo_filename}"
            try:
                photo_url = SupabaseService.upload_file("consumer-issues", photo_path, photo_bytes, "image/jpeg")
            except Exception as pe:
                print(f"Notice: photo upload: {pe}")
                photo_url = f"/uploads/consumer_temp/{issue_id}_{photo_filename}"

        if audio_bytes and audio_filename:
            audio_path = f"{consumer_user_id}/{issue_id}/voice_{audio_filename}"
            try:
                audio_url = SupabaseService.upload_file("consumer-issues", audio_path, audio_bytes, "audio/webm")
            except Exception as ae:
                print(f"Notice: audio upload: {ae}")

        loc_lat = location.get("latitude") if location else None
        loc_lng = location.get("longitude") if location else None
        loc_acc = location.get("accuracy") if location else None
        loc_addr = location.get("address") if location else None

        issue_record = {
            "id": issue_id,
            "consumer_user_id": consumer_user_id,
            "category": category or "GENERAL_COMPLAINT",
            "product_name": product_name or "Reported Package",
            "description": description,
            "barcode": barcode or "",
            "lot_number": lot_number or "",
            "image_storage_path": photo_path,
            "audio_storage_path": audio_path,
            "location_latitude": loc_lat,
            "location_longitude": loc_lng,
            "location_accuracy": loc_acc,
            "location_address": loc_addr,
            "confirmations_count": 1,
            "confirmed_by_users": [consumer_user_id],
            "priority": "LOW",
            "status": "SUBMITTED",
            "language": language or "en",
            "is_public": True,
            "admin_notes": "",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        # Cache in memory
        cached_record = dict(issue_record)
        if photo_url:
            cached_record["image_url"] = photo_url
        if audio_url:
            cached_record["audio_url"] = audio_url
        _RECENT_CONSUMER_ISSUES[issue_id] = cached_record

        try:
            res = supabase.table("consumer_issues").insert(issue_record).execute()
            if res.data:
                saved = res.data[0]
                if photo_url:
                    saved["image_url"] = photo_url
                return saved
        except Exception as e:
            print(f"Notice: consumer_issues insert (using cached): {e}")

        return cached_record

    @staticmethod
    def get_consumer_issues(consumer_user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Retrieves issues submitted by the logged-in consumer.
        """
        try:
            res = (
                supabase.table("consumer_issues")
                .select("*")
                .eq("consumer_user_id", consumer_user_id)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            if res.data:
                for item in res.data:
                    if item.get("image_storage_path") and not item.get("image_url"):
                        item["image_url"] = SupabaseService.get_file_url("consumer-issues", item["image_storage_path"])
                return res.data
        except Exception as e:
            print(f"Notice: get_consumer_issues: {e}")

        matching = [
            i for i in _RECENT_CONSUMER_ISSUES.values()
            if i.get("consumer_user_id") == consumer_user_id or not consumer_user_id
        ]
        return matching[offset:offset + limit]

    @staticmethod
    def get_consumer_issue_detail(issue_id: str, consumer_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves detail of a single issue submitted by the consumer.
        """
        try:
            res = (
                supabase.table("consumer_issues")
                .select("*")
                .eq("id", issue_id)
                .limit(1)
                .execute()
            )
            if res.data:
                item = res.data[0]
                if item.get("image_storage_path"):
                    item["image_url"] = SupabaseService.get_file_url("consumer-issues", item["image_storage_path"])
                if item.get("audio_storage_path"):
                    item["audio_url"] = SupabaseService.get_file_url("consumer-issues", item["audio_storage_path"])
                return item
        except Exception as e:
            print(f"Notice: get_consumer_issue_detail: {e}")

        return _RECENT_CONSUMER_ISSUES.get(issue_id)

    # ============================================================
    # COMMUNITY ISSUE FEED & UPVOTES (PRIVACY-PRESERVED)
    # ============================================================

    @staticmethod
    def get_community_feed(
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: float = 50.0,
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves nearby / community issues reported by citizens.
        CRITICAL PRIVACY RULES:
        - NEVER exposes citizen personal details (email, phone, user_id, auth_user_id).
        - Anonymizes exact location to neighborhood or 'Nearby / Local Area'.
        - Provides confirmation counts and priority status.
        """
        import math

        raw_items: List[Dict[str, Any]] = []
        try:
            res = (
                supabase.table("consumer_issues")
                .select("id, product_name, description, category, barcode, lot_number, image_storage_path, location_latitude, location_longitude, location_address, confirmations_count, priority, status, created_at")
                .order("created_at", desc=True)
                .limit(100)
                .execute()
            )
            if res.data:
                raw_items = res.data
        except Exception as e:
            print(f"Notice: get_community_feed Supabase fetch: {e}")

        # Combine with in-memory recent issues
        seen_ids = {item["id"] for item in raw_items}
        for mem_id, mem_item in _RECENT_CONSUMER_ISSUES.items():
            if mem_id not in seen_ids:
                raw_items.append({
                    "id": mem_id,
                    "product_name": mem_item.get("product_name"),
                    "description": mem_item.get("description"),
                    "category": mem_item.get("category"),
                    "barcode": mem_item.get("barcode"),
                    "lot_number": mem_item.get("lot_number"),
                    "image_storage_path": mem_item.get("image_storage_path"),
                    "image_url": mem_item.get("image_url"),
                    "location_latitude": mem_item.get("location_latitude"),
                    "location_longitude": mem_item.get("location_longitude"),
                    "location_address": mem_item.get("location_address"),
                    "confirmations_count": mem_item.get("confirmations_count", 1),
                    "priority": mem_item.get("priority", "LOW"),
                    "status": mem_item.get("status", "SUBMITTED"),
                    "created_at": mem_item.get("created_at"),
                })

        sanitized_feed: List[Dict[str, Any]] = []

        def calc_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            r = 6371.0
            d_lat = math.radians(lat2 - lat1)
            d_lon = math.radians(lon2 - lon1)
            a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return r * c

        for item in raw_items:
            item_lat = item.get("location_latitude")
            item_lng = item.get("location_longitude")
            dist = None

            if latitude is not None and longitude is not None and item_lat is not None and item_lng is not None:
                try:
                    dist = calc_distance_km(float(latitude), float(longitude), float(item_lat), float(item_lng))
                except Exception:
                    dist = None

            # Derive safe public location label
            addr = item.get("location_address")
            if addr and isinstance(addr, str) and len(addr) > 2:
                # Truncate address to just city/area or general vicinity
                parts = [p.strip() for p in addr.split(",") if p.strip()]
                loc_label = parts[-2] if len(parts) >= 2 else (parts[0] if parts else "Nearby / Local Area")
            elif dist is not None:
                loc_label = f"Nearby (~{round(dist, 1)} km)"
            else:
                loc_label = "Nearby / Local Area"

            # Resolve image URL safely
            img_url = item.get("image_url")
            if not img_url and item.get("image_storage_path"):
                try:
                    img_url = SupabaseService.get_file_url("consumer-issues", item["image_storage_path"])
                except Exception:
                    pass

            conf_count = item.get("confirmations_count") or 1
            priority = item.get("priority") or ("HIGH" if conf_count >= 10 else ("MEDIUM" if conf_count >= 5 else "LOW"))

            sanitized_feed.append({
                "id": str(item["id"]),
                "product_name": item.get("product_name") or "Packaged Commodity",
                "description": item.get("description") or "",
                "category": item.get("category") or "Product Issue",
                "barcode": item.get("barcode") or "",
                "lot_number": item.get("lot_number") or "",
                "image_url": img_url,
                "location_label": loc_label,
                "distance_km": round(dist, 1) if dist is not None else None,
                "confirmations_count": conf_count,
                "priority": priority,
                "status": item.get("status", "SUBMITTED"),
                "created_at": item.get("created_at"),
            })

        # Sort feed: prioritize high confirmations and proximity
        sanitized_feed.sort(
            key=lambda x: (
                0 if x["priority"] == "HIGH" else (1 if x["priority"] == "MEDIUM" else 2),
                -x["confirmations_count"],
                x["distance_km"] if x["distance_km"] is not None else 99999,
            )
        )

        return sanitized_feed[:limit]

    @staticmethod
    def confirm_community_issue(issue_id: str, consumer_user_id: str) -> Dict[str, Any]:
        """
        Increments confirmation count for an issue ("Raise Alert" / "Confirm Issue").
        Prevents abuse by verifying the user hasn't already confirmed this issue.
        Dynamically adjusts priority based on configurable thresholds:
        - 1-4 reports: LOW
        - 5-9 confirmations: MEDIUM
        - 10+ confirmations: HIGH
        """
        # 1. Fetch current issue
        target_issue = None
        try:
            res = supabase.table("consumer_issues").select("*").eq("id", issue_id).limit(1).execute()
            if res.data:
                target_issue = res.data[0]
        except Exception as e:
            print(f"Notice: confirm_community_issue fetch: {e}")

        if not target_issue and issue_id in _RECENT_CONSUMER_ISSUES:
            target_issue = _RECENT_CONSUMER_ISSUES[issue_id]

        if not target_issue:
            raise ValueError("Issue report not found")

        # 2. Check for duplicate confirmation abuse
        confirmed_by = target_issue.get("confirmed_by_users") or []
        if isinstance(confirmed_by, str):
            try:
                import json
                confirmed_by = json.loads(confirmed_by)
            except Exception:
                confirmed_by = []

        if consumer_user_id in confirmed_by:
            raise ValueError("You have already confirmed this issue.")

        # 3. Increment confirmations and recalculate priority
        new_count = int(target_issue.get("confirmations_count") or 1) + 1
        confirmed_by.append(consumer_user_id)

        if new_count >= 10:
            new_priority = "HIGH"
        elif new_count >= 5:
            new_priority = "MEDIUM"
        else:
            new_priority = "LOW"

        update_payload = {
            "confirmations_count": new_count,
            "confirmed_by_users": confirmed_by,
            "priority": new_priority,
            "updated_at": datetime.now().isoformat(),
        }

        # Update in-memory cache
        if issue_id in _RECENT_CONSUMER_ISSUES:
            _RECENT_CONSUMER_ISSUES[issue_id].update(update_payload)

        # Update Supabase
        try:
            supabase.table("consumer_issues").update(update_payload).eq("id", issue_id).execute()
            print(f"Community issue {issue_id} confirmed by user {consumer_user_id}. Count: {new_count}, Priority: {new_priority}")
        except Exception as se:
            print(f"Notice: Supabase update error: {se}")

        return {
            "success": True,
            "issue_id": issue_id,
            "confirmations_count": new_count,
            "priority": new_priority,
            "message": "Issue successfully confirmed and priority updated.",
        }

    # ============================================================
    # ADMIN CONSUMER OVERSIGHT
    # ============================================================

    @staticmethod
    def get_admin_scan_issues(
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 25,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Admin endpoint to view internal alerts from non-compliant consumer scans.
        """
        try:
            query = supabase.table("consumer_scan_issues").select("*", count="exact")
            if status:
                query = query.eq("status", status.upper())
            if priority:
                query = query.eq("priority", priority.upper())
            if search:
                query = query.ilike("product_name", f"%{search}%")

            res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            items = res.data or []

            for item in items:
                img_path = item.get("image_storage_path")
                if img_path:
                    item["image_url"] = SupabaseService.get_file_url("consumer-scans", img_path)

            return {
                "total": res.count or len(items),
                "items": items,
            }
        except Exception as e:
            print(f"Notice: get_admin_scan_issues: {e}")
            return {"total": 0, "items": []}

    @staticmethod
    def update_admin_scan_issue(
        issue_id: str,
        status: str,
        admin_notes: Optional[str],
        admin_id: str,
    ) -> Dict[str, Any]:
        """
        Admin action on a consumer scan violation alert.
        """
        update_data = {
            "status": status.upper(),
            "reviewed_at": datetime.now().isoformat(),
            "reviewed_by": admin_id,
        }
        if admin_notes is not None:
            update_data["admin_notes"] = admin_notes

        try:
            res = (
                supabase.table("consumer_scan_issues")
                .update(update_data)
                .eq("id", issue_id)
                .execute()
            )
            # Log audit
            SupabaseService.log_audit(
                user_id=admin_id,
                action="USER_SCAN_ISSUE_REVIEWED",
                details={
                    "issue_id": issue_id,
                    "new_status": status.upper(),
                    "admin_notes": admin_notes,
                },
            )
            return res.data[0] if res.data else update_data
        except Exception as e:
            print(f"Notice: update_admin_scan_issue: {e}")
            return update_data

    @staticmethod
    def get_admin_user_issues(
        status: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 25,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Admin endpoint to view consumer-submitted issue reports.
        """
        try:
            query = supabase.table("consumer_issues").select("*", count="exact")
            if status:
                query = query.eq("status", status.upper())
            if category:
                query = query.eq("category", category)
            if search:
                query = query.ilike("product_name", f"%{search}%")

            res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            items = res.data or []

            # If Supabase has no data or table empty, supplement with recent cached issues
            if not items and _RECENT_CONSUMER_ISSUES:
                items = list(_RECENT_CONSUMER_ISSUES)
                if status:
                    items = [i for i in items if i.get("status", "").upper() == status.upper()]
                if category:
                    items = [i for i in items if i.get("category") == category]
                if search:
                    s_low = search.lower()
                    items = [i for i in items if s_low in (i.get("product_name") or "").lower() or s_low in (i.get("description") or "").lower()]

            for item in items:
                if item.get("image_storage_path"):
                    item["image_url"] = SupabaseService.get_file_url("consumer-issues", item["image_storage_path"])
                if item.get("audio_storage_path"):
                    item["audio_url"] = SupabaseService.get_file_url("consumer-issues", item["audio_storage_path"])
                # Ensure priority and confirmations count are present
                item.setdefault("priority", "LOW")
                item.setdefault("confirmations_count", 1)

            # Compute counts
            stats = {
                "total": len(items),
                "submitted": sum(1 for i in items if i.get("status") == "SUBMITTED"),
                "under_review": sum(1 for i in items if i.get("status") == "UNDER_REVIEW"),
                "resolved": sum(1 for i in items if i.get("status") == "RESOLVED"),
                "rejected": sum(1 for i in items if i.get("status") == "REJECTED"),
            }

            return {
                "total": res.count or len(items),
                "stats": stats,
                "items": items,
            }
        except Exception as e:
            print(f"Notice: get_admin_user_issues: {e}")
            fallback_items = list(_RECENT_CONSUMER_ISSUES)
            return {
                "total": len(fallback_items),
                "stats": {
                    "total": len(fallback_items),
                    "submitted": sum(1 for i in fallback_items if i.get("status") == "SUBMITTED"),
                    "under_review": sum(1 for i in fallback_items if i.get("status") == "UNDER_REVIEW"),
                    "resolved": sum(1 for i in fallback_items if i.get("status") == "RESOLVED"),
                    "rejected": sum(1 for i in fallback_items if i.get("status") == "REJECTED"),
                },
                "items": fallback_items,
            }

    @staticmethod
    def update_admin_user_issue(
        issue_id: str,
        status: str,
        admin_notes: Optional[str],
        admin_id: str,
    ) -> Dict[str, Any]:
        """
        Admin action on a consumer-submitted issue.
        """
        update_data = {
            "status": status.upper(),
            "updated_at": datetime.now().isoformat(),
            "reviewed_at": datetime.now().isoformat(),
            "reviewed_by": admin_id,
        }
        if admin_notes is not None:
            update_data["admin_notes"] = admin_notes

        try:
            res = (
                supabase.table("consumer_issues")
                .update(update_data)
                .eq("id", issue_id)
                .execute()
            )
            SupabaseService.log_audit(
                user_id=admin_id,
                action=f"USER_ISSUE_{status.upper()}",
                details={
                    "issue_id": issue_id,
                    "new_status": status.upper(),
                    "admin_notes": admin_notes,
                },
            )
            return res.data[0] if res.data else update_data
        except Exception as e:
            print(f"Notice: update_admin_user_issue: {e}")
            return update_data
