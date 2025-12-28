import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { ICategoryEntity } from '../types';
import { CategoryModel } from '../models/Category.model';

/**
 * Category Repository
 * 
 * Chịu trách nhiệm:
 * - Database operations cho categories table
 * - CRUD operations
 * - Query execution
 * 
 * Theo MVVM pattern, Repository chỉ tương tác với database
 * KHÔNG chứa business logic
 */
export class CategoryRepository {
  private tableName = 'categories';

  /**
   * Get all categories by site_id
   * @param siteId - Crawl site ID
   * @returns {Promise<CategoryModel[]>}
   */
  async getCategoriesBySiteId(siteId: string): Promise<CategoryModel[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE site_id = ? ORDER BY created_at ASC`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [siteId]);
    
    return rows.map((row: RowDataPacket) => new CategoryModel(row as ICategoryEntity));
  }

  /**
   * Get category by ID
   * @param id - Category ID (Snowflake)
   * @returns {Promise<CategoryModel | null>}
   */
  async findById(id: string): Promise<CategoryModel | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return new CategoryModel(rows[0] as ICategoryEntity);
  }

  /**
   * Check if slug exists for a specific site
   * @param siteId - Site ID
   * @param slug - Category slug
   * @returns {Promise<boolean>}
   */
  async slugExistsForSite(siteId: string, slug: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE site_id = ? AND slug = ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [siteId, slug]);
    
    return (rows[0] as any).count > 0;
  }

  /**
   * Create a new category
   * @param category - Category data (without created_at/updated_at)
   * @returns {Promise<CategoryModel>}
   */
  async create(category: Omit<ICategoryEntity, 'created_at' | 'updated_at'>): Promise<CategoryModel> {
    const query = `
      INSERT INTO ${this.tableName} (id, site_id, title, slug, title_selector, link_selector)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      category.id,
      category.site_id,
      category.title,
      category.slug,
      category.title_selector,
      category.link_selector
    ];

    try {
      await pool.execute<ResultSetHeader>(query, params);
      
      // Fetch the created record
      const created = await this.findById(category.id);
      if (!created) {
        throw new Error('Failed to retrieve created category');
      }
      
      return created;
    } catch (error: any) {
      // Handle duplicate slug error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Category slug already exists for this site. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Create multiple categories in batch
   * @param categories - Array of category data
   * @returns {Promise<CategoryModel[]>}
   */
  async createBatch(categories: Omit<ICategoryEntity, 'created_at' | 'updated_at'>[]): Promise<CategoryModel[]> {
    if (categories.length === 0) {
      return [];
    }

    // Build batch insert query
    const values = categories.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const query = `
      INSERT INTO ${this.tableName} (id, site_id, title, slug, title_selector, link_selector)
      VALUES ${values}
    `;

    // Flatten params array
    const params: any[] = [];
    categories.forEach(cat => {
      params.push(cat.id, cat.site_id, cat.title, cat.slug, cat.title_selector, cat.link_selector);
    });

    try {
      await pool.execute<ResultSetHeader>(query, params);
      
      // Fetch all created records
      const ids = categories.map(c => c.id);
      const placeholders = ids.map(() => '?').join(', ');
      const selectQuery = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;
      
      const [rows] = await pool.execute<RowDataPacket[]>(selectQuery, ids);
      
      return rows.map((row: RowDataPacket) => new CategoryModel(row as ICategoryEntity));
    } catch (error: any) {
      // Handle duplicate slug error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('One or more category slugs already exist for this site. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Check if slug exists for a specific site (excluding a specific category ID)
   * @param siteId - Site ID
   * @param slug - Category slug
   * @param excludeCategoryId - Category ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async slugExistsForSiteExcludingId(siteId: string, slug: string, excludeCategoryId: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE site_id = ? AND slug = ? AND id != ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [siteId, slug, excludeCategoryId]);
    
    return (rows[0] as any).count > 0;
  }

  /**
   * Update a category
   * @param id - Category ID
   * @param data - Updated category data
   * @returns {Promise<CategoryModel>}
   */
  async update(id: string, data: Partial<Omit<ICategoryEntity, 'id' | 'created_at' | 'updated_at'>>): Promise<CategoryModel> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      params.push(data.title);
    }

    if (data.slug !== undefined) {
      fields.push('slug = ?');
      params.push(data.slug);
    }

    if (data.title_selector !== undefined) {
      fields.push('title_selector = ?');
      params.push(data.title_selector);
    }

    if (data.link_selector !== undefined) {
      fields.push('link_selector = ?');
      params.push(data.link_selector);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`;

    try {
      await pool.execute<ResultSetHeader>(query, params);
      
      // Fetch the updated record
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated category');
      }
      
      return updated;
    } catch (error: any) {
      // Handle duplicate slug error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Category slug already exists for this site. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Delete all categories for a site
   * @param siteId - Crawl site ID
   */
  async deleteCategoriesBySiteId(siteId: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE site_id = ?`;
    
    await pool.execute<ResultSetHeader>(query, [siteId]);
  }

  /**
   * Delete category by ID
   * @param id - Category ID
   */
  async delete(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    
    await pool.execute<ResultSetHeader>(query, [id]);
  }
}
