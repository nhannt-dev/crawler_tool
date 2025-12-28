import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { CrawlSiteModel } from '../models/CrawlSite.model';
import { ICrawlSite, CrawlStatus, LinkType } from '../types';

/**
 * CrawlSite Repository
 * 
 * Chịu trách nhiệm tương tác với database
 * Theo Repository pattern, tách biệt logic database khỏi business logic
 * Dễ dàng thay đổi database hoặc thêm caching layer sau này
 */
export class CrawlSiteRepository {
  private tableName = 'crawl_site';

  /**
   * Create new crawl site record
   * @param crawlSite - CrawlSite data to insert
   * @returns {Promise<CrawlSiteModel>} - Created record
   */
  async create(crawlSite: Omit<ICrawlSite, 'created_at' | 'updated_at'>): Promise<CrawlSiteModel> {
    const query = `
      INSERT INTO ${this.tableName} 
      (id, link_type, title, crawl_link, slug, status, categories, sub_categories)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      crawlSite.id,
      crawlSite.link_type,
      crawlSite.title,
      crawlSite.crawl_link,
      crawlSite.slug,
      crawlSite.status,
      crawlSite.categories || null,
      crawlSite.sub_categories || null
    ];

    try {
      await pool.execute<ResultSetHeader>(query, params);
      
      // Fetch the created record
      const created = await this.findById(crawlSite.id);
      if (!created) {
        throw new Error('Failed to retrieve created record');
      }
      
      return created;
    } catch (error: any) {
      // Handle duplicate slug error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Slug already exists. Please use a different title.');
      }
      throw error;
    }
  }

  /**
   * Find crawl site by ID
   * @param id - Snowflake ID
   * @returns {Promise<CrawlSiteModel | null>}
   */
  async findById(id: string): Promise<CrawlSiteModel | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }

    return new CrawlSiteModel(rows[0] as ICrawlSite);
  }

  /**
   * Find crawl site by slug
   * @param slug - URL-friendly slug
   * @returns {Promise<CrawlSiteModel | null>}
   */
  async findBySlug(slug: string): Promise<CrawlSiteModel | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE slug = ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [slug]);
    
    if (rows.length === 0) {
      return null;
    }

    return new CrawlSiteModel(rows[0] as ICrawlSite);
  }

  /**
   * Check if slug exists
   * @param slug - Slug to check
   * @returns {Promise<boolean>}
   */
  async slugExists(slug: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE slug = ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [slug]);
    
    return rows[0].count > 0;
  }

  /**
   * Update crawl site status
   * @param id - Snowflake ID
   * @param status - New status
   */
  async updateStatus(id: string, status: CrawlStatus): Promise<void> {
    const query = `UPDATE ${this.tableName} SET status = ? WHERE id = ?`;
    
    await pool.execute<ResultSetHeader>(query, [status, id]);
  }

  /**
   * Update categories and sub_categories
   * @param id - Snowflake ID
   * @param categories - Categories JSON string
   * @param subCategories - Sub-categories JSON string
   */
  async updateCategories(
    id: string, 
    categories: string | null, 
    subCategories: string | null
  ): Promise<void> {
    const query = `
      UPDATE ${this.tableName} 
      SET categories = ?, sub_categories = ? 
      WHERE id = ?
    `;
    
    await pool.execute<ResultSetHeader>(query, [categories, subCategories, id]);
  }

  /**
   * Get all crawl sites with pagination
   * @param limit - Number of records per page
   * @param offset - Offset for pagination
   * @returns {Promise<CrawlSiteModel[]>}
   */
  async findAll(limit: number = 10, offset: number = 0): Promise<CrawlSiteModel[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [limit, offset]);
    
    return rows.map((row: RowDataPacket) => new CrawlSiteModel(row as ICrawlSite));
  }

  /**
   * Get crawl sites by status
   * @param status - Filter by status
   * @returns {Promise<CrawlSiteModel[]>}
   */
  async findByStatus(status: CrawlStatus): Promise<CrawlSiteModel[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [status]);
    
    return rows.map((row: RowDataPacket) => new CrawlSiteModel(row as ICrawlSite));
  }

  /**
   * Delete crawl site by ID
   * @param id - Snowflake ID
   */
  async delete(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    
    await pool.execute<ResultSetHeader>(query, [id]);
  }

  /**
   * Update crawl site record (keep same ID)
   * Supports partial updates - only updates provided fields
   * @param id - Snowflake ID (unchanged)
   * @param crawlSite - New crawl site data (can be partial)
   * @returns {Promise<CrawlSiteModel>} - Updated record
   */
  async update(
    id: string, 
    crawlSite: Partial<Omit<ICrawlSite, 'created_at' | 'updated_at'>> & { id: string }
  ): Promise<CrawlSiteModel> {
    const query = `
      UPDATE ${this.tableName} 
      SET link_type = ?, title = ?, crawl_link = ?, 
          slug = ?, status = ?, categories = ?, sub_categories = ?
      WHERE id = ?
    `;

    const params = [
      crawlSite.link_type,
      crawlSite.title,
      crawlSite.crawl_link,
      crawlSite.slug,
      crawlSite.status,
      crawlSite.categories || null,
      crawlSite.sub_categories || null,
      id  // ID remains unchanged
    ];

    try {
      await pool.execute<ResultSetHeader>(query, params);
      
      // Fetch the updated record
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated record');
      }
      
      return updated;
    } catch (error: any) {
      // Handle duplicate slug error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Slug already exists. Please use a different title.');
      }
      throw error;
    }
  }

  /**
   * Check if slug exists excluding a specific ID
   * @param slug - Slug to check
   * @param excludeId - ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async slugExistsExcludingId(slug: string, excludeId: string): Promise<boolean> {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE slug = ? AND id != ?`;
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, [slug, excludeId]);
    
    return rows[0].count > 0;
  }

  /**
   * Get sites with optional filter by link_type
   * @param limit - Number of records per page
   * @param offset - Offset for pagination
   * @param linkTypeFilter - Optional filter by link_type
   * @returns {Promise<{ sites: CrawlSiteModel[], total: number }>}
   */
  async getSitesWithFilter(
    limit: number,
    offset: number,
    linkTypeFilter?: LinkType
  ): Promise<{ sites: CrawlSiteModel[], total: number }> {
    let query = `SELECT * FROM ${this.tableName}`;
    let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params: any[] = [];

    // Add filter if provided
    if (linkTypeFilter) {
      const whereClause = ` WHERE link_type = ?`;
      query += whereClause;
      countQuery += whereClause;
      params.push(linkTypeFilter);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    // Execute count query first
    const [countRows] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countRows[0].total;

    // Execute main query
    const queryParams = linkTypeFilter ? [...params, limit, offset] : [limit, offset];
    const [rows] = await pool.execute<RowDataPacket[]>(query, queryParams);
    
    const sites = rows.map((row: RowDataPacket) => new CrawlSiteModel(row as ICrawlSite));

    return { sites, total };
  }
}
