/**
 * Image helper utilities for handling Cloudinary URLs
 */

/**
 * Convert image data to URL string
 * Handles both string URLs and object format {url, publicId}
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  const normalizedUrl = url.replace(/\\/g, '/').trim();

  if (/^(https?:)?\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('blob:')) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith('/')) {
    return `${API_ORIGIN}${normalizedUrl}`;
  }

  return `${API_ORIGIN}/${normalizedUrl}`;
};

export const getImageUrl = (image, fallback = 'https://via.placeholder.com/300?text=No+Image') => {
  if (!image) return fallback;
  if (typeof image === 'string') return resolveImageUrl(image);
  if (typeof image === 'object' && image.url) return resolveImageUrl(image.url);
  return fallback;
};

/**
 * Get the first valid image URL from an array
 */
export const getFirstImageUrl = (images, fallback = 'https://via.placeholder.com/300?text=No+Image') => {
  if (!images || !Array.isArray(images) || images.length === 0) return fallback;
  return getImageUrl(images[0], fallback);
};

/**
 * Convert array of images to URLs
 */
export const imagesToUrls = (images, fallback = 'https://via.placeholder.com/300?text=No+Image') => {
  if (!images || !Array.isArray(images)) return [fallback];
  return images
    .map(img => getImageUrl(img, fallback))
    .filter(url => url !== null && url !== undefined);
};

/**
 * Check if image URL is from Cloudinary
 */
export const isCloudinaryUrl = (url) => {
  if (!url) return false;
  return typeof url === 'string' && url.includes('cloudinary.com');
};

/**
 * Get optimized Cloudinary URL with transformations
 */
export const getOptimizedCloudinaryUrl = (url, width = 300, height = 300, quality = 'auto') => {
  if (!isCloudinaryUrl(url)) return url;
  
  // Extract the image path from Cloudinary URL
  const match = url.match(/\/image\/upload\/(.*?)$/);
  if (!match) return url;
  
  const imagePath = match[1];
  const baseUrl = url.split('/image/upload/')[0];
  
  return `${baseUrl}/image/upload/w_${width},h_${height},c_fill,q_${quality}/${imagePath}`;
};

const imageHelper = {
  getImageUrl,
  getFirstImageUrl,
  imagesToUrls,
  isCloudinaryUrl,
  getOptimizedCloudinaryUrl,
};

export default imageHelper;
