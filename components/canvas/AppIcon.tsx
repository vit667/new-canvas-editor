"use client"

import { memo } from 'react';
import { getIconComponent } from '@/lib/canvas-icons';
import {
  BRAND_PREFIX,
  IMG_PREFIX,
  isBrandIcon,
  isImageIcon,
  useBrandHex,
  useBrandPath,
} from '@/lib/app-icons';
import { cn } from '@/lib/utils';

interface AppIconProps {
  value?: string;
  className?: string;
  /** Для брендов: красить в фирменный цвет (по умолчанию) или в currentColor */
  brandColor?: boolean;
  /** Что показать, если значение пустое */
  fallback?: string;
}

function BrandIcon({ slug, className, brandColor }: { slug: string; className?: string; brandColor: boolean }) {
  const d = useBrandPath(slug);
  const hex = useBrandHex(brandColor ? slug : undefined);
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4 shrink-0', className)} aria-hidden="true">
      {d && <path d={d} fill={brandColor && hex ? hex : 'currentColor'} />}
    </svg>
  );
}

/** Рендерит иконку любого формата: lucide / si:бренд / img:своя */
function AppIcon({ value, className, brandColor = true, fallback }: AppIconProps) {
  const v = value && value !== 'none' ? value : fallback;
  if (!v) return null;

  if (isBrandIcon(v)) {
    return <BrandIcon slug={v.slice(BRAND_PREFIX.length)} className={className} brandColor={brandColor} />;
  }

  if (isImageIcon(v)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={v.slice(IMG_PREFIX.length)} alt="" draggable={false} className={cn('size-4 shrink-0 object-contain', className)} />
    );
  }

  const Icon = getIconComponent(v);
  return Icon ? <Icon className={cn('size-4 shrink-0', className)} /> : null;
}

export default memo(AppIcon);
