const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmailAddress(value) {
  if (typeof value !== "string") return null;

  const email = value.trim();
  if (email.length > 254 || !EMAIL_ADDRESS_PATTERN.test(email)) return null;

  return email;
}
