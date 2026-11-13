// Crop math works in viewport pixels: the image is centred in a square viewport,
// scaled to cover it, then zoomed and shifted by the user's pan offset.

export const CROP_VIEWPORT_SIZE = 256;

export const CROP_OUTPUT_SIZE = 512;

export const CROP_MIN_ZOOM = 1;

export const CROP_MAX_ZOOM = 3;

export const INITIAL_CROP: AvatarCrop = { zoom: CROP_MIN_ZOOM, x: 0, y: 0 };

export function getCoverScale(image: ImageSize, viewport = CROP_VIEWPORT_SIZE): number {
  return Math.max(viewport / image.width, viewport / image.height);
}

// keeps the image covering the whole viewport so the circle never shows empty space
export function clampCrop(crop: AvatarCrop, image: ImageSize, viewport = CROP_VIEWPORT_SIZE): AvatarCrop {
  const zoom = Math.min(CROP_MAX_ZOOM, Math.max(CROP_MIN_ZOOM, crop.zoom));
  const scale = getCoverScale(image, viewport) * zoom;
  const maxX = (image.width * scale - viewport) / 2;
  const maxY = (image.height * scale - viewport) / 2;

  return { zoom, x: clamp(crop.x, -maxX, maxX), y: clamp(crop.y, -maxY, maxY) };
}

// the square of the source image that ends up inside the viewport
export function getCropSourceRect(crop: AvatarCrop, image: ImageSize, viewport = CROP_VIEWPORT_SIZE): CropRect {
  const scale = getCoverScale(image, viewport) * crop.zoom;
  const size = viewport / scale;

  return {
    x: image.width / 2 - crop.x / scale - size / 2,
    y: image.height / 2 - crop.y / scale - size / 2,
    size
  };
}

export async function renderCroppedAvatar(source: string, crop: AvatarCrop, fileName: string): Promise<File> {
  const image = await loadImage(source);
  const rect = getCropSourceRect(crop, { width: image.naturalWidth, height: image.naturalHeight });
  const canvas = document.createElement('canvas');
  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available');
  }

  context.imageSmoothingQuality = 'high';
  context.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);

  // browsers that cannot encode webp silently return png, so the blob type decides the extension
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));

  if (!blob) {
    throw new Error('Could not process the image');
  }

  return new File([blob], `${fileName.replace(/\.[^.]+$/, '')}.${blob.type === 'image/webp' ? 'webp' : 'png'}`, { type: blob.type });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the image'));
    image.src = source;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface AvatarCrop {
  zoom: number;
  x: number;
  y: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  size: number;
}
