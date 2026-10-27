export function validateLink(platform: string, link: string): string | null {
  const t = (link || "").trim();
  if (!t) return "Link required.";
  if (platform === "instagram") {
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(t)) return "Enter a valid Instagram link (start with https://instagram.com/).";
  } else if (platform === "tiktok") {
    if (!/^https?:\/\/(vm\.|www\.)?tiktok\.com\//i.test(t)) return "Enter a valid TikTok link (start with https://tiktok.com/).";
  } else if (platform === "youtube") {
    if (!/^https?:\/\/(www\.)?youtube\.com\//i.test(t) && !/^https?:\/\/youtu\.be\//i.test(t))
      return "Enter a valid YouTube link (start with https://youtube.com/).";
  }
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Too weak", "Weak", "Okay", "Good", "Strong"];
  return { score, label: labels[Math.min(score, 4)] };
}
