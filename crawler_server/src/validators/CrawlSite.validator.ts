import { Request, Response, NextFunction } from 'express';
import { ICreateCrawlDTO, IModifyCrawlDTO, LinkType } from '../types';

/**
 * Validator for CrawlSite requests
 * 
 * Middleware để validate request trước khi đến controller
 * Đảm bảo data sạch và đúng format
 */
export class CrawlSiteValidator {
  /**
   * Validate initialize crawl request
   */
  static validateInitializeCrawl(req: Request, res: Response, next: NextFunction): void {
    const { link_type, title, crawl_link } = req.body as ICreateCrawlDTO;

    const errors: string[] = [];

    // Validate link_type
    if (!link_type) {
      errors.push('link_type is required');
    } else if (!Object.values(LinkType).includes(link_type)) {
      errors.push('link_type must be either "URL" or "API"');
    }

    // Validate title
    if (!title) {
      errors.push('title is required');
    } else if (typeof title !== 'string') {
      errors.push('title must be a string');
    } else if (title.trim().length === 0) {
      errors.push('title cannot be empty');
    } else if (title.trim().length > 255) {
      errors.push('title must not exceed 255 characters');
    }

    // Validate crawl_link
    if (!crawl_link) {
      errors.push('crawl_link is required');
    } else if (typeof crawl_link !== 'string') {
      errors.push('crawl_link must be a string');
    } else if (crawl_link.trim().length === 0) {
      errors.push('crawl_link cannot be empty');
    }

    // If there are validation errors, return 400
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: errors.join('; '),
        statusCode: 400
      });
      return;
    }

    // Validation passed, proceed to controller
    next();
  }

  /**
   * Validate modify crawl request
   * For PATCH: All fields are optional, only validate provided fields
   */
  static validateModifyCrawl(req: Request, res: Response, next: NextFunction): void {
    const { link_type, title, crawl_link } = req.body as IModifyCrawlDTO;

    const errors: string[] = [];

    // Check if at least one field is provided
    if (!link_type && !title && !crawl_link) {
      errors.push('At least one field (link_type, title, or crawl_link) must be provided');
    }

    // Validate link_type if provided
    if (link_type !== undefined) {
      if (!Object.values(LinkType).includes(link_type)) {
        errors.push('link_type must be either "URL" or "API"');
      }
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string') {
        errors.push('title must be a string');
      } else if (title.trim().length === 0) {
        errors.push('title cannot be empty');
      } else if (title.trim().length > 255) {
        errors.push('title must not exceed 255 characters');
      }
    }

    // Validate crawl_link if provided
    if (crawl_link !== undefined) {
      if (typeof crawl_link !== 'string') {
        errors.push('crawl_link must be a string');
      } else if (crawl_link.trim().length === 0) {
        errors.push('crawl_link cannot be empty');
      }
    }

    // Validate site_id parameter
    const { site_id } = req.params;
    if (!site_id || typeof site_id !== 'string' || site_id.trim().length === 0) {
      errors.push('site_id is required in URL path');
    }

    // If there are validation errors, return 400
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: errors.join('; '),
        statusCode: 400
      });
      return;
    }

    // Validation passed, proceed to controller
    next();
  }

  /**
   * Validate create category request
   */
  static validateCreateCategory(req: Request, res: Response, next: NextFunction): void {
    const { title_selector, link_selector } = req.body;

    const errors: string[] = [];

    // Validate title_selector
    if (!title_selector) {
      errors.push('title_selector is required');
    } else if (typeof title_selector !== 'string') {
      errors.push('title_selector must be a string');
    } else if (title_selector.trim().length === 0) {
      errors.push('title_selector cannot be empty');
    } else if (title_selector.length > 500) {
      errors.push('title_selector must not exceed 500 characters');
    }

    // Validate link_selector
    if (!link_selector) {
      errors.push('link_selector is required');
    } else if (typeof link_selector !== 'string') {
      errors.push('link_selector must be a string');
    } else if (link_selector.trim().length === 0) {
      errors.push('link_selector cannot be empty');
    } else if (link_selector.length > 500) {
      errors.push('link_selector must not exceed 500 characters');
    }

    // Validate site_id parameter
    const { site_id } = req.params;
    if (!site_id || typeof site_id !== 'string' || site_id.trim().length === 0) {
      errors.push('site_id is required in URL path');
    }

    // If there are validation errors, return 400
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: errors.join('; '),
        statusCode: 400
      });
      return;
    }

    // Validation passed, proceed to controller
    next();
  }
}
