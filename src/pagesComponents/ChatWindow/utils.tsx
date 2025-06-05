export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateSeededUUID(seed: string) {
  // Create a simple hash of the seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash to generate a consistent UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (hash + Math.abs(hash) * 16) | 0;
    hash = Math.floor(hash / 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/[#*_~`>]/g, '') // Remove Markdown syntax characters
    .replace(/\[(.*?)\]\((.*?)\)/g, '$2') // Replace links [title](url) with url
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // Replace images ![alt](url) with "alt"
    .replace(/>\s?/g, '') // Remove blockquotes
    .replace(/^\s*-\s+/gm, '\n- ') // Retain unordered list markers
    .replace(/\n+/g, '\n') // Collapse multiple newlines
    .trim(); // Remove leading/trailing whitespace
}

export const roundedToFixed = (input: number, digits = 4): string => {
    const rounder = 10 ** digits;
  return (Math.round(input * rounder) / rounder).toFixed(digits);
};

export const kFormatter = (num) => {
  if (typeof num === "string") return num;

  if (Math.abs(num) > 999_999) {
    return `${(Math.sign(num) * (Math.abs(num) / 1_000_000)).toFixed(1)}mil`;
  }

  if (Math.abs(num) > 999) {
    return `${(Math.sign(num) * (Math.abs(num) / 1000)).toFixed(1)}k`;
  }

  return Math.sign(num) * Math.abs(num);
};
