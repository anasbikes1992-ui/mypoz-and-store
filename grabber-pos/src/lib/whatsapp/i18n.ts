export type Locale = "en" | "si" | "ta";

const dict = {
  en: {
    welcome: "Welcome",
    order: "Order",
    viewMenu: "View menu",
    offers: "Today's offers",
    location: "Location",
    trackOrder: "Track order",
    talkToStaff: "Talk to staff",
    replyNumber: "Reply with a number, or hi to start again.",
    chooseCategory: "Choose a category.",
    selectItem: "Select an item.",
    sendZero: "Send 0 to checkout.",
    added: "Added",
    sendAnother: "Send another number, or 0 to checkout.",
    cartEmpty: "Cart is empty. Send a number to add an item.",
    noOffers: "No offers listed yet. Ask staff or check the online store.",
    locationUnset: "Location not set.",
    sendReceipt: "Send your order number (receipt id).",
    staffSoon: "A staff member will reply here shortly.",
    staffThanks: "Thanks — staff have been notified.",
    menuSoon: "Menu coming soon.",
    noCategories: "No categories yet.",
    listedNumber: "Send a listed number, or 0 to checkout.",
    listedCategory: "Choose a listed category number.",
    lookingUp: "Looking up that order…",
    placing: "Placing your order…",
    outOfStock: "Out of stock",
    left: "left",
  },
  si: {
    welcome: "ආයුබෝවන්",
    order: "ඇණවුම් කරන්න",
    viewMenu: "මෙනුව බලන්න",
    offers: "අද දිනයේ දීමනා",
    location: "ස්ථානය",
    trackOrder: "ඇණවුම ලුහුබඳින්න",
    talkToStaff: "කාර්ය මණ්ඩලය සමඟ කතා කරන්න",
    replyNumber: "අංකයක් යවන්න, නැතහොත් hi යවන්න.",
    chooseCategory: "ප්‍රවර්ගයක් තෝරන්න.",
    selectItem: "අයිතමයක් තෝරන්න.",
    sendZero: "ගෙවීමට 0 යවන්න.",
    added: "එකතු කළා",
    sendAnother: "තවත් අංකයක් යවන්න, නැතහොත් 0.",
    cartEmpty: "කරත්තය හිස්ය. අංකයක් යවන්න.",
    noOffers: "දීමනා නැත. කාර්ය මණ්ඩලයෙන් විමසන්න.",
    locationUnset: "ස්ථානය සකසා නැත.",
    sendReceipt: "ඇණවුම් අංකය යවන්න.",
    staffSoon: "කාර්ය මණ්ඩලය මෙහි පිළිතුරු දෙනු ඇත.",
    staffThanks: "ස්තුතියි — කාර්ය මණ්ඩලයට දැනුම් දී ඇත.",
    menuSoon: "මෙනුව ඉක්මනින්.",
    noCategories: "ප්‍රවර්ග නැත.",
    listedNumber: "ලැයිස්තුගත අංකයක් හෝ 0 යවන්න.",
    listedCategory: "ලැයිස්තුගත ප්‍රවර්ග අංකය තෝරන්න.",
    lookingUp: "ඇණවුම සොයමින්…",
    placing: "ඇණවුම තබමින්…",
    outOfStock: "තොගයේ නැත",
    left: "ඉතිරි",
  },
  ta: {
    welcome: "வணக்கம்",
    order: "ஆர்டர்",
    viewMenu: "மெனுவைப் பார்க்க",
    offers: "இன்றைய சலுகைகள்",
    location: "இடம்",
    trackOrder: "ஆர்டரைக் கண்காணிக்க",
    talkToStaff: "ஊழியரிடம் பேச",
    replyNumber: "எண்ணை அனுப்பவும், அல்லது hi.",
    chooseCategory: "ஒரு வகையைத் தேர்ந்தெடுக்கவும்.",
    selectItem: "ஒரு பொருளைத் தேர்ந்தெடுக்கவும்.",
    sendZero: "செக்அவுட்டுக்கு 0 அனுப்பவும்.",
    added: "சேர்க்கப்பட்டது",
    sendAnother: "மற்றொரு எண் அல்லது 0 அனுப்பவும்.",
    cartEmpty: "வண்டி காலியாக உள்ளது. ஒரு எண் அனுப்பவும்.",
    noOffers: "சலுகைகள் இல்லை. ஊழியரிடம் கேளுங்கள்.",
    locationUnset: "இடம் அமைக்கப்படவில்லை.",
    sendReceipt: "ஆர்டர் எண்ணை அனுப்பவும்.",
    staffSoon: "ஒரு ஊழியர் விரைவில் பதிலளிப்பார்.",
    staffThanks: "நன்றி — ஊழியருக்கு தெரிவிக்கப்பட்டது.",
    menuSoon: "மெனு விரைவில்.",
    noCategories: "வகைகள் இல்லை.",
    listedNumber: "பட்டியல் எண் அல்லது 0 அனுப்பவும்.",
    listedCategory: "பட்டியல் வகை எண்ணைத் தேர்ந்தெடுக்கவும்.",
    lookingUp: "ஆர்டரைத் தேடுகிறது…",
    placing: "ஆர்டர் இடப்படுகிறது…",
    outOfStock: "கையிருப்பில் இல்லை",
    left: "மீதம்",
  },
} as const;

export type MessageKey = keyof typeof dict.en;

export function t(locale: Locale | string | undefined, key: MessageKey): string {
  const loc: Locale = locale === "si" || locale === "ta" ? locale : "en";
  return dict[loc][key];
}

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "si" || v === "ta";
}

export function detectLocale(text: string, fallback: Locale = "en"): Locale {
  if (/[\u0D80-\u0DFF]/.test(text)) return "si";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  const lower = text.trim().toLowerCase();
  if (lower === "si" || lower === "sinhala") return "si";
  if (lower === "ta" || lower === "tamil") return "ta";
  if (lower === "en" || lower === "english") return "en";
  return fallback;
}

export const LOCALES: Locale[] = ["en", "si", "ta"];
