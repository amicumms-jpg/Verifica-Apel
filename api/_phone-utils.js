const COUNTRY_PREFIXES = [
  { code: "1", name: "SUA / Canada", flag: "🇺🇸" },
  { code: "40", name: "România", flag: "🇷🇴" },
  { code: "44", name: "Regatul Unit", flag: "🇬🇧" },
  { code: "49", name: "Germania", flag: "🇩🇪" },
  { code: "39", name: "Italia", flag: "🇮🇹" },
  { code: "33", name: "Franța", flag: "🇫🇷" },
  { code: "34", name: "Spania", flag: "🇪🇸" },
  { code: "31", name: "Țările de Jos", flag: "🇳🇱" },
  { code: "32", name: "Belgia", flag: "🇧🇪" },
  { code: "43", name: "Austria", flag: "🇦🇹" },
  { code: "41", name: "Elveția", flag: "🇨🇭" },
  { code: "36", name: "Ungaria", flag: "🇭🇺" },
  { code: "359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "373", name: "Republica Moldova", flag: "🇲🇩" },
  { code: "48", name: "Polonia", flag: "🇵🇱" },
  { code: "90", name: "Turcia", flag: "🇹🇷" }
].sort((a, b) => b.code.length - a.code.length);

export function parseInternationalPhone(raw = "") {
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (/^0[23789]\d{6,10}$/.test(digits)) {
    digits = "40" + digits.slice(1);
  }

  digits = digits.slice(0, 15);
  if (digits.length < 7) return null;

  const matched = COUNTRY_PREFIXES.find((item) => digits.startsWith(item.code));
  if (matched) {
    return {
      phone: digits,
      countryCode: matched.code,
      countryName: matched.name,
      flag: matched.flag,
      display: `+${digits}`
    };
  }

  return {
    phone: digits,
    countryCode: digits.slice(0, 3),
    countryName: "Internațional",
    flag: "🌍",
    display: `+${digits}`
  };
}
