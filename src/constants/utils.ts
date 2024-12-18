// Get user's preferred locale from browser
export const getUserLocale = () => {
  // First try to get the browser's language settings
  if (typeof navigator !== "undefined") {
    // navigator.languages is an array of user's preferred languages
    if (navigator.languages && navigator.languages.length) {
      return navigator.languages[0];
    }
    // Fallbacks for older browsers
    return navigator.language || (navigator as any).userLanguage || (navigator as any).browserLanguage || "en-US";
  }
  return "en-US"; // Default fallback
};

export const localizeNumber = (value: number | string, style = "currency", minimumFractionDigits = 0) => {
  return new Intl.NumberFormat(getUserLocale(), {
    // @ts-ignore
    style,
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(Number(value));
};
