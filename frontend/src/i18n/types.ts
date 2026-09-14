export type SupportedLanguage = "en" | "hi" | "mr" | "te" | "ta" | "kn" | "bn" | "gu";

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  fontFamily?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
];

export interface TranslationSchema {
  common: {
    language: string;
    loading: string;
    error: string;
    retry: string;
    back: string;
    close: string;
    save: string;
    cancel: string;
    download: string;
    reportIssue: string;
    viewDetails: string;
    notDetected: string;
    undetermined: string;
  };
  nav: {
    portalTitle: string;
    portalSubtitle: string;
    citizenBadge: string;
    overview: string;
    dashboard: string;
    scanProduct: string;
    multiScan: string;
    myScans: string;
    reportProduct: string;
    myGrievances: string;
    communityFeed: string;
    myAccount: string;
    signOut: string;
    officerLogin: string;
    citizenPortal: string;
  };
  voice: {
    listen: string;
    stop: string;
    speaking: string;
  };

  scanner: {
    title: string;
    subtitle: string;
    dragDropTitle: string;
    dragDropSubtitle: string;
    choosePhoto: string;
    openCamera: string;
    changePhoto: string;
    retakePhoto: string;
    runAnalysis: string;
    analyzing: string;
    stepUploading: string;
    stepExtracting: string;
    stepComplete: string;
    tipsTitle: string;
    tip1: string;
    tip2: string;
    tip3: string;
    locationPrompt: string;
    locationDenied: string;
  };
  product: {
    productOverview: string;
    productName: string;
    category: string;
    packagedFood: string;
    commodity: string;
    quantity: string;
    mrp: string;
    batchNumber: string;
    mfgDate: string;
    packedDate: string;
    expiryDate: string;
    bestBefore: string;
    shelfLifeStatus: string;
    safeShelfLife: string;
    expiredWarning: string;
    expiredHeadline: string;
    expiredSubtext: string;
    expiryUndetermined: string;
    licenseNumber: string;
    countryOfOrigin: string;
    manufacturer: string;
    marketedBy: string;
    manufacturerAddress: string;
    consumerContact: string;
    scannedOn: string;
  };
  ingredients: {
    title: string;
    percentageDeclaredNote: string;
    percentagesNotDeclared: string;
    noIngredientsFound: string;
    primaryIngredient: string;
  };
  nutrition: {
    title: string;
    perServingOr100g: string;
    nutrientParameter: string;
    declaredQuantity: string;
    noNutritionDetected: string;
    overviewTitle: string;
    consumerNote: string;
    sugarHighNote: string;
    sodiumHighNote: string;
    fatHighNote: string;
    rdaNotice: string;
  };
  allergens: {
    title: string;
    contains: string;
    noAllergensDetected: string;
    checkNotice: string;
  };
  suitability: {
    title: string;
    subtitle: string;
    noAgeRestrictions: string;
    sugarSensitive: string;
    sodiumSensitive: string;
    generalGuidance: string;
  };
  advisory: {
    title: string;
    subtitle: string;
    goodToKnow: string;
    allergenAlert: string;
    shelfLifeAlert: string;
    disclaimer: string;
  };
  report: {
    downloadReport: string;
    generatingReport: string;
    downloadSuccess: string;
    officialReportTitle: string;
    consumerInfoNotice: string;
  };
  reportForm: {
    title: string;
    subtitle: string;
    step1Photo: string;
    step1UploadPrompt: string;
    step2Confirm: string;
    step3Location: string;
    step3LocationAttached: string;
    step3LocationPending: string;
    step4Describe: string;
    typePlaceholder: string;
    orVoice: string;
    recordVoice: string;
    stopVoice: string;
    voiceListening: string;
    voiceConverted: string;
    submitBtn: string;
    submitting: string;
    successTitle: string;
    successDesc: string;
    photoRequired: string;
    confirmRequired: string;
    descRequired: string;
  };
  communityFeed: {
    title: string;
    subtitle: string;
    locationPrompt: string;
    enableLocation: string;
    locationDeniedNotice: string;
    product: string;
    issue: string;
    location: string;
    reports: string;
    priority: string;
    status: string;
    confirmIssue: string;
    raiseAlert: string;
    alreadyConfirmed: string;
    confirmSuccess: string;
    reportedByCount: string;
    nearbyArea: string;
    noIssues: string;
  };
  categories: {
    packaged_food: string;
    beverage: string;
    cosmetic: string;
    personal_care: string;
    household_product: string;
    pharmaceutical: string;
    supplement: string;
    electronic_product: string;
    other: string;
    unknown: string;
  };

  landing: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    exploreCitizen: string;
    officerPortal: string;
    ministryBadge: string;
    heroTitlePrefix: string;
    heroTitleSuffix: string;
    enforcementDivision: string;
    operationalPortals: string;
    frontOfficers: string;
    officerTitle: string;
    officerDesc: string;
    adminTitle: string;
    adminDesc: string;
    flipToCitizenHint: string;
    flipToCitizenBtn: string;
    citizenDivision: string;
    publicPortal: string;
    backCitizens: string;
    citizenTitle: string;
    citizenDesc: string;
    grievanceTitle: string;
    grievanceDesc: string;
    flipToOfficerHint: string;
    flipToOfficerBtn: string;
    enterPortal: string;
    featuresHeading: string;
    featuresSubtitle: string;
    featOcrTitle: string;
    featOcrDesc: string;
    featComplianceTitle: string;
    featComplianceDesc: string;
    featExpiryTitle: string;
    featExpiryDesc: string;
    featGrievanceTitle: string;
    featGrievanceDesc: string;
    howItWorksHeading: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    statScans: string;
    statRules: string;
    statOfficers: string;
    statAccuracy: string;
    footerPlatform: string;
    footerDesc: string;
    quickLinks: string;
    legalRules: string;
    supportContact: string;
    allRightsReserved: string;
  };
  auth: {
    officerLoginTitle: string;
    officerSubtitle: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    signInBtn: string;
    signingIn: string;
    citizenLoginTitle: string;
    citizenSubtitle: string;
    citizenUsernameLabel: string;
    citizenSignInBtn: string;
    noAccount: string;
    createAccount: string;
    hasAccount: string;
    signUpTitle: string;
    fullNameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    confirmPasswordLabel: string;
    registerBtn: string;
    registering: string;
    portalHome: string;
  };
  officer: {
    sidebarOversight: string;
    sidebarEnforcement: string;
    directorateModules: string;
    inspectorWorkspace: string;
    scanProduct: string;
    multiScan: string;
    inspectionHistory: string;
    reportsDossiers: string;
    profileSettings: string;
    dashboard: string;
    inspectors: string;
    inspections: string;
    citizenScanAlerts: string;
    citizenGrievances: string;
    rulesManagement: string;
    reports: string;
    analytics: string;
    auditLogs: string;
    settings: string;
    topbarTitle: string;
    topbarSubtitle: string;
    engineActive: string;
    logout: string;
  };
  multiScan: {
    title: string;
    subtitle: string;
    uploadTitle: string;
    uploadSubtitle: string;
    dropzoneHint: string;
    maxImagesLimit: string;
    analyzeBtn: string;
    analyzingBtn: string;
    progressTitle: string;
    stepProcessing: string;
    stepDetecting: string;
    stepAnalyzing: string;
    uniqueProductsDetected: string;
    sideBySideTitle: string;
    sideBySideSubtitle: string;
    productCardTitle: string;
    primaryIdentity: string;
    viewAnalysisBtn: string;
    downloadReportBtn: string;
    frontBadge: string;
    backBadge: string;
    mergedSidesBadge: string;
    retryFailedBtn: string;
    failedAlert: string;
    comparisonHeaders: {
      product: string;
      brand: string;
      barcode: string;
      batch: string;
      license: string;
      mrp: string;
      quantity: string;
      mfgDate: string;
      expiryDate: string;
      status: string;
    };
  };
}

