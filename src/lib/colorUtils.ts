function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function setLightness(hex: string, lightness: number, saturationMultiplier = 1): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsl(r, g, b);
  const clampedS = Math.max(0, Math.min(100, s * saturationMultiplier));
  const clampedL = Math.max(0, Math.min(100, lightness));
  const [nr, ng, nb] = hslToRgb(h, clampedS, clampedL);
  return rgbToHex(nr, ng, nb);
}

export interface BrandShades {
  50: string;
  100: string;
  500: string;
  600: string;
  700: string;
  900: string;
}

export function generateBrandShades(baseHex: string): BrandShades {
  const [r, g, b] = hexToRgb(baseHex);
  const [, , l] = rgbToHsl(r, g, b);

  return {
    50: setLightness(baseHex, 96, 0.5),
    100: setLightness(baseHex, 91, 0.6),
    500: baseHex,
    600: setLightness(baseHex, Math.max(l - 8, 30)),
    700: setLightness(baseHex, Math.max(l - 16, 22)),
    900: setLightness(baseHex, Math.max(l - 32, 12)),
  };
}

export function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}