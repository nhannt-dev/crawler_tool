import { ICrawlSite, LinkType, CrawlStatus } from '../types';

/**
 * CrawlSite Model
 * 
 * Đại diện cho entity CrawlSite trong hệ thống
 * Theo MVVM pattern, Model chỉ chứa data và business logic cơ bản
 * Không chứa database logic (thuộc về Repository)
 */
export class CrawlSiteModel implements ICrawlSite {
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

  constructor(data: ICrawlSite) {
    this.id = data.id;
    this.link_type = data.link_type;
    this.title = data.title;
    this.crawl_link = data.crawl_link;
    this.slug = data.slug;
    this.status = data.status;
    this.categories = data.categories || null;
    this.sub_categories = data.sub_categories || null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Convert model to plain object for API response
   */
  toJSON(): ICrawlSite {
    return {
      id: this.id,
      link_type: this.link_type,
      title: this.title,
      crawl_link: this.crawl_link,
      slug: this.slug,
      status: this.status,
      categories: this.categories,
      sub_categories: this.sub_categories,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Validate if the crawl link is valid based on link_type
   */
  isValidCrawlLink(): boolean {
    if (this.link_type === LinkType.URL) {
      return this.isValidUrl(this.crawl_link);
    } else if (this.link_type === LinkType.API) {
      return this.isValidApiEndpoint(this.crawl_link);
    }
    return false;
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if API endpoint is valid
   */
  private isValidApiEndpoint(endpoint: string): boolean {
    try {
      const urlObj = new URL(endpoint);
      return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:');
    } catch {
      return false;
    }
  }

  /**
   * Check if task is in a running state
   */
  isRunning(): boolean {
    return this.status === CrawlStatus.RUNNING;
  }

  /**
   * Check if task is completed
   */
  isCompleted(): boolean {
    return this.status === CrawlStatus.DONE;
  }

  /**
   * Check if task has error
   */
  hasError(): boolean {
    return this.status === CrawlStatus.ERROR;
  }
}
