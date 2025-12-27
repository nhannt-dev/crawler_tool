const express = require('express');
const puppeteer = require('puppeteer');
const SnowflakeId = require('snowflake-id').default;
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crawler_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Khởi tạo Snowflake ID generator
const snowflake = new SnowflakeId({
  mid: 1,
  offset: (2024 - 1970) * 31536000 * 1000
});

// Khởi tạo database
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Tạo bảng crawl_history nếu chưa có
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crawl_history (
        id VARCHAR(50) PRIMARY KEY,
        url VARCHAR(2048) NOT NULL,
        title VARCHAR(500),
        description TEXT,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        h1_count INT DEFAULT 0,
        h2_count INT DEFAULT 0,
        links_count INT DEFAULT 0,
        images_count INT DEFAULT 0,
        has_screenshot BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_url (url(255)),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Tạo bảng category_crawl để lưu kết quả crawl category
    await connection.query(`
      CREATE TABLE IF NOT EXISTS category_crawl (
        id VARCHAR(50) PRIMARY KEY,
        request_id VARCHAR(50) NOT NULL,
        selector VARCHAR(500) NOT NULL,
        total_items INT DEFAULT 0,
        filtered_items INT DEFAULT 0,
        crawl_data JSON,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES crawl_history(id) ON DELETE CASCADE,
        INDEX idx_request_id (request_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    connection.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

// Middleware để parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API endpoint để crawl trang web
app.post('/api/crawl', async (req, res) => {
  const { url } = req.body;
  
  // Validate URL
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required in request body'
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format'
    });
  }

  // Generate unique request ID
  const requestId = snowflake.generate();

  let browser;
  try {
    // Khởi tạo Puppeteer browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent để tránh bị chặn
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Đi đến URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Lấy thông tin từ trang
    const pageData = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
        ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
        links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        })).slice(0, 50), // Giới hạn 50 links đầu tiên
        images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
          alt: img.alt,
          src: img.src
        })).slice(0, 20) // Giới hạn 20 images đầu tiên
      };
    });

    // Lấy screenshot
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: false
    });

    await browser.close();

    // Lưu vào database
    try {
      await pool.query(
        `INSERT INTO crawl_history (id, url, title, description, status, h1_count, h2_count, links_count, images_count, has_screenshot) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId.toString(),
          url,
          pageData.title || null,
          pageData.description || null,
          'success',
          pageData.h1.length,
          pageData.h2.length,
          pageData.links.length,
          pageData.images.length,
          true
        ]
      );
    } catch (dbError) {
      console.error('Database save error:', dbError.message);
    }

    // Trả về kết quả
    res.json({
      success: true,
      requestId: requestId.toString(),
      timestamp: new Date().toISOString(),
      data: {
        ...pageData,
        screenshot: `data:image/png;base64,${screenshot}`
      }
    });

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    // Lưu lỗi vào database
    try {
      await pool.query(
        `INSERT INTO crawl_history (id, url, status, error_message) 
         VALUES (?, ?, ?, ?)`,
        [requestId.toString(), url, 'failed', error.message]
      );
    } catch (dbError) {
      console.error('Database save error:', dbError.message);
    }
    
    console.error('Crawl error:', error);
    res.status(500).json({
      success: false,
      requestId: requestId.toString(),
      error: 'Failed to crawl the URL',
      message: error.message
    });
  }
});

// API crawl category theo selector từ requestId
app.post('/api/crawl/:requestId/category', async (req, res) => {
  const { requestId } = req.params;
  const { selector, subCategorySelector } = req.body;
  
  // Validate selector
  if (!selector) {
    return res.status(400).json({
      success: false,
      error: 'Selector is required in request body'
    });
  }

  let browser;
  try {
    // Lấy thông tin crawl từ database
    const [rows] = await pool.query(
      'SELECT url, status FROM crawl_history WHERE id = ?',
      [requestId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request ID not found'
      });
    }
    
    const { url, status } = rows[0];
    
    if (status !== 'success') {
      return res.status(400).json({
        success: false,
        error: 'Original crawl was not successful',
        url
      });
    }

    // Khởi tạo Puppeteer browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Đi đến URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Lấy dữ liệu theo selector (category và sub_category)
    const rawCategoryData = await page.evaluate((sel, subSel) => {
      // Helper function để lấy text bao gồm pseudo-elements
      const getFullText = (element) => {
        let text = element.textContent.trim();
        
        // Lấy content từ ::before
        const beforeContent = window.getComputedStyle(element, '::before').content;
        if (beforeContent && beforeContent !== 'none' && beforeContent !== '""') {
          const beforeText = beforeContent.replace(/^["']|["']$/g, ''); // Bỏ dấu ngoặc kép
          text = beforeText + ' ' + text;
        }
        
        // Lấy content từ ::after
        const afterContent = window.getComputedStyle(element, '::after').content;
        if (afterContent && afterContent !== 'none' && afterContent !== '""') {
          const afterText = afterContent.replace(/^["']|["']$/g, ''); // Bỏ dấu ngoặc kép
          text = text + ' ' + afterText;
        }
        
        return text.trim();
      };
      
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map((el, index) => {
        const item = {
          index: index + 1,
          text: getFullText(el),
          originalText: el.textContent.trim(), // Text gốc không có pseudo-element
          html: el.innerHTML,
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          id: el.id,
          href: el.href || null,
          src: el.src || null
        };
        
        // Nếu có subCategorySelector, lấy sub_category trong element này
        if (subSel) {
          const subElements = el.querySelectorAll(subSel);
          item.sub_category = Array.from(subElements).map((subEl, subIndex) => ({
            index: subIndex + 1,
            text: getFullText(subEl),
            originalText: subEl.textContent.trim(),
            html: subEl.innerHTML,
            tagName: subEl.tagName.toLowerCase(),
            className: subEl.className,
            id: subEl.id,
            href: subEl.href || null,
            src: subEl.src || null
          }));
        }
        
        return item;
      });
    }, selector, subCategorySelector || null);

    await browser.close();

    // Filter bỏ các item không hợp lệ (category)
    const categoryData = rawCategoryData.filter(item => {
      const text = item.text.toLowerCase();
      
      // Bỏ qua nếu text null hoặc rỗng
      if (!item.text || item.text.length === 0) return false;
      
      // Bỏ qua nếu chỉ chứa icon hoặc ký tự đặc biệt
      if (/^[\s\u200B-\u200D\uFEFF\u00A0]*$/.test(item.text)) return false;
      
      // Bỏ qua nếu chứa "trang chủ" hoặc "home"
      if (text === 'trang chủ' || text === 'home' || text === 'trangchủ') return false;
      
      // Bỏ qua nếu chỉ chứa các ký tự icon phổ biến
      if (/^[\u2190-\u21FF\u2600-\u26FF\u2700-\u27BF\uE000-\uF8FF]+$/.test(item.text)) return false;
      
      return true;
    }).map((item, index) => {
      // Chỉ filter sub_category nếu có
      if (subCategorySelector && item.sub_category) {
        const filteredSubCategory = item.sub_category.filter(subItem => {
          const subText = subItem.text.toLowerCase();
          if (!subItem.text || subItem.text.length === 0) return false;
          if (/^[\s\u200B-\u200D\uFEFF\u00A0]*$/.test(subItem.text)) return false;
          if (subText === 'trang chủ' || subText === 'home' || subText === 'trangchủ') return false;
          if (/^[\u2190-\u21FF\u2600-\u26FF\u2700-\u27BF\uE000-\uF8FF]+$/.test(subItem.text)) return false;
          return true;
        }).map((subItem, subIndex) => ({
          ...subItem,
          index: subIndex + 1
        }));
        
        return {
          ...item,
          index: index + 1,
          sub_category: filteredSubCategory
        };
      } else {
        return {
          ...item,
          index: index + 1
        };
      }
    });

    // Đếm tổng sub_category (nếu có)
    const totalSubCategories = subCategorySelector 
      ? categoryData.reduce((sum, item) => sum + (item.sub_category ? item.sub_category.length : 0), 0)
      : undefined;

    // Kiểm tra nếu có subCategorySelector nhưng không tìm thấy sub_category nào
    if (subCategorySelector && totalSubCategories === 0) {
      await browser.close();
      return res.status(400).json({
        success: false,
        error: 'No sub-categories found',
        message: `Selector "${subCategorySelector}" did not match any elements within the selected categories. Please check your selector.`,
        selector,
        subCategorySelector,
        categoriesFound: categoryData.length
      });
    }

    // Lưu vào database
    try {
      const categoryId = snowflake.generate();
      await pool.query(
        `INSERT INTO category_crawl (id, request_id, selector, total_items, filtered_items, crawl_data, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          categoryId.toString(),
          requestId,
          subCategorySelector ? `${selector} (sub: ${subCategorySelector})` : selector,
          rawCategoryData.length,
          categoryData.length,
          JSON.stringify(categoryData),
          'success'
        ]
      );
    } catch (dbError) {
      console.error('Database save error:', dbError.message);
    }

    // Trả về kết quả
    const response = {
      success: true,
      requestId,
      url,
      selector,
      totalCount: rawCategoryData.length,
      filteredCount: categoryData.length,
      timestamp: new Date().toISOString(),
      data: categoryData
    };
    
    // Chỉ thêm các field liên quan đến sub_category nếu có subCategorySelector
    if (subCategorySelector) {
      response.subCategorySelector = subCategorySelector;
      response.totalSubCategories = totalSubCategories;
    }
    
    res.json(response);

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    // Lưu lỗi vào database
    try {
      const categoryId = snowflake.generate();
      await pool.query(
        `INSERT INTO category_crawl (id, request_id, selector, status, error_message) 
         VALUES (?, ?, ?, ?, ?)`,
        [categoryId.toString(), requestId, selector, 'failed', error.message]
      );
    } catch (dbError) {
      console.error('Database save error:', dbError.message);
    }
    
    console.error('Category crawl error:', error);
    res.status(500).json({
      success: false,
      requestId,
      error: 'Failed to crawl category',
      message: error.message
    });
  }
});

// API lấy lịch sử crawl
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status; // 'success' hoặc 'failed'
    
    let query = 'SELECT * FROM crawl_history';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    
    // Đếm tổng số records
    let countQuery = 'SELECT COUNT(*) as total FROM crawl_history';
    if (status) {
      countQuery += ' WHERE status = ?';
      const [countResult] = await pool.query(countQuery, status ? [status] : []);
      var total = countResult[0].total;
    } else {
      const [countResult] = await pool.query(countQuery);
      var total = countResult[0].total;
    }
    
    res.json({
      success: true,
      total,
      limit,
      offset,
      data: rows
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

// API lấy chi tiết crawl theo ID
app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM crawl_history WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crawl record not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('History detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history detail',
      message: error.message
    });
  }
});

// API thống kê
app.get('/api/stats', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_crawls,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_crawls,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_crawls,
        COUNT(DISTINCT url) as unique_urls
      FROM crawl_history
    `);
    
    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Crawler server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Crawler Server API',
    endpoints: {
      health: 'GET /api/health',
      crawl: 'POST /api/crawl',
      crawlCategory: 'POST /api/crawl/:requestId/category',
      history: 'GET /api/history',
      historyDetail: 'GET /api/history/:id',
      stats: 'GET /api/stats'
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Crawler Server is running on port ${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/crawl`);
  console.log(`📊 History: http://localhost:${PORT}/api/history`);
  console.log(`📈 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  
  // Khởi tạo database
  await initDatabase();
});
