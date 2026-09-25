const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateShortCode(length = 7): string {
  let result = "";

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[index];
  }

  return result;
}
