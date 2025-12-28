# Crawler Tool API

Hệ thống API tool crawler được xây dựng với kiến trúc MVVM, sử dụng NodeJS (TypeScript), Express, MySQL và Puppeteer.

## 📋 Mục lục

- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#️-kiến-trúc-hệ-thống)
- [Cài đặt và chạy](#-cài-đặt-và-chạy)
- [Database Schema](#️-database-schema)
- [API Documentation](#-api-documentation)
  - [1. Initialize Crawl](#1-initialize-crawl)
  - [2. Modify Crawl](#2-modify-crawl)
  - [3. Purge Crawl](#3-purge-crawl)
  - [4. Get Sites List](#4-get-sites-list)
  - [5. Get Site Detail](#5-get-site-detail)
  - [6. Crawl and Create Category](#6-crawl-and-create-category)
  - [7. Update Category](#7-update-category)
- [Testing](#-testing)

---

## 🚀 Công nghệ sử dụng

| Technology | Version | Purpose |
|------------|---------|---------|
| **NodeJS** | 18+ | Runtime environment |
| **TypeScript** | 5.0+ | Type-safe JavaScript |
| **Express** | 4.18+ | Web framework |
| **MySQL** | 8.0+ | Relational database |
| **Puppeteer** | 21.6+ | Web scraping & automation |
| **Snowflake ID** | - | Distributed ID generation |
| **Slugify** | 1.6+ | URL-friendly slug generation |

---

## 🏗️ Kiến trúc hệ thống

Hệ thống được xây dựng theo **MVVM (Model-View-ViewModel) Pattern**:

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                    │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                   ROUTES & VALIDATOR                 │
│  - Route definition                                  │
│  - Input validation                                  │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                    CONTROLLER                        │
│  - Nhận request                                      │
│  - Extract parameters                                │
│  - Gọi Service                                       │
│  - Format response                                   │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                SERVICE (ViewModel)                   │
│  - Business logic                                    │
│  - Generate Snowflake ID                             │
│  - Generate unique slug                              │
│  - Puppeteer crawling                                │
│  - Orchestrate repository calls                      │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                    REPOSITORY                        │
│  - Database operations (CRUD)                        │
│  - Query execution                                   │
│  - Data mapping to Models                            │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                    MODEL                             │
│  - Data structure & validation                       │
│  - Entity representation                             │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                DATABASE (MySQL)                      │
└─────────────────────────────────────────────────────┘
```

**Cấu trúc thư mục:**

```
src/
├── config/           # Database connection pool
├── models/           # Entity models với validation
├── repositories/     # Database operations (CRUD)
├── services/         # Business logic (ViewModel)
├── controllers/      # Request handlers
├── routes/           # API route definitions
├── validators/       # Input validation middleware
├── middlewares/      # Error handling, logging
├── types/            # TypeScript interfaces
└── utils/            # Helpers (Snowflake, Slugify)
```

---

## 🔧 Cài đặt và chạy

### 1. Prerequisites

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm or yarn

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Database

Tạo file `.env` trong thư mục root:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crawler_db

# Server
PORT=3000
NODE_ENV=development
```

### 4. Tạo Database

```bash
mysql -u root -p < database/schema.sql
```

### 5. Chạy Development Server

```bash
npm run dev
```

Server chạy tại: `http://localhost:3000`

### 6. Build Production

```bash
npm run build
npm start
```

---

## 🗄️ Database Schema

### Table: `crawl_site`

```sql
CREATE TABLE crawl_site (
  id VARCHAR(20) PRIMARY KEY,
  link_type ENUM('URL', 'API') NOT NULL,
  title VARCHAR(255) NOT NULL,
  crawl_link TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('INIT', 'RUNNING', 'DONE', 'ERROR') DEFAULT 'INIT',
  categories JSON NULL,
  sub_categories JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_link_type (link_type),
  INDEX idx_created_at (created_at DESC)
);
```

### Table: `categories`

```sql
CREATE TABLE categories (
  id VARCHAR(20) PRIMARY KEY,
  site_id VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title_selector VARCHAR(500) NOT NULL,
  link_selector VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (site_id) REFERENCES crawl_site(id) ON DELETE CASCADE,
  UNIQUE KEY unique_slug_per_site (site_id, slug),
  INDEX idx_site_id (site_id),
  INDEX idx_slug (slug)
);
```

**Relationships:**

```
crawl_site (1) ─── (N) categories
    │
   id ←────── site_id (ON DELETE CASCADE)
```

---

## 📚 API Documentation

Base URL: `http://localhost:3000`

### 1. Initialize Crawl

Tạo mới một task crawl site.

**Endpoint:** `POST /api/initialize-crawl`

**Request Body:**

```json
{
  "link_type": "URL",
  "title": "Example Website",
  "crawl_link": "https://example.com"
}
```

| Field | Type | Required | Description | Values |
|-------|------|----------|-------------|--------|
| link_type | string | Yes | Loại link cần crawl | "URL", "API" |
| title | string | Yes | Tiêu đề (max 255 chars) | - |
| crawl_link | string | Yes | URL hoặc API endpoint | Valid URL |

**Success Response (201 Created):**

```json
{
  "success": true,
  "task_id": "1734512345678901234",
  "slug": "example-website-abc123",
  "status": "INIT",
  "message": "Crawl task initialized successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Title is required and must be a non-empty string.",
  "statusCode": 400
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Test Site",
    "crawl_link": "https://example.com"
  }'
```

---

### 2. Modify Crawl

Cập nhật thông tin của task crawl. Hỗ trợ **partial update** (chỉ gửi field muốn thay đổi).

**Endpoint:** `PATCH /api/modify-crawl/:site_id`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| site_id | string | Yes | Task ID cần update |

**Request Body (partial update):**

```json
{
  "title": "Updated Title"
}
```

Hoặc update nhiều fields:

```json
{
  "link_type": "API",
  "title": "Updated Title",
  "crawl_link": "https://new-url.com"
}
```

| Field | Type | Required | Description | Values |
|-------|------|----------|-------------|--------|
| link_type | string | No | Loại link cần crawl | "URL", "API" |
| title | string | No | Tiêu đề mới (max 255 chars) | - |
| crawl_link | string | No | URL hoặc API endpoint mới | Valid URL |

**Lưu ý:**
- Hỗ trợ **PARTIAL UPDATE** - chỉ gửi field muốn thay đổi
- **GIỮ NGUYÊN ID** của task
- Status reset về **INIT** khi update
- Categories/sub_categories reset về **null**
- Nếu update `title`, slug mới sẽ tự động sinh
- Phải gửi ít nhất 1 field

**Success Response (200 OK):**

```json
{
  "success": true,
  "task_id": "1734512345678901234",
  "message": "Crawl task modified successfully",
  "data": {
    "id": "1734512345678901234",
    "link_type": "URL",
    "title": "Updated Title",
    "crawl_link": "https://example.com",
    "slug": "updated-title-xyz123",
    "status": "INIT",
    "created_at": "2025-12-28T10:00:00.000Z"
  }
}
```

**cURL Example:**

```bash
# Update chỉ title
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title"}'

# Update nhiều fields
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "API",
    "crawl_link": "https://api.new.com"
  }'
```

---

### 3. Purge Crawl

Xóa vĩnh viễn task crawl và tất cả dữ liệu liên quan.

**Endpoint:** `DELETE /api/purge-crawl/:site_id`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| site_id | string | Yes | Task ID cần xóa |

**Lưu ý:**
- **XÓA VĨNH VIỄN** task khỏi database
- Categories liên quan sẽ bị xóa theo (CASCADE DELETE)
- **Không thể khôi phục** sau khi xóa

**Success Response (200 OK):**

```json
{
  "success": true,
  "deleted_id": "1734512345678901234"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Crawl task not found.",
  "statusCode": 404
}
```

**cURL Example:**

```bash
curl -X DELETE http://localhost:3000/api/purge-crawl/1734512345678901234
```

---

### 4. Get Sites List

Lấy danh sách sites với filter và pagination.

**Endpoint:** `GET /api/sites`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number (1-indexed) |
| limit | number | No | 10 | Items per page (min: 1, max: 100) |
| filter | string | No | - | Filter by link_type ('URL' or 'API') |

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "1734512345678901234",
      "title": "Example Website",
      "slug": "example-website-abc123",
      "link_type": "URL",
      "status": "INIT",
      "created_at": "2025-12-28T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

**cURL Examples:**

```bash
# Get all sites (default pagination)
curl http://localhost:3000/api/sites

# Get with custom pagination
curl "http://localhost:3000/api/sites?page=2&limit=20"

# Filter by URL type
curl "http://localhost:3000/api/sites?filter=URL"

# Combined filter + pagination
curl "http://localhost:3000/api/sites?filter=API&page=1&limit=5"
```

---

### 5. Get Site Detail

Lấy thông tin chi tiết site kèm categories.

**Endpoint:** `GET /api/site/:slug`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| slug | string | Yes | Site slug (URL-friendly ID) |

**Success Response (200 OK):**

```json
{
  "id": "1734512345678901234",
  "title": "Example Website",
  "slug": "example-website-abc123",
  "link_type": "URL",
  "status": "DONE",
  "categories": [
    {
      "id": "1734512345678901235",
      "title": "Technology",
      "slug": "technology-xyz",
      "title_selector": "h2.category-title",
      "link_selector": "a.category-link"
    }
  ]
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Site not found",
  "statusCode": 404
}
```

**cURL Example:**

```bash
curl http://localhost:3000/api/site/example-website-abc123
```

---

### 6. Crawl and Create Category

Crawl một trang web để trích xuất **TẤT CẢ** categories matching selector và lưu vào database. API tự động **bỏ qua các link trang chủ/homepage**.

**Endpoint:** `POST /api/crawl/:site_id/category`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| site_id | string | Yes | Site ID (Snowflake ID) |

**Request Body:**

```json
{
  "title_selector": "h2.category-title",
  "link_selector": "a.category-link"
}
```

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| title_selector | string | Yes | 500 | CSS selector for category title |
| link_selector | string | Yes | 500 | CSS selector for category link |

**Important Notes:**
- API sẽ crawl **TẤT CẢ elements** matching selector
- **Tự động bỏ qua** các element là home page/trang chủ
- Lưu **batch** tất cả categories vào MySQL cùng lúc
- Các keywords home page được filter: `home`, `homepage`, `trang chủ`, `🏠`, etc.
- Các root path được filter: `/`, `#`, empty href

**Success Response (201 Created):**

```json
{
  "site_id": "1734512345678901234",
  "total_created": 5,
  "categories": [
    {
      "id": "1734512345678901235",
      "title": "Technology",
      "slug": "technology-abc123",
      "title_selector": "ul.menu-nav > li > a.nav-link",
      "link_selector": "ul.menu-nav > li > a.nav-link[href]"
    },
    {
      "id": "1734512345678901236",
      "title": "Sports",
      "slug": "sports-xyz456",
      "title_selector": "ul.menu-nav > li > a.nav-link",
      "link_selector": "ul.menu-nav > li > a.nav-link[href]"
    },
    {
      "id": "1734512345678901237",
      "title": "Entertainment",
      "slug": "entertainment-def789",
      "title_selector": "ul.menu-nav > li > a.nav-link",
      "link_selector": "ul.menu-nav > li > a.nav-link[href]"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| site_id | string | Site ID |
| total_created | number | Số lượng categories đã tạo |
| categories | array | Danh sách categories đã crawl |
| categories[].id | string | Category ID (Snowflake) |
| categories[].title | string | Category title (extracted from page) |
| categories[].slug | string | URL-friendly slug (auto-generated) |
| categories[].title_selector | string | CSS selector used |
| categories[].link_selector | string | CSS selector used |

**Error Responses:**

**Site Not Found (404):**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Site not found",
  "statusCode": 404
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "title_selector is required; link_selector is required",
  "statusCode": 400
}
```

**Crawl Failed (500):**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Crawl failed: No element found for selector: h2.category-title",
  "statusCode": 500
}
```

**No Valid Category (500):**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "No valid category found - all elements are home page links or empty",
  "statusCode": 500
}
```

**cURL Examples:**

```bash
# Crawl all categories from menu
curl -X POST http://localhost:3000/api/crawl/1734512345678901234/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "ul.menu-nav > li > a.nav-link",
    "link_selector": "ul.menu-nav > li > a.nav-link[href]"
  }'

# Crawl specific section
curl -X POST http://localhost:3000/api/crawl/1734512345678901234/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "div.sidebar h3.category-name",
    "link_selector": "div.sidebar a.category-url"
  }'
```

**Flow khi crawl nhiều elements:**

```html
<!-- Example HTML -->
<ul class="menu-nav">
  <li><a class="nav-link" href="/">🏠 Home</a></li>        <!-- SKIPPED -->
  <li><a class="nav-link" href="/">Trang chủ</a></li>     <!-- SKIPPED -->
  <li><a class="nav-link" href="/tech">Technology</a></li> <!-- CREATED ✓ -->
  <li><a class="nav-link" href="/sports">Sports</a></li>   <!-- CREATED ✓ -->
  <li><a class="nav-link" href="/news">News</a></li>       <!-- CREATED ✓ -->
</ul>
```

**Kết quả:**
- Selector `ul.menu-nav > li > a.nav-link` match **5 elements**
- Skip **2 elements** đầu (home page)
- Crawl **3 categories hợp lệ**: Technology, Sports, News
- Batch insert vào MySQL
- Return `total_created: 3` với array of 3 categories

---

## 🧪 Testing

### Complete Workflow Test

```bash
#!/bin/bash

# 1. Create a site
echo "=== Creating site ==="
TASK_ID=$(curl -s -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Tech News",
    "crawl_link": "https://example.com"
  }' | jq -r '.task_id')

echo "Created site: $TASK_ID"

# 2. Get site list
echo -e "\n=== Getting sites list ==="
curl -s "http://localhost:3000/api/sites?limit=5" | jq

# 3. Create first category
echo -e "\n=== Creating first category ==="
curl -s -X POST http://localhost:3000/api/crawl/$TASK_ID/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "ul.menu-nav > li > a.nav-link",
    "link_selector": "ul.menu-nav > li > a.nav-link[href]"
  }' | jq

# Response will contain ALL categories crawled (not just one)
# Example:
# {
#   "site_id": "...",
#   "total_created": 5,
#   "categories": [
#     {"id": "...", "title": "Technology", "slug": "technology-abc"},
#     {"id": "...", "title": "Sports", "slug": "sports-xyz"},
#     ...
#   ]
# }

# 4. Get site detail with categories
echo -e "\n=== Getting site detail ==="
SLUG=$(curl -s http://localhost:3000/api/sites | jq -r '.data[0].slug')
curl -s http://localhost:3000/api/site/$SLUG | jq

# 5. Modify site
echo -e "\n=== Modifying site ==="
curl -s -X PATCH http://localhost:3000/api/modify-crawl/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Tech News"}' | jq

# 6. Delete site (cascade delete categories)
echo -e "\n=== Deleting site ==="
curl -s -X DELETE http://localhost:3000/api/purge-crawl/$TASK_ID | jq

echo -e "\n=== Test completed ==="
```

Save script trên vào `test.sh` và chạy:

```bash
chmod +x test.sh
./test.sh
```

---

### 7. Update Category

**Endpoint:** `PATCH /api/crawl/{site_id}/{category_id}`

Update an existing category with new selectors, automatically crawl the new title and regenerate the slug.

**URL Parameters:**
- `site_id` (string, required): The Snowflake ID of the site
- `category_id` (string, required): The Snowflake ID of the category to update

**Request Body:**
```json
{
  "title_selector": "div.category-name > a",
  "link_selector": "a.category-link"
}
```

**Business Rules:**
1. Validates that the site exists
2. Validates that the category exists
3. Validates that the category belongs to the specified site
4. Launches Puppeteer to crawl the site with the new selectors
5. Extracts the title using `title_selector` (auto-skips home page links)
6. Generates a unique slug from the crawled title (excludes current category from uniqueness check)
7. Updates the category with new title, slug, and selectors

**Success Response (200 OK):**
```json
{
  "site_id": "7318887623000637440",
  "category": {
    "id": "7318920077853147136",
    "slug": "dien-thoai-may-tinh-bang",
    "title": "Điện thoại, máy tính bảng",
    "title_selector": "div.category-name > a",
    "link_selector": "a.category-link",
    "created_at": "2024-01-15T08:30:00.000Z",
    "updated_at": "2024-01-15T10:45:00.000Z"
  }
}
```

**Error Responses:**

- **404 Not Found** (Site doesn't exist):
```json
{
  "error": "Site not found"
}
```

- **404 Not Found** (Category doesn't exist):
```json
{
  "error": "Category not found"
}
```

- **403 Forbidden** (Category doesn't belong to site):
```json
{
  "error": "Category does not belong to this site"
}
```

- **400 Bad Request** (Validation failed):
```json
{
  "errors": [
    {
      "field": "title_selector",
      "message": "Title selector is required"
    }
  ]
}
```

- **500 Internal Server Error** (Crawl failed):
```json
{
  "error": "Failed to crawl category"
}
```

**Example cURL:**
```bash
# Update category with new selectors
curl -X PATCH http://localhost:3000/api/crawl/7318887623000637440/7318920077853147136 \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "div.updated-selector > a",
    "link_selector": "a.new-link-selector"
  }'

# Verify the update
curl http://localhost:3000/api/site/tiki
```

**Notes:**
- The slug is automatically regenerated from the newly crawled title
- Slug uniqueness is checked per site (excludes the category being updated)
- Vietnamese characters in titles are converted to URL-friendly slugs
- Home page links are automatically filtered out during crawling
- All fields except `id`, `site_id`, `created_at` are updated

---

## 📊 API Summary

| Endpoint | Method | Purpose | Key Features |
|----------|--------|---------|--------------|
| `/api/initialize-crawl` | POST | Tạo task mới | Snowflake ID, unique slug |
| `/api/modify-crawl/:id` | PATCH | Update task | Partial update, ID preserved |
| `/api/purge-crawl/:id` | DELETE | Xóa task | Cascade delete categories |
| `/api/sites` | GET | List sites | Filter, pagination |
| `/api/site/:slug` | GET | Site detail | Include categories |
| `/api/crawl/:site_id/category` | POST | Crawl categories | Puppeteer, auto skip home, batch insert |
| `/api/crawl/:site_id/:category_id` | PATCH | Update category | Validation, crawl, slug regeneration |

---

## 🎯 Best Practices

**MVVM Pattern:**
- ✅ Tách biệt concerns (Model, View, ViewModel)
- ✅ Single Responsibility cho mỗi layer
- ✅ Business logic tập trung ở Service

**Security:**
- ✅ Input validation với middleware
- ✅ Prepared statements (SQL injection prevention)
- ✅ Environment variables cho sensitive data

**Performance:**
- ✅ Database connection pooling
- ✅ Indexes cho frequently queried columns
- ✅ Pagination cho large datasets

**Error Handling:**
- ✅ Centralized error handler
- ✅ Meaningful error messages
- ✅ Proper HTTP status codes

---

## 📖 Snowflake ID

Snowflake ID là thuật toán sinh ID phân tán của Twitter:

**Structure (64 bits):**
```
[41 bits: Timestamp] [5 bits: Datacenter] [5 bits: Worker] [12 bits: Sequence]
```

**Ưu điểm:**
- ✅ Unique trong hệ thống phân tán
- ✅ Time-ordered (ID tăng theo thời gian)
- ✅ High performance (hàng nghìn ID/giây)
- ✅ No central coordination needed

**Example:**
```
ID: 1734512345678901234
Timestamp: 2025-12-28 10:30:45
Worker: 1
Sequence: 789
```

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Backend Architect - Senior Level
