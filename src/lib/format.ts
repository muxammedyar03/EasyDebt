// Formatting helpers
// Phone: +998 XX XXX XX XX
export const formatUzPhone = (input: string): string => {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  let rest = digits;
  if (rest.startsWith("998")) {
    rest = rest.slice(3);
  }
  // Limit to 9 digits after country code
  rest = rest.slice(0, 9);
  const part1 = rest.slice(0, 2);
  const part2 = rest.slice(2, 5);
  const part3 = rest.slice(5, 7);
  const part4 = rest.slice(7, 9);
  let out = "+998";
  if (part1) out += ` ${part1}`;
  if (part2) out += ` ${part2}`;
  if (part3) out += ` ${part3}`;
  if (part4) out += ` ${part4}`;
  return out;
};

// Numbers: group by thousands using spaces (e.g., 1234567 -> "1 234 567")
export const formatNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  return numbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ");
};
