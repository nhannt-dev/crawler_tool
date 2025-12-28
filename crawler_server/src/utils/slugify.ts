import slugify from 'slugify';

/**
 * Generate URL-friendly slug from title
 * 
 * @param title - The title string to convert
 * @param suffix - Optional suffix to ensure uniqueness (e.g., timestamp or counter)
 * @returns {string} - URL-friendly slug
 */
export const generateSlug = (title: string, suffix?: string): string => {
  const baseSlug = slugify(title, {
    lower: true,           // Convert to lowercase
    strict: true,          // Strip special characters
    locale: 'en',          // English locale support
    trim: true,            // Trim leading/trailing replacement chars
    replacement: '-'       // Replace spaces with hyphens
  });

  if (suffix) {
    return `${baseSlug}-${suffix}`;
  }

  return baseSlug;
};

/**
 * Generate unique slug with timestamp
 * Đảm bảo slug unique bằng cách thêm timestamp
 * 
 * @param title - The title string to convert
 * @returns {string} - Unique slug with timestamp
 */
export const generateUniqueSlug = (title: string): string => {
  const timestamp = Date.now().toString(36); // Base36 for shorter string
  return generateSlug(title, timestamp);
};
