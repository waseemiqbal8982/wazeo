export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function authErrorMessage(error: { message?: string; code?: string }): string {
  const msg = (error.message || "").toLowerCase();
  if (error.code === "user_already_exists" || msg.includes("already registered"))
    return "An account with this email already exists.";
  if (msg.includes("invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("email not confirmed")) return "Please verify your email first (check your inbox).";
  if (msg.includes("password should be")) return "Password is too weak. Use at least 8 characters.";
  if (msg.includes("rate limit")) return "Too many attempts. Please wait a moment.";
  if (msg.includes("invalid email")) return "Enter a valid email address.";
  return error.message || "Something went wrong. Please try again.";
}
