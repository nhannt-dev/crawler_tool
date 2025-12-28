import { CrawlSiteRepository } from '../repositories/CrawlSite.repository';
import { CategoryRepository } from '../repositories/Category.repository';
import { CrawlSiteModel } from '../models/CrawlSite.model';
import { ICreateCrawlDTO, IModifyCrawlDTO, LinkType, CrawlStatus, IGetSitesResponse, ISiteListItem, ICrawlSite, ISiteDetailResponse, ICategoryResponseDTO, ICreateCategoryDTO, ICreateCategoryResponse, ICategoryEntity } from '../types';
import { snowflakeGenerator } from '../utils/snowflake';
import { generateUniqueSlug } from '../utils/slugify';
import puppeteer from 'puppeteer';

/**
 * CrawlSite Service
 * 
 * Chứa business logic của ứng dụng
 * Xử lý các quy tắc nghiệp vụ:
 * - Validate input
 * - Generate Snowflake ID
 * - Generate unique slug
 * - Orchestrate repository calls
 * 
 * Theo MVVM, Service là ViewModel layer
 */
export class CrawlSiteService {
  private repository: CrawlSiteRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.repository = new CrawlSiteRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Initialize a new crawl task
   * 
   * Business flow:
   * 1. Validate input data
   * 2. Generate Snowflake ID
   * 3. Generate unique slug from title
   * 4. Check slug uniqueness (retry with different slug if exists)
   * 5. Save to database with status = INIT
   * 6. Return created task
   * 
   * @param data - Create crawl DTO
   * @returns {Promise<CrawlSiteModel>}
   */
  async initializeCrawl(data: ICreateCrawlDTO): Promise<CrawlSiteModel> {
    // 1. Validate input
    this.validateCreateCrawlData(data);

    // 2. Generate Snowflake ID
    const taskId = snowflakeGenerator.generate();

    // 3. Generate unique slug
    let slug = generateUniqueSlug(data.title);
    let slugAttempts = 0;
    const maxSlugAttempts = 5;

    // 4. Ensure slug is unique (retry if exists)
    while (await this.repository.slugExists(slug) && slugAttempts < maxSlugAttempts) {
      slug = generateUniqueSlug(data.title);
      slugAttempts++;
    }

    if (slugAttempts >= maxSlugAttempts) {
      throw new Error('Failed to generate unique slug. Please try a different title.');
    }

    // 5. Create crawl site record
    const crawlSiteData = {
      id: taskId,
      link_type: data.link_type,
      title: data.title.trim(),
      crawl_link: data.crawl_link.trim(),
      slug: slug,
      status: CrawlStatus.INIT,
      categories: null,        // Null initially for future API
      sub_categories: null     // Null initially for future API
    };

    // Validate URL/API endpoint
    const tempModel = new CrawlSiteModel({
      ...crawlSiteData,
      created_at: new Date(),
      updated_at: new Date()
    });

    if (!tempModel.isValidCrawlLink()) {
      throw new Error(`Invalid ${data.link_type} format. Please provide a valid URL.`);
    }

    // 6. Save to database
    const createdTask = await this.repository.create(crawlSiteData);

    return createdTask;
  }

  /**
   * Validate create crawl data
   * @param data - Input data to validate
   */
  private validateCreateCrawlData(data: ICreateCrawlDTO): void {
    // Validate link_type
    if (!data.link_type || !Object.values(LinkType).includes(data.link_type)) {
      throw new Error('Invalid link_type. Must be either URL or API.');
    }

    // Validate title
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Title is required and must be a non-empty string.');
    }

    if (data.title.trim().length > 255) {
      throw new Error('Title must not exceed 255 characters.');
    }

    // Validate crawl_link
    if (!data.crawl_link || typeof data.crawl_link !== 'string' || data.crawl_link.trim().length === 0) {
      throw new Error('Crawl link is required and must be a non-empty string.');
    }
  }

  /**
   * Get crawl task by ID
   * @param id - Task ID (Snowflake ID)
   */
  async getCrawlById(id: string): Promise<CrawlSiteModel | null> {
    return await this.repository.findById(id);
  }

  /**
   * Get crawl task by slug
   * @param slug - URL slug
   */
  async getCrawlBySlug(slug: string): Promise<CrawlSiteModel | null> {
    return await this.repository.findBySlug(slug);
  }

  /**
   * Update crawl status
   * @param id - Task ID
   * @param status - New status
   */
  async updateCrawlStatus(id: string, status: CrawlStatus): Promise<void> {
    const task = await this.repository.findById(id);
    
    if (!task) {
      throw new Error('Crawl task not found.');
    }

    await this.repository.updateStatus(id, status);
  }

  /**
   * Update categories (for future use)
   * @param id - Task ID
   * @param categories - Categories data
   * @param subCategories - Sub-categories data
   */
  async updateCategories(
    id: string, 
    categories: any, 
    subCategories: any
  ): Promise<void> {
    const task = await this.repository.findById(id);
    
    if (!task) {
      throw new Error('Crawl task not found.');
    }

    const categoriesJson = categories ? JSON.stringify(categories) : null;
    const subCategoriesJson = subCategories ? JSON.stringify(subCategories) : null;

    await this.repository.updateCategories(id, categoriesJson, subCategoriesJson);
  }

  /**
   * Get all crawl tasks with pagination
   * @param page - Page number (1-indexed)
   * @param pageSize - Items per page
   */
  async getAllCrawls(page: number = 1, pageSize: number = 10): Promise<CrawlSiteModel[]> {
    const offset = (page - 1) * pageSize;
    return await this.repository.findAll(pageSize, offset);
  }

  /**
   * Get crawl tasks by status
   * @param status - Filter by status
   */
  async getCrawlsByStatus(status: CrawlStatus): Promise<CrawlSiteModel[]> {
    return await this.repository.findByStatus(status);
  }

  /**
   * Modify an existing crawl task
   * 
   * Business flow:
   * 1. Validate input data
   * 2. Check if record exists
   * 3. Generate unique slug from new title
   * 4. Check slug uniqueness (excluding current record)
   * 5. Update database keeping the same ID and reset status to INIT
   * 6. Return updated task
   * 
   * @param siteId - Task ID to modify
   * @param data - Modify crawl DTO
   * @returns {Promise<CrawlSiteModel>}
   */
  async modifyCrawl(
    siteId: string, 
    data: IModifyCrawlDTO
  ): Promise<CrawlSiteModel> {
    // 1. Check if record exists
    const existingTask = await this.repository.findById(siteId);
    if (!existingTask) {
      throw new Error('Crawl task not found.');
    }

    // 2. Prepare partial update data (only update provided fields)
    const updateData: Partial<Omit<ICrawlSite, 'created_at' | 'updated_at'>> = {
      id: siteId  // Keep same ID
    };

    // Only update link_type if provided
    if (data.link_type !== undefined) {
      updateData.link_type = data.link_type;
    }

    // Only update title and regenerate slug if title is provided
    if (data.title !== undefined) {
      this.validateModifyCrawlData({ title: data.title });
      
      // Generate unique slug from new title
      let slug = generateUniqueSlug(data.title);
      let slugAttempts = 0;
      const maxSlugAttempts = 5;

      // Ensure slug is unique (excluding current record ID)
      while (
        await this.repository.slugExistsExcludingId(slug, siteId) && 
        slugAttempts < maxSlugAttempts
      ) {
        slug = generateUniqueSlug(data.title);
        slugAttempts++;
      }

      if (slugAttempts >= maxSlugAttempts) {
        throw new Error('Failed to generate unique slug. Please try a different title.');
      }

      updateData.title = data.title.trim();
      updateData.slug = slug;
    }

    // Only update crawl_link if provided
    if (data.crawl_link !== undefined) {
      updateData.crawl_link = data.crawl_link.trim();
    }

    // Reset status to INIT when any field is modified
    updateData.status = CrawlStatus.INIT;
    
    // Reset categories and sub_categories when any field is modified
    updateData.categories = null;
    updateData.sub_categories = null;

    // Prepare full data for update (merge with existing data)
    const updatedCrawlSiteData = {
      id: siteId,
      link_type: updateData.link_type ?? existingTask.link_type,
      title: updateData.title ?? existingTask.title,
      crawl_link: updateData.crawl_link ?? existingTask.crawl_link,
      slug: updateData.slug ?? existingTask.slug,
      status: updateData.status,
      categories: updateData.categories,
      sub_categories: updateData.sub_categories
    };

    // Validate URL/API endpoint
    const tempModel = new CrawlSiteModel({
      ...updatedCrawlSiteData,
      created_at: new Date(),
      updated_at: new Date()
    });

    if (!tempModel.isValidCrawlLink()) {
      throw new Error(`Invalid ${data.link_type} format. Please provide a valid URL.`);
    }

    // 5. Update in database
    const updatedTask = await this.repository.update(siteId, updatedCrawlSiteData);

    return updatedTask;
  }

  /**
   * Validate modify crawl data
   * @param data - Input data to validate
   */
  private validateModifyCrawlData(data: IModifyCrawlDTO): void {
    // Validate link_type
    if (!data.link_type || !Object.values(LinkType).includes(data.link_type)) {
      throw new Error('Invalid link_type. Must be either URL or API.');
    }

    // Validate title
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('Title is required and must be a non-empty string.');
    }

    if (data.title.trim().length > 255) {
      throw new Error('Title must not exceed 255 characters.');
    }

    // Validate crawl_link
    if (!data.crawl_link || typeof data.crawl_link !== 'string' || data.crawl_link.trim().length === 0) {
      throw new Error('Crawl link is required and must be a non-empty string.');
    }
  }

  /**
   * Purge (delete) an existing crawl task
   * 
   * Business flow:
   * 1. Check if record exists
   * 2. Delete the record from database
   * 3. Return deleted ID
   * 
   * Note: When deleting the crawl_site record, all associated data
   * (categories, sub_categories stored as JSON) will be automatically removed
   * as they are part of the same record.
   * 
   * @param siteId - Task ID to delete
   * @returns {Promise<string>} - Deleted site ID
   */
  async purgeCrawl(siteId: string): Promise<string> {
    // 1. Check if record exists
    const existingTask = await this.repository.findById(siteId);
    if (!existingTask) {
      throw new Error('Crawl task not found.');
    }

    // 2. Delete the record (this will also remove categories and sub_categories)
    await this.repository.delete(siteId);

    // 3. Return deleted ID
    return siteId;
  }

  /**
   * Get sites list with optional filter and pagination
   * 
   * Business flow:
   * 1. Validate and parse pagination parameters
   * 2. Validate filter parameter if provided
   * 3. Call repository with filter and pagination
   * 4. Transform to response format
   * 5. Return data with pagination info
   * 
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param filter - Optional link_type filter ('URL' | 'API')
   * @returns {Promise<IGetSitesResponse>}
   */
  async getSites(
    page: number = 1,
    limit: number = 10,
    filter?: string
  ): Promise<IGetSitesResponse> {
    // 1. Validate and normalize pagination
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    const offset = (normalizedPage - 1) * normalizedLimit;

    // 2. Validate filter if provided
    let linkTypeFilter: LinkType | undefined;
    if (filter) {
      if (filter !== 'URL' && filter !== 'API') {
        throw new Error('Invalid filter value. Must be either "URL" or "API".');
      }
      linkTypeFilter = filter as LinkType;
    }

    // 3. Get sites from repository
    const { sites, total } = await this.repository.getSitesWithFilter(
      normalizedLimit,
      offset,
      linkTypeFilter
    );

    // 4. Transform to response format
    const data: ISiteListItem[] = sites.map(site => ({
      id: site.id,
      title: site.title,
      slug: site.slug,
      link_type: site.link_type,
      status: site.status,
      created_at: site.created_at
    }));

    // 5. Return with pagination info
    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total
      }
    };
  }

  /**
   * Get site detail by slug with categories
   * 
   * Business flow:
   * 1. Find site by slug
   * 2. Get all categories for the site
   * 3. Map to response structure
   * 4. Return site detail with categories
   * 
   * @param slug - Site slug
   * @returns {Promise<ISiteDetailResponse>}
   */
  async getSiteDetailBySlug(slug: string): Promise<ISiteDetailResponse> {
    // 1. Find site by slug
    const site = await this.repository.findBySlug(slug);
    if (!site) {
      throw new Error('Site not found');
    }

    // 2. Get all categories for this site
    const categories = await this.categoryRepository.getCategoriesBySiteId(site.id);

    // 3. Map to response structure
    const categoriesDTO: ICategoryResponseDTO[] = categories.map(category => ({
      id: category.id,
      title: category.title,
      slug: category.slug,
      title_selector: category.title_selector,
      link_selector: category.link_selector
    }));

    // 4. Return complete site detail
    return {
      id: site.id,
      title: site.title,
      slug: site.slug,
      link_type: site.link_type,
      status: site.status,
      categories: categoriesDTO
    };
  }

  /**
   * Crawl and create categories for a site
   * 
   * Business flow:
   * 1. Validate site exists
   * 2. Launch Puppeteer and navigate to site URL
   * 3. Extract ALL category titles matching selector (skip home pages)
   * 4. Generate unique slugs for each category
   * 5. Generate Snowflake IDs for all categories
   * 6. Save all categories to database in batch
   * 7. Return array of created categories
   * 
   * @param siteId - Site ID
   * @param data - Category selectors
   * @returns {Promise<ICreateCategoryResponse>}
   */
  async crawlCategory(
    siteId: string,
    data: ICreateCategoryDTO
  ): Promise<ICreateCategoryResponse> {
    // 1. Validate site exists
    const site = await this.repository.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    // 2. Validate selectors
    if (!data.title_selector || data.title_selector.trim().length === 0) {
      throw new Error('title_selector is required');
    }

    if (!data.link_selector || data.link_selector.trim().length === 0) {
      throw new Error('link_selector is required');
    }

    // 3. Launch Puppeteer and crawl ALL matching elements
    let categoryTitles: string[] = [];
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Navigate to site URL
      await page.goto(site.crawl_link, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Extract category titles using provided selector
      const titleElements = await page.$$(data.title_selector);
      
      if (titleElements.length === 0) {
        await browser.close();
        throw new Error(`No element found for selector: ${data.title_selector}`);
      }

      // Home page keywords to filter out (case-insensitive)
      const homeKeywords = [
        'home',
        'homepage',
        'home page',
        'trang chủ',
        'trangchu',
        'trang-chu',
        'index',
        '🏠', // home icon
        '⌂',  // home symbol
      ];

      // Extract all valid categories (skip home page links)
      for (let i = 0; i < titleElements.length; i++) {
        const element = titleElements[i];
        
        // Extract text and href
        const elementData = await page.evaluate((el) => {
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          return { text, href };
        }, element);

        const textLower = elementData.text.toLowerCase();
        const href = elementData.href.toLowerCase();

        // Skip if text is empty or only whitespace
        if (!elementData.text) {
          console.log(`Skipping element ${i}: empty text`);
          continue;
        }

        // Skip if text matches home keywords
        const isHomeKeyword = homeKeywords.some(keyword => 
          textLower === keyword || textLower.includes(keyword)
        );
        
        // Skip if href is root path or hash
        const isRootPath = href === '/' || href === '#' || href === '' || 
                          href.endsWith('/') && href.split('/').filter(Boolean).length === 0;

        // Skip home page elements
        if (isHomeKeyword || isRootPath) {
          console.log(`Skipping home page element ${i}: "${elementData.text}" (href: ${elementData.href})`);
          continue;
        }

        // Add valid category title
        categoryTitles.push(elementData.text);
      }

      await browser.close();

      if (categoryTitles.length === 0) {
        throw new Error('No valid category found - all elements are home page links or empty');
      }

      console.log(`Found ${categoryTitles.length} valid categories:`, categoryTitles);
    } catch (error: any) {
      throw new Error(`Crawl failed: ${error.message}`);
    }

    // 4. Generate unique slugs and Snowflake IDs for all categories
    const categoriesToCreate: Omit<ICategoryEntity, 'created_at' | 'updated_at'>[] = [];
    
    for (const title of categoryTitles) {
      // Generate unique slug from crawled title
      let slug = generateUniqueSlug(title);
      let slugAttempts = 0;
      const maxSlugAttempts = 5;

      // Ensure slug is unique within site scope
      while (
        await this.categoryRepository.slugExistsForSite(siteId, slug) &&
        slugAttempts < maxSlugAttempts
      ) {
        slug = generateUniqueSlug(title);
        slugAttempts++;
      }

      if (slugAttempts >= maxSlugAttempts) {
        console.warn(`Failed to generate unique slug for "${title}". Skipping...`);
        continue;
      }

      // Generate Snowflake ID for category
      const categoryId = snowflakeGenerator.generate();

      // Add to batch
      categoriesToCreate.push({
        id: categoryId,
        site_id: siteId,
        title: title,
        slug: slug,
        title_selector: data.title_selector.trim(),
        link_selector: data.link_selector.trim()
      });
    }

    if (categoriesToCreate.length === 0) {
      throw new Error('Failed to generate slugs for any category. Please try again.');
    }

    // 5. Batch insert all categories to database
    const createdCategories = await this.categoryRepository.createBatch(categoriesToCreate);

    // 6. Return response with all created categories
    return {
      site_id: siteId,
      total_created: createdCategories.length,
      categories: createdCategories.map(cat => ({
        id: cat.id,
        title: cat.title,
        slug: cat.slug,
        title_selector: cat.title_selector,
        link_selector: cat.link_selector
      }))
    };
  }

  /**
   * Update category with new selectors
   * 
   * Business flow:
   * 1. Validate site exists
   * 2. Validate category exists and belongs to site
   * 3. Launch Puppeteer and crawl with new selectors
   * 4. Extract category title
   * 5. Generate unique slug from title (excluding current category)
   * 6. Update category in database
   * 7. Return updated category
   * 
   * @param siteId - Site ID
   * @param categoryId - Category ID to update
   * @param data - New selectors
   * @returns {Promise<{ site_id: string; category: ICategoryResponseDTO }>}
   */
  async updateCategory(
    siteId: string,
    categoryId: string,
    data: ICreateCategoryDTO
  ): Promise<{ site_id: string; category: ICategoryResponseDTO }> {
    // 1. Validate site exists
    const site = await this.repository.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    // 2. Validate category exists and belongs to site
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    if (category.site_id !== siteId) {
      throw new Error('Category does not belong to this site');
    }

    // 3. Validate selectors
    if (!data.title_selector || data.title_selector.trim().length === 0) {
      throw new Error('title_selector is required');
    }

    if (!data.link_selector || data.link_selector.trim().length === 0) {
      throw new Error('link_selector is required');
    }

    // 4. Launch Puppeteer and crawl with new selectors
    let categoryTitle: string;
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Navigate to site URL
      await page.goto(site.crawl_link, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Extract category title using provided selector
      const titleElements = await page.$$(data.title_selector);
      
      if (titleElements.length === 0) {
        await browser.close();
        throw new Error(`No element found for selector: ${data.title_selector}`);
      }

      // Home page keywords to filter out
      const homeKeywords = [
        'home', 'homepage', 'home page',
        'trang chủ', 'trangchu', 'trang-chu',
        'index', '🏠', '⌂'
      ];

      // Find first valid category title (skip home page links)
      let validCategoryTitle = '';

      for (let i = 0; i < titleElements.length; i++) {
        const element = titleElements[i];
        
        const elementData = await page.evaluate((el) => {
          const text = el.textContent?.trim() || '';
          const href = el.getAttribute('href') || '';
          return { text, href };
        }, element);

        const textLower = elementData.text.toLowerCase();
        const href = elementData.href.toLowerCase();

        if (!elementData.text) continue;

        const isHomeKeyword = homeKeywords.some(keyword => 
          textLower === keyword || textLower.includes(keyword)
        );
        
        const isRootPath = href === '/' || href === '#' || href === '' || 
                          href.endsWith('/') && href.split('/').filter(Boolean).length === 0;

        if (isHomeKeyword || isRootPath) {
          console.log(`Skipping home page element: "${elementData.text}"`);
          continue;
        }

        validCategoryTitle = elementData.text;
        break;
      }

      await browser.close();

      if (!validCategoryTitle) {
        throw new Error('No valid category found - all elements are home page links or empty');
      }

      categoryTitle = validCategoryTitle;
    } catch (error: any) {
      throw new Error(`Crawl failed: ${error.message}`);
    }

    // 5. Generate unique slug from crawled title (excluding current category)
    let slug = generateUniqueSlug(categoryTitle);
    let slugAttempts = 0;
    const maxSlugAttempts = 5;

    while (
      await this.categoryRepository.slugExistsForSiteExcludingId(siteId, slug, categoryId) &&
      slugAttempts < maxSlugAttempts
    ) {
      slug = generateUniqueSlug(categoryTitle);
      slugAttempts++;
    }

    if (slugAttempts >= maxSlugAttempts) {
      throw new Error('Failed to generate unique slug. Please try again.');
    }

    // 6. Update category in database
    const updatedCategory = await this.categoryRepository.update(categoryId, {
      title: categoryTitle,
      slug: slug,
      title_selector: data.title_selector.trim(),
      link_selector: data.link_selector.trim()
    });

    // 7. Return response
    return {
      site_id: siteId,
      category: {
        id: updatedCategory.id,
        title: updatedCategory.title,
        slug: updatedCategory.slug,
        title_selector: updatedCategory.title_selector,
        link_selector: updatedCategory.link_selector
      }
    };
  }
}
