// Utility functions for handling images safely

export const getImageWithFallback = (src: string, fallback: string = '/images/placeholder-food.svg'): string => {
  // If it's already a local image, return as is
  if (src.startsWith('/') || src.startsWith('./')) {
    return src;
  }
  
  // For external URLs, we'll let the SafeImage component handle the fallback
  return src;
};

export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const img = event.currentTarget;
  if (img.src !== '/images/placeholder-food.svg') {
    img.src = '/images/placeholder-food.svg';
  }
};

// List of domains that are known to have rate limiting issues
export const PROBLEMATIC_DOMAINS = [
  'archanaskitchen.com',
  'cookingfromheart.com',
  'indisch-kochen.com',
  'wallpapercave.com',
  'vegrecipesofindia.com',
  'chaibag.com',
  'flavorquotient.com',
  'skydecklounge.in',
  'vaya.in',
  'licious.in',
  'tse1.mm.bing.net',
  'tse2.mm.bing.net',
  'tse3.mm.bing.net',
  'tse4.mm.bing.net',
  'static.vecteezy.com'
];

export const isProblematicDomain = (url: string): boolean => {
  return PROBLEMATIC_DOMAINS.some(domain => url.includes(domain));
};