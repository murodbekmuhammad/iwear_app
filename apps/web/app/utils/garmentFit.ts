import type { Category } from '~/types';

/**
 * Works out where to draw a clothing photo over a person, from body landmarks.
 * Everything here is plain maths so it can be unit-tested without a camera.
 */

export interface Point {
  x: number;
  y: number;
}

/** Body points in stage pixels (already mirrored like the video on screen). */
export interface BodyPoints {
  leftShoulder: Point;
  rightShoulder: Point;
  leftHip: Point | null;
  rightHip: Point | null;
}

/** Where the clothes' visible pixels are inside their photo, measured from its transparency. */
export interface GarmentShape {
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Width of the visible pixels in the top rows (the waistband of a skirt, the shoulders of a scarf). */
  topWidth: number;
}

/** Centre of the photo in stage pixels, its height in stage pixels, and its rotation in degrees. */
export interface Placement {
  x: number;
  y: number;
  height: number;
  angle: number;
}

interface Rule {
  anchor: 'shoulders' | 'hips';
  /** How far down the clothes (0 = top, 1 = bottom) the anchor line sits. */
  anchorAt: number;
  /** For upper-body clothes: how far down the hips sit, used to size them by torso length. */
  hipsAt?: number;
  /** For width-sized clothes: the clothes' top width divided by the distance between the body points. */
  widthRatio?: number;
}

const rules: Record<Category, Rule> = {
  DRESS: { anchor: 'shoulders', anchorAt: 0.02, hipsAt: 0.42 },
  TOP: { anchor: 'shoulders', anchorAt: 0.08, hipsAt: 0.85 },
  OUTERWEAR: { anchor: 'shoulders', anchorAt: 0.1, hipsAt: 0.55 },
  SUIT: { anchor: 'shoulders', anchorAt: 0.1, hipsAt: 0.6 },
  // Hip landmarks sit at the hip joints, a little below the waistband and inside it.
  BOTTOM: { anchor: 'hips', anchorAt: 0.08, widthRatio: 1.6 },
  ACCESSORY: { anchor: 'shoulders', anchorAt: 0.05, widthRatio: 1.1 },
};

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Returns null when the body points needed for this kind of clothes are missing. */
export function fitGarment(category: Category, body: BodyPoints, shape: GarmentShape): Placement | null {
  const rule = rules[category] ?? rules.TOP;
  const shoulders = mid(body.leftShoulder, body.rightShoulder);
  const hips = body.leftHip && body.rightHip ? mid(body.leftHip, body.rightHip) : null;
  const visibleHeight = Math.max(1, shape.bottom - shape.top);

  let anchor: Point;
  let scale: number;
  // The line across the body, from the shopper's right to left as seen on screen.
  let across: [Point, Point];

  if (rule.anchor === 'hips') {
    if (!body.leftHip || !body.rightHip || !hips) return null;
    anchor = hips;
    across = [body.rightHip, body.leftHip];
    scale = (dist(body.leftHip, body.rightHip) * (rule.widthRatio ?? 1)) / Math.max(1, shape.topWidth);
  } else {
    anchor = shoulders;
    across = [body.rightShoulder, body.leftShoulder];
    if (rule.hipsAt !== undefined && hips) {
      scale = dist(shoulders, hips) / ((rule.hipsAt - rule.anchorAt) * visibleHeight);
    } else {
      // No hips in view: size by shoulder width instead. The neckline or straps at the top of
      // the clothes are narrower than the distance between the shoulder joints.
      const ratio = rule.widthRatio ?? 0.75;
      scale = (dist(body.leftShoulder, body.rightShoulder) * ratio) / Math.max(1, shape.topWidth);
    }
  }
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const [a, b] = across;
  let angle = Math.atan2(b.y - a.y, b.x - a.x);
  // Keep the clothes upright whichever way round the points come.
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;

  // The anchor's spot inside the photo, then the photo's centre relative to it, rotated with the body.
  const anchorX = (shape.left + shape.right) / 2;
  const anchorY = shape.top + rule.anchorAt * visibleHeight;
  const dx = (shape.width / 2 - anchorX) * scale;
  const dy = (shape.height / 2 - anchorY) * scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: anchor.x + dx * cos - dy * sin,
    y: anchor.y + dx * sin + dy * cos,
    height: shape.height * scale,
    angle: (angle * 180) / Math.PI,
  };
}

/** Measures the visible (non-transparent) part of a loaded image. Falls back to the whole image. */
export function measureGarment(img: HTMLImageElement): GarmentShape {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const whole: GarmentShape = { width, height, top: 0, bottom: height, left: 0, right: width, topWidth: width * 0.5 };
  try {
    const step = Math.max(1, Math.round(width / 150));
    const w = Math.ceil(width / step);
    const h = Math.ceil(height / step);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return whole;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data; // throws if the image isn't CORS-enabled
    const rows: { left: number; right: number }[] = [];
    let top = -1;
    let bottom = -1;
    let left = w;
    let right = -1;
    for (let y = 0; y < h; y++) {
      let rowLeft = -1;
      let rowRight = -1;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3]! > 40) {
          if (rowLeft < 0) rowLeft = x;
          rowRight = x;
        }
      }
      rows.push({ left: rowLeft, right: rowRight });
      if (rowLeft >= 0) {
        if (top < 0) top = y;
        bottom = y;
        left = Math.min(left, rowLeft);
        right = Math.max(right, rowRight);
      }
    }
    // A photo with no transparency (a normal shop photo) can't be measured.
    if (top < 0 || (top === 0 && bottom === h - 1 && left === 0 && right === w - 1)) return whole;
    // Widest row in the top 6% of the clothes.
    const band = Math.max(1, Math.round((bottom - top) * 0.06));
    let topWidth = 0;
    for (let y = top; y <= Math.min(bottom, top + band); y++) {
      const row = rows[y]!;
      if (row.left >= 0) topWidth = Math.max(topWidth, row.right - row.left + 1);
    }
    return {
      width,
      height,
      top: top * step,
      bottom: (bottom + 1) * step,
      left: left * step,
      right: (right + 1) * step,
      topWidth: topWidth * step,
    };
  } catch {
    return whole;
  }
}
