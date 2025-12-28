import { Router } from 'express';
import { CrawlSiteController } from '../controllers/CrawlSite.controller';
import { CrawlSiteValidator } from '../validators/CrawlSite.validator';
import { asyncHandler } from '../middlewares/errorHandler';

/**
 * Crawl Routes
 * 
 * Định nghĩa các API endpoints cho crawl operations
 */
const router = Router();
const controller = new CrawlSiteController();

/**
 * POST /api/initialize-crawl
 * Initialize a new crawl task
 */
router.post(
  '/initialize-crawl',
  CrawlSiteValidator.validateInitializeCrawl,
  asyncHandler(controller.initializeCrawl.bind(controller))
);

/**
 * GET /api/crawl/:id
 * Get crawl task by ID
 */
router.get(
  '/crawl/:id',
  asyncHandler(controller.getCrawlById.bind(controller))
);

/**
 * GET /api/crawl/slug/:slug
 * Get crawl task by slug
 */
router.get(
  '/crawl/slug/:slug',
  asyncHandler(controller.getCrawlBySlug.bind(controller))
);

/**
 * GET /api/crawls
 * Get all crawl tasks with pagination
 */
router.get(
  '/crawls',
  asyncHandler(controller.getAllCrawls.bind(controller))
);

/**
 * GET /api/sites
 * Get sites list with optional filter and pagination
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - filter: Filter by link_type ('URL' or 'API')
 */
router.get(
  '/sites',
  asyncHandler(controller.getSites.bind(controller))
);

/**
 * GET /api/site/:slug
 * Get site detail with categories
 */
router.get(
  '/site/:slug',
  asyncHandler(controller.getSiteDetailBySlug.bind(controller))
);

/**
 * POST /api/crawl/:site_id/category
 * Crawl and create a new category for a site
 */
router.post(
  '/crawl/:site_id/category',
  CrawlSiteValidator.validateCreateCategory,
  asyncHandler(controller.createCategory.bind(controller))
);

/**
 * PATCH /api/crawl/:site_id/:category_id
 * Update category with new selectors
 */
router.patch(
  '/crawl/:site_id/:category_id',
  CrawlSiteValidator.validateUpdateCategory,
  asyncHandler(controller.updateCategory.bind(controller))
);

/**
 * PATCH /api/modify-crawl/:site_id
 * Modify an existing crawl task
 */
router.patch(
  '/modify-crawl/:site_id',
  CrawlSiteValidator.validateModifyCrawl,
  asyncHandler(controller.modifyCrawl.bind(controller))
);

/**
 * DELETE /api/purge-crawl/:site_id
 * Delete an existing crawl task
 */
router.delete(
  '/purge-crawl/:site_id',
  asyncHandler(controller.purgeCrawl.bind(controller))
);

export default router;
