-- ================================================
-- Database Schema for Crawler Tool API
-- ================================================

-- Create database
CREATE DATABASE IF NOT EXISTS crawler_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE crawler_db;

-- ================================================
-- Table: crawl_site
-- ================================================
CREATE TABLE IF NOT EXISTS crawl_site (
  -- Primary Key: Snowflake ID (19 characters max for JavaScript safe integer)
  id VARCHAR(20) PRIMARY KEY COMMENT 'Snowflake ID for distributed system',
  
  -- Link configuration
  link_type ENUM('URL', 'API') NOT NULL COMMENT 'Type of crawl link: URL or API',
  title VARCHAR(255) NOT NULL COMMENT 'Title of the crawl task',
  crawl_link TEXT NOT NULL COMMENT 'The actual URL or API endpoint to crawl',
  slug VARCHAR(255) NOT NULL UNIQUE COMMENT 'URL-friendly unique identifier generated from title',
  
  -- Status tracking
  status ENUM('INIT', 'RUNNING', 'DONE', 'ERROR') NOT NULL DEFAULT 'INIT' COMMENT 'Current status of crawl task',
  
  -- Categories (for future APIs - initially NULL)
  categories JSON NULL COMMENT 'Categories extracted from crawl (populated later)',
  sub_categories JSON NULL COMMENT 'Sub-categories extracted from crawl (populated later)',
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  -- Indexes for performance
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_link_type (link_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main table for crawler tasks';

-- ================================================
-- Table: categories
-- ================================================
CREATE TABLE IF NOT EXISTS categories (
  -- Primary Key: Snowflake ID
  id VARCHAR(20) PRIMARY KEY COMMENT 'Snowflake ID for distributed system',
  
  -- Foreign Key to crawl_site
  site_id VARCHAR(20) NOT NULL COMMENT 'Reference to crawl_site.id',
  
  -- Category data
  title VARCHAR(255) NOT NULL COMMENT 'Category title extracted from crawl',
  slug VARCHAR(255) NOT NULL COMMENT 'URL-friendly identifier generated from title',
  title_selector VARCHAR(500) NOT NULL COMMENT 'CSS selector for extracting category title',
  link_selector VARCHAR(500) NOT NULL COMMENT 'CSS selector for extracting category link',
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  -- Foreign Key constraint
  FOREIGN KEY (site_id) REFERENCES crawl_site(id) ON DELETE CASCADE,
  
  -- Unique constraint: slug must be unique per site
  UNIQUE KEY unique_slug_per_site (site_id, slug),
  
  -- Indexes for performance
  INDEX idx_site_id (site_id),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Categories extracted from crawl sites';

-- ================================================
-- Sample Data (Optional - for testing)
-- ================================================
-- INSERT INTO crawl_site (id, link_type, title, crawl_link, slug, status) VALUES
-- ('1234567890123456789', 'URL', 'Example Website', 'https://example.com', 'example-website-abc123', 'INIT');
-- 
-- INSERT INTO categories (id, site_id, slug, title_selector, link_selector) VALUES
-- ('1234567890123456790', '1234567890123456789', 'technology-abc123', 'h2.category-title', 'a.category-link');
