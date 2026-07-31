import React, { useState, useEffect } from 'react';
import { formatImageUrl, getProxyImageUrl } from '../utils/imageUtils';
import { Image as ImageIcon } from 'lucide-react';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  adaptive?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className = '',
  adaptive = true,
  onError,
  onLoad,
  ...rest
}) => {
  const formattedUrl = formatImageUrl(src);

  // stage: 'direct' | 'proxy' | 'fallback'
  const [stage, setStage] = useState<'direct' | 'proxy' | 'fallback'>('direct');
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    setStage('direct');
    setCurrentSrc(formattedUrl || (fallbackSrc || ''));
  }, [src, fallbackSrc, formattedUrl]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (stage === 'direct' && formattedUrl && !formattedUrl.startsWith('data:') && !formattedUrl.startsWith('blob:')) {
      // Direct attempt failed: fallback to high-performance proxy to bypass referrer/hotlink/CORS restrictions
      setStage('proxy');
      setCurrentSrc(getProxyImageUrl(formattedUrl));
    } else if (stage === 'proxy' || (stage === 'direct' && (!formattedUrl || formattedUrl.startsWith('data:')))) {
      // Both direct & proxy failed or invalid source: go to fallback
      setStage('fallback');
      if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      }
      if (onError) onError(e);
    } else if (stage === 'fallback') {
      if (onError) onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (onLoad) onLoad(e);
  };

  // If stage is fallback (or currentSrc is empty) and no explicit fallbackSrc image was given,
  // render a clean, styled UI placeholder box
  if ((!currentSrc || stage === 'fallback') && !fallbackSrc) {
    return (
      <div className={`bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center text-slate-500 p-3 select-none ${className}`}>
        <ImageIcon className="w-7 h-7 opacity-40 mb-1" />
        <span className="text-[10px] font-mono tracking-wider opacity-60 uppercase truncate max-w-[90%] text-center">
          {alt || 'No Image'}
        </span>
      </div>
    );
  }

  const activeImage = currentSrc || fallbackSrc || '';

  // Adaptive mode: render a dual-layer frame where ambient blurred artwork fills the container,
  // and the crisp foreground image maintains its true natural aspect ratio (portrait/square/landscape) without cropping!
  if (adaptive) {
    return (
      <div className={`relative overflow-hidden flex items-center justify-center bg-slate-950 ${className}`}>
        {/* Ambient blurred backdrop matching the image's exact colors */}
        <img
          src={activeImage}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-40 pointer-events-none select-none transition-opacity duration-500"
        />

        {/* Main foreground image preserving 100% of original image dimensions and aspect ratio */}
        <img
          {...rest}
          src={activeImage}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={handleError}
          onLoad={handleLoad}
          className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={activeImage}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={handleLoad}
      className={className}
    />
  );
};
