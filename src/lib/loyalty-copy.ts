/** Normalize store-authored loyalty copy when displaying existing records. */
export function formatLoyaltyCopy(text: string): string {
  return text.replace(/điểm\s+thưởng(?:\s+tích\s+(?:lũy|luỹ))?/giu, (phrase) => {
    if (phrase.startsWith("ĐIỂM")) return "ĐIỂM TÍCH LŨY";
    return phrase.startsWith("Điểm") ? "Điểm tích lũy" : "điểm tích lũy";
  });
}
