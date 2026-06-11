/* Google Play subscriptions via RevenueCat (react-native-purchases).

   Native module → only works in a dev build / release, not Expo Go. Everything
   here is lazy-loaded and guarded so the app still runs in Expo Go (the Upgrade
   screen just shows a "needs the app build" note there).

   The RevenueCat app_user_id is set to our Mongo userId via logIn(), so the
   backend webhook can match the purchase to the right account. */
import Constants from "expo-constants";

const ANDROID_KEY = Constants.expoConfig?.extra?.revenueCatAndroidKey || "";
export const PRO_ENTITLEMENT = Constants.expoConfig?.extra?.proEntitlement || "pro";

let Purchases = null;
let configured = false;

function load() {
  if (Purchases) return Purchases;
  try {
    Purchases = require("react-native-purchases").default;
    return Purchases;
  } catch {
    return null;
  }
}

export function isPurchasesAvailable() {
  return !!load();
}

/* configure once + identify the user so purchases attach to their account */
export async function initPurchases(userId) {
  const P = load();
  if (!P || !ANDROID_KEY || ANDROID_KEY.startsWith("REPLACE_")) return false;
  try {
    if (!configured) {
      P.configure({ apiKey: ANDROID_KEY, appUserID: userId || undefined });
      configured = true;
    } else if (userId) {
      await P.logIn(userId);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/* returns the monthly package + display price, or null */
export async function getProOffering() {
  const P = load();
  if (!P) return null;
  try {
    const offerings = await P.getOfferings();
    const current = offerings?.current;
    if (!current) return null;
    const pkg = current.monthly || current.availablePackages?.[0] || null;
    if (!pkg) return null;
    return {
      pkg,
      priceString: pkg.product?.priceString || "",
      title: pkg.product?.title || "Pro Monthly",
    };
  } catch {
    return null;
  }
}

export async function hasProEntitlement() {
  const P = load();
  if (!P) return false;
  try {
    const info = await P.getCustomerInfo();
    return !!info?.entitlements?.active?.[PRO_ENTITLEMENT];
  } catch {
    return false;
  }
}

/* purchase the monthly package; resolves { active } */
export async function purchasePro(pkg) {
  const P = load();
  if (!P) throw new Error("Purchases not available in this build");
  const { customerInfo } = await P.purchasePackage(pkg);
  return { active: !!customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT] };
}

export async function restorePurchases() {
  const P = load();
  if (!P) throw new Error("Purchases not available in this build");
  const info = await P.restorePurchases();
  return { active: !!info?.entitlements?.active?.[PRO_ENTITLEMENT] };
}
