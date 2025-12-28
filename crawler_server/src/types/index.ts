/**
 * Enums for CrawlSite
 */

export enum LinkType {
  URL = 'URL',
  API = 'API'
}

export enum CrawlStatus {
  INIT = 'INIT',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  ERROR = 'ERROR'
}

/**
 * Interface for CrawlSite entity
 */
export interface ICrawlSite {
  id: string;
  link_type: LinkType;
  title: string;
  crawl_link: string;
  slug: string;
  status: CrawlStatus;
  categories?: string | null;
  sub_categories?: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO for creating a new crawl task
 */
export interface ICreateCrawlDTO {
  link_type: LinkType;
  title: string;
  crawl_link: string;
}

/**
 * DTO for modifying an existing crawl task
 * All fields are optional - only send fields you want to update
 */
export interface IModifyCrawlDTO {
  link_type?: LinkType;
  title?: string;
  crawl_link?: string;
}

/**
 * Response interface for initialize crawl API
 */
export interface IInitializeCrawlResponse {
  success: boolean;
  task_id: string;
  message: string;
  data: {
    id: string;
    link_type: LinkType;
    title: string;
    crawl_link: string;
    slug: string;
    status: CrawlStatus;
    created_at: Date;
  };
}

/**
 * Error response interface
 */
export interface IErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Response interface for modify crawl API
 */
export interface IModifyCrawlResponse {
  success: boolean;
  task_id: string;
  message: string;
  data: {
    id: string;
    link_type: LinkType;
    title: string;
    crawl_link: string;
    slug: string;
    status: CrawlStatus;
    created_at: Date;
  };
}

/**
 * Response interface for purge crawl API
 */
export interface IPurgeCrawlResponse {
  success: boolean;
  deleted_id: string;
}

/**
 * Site list item for GET /api/sites
 */
export interface ISiteListItem {
  id: string;
  title: string;
  slug: string;
  link_type: LinkType;
  status: CrawlStatus;
  created_at: Date;
}

/**
 * Response interface for get sites API
 */
export interface IGetSitesResponse {
  data: ISiteListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Category interface (new structure with Snowflake ID)
 */
export interface ICategoryEntity {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  title_selector: string;
  link_selector: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO for creating a new category
 */
export interface ICreateCategoryDTO {
  title_selector: string;
  link_selector: string;
}

/**
 * Category DTO for response
 */
export interface ICategoryResponseDTO {
  id: string;
  title: string;
  slug: string;
  title_selector: string;
  link_selector: string;
}

/**
 * Response interface for create category API
 */
export interface ICreateCategoryResponse {
  site_id: string;
  total_created: number;
  categories: ICategoryResponseDTO[];
}

/**
 * Site detail response with categories
 */
export interface ISiteDetailResponse {
  id: string;
  title: string;
  slug: string;
  link_type: LinkType;
  status: CrawlStatus;
  categories: ICategoryResponseDTO[];
}
