import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onError?: () => void;
}

const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = '/images/placeholder-food.svg',
  onError 
}) => {
  const [imgSrc, setImgSrc] = useState(API_CONFIG.getAssetUrl(src) || '');
  
  useEffect(() => {
    setImgSrc(API_CONFIG.getAssetUrl(src) || '');
  }, [src]);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      onError?.();
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default SafeImage;