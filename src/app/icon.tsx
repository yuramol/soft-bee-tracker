import { ImageResponse } from 'next/og';

import { LOGO_MARK_PATH } from '@/assets/icons/logo-mark';

export const size = {
  width: 32,
  height: 32
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C3FF00',
        borderRadius: '50%'
      }}
    >
      <svg width='20' height='23' viewBox='0 0 25 29' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d={LOGO_MARK_PATH} fill='#1B1C23' />
      </svg>
    </div>,
    { ...size }
  );
}
