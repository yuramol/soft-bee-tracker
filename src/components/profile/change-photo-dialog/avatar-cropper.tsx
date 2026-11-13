'use client';

import { MoveIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@ui/button';
import {
  clampCrop,
  CROP_MAX_ZOOM,
  CROP_MIN_ZOOM,
  CROP_VIEWPORT_SIZE,
  getCoverScale,
  type AvatarCrop,
  type ImageSize
} from '@/lib/avatar-crop';
import content from '../content.json';

export function AvatarCropper({ src, crop, disabled, onCropChange }: AvatarCropperProps) {
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const dragRef = useRef<DragStart | null>(null);

  function updateCrop(next: AvatarCrop) {
    if (imageSize) {
      onCropChange(clampCrop(next, imageSize));
    }
  }

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, crop };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;

    if (start) {
      updateCrop({
        ...start.crop,
        x: start.crop.x + event.clientX - start.pointerX,
        y: start.crop.y + event.clientY - start.pointerY
      });
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10;
    const moves: Record<string, AvatarCrop> = {
      ArrowLeft: { ...crop, x: crop.x - step },
      ArrowRight: { ...crop, x: crop.x + step },
      ArrowUp: { ...crop, y: crop.y - step },
      ArrowDown: { ...crop, y: crop.y + step },
      '+': { ...crop, zoom: crop.zoom + ZOOM_STEP },
      '=': { ...crop, zoom: crop.zoom + ZOOM_STEP },
      '-': { ...crop, zoom: crop.zoom - ZOOM_STEP }
    };
    const next = moves[event.key];

    if (next && !disabled) {
      event.preventDefault();
      updateCrop(next);
    }
  }

  function handleZoomChange(event: React.ChangeEvent<HTMLInputElement>) {
    updateCrop({ ...crop, zoom: Number(event.target.value) });
  }

  function handleZoomOutClick() {
    updateCrop({ ...crop, zoom: crop.zoom - ZOOM_STEP });
  }

  function handleZoomInClick() {
    updateCrop({ ...crop, zoom: crop.zoom + ZOOM_STEP });
  }

  const scale = imageSize ? getCoverScale(imageSize) * crop.zoom : 0;

  return (
    <div className='flex w-full flex-col items-center gap-3'>
      <div
        role='application'
        tabIndex={disabled ? -1 : 0}
        aria-label={content.photo.cropLabel}
        aria-describedby='avatar-crop-hint'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{ width: CROP_VIEWPORT_SIZE, height: CROP_VIEWPORT_SIZE }}
        className='bg-muted focus-visible:ring-ring/50 relative cursor-grab touch-none overflow-hidden rounded-xl outline-none select-none focus-visible:ring-3 active:cursor-grabbing'
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object url drawn at a computed transform */}
        <img
          src={src}
          alt=''
          draggable={false}
          onLoad={handleImageLoad}
          className='pointer-events-none absolute top-1/2 left-1/2 max-w-none'
          style={
            imageSize
              ? {
                  width: imageSize.width * scale,
                  height: imageSize.height * scale,
                  transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px))`
                }
              : { visibility: 'hidden' }
          }
        />
        {/* the huge shadow dims everything outside the circle that becomes the avatar */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] ring-2 ring-white/80'
        />
      </div>

      <p id='avatar-crop-hint' className='text-muted-foreground flex items-center gap-1.5 text-xs'>
        <MoveIcon className='size-3.5' />
        {content.photo.cropHint}
      </p>

      <div className='flex w-full max-w-64 items-center gap-2'>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={content.photo.zoomOut}
          disabled={disabled || crop.zoom <= CROP_MIN_ZOOM}
          onClick={handleZoomOutClick}
        >
          <ZoomOutIcon />
        </Button>
        <input
          type='range'
          min={CROP_MIN_ZOOM}
          max={CROP_MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          disabled={disabled || !imageSize}
          aria-label={content.photo.zoomLabel}
          onChange={handleZoomChange}
          className='accent-foreground h-1.5 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
        />
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={content.photo.zoomIn}
          disabled={disabled || crop.zoom >= CROP_MAX_ZOOM}
          onClick={handleZoomInClick}
        >
          <ZoomInIcon />
        </Button>
      </div>
    </div>
  );
}

const ZOOM_STEP = 0.1;

interface AvatarCropperProps {
  src: string;
  crop: AvatarCrop;
  disabled: boolean;
  onCropChange: (crop: AvatarCrop) => void;
}

interface DragStart {
  pointerX: number;
  pointerY: number;
  crop: AvatarCrop;
}
