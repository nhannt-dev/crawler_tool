import { Request, Response } from 'express';
import { CrawlSiteService } from '../services/CrawlSite.service';
import { ICreateCrawlDTO, IModifyCrawlDTO, IInitializeCrawlResponse, IModifyCrawlResponse, IPurgeCrawlResponse, IGetSitesResponse, ISiteDetailResponse, ICreateCategoryDTO, ICreateCategoryResponse } from '../types';

/**
 * CrawlSite Controller
 * 
 * Chịu trách nhiệm:
 * - Nhận request từ client
 * - Gọi service để xử lý business logic
 * - Format và trả về response
 * 
 * Theo MVVM pattern, Controller chỉ làm nhiệm vụ điều phối
 * KHÔNG chứa business logic phức tạp
 */
export class CrawlSiteController {
  private service: CrawlSiteService;

  constructor() {
    this.service = new CrawlSiteService();
  }

  /**
   * POST /api/initialize-crawl
   * 
   * Initialize a new crawl task
   * Request body: { link_type, title, crawl_link }
   */
  async initializeCrawl(req: Request, res: Response): Promise<void> {
    try {
      const createData: ICreateCrawlDTO = {
        link_type: req.body.link_type,
        title: req.body.title,
        crawl_link: req.body.crawl_link
      };

      // Call service to handle business logic
      const createdTask = await this.service.initializeCrawl(createData);

      // Format success response
      const response: IInitializeCrawlResponse = {
        success: true,
        task_id: createdTask.id,
        message: 'Crawl task initialized successfully',
        data: {
          id: createdTask.id,
          link_type: createdTask.link_type,
          title: createdTask.title,
          crawl_link: createdTask.crawl_link,
          slug: createdTask.slug,
          status: createdTask.status,
          created_at: createdTask.created_at
        }
      };

      res.status(201).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }

  /**
   * GET /api/crawl/:id
   * 
   * Get crawl task by ID
   */
  async getCrawlById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const task = await this.service.getCrawlById(id);

      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Crawl task not found',
          statusCode: 404
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: task.toJSON()
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * GET /api/crawl/slug/:slug
   * 
   * Get crawl task by slug
   */
  async getCrawlBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const task = await this.service.getCrawlBySlug(slug);

      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Crawl task not found',
          statusCode: 404
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: task.toJSON()
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * GET /api/crawls
   * 
   * Get all crawl tasks with pagination
   */
  async getAllCrawls(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;

      const tasks = await this.service.getAllCrawls(page, pageSize);

      res.status(200).json({
        success: true,
        data: tasks.map(task => task.toJSON()),
        pagination: {
          page,
          pageSize,
          total: tasks.length
        }
      });
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * PATCH /api/modify-crawl/:site_id
   * 
   * Modify an existing crawl task
   * Request body: { link_type, title, crawl_link }
   */
  async modifyCrawl(req: Request, res: Response): Promise<void> {
    try {
      const { site_id } = req.params;
      const modifyData: IModifyCrawlDTO = {
        link_type: req.body.link_type,
        title: req.body.title,
        crawl_link: req.body.crawl_link
      };

      // Call service to handle business logic
      const updatedTask = await this.service.modifyCrawl(site_id, modifyData);

      // Format success response
      const response: IModifyCrawlResponse = {
        success: true,
        task_id: updatedTask.id,
        message: 'Crawl task modified successfully',
        data: {
          id: updatedTask.id,
          link_type: updatedTask.link_type,
          title: updatedTask.title,
          crawl_link: updatedTask.crawl_link,
          slug: updatedTask.slug,
          status: updatedTask.status,
          created_at: updatedTask.created_at
        }
      };

      res.status(200).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }

  /**
   * DELETE /api/purge-crawl/:site_id
   * 
   * Delete an existing crawl task
   * This will permanently remove the task and all associated data
   */
  async purgeCrawl(req: Request, res: Response): Promise<void> {
    try {
      const { site_id } = req.params;

      // Call service to handle business logic
      const deletedId = await this.service.purgeCrawl(site_id);

      // Format success response
      const response: IPurgeCrawlResponse = {
        success: true,
        deleted_id: deletedId
      };

      res.status(200).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }

  /**
   * GET /api/sites
   * 
   * Get list of sites with optional filter and pagination
   * Query params:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * - filter: Filter by link_type ('URL' or 'API')
   */
  async getSites(req: Request, res: Response): Promise<void> {
    try {
      // Extract and parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const filter = req.query.filter as string | undefined;

      // Call service to get sites
      const response: IGetSitesResponse = await this.service.getSites(page, limit, filter);

      res.status(200).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }

  /**
   * GET /api/site/:slug
   * 
   * Get site detail with categories and subcategories
   */
  async getSiteDetailBySlug(req: Request, res: Response): Promise<void> {
    try {
      // Extract slug from URL params
      const { slug } = req.params;

      // Call service to get site detail
      const response: ISiteDetailResponse = await this.service.getSiteDetailBySlug(slug);

      res.status(200).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }

  /**
   * POST /api/crawl/:site_id/category
   * 
   * Crawl and create a new category for a site
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      // Extract site_id from URL params
      const { site_id } = req.params;

      // Extract data from request body
      const data: ICreateCategoryDTO = req.body;

      // Call service to crawl and create category
      const response: ICreateCategoryResponse = await this.service.crawlCategory(site_id, data);

      res.status(201).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }

  /**
   * PATCH /api/crawl/:site_id/:category_id
   * 
   * Update category with new selectors
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      // Extract site_id and category_id from URL params
      const { site_id, category_id } = req.params;

      // Extract data from request body
      const data: ICreateCategoryDTO = req.body;

      // Call service to update category
      const response = await this.service.updateCategory(site_id, category_id, data);

      res.status(200).json(response);
    } catch (error: any) {
      // Error handling được xử lý bởi error middleware
      throw error;
    }
  }
}
