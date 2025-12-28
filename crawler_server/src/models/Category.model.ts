import { ICategoryEntity } from '../types';

/**
 * Category Model
 * 
 * Represents a category entity extracted from crawl sites
 */
export class CategoryModel {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  title_selector: string;
  link_selector: string;
  created_at: Date;
  updated_at: Date;

  constructor(data: ICategoryEntity) {
    this.id = data.id;
    this.site_id = data.site_id;
    this.title = data.title;
    this.slug = data.slug;
    this.title_selector = data.title_selector;
    this.link_selector = data.link_selector;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Validate category data
   */
  validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Category id is required');
    }

    if (!this.site_id || this.site_id.trim().length === 0) {
      throw new Error('Category site_id is required');
    }

    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Category title is required');
    }

    if (this.title.length > 255) {
      throw new Error('Category title must not exceed 255 characters');
    }

    if (!this.slug || this.slug.trim().length === 0) {
      throw new Error('Category slug is required');
    }

    if (this.slug.length > 255) {
      throw new Error('Category slug must not exceed 255 characters');
    }

    if (!this.title_selector || this.title_selector.trim().length === 0) {
      throw new Error('Category title_selector is required');
    }

    if (this.title_selector.length > 500) {
      throw new Error('Category title_selector must not exceed 500 characters');
    }

    if (!this.link_selector || this.link_selector.trim().length === 0) {
      throw new Error('Category link_selector is required');
    }

    if (this.link_selector.length > 500) {
      throw new Error('Category link_selector must not exceed 500 characters');
    }
  }
}
