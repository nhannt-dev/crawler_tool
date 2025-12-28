# Crawler Tool API

Hệ thống API tool crawler được xây dựng với kiến trúc MVVM, sử dụng NodeJS (TypeScript), Express, MySQL và Puppeteer.

## 📋 Mục lục

- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cài đặt và chạy](#cài-đặt-và-chạy)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
  - [1. Initialize Crawl](#1-initialize-crawl)
  - [2. Modify Crawl](#2-modify-crawl)
  - [3. Purge Crawl](#3-purge-crawl)
  - [4. Get Sites List](#4-get-sites-list)
  - [5. Get Site Detail](#5-get-site-detail)
  - [6. Crawl and Create Category](#6-crawl-and-create-category)
- [Luồng xử lý](#luồng-xử-lý)
- [Testing](#testing)

## 🚀 Công nghệ sử dụng

- **NodeJS** với **TypeScript** - Type-safe JavaScript
- **Express** - Web framework
- **MySQL** - Relational database
- **Puppeteer** - Web scraping và automation
- **Snowflake ID** - Distributed ID generation
- **Slugify** - URL-friendly slug generation

## 🏗️ Kiến trúc hệ thống

Hệ thống được xây dựng theo **MVVM (Model-View-ViewModel) Pattern**:

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    CONTROLLER                        │
│  - Nhận request                                      │
│  - Validate input (Validator)                        │
│  - Gọi Service                                       │
│  - Format response                                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    SERVICE (ViewModel)               │
│  - Business logic                                    │
│  - Generate Snowflake ID                             │
│  - Generate unique slug                              │
│  - Orchestrate repository calls                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    REPOSITORY                        │
│  - Database operations (CRUD)                        │
│  - Query execution                                   │
│  - Data mapping                                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    MODEL                             │
│  - Data structure                                    │
│  - Business validation                               │
│  - Entity representation                             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    DATABASE (MySQL)                  │
└─────────────────────────────────────────────────────┘
```

### Tại sao chọn MVVM?

✅ **Separation of Concerns**: Mỗi layer có trách nhiệm riêng biệt  
✅ **Testability**: Dễ dàng unit test từng layer độc lập  
✅ **Scalability**: Dễ mở rộng và thêm features mới  
✅ **Maintainability**: Code rõ ràng, dễ bảo trì  
✅ **Reusability**: Service và Repository có thể tái sử dụng  

## 📁 Cấu trúc thư mục

```
crawler_tool/
├── src/
│   ├── config/
│   │   └── database.ts              # MySQL connection pool config
│   ├── models/
│   │   └── CrawlSite.model.ts       # CrawlSite entity model
│   ├── repositories/
│   │   └── CrawlSite.repository.ts  # Database operations
│   ├── services/
│   │   └── CrawlSite.service.ts     # Business logic (ViewModel)
│   ├── controllers/
│   │   └── CrawlSite.controller.ts  # Request handlers
│   ├── routes/
│   │   └── crawl.routes.ts          # API routes definition
│   ├── middlewares/
│   │   └── errorHandler.ts          # Global error handling
│   ├── validators/
│   │   └── CrawlSite.validator.ts   # Request validation
│   ├── utils/
│   │   ├── snowflake.ts             # Snowflake ID generator
│   │   └── slugify.ts               # Slug generator
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces & enums
│   └── app.ts                       # Express app entry point
├── database/
│   └── schema.sql                   # Database schema
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 Cài đặt và chạy

### 1. Prerequisites

- Node.js >= 18.x
- MySQL >= 8.0
- npm hoặc yarn

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Database

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật thông tin database trong `.env`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crawler_db

DATACENTER_ID=1
WORKER_ID=1
```

### 4. Tạo Database

Chạy SQL script để tạo database và table:

```bash
mysql -u root -p < database/schema.sql
```

Hoặc import trực tiếp vào MySQL:

```sql
source database/schema.sql;
```

### 5. Chạy Development Server

```bash
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 6. Build Production

```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-12-28T10:00:00.000Z"
}
```

---

### 1. Initialize Crawl Task

Tạo một task crawl mới.

**Endpoint:** `POST /api/initialize-crawl`

**Request Body:**

```json
{
  "link_type": "URL",
  "title": "Crawl Example Website",
  "crawl_link": "https://example.com"
}
```

**Request Fields:**

| Field       | Type   | Required | Description                    | Values      |
| ----------- | ------ | -------- | ------------------------------ | ----------- |
| link_type   | string | Yes      | Loại link cần crawl            | "URL", "API"|
| title       | string | Yes      | Tiêu đề task (max 255 chars)   |             |
| crawl_link  | string | Yes      | URL hoặc API endpoint          |             |

**Success Response (201 Created):**

```json
{
  "success": true,
  "task_id": "1734512345678901234",
  "message": "Crawl task initialized successfully",
  "data": {
    "id": "1734512345678901234",
    "link_type": "URL",
    "title": "Crawl Example Website",
    "crawl_link": "https://example.com",
    "slug": "crawl-example-website-lm3k9x",
    "status": "INIT",
    "created_at": "2025-12-28T10:00:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "link_type must be either \"URL\" or \"API\"",
  "statusCode": 400
}
```

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "error": "Conflict",
  "message": "Slug already exists. Please use a different title.",
  "statusCode": 409
}
```

---

### 2. Get Crawl Task by ID

Lấy thông tin task theo ID.

**Endpoint:** `GET /api/crawl/:id`

**Example:**

```http
GET /api/crawl/1734512345678901234
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "1734512345678901234",
    "link_type": "URL",
    "title": "Crawl Example Website",
    "crawl_link": "https://example.com",
    "slug": "crawl-example-website-lm3k9x",
    "status": "INIT",
    "categories": null,
    "sub_categories": null,
    "created_at": "2025-12-28T10:00:00.000Z",
    "updated_at": "2025-12-28T10:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Crawl task not found",
  "statusCode": 404
}
```

---

### 3. Get Crawl Task by Slug

Lấy thông tin task theo slug.

**Endpoint:** `GET /api/crawl/slug/:slug`

**Example:**

```http
GET /api/crawl/slug/crawl-example-website-lm3k9x
```

**Response:** Giống như API Get by ID

---

### 4. Get All Crawl Tasks

Lấy danh sách tất cả tasks với pagination.

**Endpoint:** `GET /api/crawls`

**Query Parameters:**

| Parameter | Type   | Default | Description           |
| --------- | ------ | ------- | --------------------- |
| page      | number | 1       | Page number           |
| pageSize  | number | 10      | Items per page        |

**Example:**

```http
GET /api/crawls?page=1&pageSize=10
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "1734512345678901234",
      "link_type": "URL",
      "title": "Crawl Example Website",
      "crawl_link": "https://example.com",
      "slug": "crawl-example-website-lm3k9x",
      "status": "INIT",
      "categories": null,
      "sub_categories": null,
      "created_at": "2025-12-28T10:00:00.000Z",
      "updated_at": "2025-12-28T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1
  }
}
```

---

### 5. Modify Crawl Task

Cập nhật thông tin của một task crawl đã tồn tại. API này hỗ trợ **partial update** - chỉ cần gửi các field muốn thay đổi.

**Endpoint:** `PATCH /api/modify-crawl/:site_id`

**URL Parameters:**

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| site_id   | string | Yes      | ID của task cần modify         |

**Request Body:**

Tất cả các field đều **optional** - chỉ gửi field muốn cập nhật:

```json
{
  "title": "Updated Crawl Example"
}
```

Hoặc update nhiều field:

```json
{
  "link_type": "URL",
  "title": "Updated Crawl Example",
  "crawl_link": "https://updated-example.com"
}
```

**Request Fields:**

| Field       | Type   | Required | Description                    | Values      |
| ----------- | ------ | -------- | ------------------------------ | ----------- |
| link_type   | string | No       | Loại link cần crawl            | "URL", "API"|
| title       | string | No       | Tiêu đề mới (max 255 chars)    |             |
| crawl_link  | string | No       | URL hoặc API endpoint mới      |             |

**Success Response (200 OK):**

```json
{
  "success": true,
  "task_id": "1734512345678901234",
  "message": "Crawl task modified successfully",
  "data": {
    "id": "1734512345678901234",
    "link_type": "URL",
    "title": "Updated Crawl Example",
    "crawl_link": "https://updated-example.com",
    "slug": "updated-crawl-example-nm4l8y",
    "status": "INIT",
    "created_at": "2025-12-28T11:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "At least one field (link_type, title, or crawl_link) must be provided",
  "statusCode": 400
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

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "error": "Conflict",
  "message": "Slug already exists. Please use a different title.",
  "statusCode": 409
}
```

**Lưu ý quan trọng:**
- API này hỗ trợ **PARTIAL UPDATE** - chỉ gửi field muốn thay đổi
- **GIỮ NGUYÊN ID** của task, không tạo ID mới
- Status sẽ được reset về **INIT** khi có bất kỳ field nào được update
- Categories và sub_categories sẽ được reset về **null**
- Nếu update `title`, slug mới sẽ được tự động sinh
- Phải gửi ít nhất 1 field để update

---

### 6. Purge Crawl Task

Xóa vĩnh viễn một task crawl khỏi hệ thống. API này sẽ xóa toàn bộ dữ liệu liên quan.

**Endpoint:** `DELETE /api/purge-crawl/:site_id`

**URL Parameters:**

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| site_id   | string | Yes      | ID của task cần xóa            |

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

**Lưu ý quan trọng:**
- API này **XÓA VĨNH VIỄN** task khỏi database
- Tất cả dữ liệu liên quan (categories, sub_categories) sẽ bị xóa theo
- Không thể khôi phục sau khi xóa
- Sử dụng thận trọng trong production

---

## 🔄 Luồng xử lý

### Initialize Crawl API Flow

```
1. CLIENT gửi POST request đến /api/initialize-crawl
   ↓
2. VALIDATOR kiểm tra input
   - link_type phải là "URL" hoặc "API"
   - title không được rỗng, max 255 chars
   - crawl_link không được rỗng
   ↓
3. CONTROLLER nhận request
   - Extract data từ request body
   - Gọi Service.initializeCrawl()
   ↓
4. SERVICE xử lý business logic
   - Validate dữ liệu chi tiết
   - Generate Snowflake ID (unique distributed ID)
   - Generate slug từ title (URL-friendly)
   - Retry nếu slug bị trùng (max 5 lần)
   - Validate URL/API format
   ↓
5. REPOSITORY lưu vào database
   - INSERT record với status = INIT
   - categories = NULL (sẽ crawl sau)
   - sub_categories = NULL (sẽ crawl sau)
   ↓
6. CONTROLLER format response
   - Trả về task_id, slug, status
   - HTTP 201 Created
   ↓
7. CLIENT nhận response với task_id
```

### Data Flow Example

**Input:**

```json
{
  "link_type": "URL",
  "title": "Example Website",
  "crawl_link": "https://example.com"
}
```

**Processing:**

1. Snowflake ID: `1734512345678901234`
2. Slug generation: `"Example Website"` → `"example-website-lm3k9x"`
3. Status: `INIT`
4. Categories: `null` (sẽ được populate bởi API khác)

**Output:**

```json
{
  "task_id": "1734512345678901234",
  "slug": "example-website-lm3k9x",
  "status": "INIT"
}
```

---

### Modify Crawl API Flow

```
1. CLIENT gửi PATCH request đến /api/modify-crawl/:site_id
   ↓
2. VALIDATOR kiểm tra input
   - site_id phải tồn tại trong URL params
   - Ít nhất 1 field (link_type, title, hoặc crawl_link) phải được gửi
   - Nếu link_type được gửi: phải là "URL" hoặc "API"
   - Nếu title được gửi: không rỗng, max 255 chars
   - Nếu crawl_link được gửi: không rỗng
   ↓
3. CONTROLLER nhận request
   - Extract site_id từ URL params
   - Extract các field từ request body (chỉ field có giá trị)
   - Gọi Service.modifyCrawl()
   ↓
4. SERVICE xử lý business logic
   - Kiểm tra record cũ có tồn tại không
   - Nếu title được update: Generate slug mới
   - Retry nếu slug bị trùng (max 5 lần)
   - Check slug uniqueness (trừ bản ghi đang update)
   - Merge các field mới với dữ liệu cũ
   - Validate URL/API format nếu crawl_link được update
   ↓
5. REPOSITORY update database
   - UPDATE chỉ các field được gửi lên
   - GIỮ NGUYÊN ID và các field không thay đổi
   - Reset status = INIT
   - Reset categories = NULL
   - Reset sub_categories = NULL
   ↓
6. CONTROLLER format response
   - Trả về task_id (giữ nguyên), dữ liệu đã update, status
   - HTTP 200 OK
   ↓
7. CLIENT nhận response với cùng task_id
```

### Modify Crawl Data Flow Examples

**Example 1: Update chỉ title**

**Input:**

```json
{
  "site_id": "1734512345678901234",
  "title": "New Title Only"
}
```

**Processing:**

1. Snowflake ID: `1734512345678901234` (GIỮ NGUYÊN)
2. New slug: `"New Title Only"` → `"new-title-only-ab3c5x"`
3. link_type: Giữ nguyên từ DB
4. crawl_link: Giữ nguyên từ DB
5. Status: Reset to `INIT`
6. Categories: Reset to `null`

**Output:**

```json
{
  "task_id": "1734512345678901234",
  "slug": "new-title-only-ab3c5x",
  "status": "INIT",
  "link_type": "URL",
  "crawl_link": "https://old-link.com"
}
```

**Example 2: Update chỉ link_type**

**Input:**

```json
{
  "site_id": "1734512345678901234",
  "link_type": "API"
}
```

**Processing:**

1. Snowflake ID: `1734512345678901234` (GIỮ NGUYÊN)
2. link_type: Thay đổi từ "URL" → "API"
3. title: Giữ nguyên
4. slug: Giữ nguyên
5. crawl_link: Giữ nguyên
6. Status: Reset to `INIT`

**Output:**

```json
{
  "task_id": "1734512345678901234",
  "link_type": "API",
  "status": "INIT"
}
```

**Example 3: Update tất cả fields**

**Input:**

```json
{
  "site_id": "1734512345678901234",
  "link_type": "API",
  "title": "Updated API Crawler",
  "crawl_link": "https://api.new-example.com/v2"
}
```

**Processing:**

1. Snowflake ID: `1734512345678901234` (GIỮ NGUYÊN)
2. New slug: `"Updated API Crawler"` → `"updated-api-crawler-nm4l8y"`
3. link_type: "API"
4. crawl_link: "https://api.new-example.com/v2"
5. Status: Reset to `INIT`
6. Categories: Reset to `null`

**Output:**

```json
{
  "task_id": "1734512345678901234",
  "link_type": "API",
  "title": "Updated API Crawler",
  "crawl_link": "https://api.new-example.com/v2",
  "slug": "updated-api-crawler-nm4l8y",
  "status": "INIT"
}
```

---

### Purge Crawl API Flow

```
1. CLIENT gửi DELETE request đến /api/purge-crawl/:site_id
   ↓
2. CONTROLLER nhận request
   - Extract site_id từ URL params
   - Gọi Service.purgeCrawl()
   ↓
3. SERVICE xử lý business logic
   - Kiểm tra record có tồn tại không
   - Nếu không tồn tại → throw Error (404)
   ↓
4. REPOSITORY xóa khỏi database
   - DELETE record từ crawl_site table
   - Categories và sub_categories (JSON fields) tự động bị xóa theo
   ↓
5. CONTROLLER format response
   - Trả về deleted_id
   - HTTP 200 OK
   ↓
6. CLIENT nhận confirmation với deleted_id
```

### Purge Crawl Data Flow Example

**Input:**

```json
{
  "site_id": "1734512345678901234"
}
```

**Processing:**

1. Check existence: Record found ✓
2. Delete operation: Remove from database
3. All data removed: ID, title, link, slug, status, categories, sub_categories

**Output:**

```json
{
  "success": true,
  "deleted_id": "1734512345678901234"
}
```

---

## 7. Get Sites List

Get list of sites with optional filtering and pagination.

### 📋 Endpoint

```
GET /api/sites
```

### 📥 Query Parameters

| Parameter | Type   | Required | Default | Description                                    |
| --------- | ------ | -------- | ------- | ---------------------------------------------- |
| page      | number | No       | 1       | Page number (1-indexed)                        |
| limit     | number | No       | 10      | Items per page (min: 1, max: 100)              |
| filter    | string | No       | -       | Filter by link_type ('URL' or 'API')           |

### ✅ Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "1734512345678901234",
      "title": "Example Website",
      "slug": "example-website",
      "link_type": "URL",
      "status": "INIT",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "1734512345678901235",
      "title": "API Endpoint",
      "slug": "api-endpoint",
      "link_type": "API",
      "status": "DONE",
      "created_at": "2024-01-15T09:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### ❌ Error Responses

**Invalid Filter Value (400 Bad Request)**

```json
{
  "error": "Invalid filter value. Must be either \"URL\" or \"API\"."
}
```

### 📡 cURL Examples

**Get all sites (default pagination)**

```bash
curl http://localhost:3000/api/sites
```

**Get sites with custom pagination**

```bash
curl "http://localhost:3000/api/sites?page=2&limit=20"
```

**Filter by URL type**

```bash
curl "http://localhost:3000/api/sites?filter=URL"
```

**Filter by API type**

```bash
curl "http://localhost:3000/api/sites?filter=API"
```

**Combined: Filter + Pagination**

```bash
curl "http://localhost:3000/api/sites?filter=URL&page=1&limit=5"
```

### Get Sites API Flow

```
1. CLIENT gửi GET request đến /api/sites với query params
   ↓
2. CONTROLLER nhận request
   - Parse query params: page, limit, filter
   - Convert to correct types (parseInt)
   - Gọi Service.getSites()
   ↓
3. SERVICE xử lý business logic
   - Validate pagination (page >= 1, limit 1-100)
   - Validate filter nếu có ('URL' hoặc 'API')
   - Calculate offset: (page - 1) * limit
   ↓
4. REPOSITORY query database
   - Build dynamic SQL với WHERE clause nếu có filter
   - Execute COUNT query để lấy total
   - Execute SELECT query với LIMIT/OFFSET
   - ORDER BY created_at DESC
   ↓
5. SERVICE transform data
   - Map CrawlSiteModel to ISiteListItem
   - Chỉ lấy fields cần thiết: id, title, slug, link_type, status, created_at
   - Format response với pagination metadata
   ↓
6. CONTROLLER trả về response
   - HTTP 200 OK
   ↓
7. CLIENT nhận data array + pagination info
```

### Get Sites Data Flow Example

**Input (All Sites):**

```
GET /api/sites?page=1&limit=10
```

**Processing:**

1. Parse params: page=1, limit=10, filter=undefined
2. Normalize: page=1, limit=10, offset=0
3. Repository: SELECT * FROM crawl_site ORDER BY created_at DESC LIMIT 10 OFFSET 0
4. Count query: SELECT COUNT(*) FROM crawl_site
5. Transform to ISiteListItem[] (only essential fields)

**Output:**

```json
{
  "data": [
    {
      "id": "1734512345678901234",
      "title": "Example Site",
      "slug": "example-site",
      "link_type": "URL",
      "status": "INIT",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

**Input (Filtered by URL):**

```
GET /api/sites?filter=URL&page=1&limit=5
```

**Processing:**

1. Parse params: page=1, limit=5, filter='URL'
2. Validate filter: 'URL' is valid LinkType ✓
3. Repository: SELECT * FROM crawl_site WHERE link_type = 'URL' ORDER BY created_at DESC LIMIT 5 OFFSET 0
4. Count query: SELECT COUNT(*) FROM crawl_site WHERE link_type = 'URL'

**Output:**

```json
{
  "data": [
    {
      "id": "1734512345678901234",
      "title": "Website Crawler",
      "slug": "website-crawler",
      "link_type": "URL",
      "status": "DONE",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 15
  }
}
```

---

## 8. Get Site Detail by Slug

Get complete site information including categories and subcategories.

### 📋 Endpoint

```
GET /api/site/:slug
```

### 📥 URL Parameters

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| slug      | string | Yes      | Site slug (URL-friendly ID)    |

### ✅ Success Response (200 OK)

**With categories and subcategories:**

```json
{
  "id": "1734512345678901234",
  "title": "Example Website",
  "slug": "example-website-abc123",
  "link_type": "URL",
  "status": "DONE",
  "categories": [
    {
      "id": "1",
      "name": "Technology",
      "subcategories": [
        {
          "id": "1",
          "name": "Web Development"
        },
        {
          "id": "2",
          "name": "Mobile Development"
        }
      ]
    },
    {
      "id": "2",
      "name": "Business",
      "subcategories": [
        {
          "id": "3",
          "name": "Marketing"
        },
        {
          "id": "4",
          "name": "Finance"
        }
      ]
    }
  ]
}
```

**Without categories (empty array):**

```json
{
  "id": "1734512345678901234",
  "title": "New Site",
  "slug": "new-site-xyz789",
  "link_type": "API",
  "status": "INIT",
  "categories": []
}
```

### ❌ Error Responses

**Site Not Found (404 Not Found)**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Site not found",
  "statusCode": 404
}
```

### 📡 cURL Examples

**Get site by slug**

```bash
curl http://localhost:3000/api/site/example-website-abc123
```

**Example with pretty print**

```bash
curl http://localhost:3000/api/site/example-website-abc123 | jq
```

### Get Site Detail API Flow

```
1. CLIENT gửi GET request đến /api/site/:slug
   ↓
2. CONTROLLER nhận request
   - Extract slug từ URL params
   - Gọi Service.getSiteDetailBySlug()
   ↓
3. SERVICE xử lý business logic
   - Find site by slug từ CrawlSiteRepository
   - Nếu không tìm thấy → throw Error (404)
   ↓
4. SERVICE lấy categories
   - Get categories by site_id từ CategoryRepository
   - Nếu không có categories → return site với categories = []
   ↓
5. SERVICE lấy subcategories
   - Get subcategories cho tất cả categories (batch query)
   - Map subcategories theo category_id
   ↓
6. SERVICE transform data
   - Map CategoryModel[] to ICategoryDTO[]
   - Map SubcategoryModel[] to ISubcategoryDTO[]
   - Nested structure: categories[].subcategories[]
   ↓
7. CONTROLLER trả về response
   - HTTP 200 OK
   ↓
8. CLIENT nhận complete site detail
```

### Get Site Detail Data Flow Example

**Input:**

```
GET /api/site/tech-blog-xyz123
```

**Processing:**

1. Find site: `SELECT * FROM crawl_site WHERE slug = 'tech-blog-xyz123'`
   - Found: id=1734512345678901234, title="Tech Blog", status="DONE"

2. Get categories: `SELECT * FROM category WHERE site_id = '1734512345678901234'`
   - Found: [
       {id: 1, name: "Programming"},
       {id: 2, name: "DevOps"}
     ]

3. Get subcategories: `SELECT * FROM subcategory WHERE category_id IN (1, 2)`
   - Found: [
       {id: 1, category_id: 1, name: "JavaScript"},
       {id: 2, category_id: 1, name: "Python"},
       {id: 3, category_id: 2, name: "Docker"},
       {id: 4, category_id: 2, name: "Kubernetes"}
     ]

4. Map to response structure:
   - Group subcategories by category_id
   - Transform to DTOs (convert IDs to strings)
   - Nest subcategories inside categories

**Output:**

```json
{
  "id": "1734512345678901234",
  "title": "Tech Blog",
  "slug": "tech-blog-xyz123",
  "link_type": "URL",
  "status": "DONE",
  "categories": [
    {
      "id": "1",
      "name": "Programming",
      "subcategories": [
        {"id": "1", "name": "JavaScript"},
        {"id": "2", "name": "Python"}
      ]
    },
    {
      "id": "2",
      "name": "DevOps",
      "subcategories": [
        {"id": "3", "name": "Docker"},
        {"id": "4", "name": "Kubernetes"}
      ]
    }
  ]
}
```

**Example: Site without categories**

**Input:**

```
GET /api/site/new-site-abc
```

**Processing:**

1. Find site: Found (status=INIT)
2. Get categories: No categories found
3. Return site with empty categories array

**Output:**

```json
{
  "id": "1734512345678901235",
  "title": "New Site",
  "slug": "new-site-abc",
  "link_type": "URL",
  "status": "INIT",
  "categories": []
}
```

---

## 9. Crawl and Create Category

Crawl a site to extract category information and save it to the database.

### 📋 Endpoint

```
POST /api/crawl/:site_id/category
```

### 📥 URL Parameters

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| site_id   | string | Yes      | Site ID (Snowflake ID)         |

### 📥 Request Body

```json
{
  "title_selector": "h2.category-title",
  "link_selector": "a.category-link"
}
```

| Field           | Type   | Required | Max Length | Description                           |
| --------------- | ------ | -------- | ---------- | ------------------------------------- |
| title_selector  | string | Yes      | 500        | CSS selector for category title       |
| link_selector   | string | Yes      | 500        | CSS selector for category link        |

**Important Notes:**
- If selector matches **multiple elements**, only the **first element** will be used
- Use specific selectors (e.g., `:first-child`, `:nth-child(1)`) for better control
- Example for multiple elements: `ul.menu-nav > li:first-child > a.nav-link`

### ✅ Success Response (201 Created)

```json
{
  "site_id": "1734512345678901234",
  "category": {
    "id": "1734512345678901235",
    "slug": "technology-abc123",
    "title_selector": "h2.category-title",
    "link_selector": "a.category-link"
  }
}
```

### ❌ Error Responses

**Site Not Found (404 Not Found)**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Site not found",
  "statusCode": 404
}
```

**Validation Error (400 Bad Request)**

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "title_selector is required; link_selector is required",
  "statusCode": 400
}
```

**Crawl Failed (500 Internal Server Error)**

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Crawl failed: No element found for selector: h2.category-title",
  "statusCode": 500
}
```

**Duplicate Slug (500 Internal Server Error)**

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Failed to generate unique slug. Please try again.",
  "statusCode": 500
}
```

### 📡 cURL Examples

**Create category**

```bash
curl -X POST http://localhost:3000/api/crawl/1734512345678901234/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "h2.category-title",
    "link_selector": "a.category-link"
  }'
```

**Example with different selectors**

```bash
curl -X POST http://localhost:3000/api/crawl/1734512345678901234/category \
  -

**Example with multiple matching elements (uses first)**

```bash
curl -X POST http://localhost:3000/api/crawl/1734512345678901234/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "ul.menu-nav > li:first-child > a.nav-link",
    "link_selector": "ul.menu-nav > li:first-child > a.nav-link[href]"
  }'
```H "Content-Type: application/json" \
  -d '{
    "title_selector": "div.cat-name",
    "link_selector": "a.cat-url"
  }'
```

### Crawl Category API Flow

```
1. CLIENT gửi POST request đến /api/crawl/:site_id/category
   ↓
2. VALIDATOR kiểm tra input
   - site_id phải tồn tại trong URL params
   - title_selector: required, max 500 chars
   - link_selector: required, max 500 chars
   ↓
3. CONTROLLER nhận request
   - Extract site_id từ URL params
   - Extract selectors từ request body
   - Gọi Service.crawlCategory()
   ↓
4. SERVICE xử lý business logic
   - Validate site tồn tại
   - Launch Puppeteer browser
   - Navigate to crawl_link
   - Extract category title using title_selector
   - Generate unique slug from title
   - Generate Snowflake ID cho category
   ↓
5. REPOSITORY lưu vào database
   - INSERT category với:
     * id: Snowflake ID
     * site_id: FK to crawl_site
     * slug: unique per site
     * title_selector, link_selector
   ↓
6. CONTROLLER trả về response
   - HTTP 201 Created
   ↓
7. CLIENT nhận category mới tạo
```

### Crawl Category Data Flow Example

**Input:**

```
POST /api/crawl/1734512345678901234/category
{
  "title_selector": "h2.category-title",
  "link_selector": "a.category-link"
}
```

**Processing:**

1. Find site: id=1734512345678901234, crawl_link="https://example.com"
2. Launch Puppeteer:
   - Navigate to https://example.com
   - Wait for page load (networkidle2)
3. Extract title:
   - Find element matching "h2.category-title"
   - Extract textContent: "Technology News"
4. Generate slug:
   - Input: "Technology News"
   - Output: "technology-news-abc123"
   - Check uniqueness for this site_id
5. Generate ID:
   - Snowflake ID: "1734512345678901235"
6. Save to database:
   - INSERT INTO categories (id, site_id, slug, title_selector, link_selector)

**Output:**

```json
{
  "site_id": "1734512345678901234",
  "category": {
    "id": "1734512345678901235",
    "slug": "technology-news-abc123",
    "title_selector": "h2.category-title",
    "link_selector": "a.category-link"
  }
}
```

**Example: Crawl Failed**

**Input:**

```
POST /api/crawl/1734512345678901234/category
{
  "title_selector": "div.not-exist",
  "link_selector": "a.link"
}
```

**Processing:**

1. Launch Puppeteer successfully
2. Navigate to site successfully
3. Try to find element with selector "div.not-exist"
4. Element not found → throw error

**Output:**

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Crawl failed: No element found for selector: div.not-exist",
  "statusCode": 500
}
```

---

## 🗄️ Database Schema

### Table: `crawl_site`

| Column          | Type                              | Description                           |
| --------------- | --------------------------------- | ------------------------------------- |
| id              | VARCHAR(20) PRIMARY KEY           | Snowflake ID                          |
| link_type       | ENUM('URL', 'API')                | Loại link                             |
| title           | VARCHAR(255)                      | Tiêu đề task                          |
| crawl_link      | TEXT                              | URL hoặc API endpoint                 |
| slug            | VARCHAR(255) UNIQUE               | URL-friendly identifier               |
| status          | ENUM('INIT', 'RUNNING', 'DONE', 'ERROR') | Trạng thái crawl          |
| categories      | JSON NULL                         | Categories (populate sau)             |
| sub_categories  | JSON NULL                         | Sub-categories (populate sau)         |
| created_at      | TIMESTAMP                         | Thời gian tạo                         |
| updated_at      | TIMESTAMP                         | Thời gian cập nhật                    |

**Indexes:**

- `idx_slug` - Tìm kiếm theo slug
- `idx_status` - Filter theo status
- `idx_link_type` - Filter theo link type
- `idx_created_at` - Sắp xếp theo thời gian

### Table: `categories`

| Column          | Type                              | Description                           |
| --------------- | --------------------------------- | ------------------------------------- |
| id              | VARCHAR(20) PRIMARY KEY           | Snowflake ID                          |
| site_id         | VARCHAR(20)                       | Foreign key to crawl_site.id          |
| slug            | VARCHAR(255)                      | URL-friendly identifier               |
| title_selector  | VARCHAR(500)                      | CSS selector for title extraction     |
| link_selector   | VARCHAR(500)                      | CSS selector for link extraction      |
| created_at      | TIMESTAMP                         | Thời gian tạo                         |
| updated_at      | TIMESTAMP                         | Thời gian cập nhật                    |

**Foreign Keys:**

- `site_id` REFERENCES `crawl_site(id)` ON DELETE CASCADE

**Unique Constraints:**

- `unique_slug_per_site` - (site_id, slug) must be unique

**Indexes:**

- `idx_site_id` - Tìm categories theo site
- `idx_slug` - Tìm theo slug

**Relationship:**

```
crawl_site (1) ─── (N) categories
    │                      │
   id ←───────────── site_id
                         │
                         ↓
               ON DELETE CASCADE
```

**Status Flow:**

```
INIT → RUNNING → DONE
  ↓
ERROR (nếu có lỗi)
```

---

## 🧪 Testing với Postman/cURL

### Test Initialize Crawl (Success)

```bash
curl -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Test Crawler",
    "crawl_link": "https://example.com"
  }'
```

### Test với API type

```bash
curl -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "API",
    "title": "Test API Crawler",
    "crawl_link": "https://api.example.com/data"
  }'
```

### Test Validation Error

```bash
curl -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "INVALID",
    "title": "",
    "crawl_link": ""
  }'
```

### Test Get by ID

```bash
curl http://localhost:3000/api/crawl/1734512345678901234
```

### Test Get All

```bash
curl "http://localhost:3000/api/crawls?page=1&pageSize=10"
```

### Test Modify Crawl (Success)

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Updated Test Crawler",
    "crawl_link": "https://updated-example.com"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "task_id": "1734512345678901234",
  "message": "Crawl task modified successfully",
  "data": {
    "id": "1734512345678901234",
    "link_type": "URL",
    "title": "Updated Test Crawler",
    "crawl_link": "https://updated-example.com",
    "slug": "updated-test-crawler-nm4l8y",
    "status": "INIT",
    "created_at": "2025-12-28T11:30:00.000Z"
  }
}
```

### Test Modify - Partial Update (chỉ title)

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Only Update Title"
  }'
```

### Test Modify - Partial Update (chỉ link_type)

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "API"
  }'
```

### Test Modify với API type

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "API",
    "title": "Updated API Endpoint",
    "crawl_link": "https://api.new-service.com/v2/data"
  }'
```

### Test Modify - No Fields Provided

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "At least one field (link_type, title, or crawl_link) must be provided",
  "statusCode": 400
}
```

### Test Modify - Task Not Found

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/9999999999999999999 \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Test",
    "crawl_link": "https://example.com"
  }'
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Crawl task not found.",
  "statusCode": 404
}
```

### Test Modify - Validation Error

```bash
curl -X PATCH http://localhost:3000/api/modify-crawl/1734512345678901234 \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "INVALID",
    "title": ""
  }'
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "link_type must be either \"URL\" or \"API\"; title cannot be empty",
  "statusCode": 400
}
```

### Test Purge Crawl (Success)

```bash
curl -X DELETE http://localhost:3000/api/purge-crawl/1734512345678901234
```

**Expected Response:**

```json
{
  "success": true,
  "deleted_id": "1734512345678901234"
}
```

### Test Purge - Task Not Found

```bash
curl -X DELETE http://localhost:3000/api/purge-crawl/9999999999999999999
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Crawl task not found.",
  "statusCode": 404
}
```

### Test Create Category (Success)

```bash
# First, create a site
TASK_ID=$(curl -s -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Test Site",
    "crawl_link": "https://example.com"
  }' | jq -r '.task_id')

echo "Created site: $TASK_ID"

# Then, create a category for that site
curl -X POST http://localhost:3000/api/crawl/$TASK_ID/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "h1",
    "link_selector": "a"
  }'
```

**Expected Response:**

```json
{
  "site_id": "1734512345678901234",
  "category": {
    "id": "1734512345678901235",
    "slug": "example-domain-abc123",
    "title_selector": "h1",
    "link_selector": "a"
  }
}
```

### Test Create Category - Site Not Found

```bash
curl -X POST http://localhost:3000/api/crawl/9999999999999999999/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "h1",
    "link_selector": "a"
  }'
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Site not found",
  "statusCode": 404
}
```

### Test Create Category - Validation Error

```bash
curl -X POST http://localhost:3000/api/crawl/1734512345678901234/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "",
    "link_selector": ""
  }'
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "title_selector cannot be empty; link_selector cannot be empty",
  "statusCode": 400
}
```

### Test Get Site Detail with Categories

```bash
# Get site detail by slug (should include created categories)
SLUG=$(curl -s http://localhost:3000/api/crawl/$TASK_ID | jq -r '.data.slug')
curl http://localhost:3000/api/site/$SLUG
```

**Expected Response:**

```json
{
  "id": "1734512345678901234",
  "title": "Test Site",
  "slug": "test-site-xyz789",
  "link_type": "URL",
  "status": "INIT",
  "categories": [
    {
      "id": "1734512345678901235",
      "slug": "example-domain-abc123",
      "title_selector": "h1",
      "link_selector": "a"
    }
  ]
}
```

### Test Workflow - Create Site, Add Category, View Detail

```bash
# 1. Create a site
TASK_ID=$(curl -s -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "News Website",
    "crawl_link": "https://example.com"
  }' | jq -r '.task_id')

echo "Created site: $TASK_ID"

# 2. Create first category
curl -X POST http://localhost:3000/api/crawl/$TASK_ID/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "h2.category",
    "link_selector": "a.cat-link"
  }'

# 3. Create second category
curl -X POST http://localhost:3000/api/crawl/$TASK_ID/category \
  -H "Content-Type: application/json" \
  -d '{
    "title_selector": "h3.section",
    "link_selector": "a.section-url"
  }'

# 4. Get site detail with all categories
SLUG=$(curl -s http://localhost:3000/api/crawl/$TASK_ID | jq -r '.data.slug')
curl http://localhost:3000/api/site/$SLUG

# 5. Delete the site (cascade delete categories)
curl -X DELETE http://localhost:3000/api/purge-crawl/$TASK_ID
```

---

```bash
# 1. Create a task
TASK_ID=$(curl -s -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Test Task",
    "crawl_link": "https://test.com"
  }' | jq -r '.task_id')

echo "Created task: $TASK_ID"

# 2. Modify only the title
curl -X PATCH http://localhost:3000/api/modify-crawl/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Modified Test Task"
  }'

# 3. Modify multiple fields
curl -X PATCH http://localhost:3000/api/modify-crawl/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "API",
    "crawl_link": "https://api.modified-test.com"
  }'

# 4. Delete the task
curl -X DELETE http://localhost:3000/api/purge-crawl/$TASK_ID
```

### Test Get Site Detail by Slug

```bash
# Get site detail (assuming you have data in DB)
curl http://localhost:3000/api/site/example-website-abc123
```

**Expected Response:**

```json
{
  "id": "1734512345678901234",
  "title": "Example Website",
  "slug": "example-website-abc123",
  "link_type": "URL",
  "status": "DONE",
  "categories": [
    {
      "id": "1",
      "name": "Technology",
      "subcategories": [
        {"id": "1", "name": "Web Development"},
        {"id": "2", "name": "Mobile Development"}
      ]
    }
  ]
}
```

### Test Complete Flow with Sample Data

```bash
# 1. Create a site
SITE_ID=$(curl -s -X POST http://localhost:3000/api/initialize-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "link_type": "URL",
    "title": "Tech Blog Example",
    "crawl_link": "https://techblog.com"
  }' | jq -r '.task_id')

SLUG=$(curl -s http://localhost:3000/api/crawl/$SITE_ID | jq -r '.data.slug')

echo "Created site: $SITE_ID with slug: $SLUG"

# 2. Insert sample categories (using MySQL)
mysql -u root -p crawler_db -e "
INSERT INTO category (site_id, name) VALUES 
('$SITE_ID', 'Programming'),
('$SITE_ID', 'DevOps');

INSERT INTO subcategory (category_id, name) VALUES 
(LAST_INSERT_ID()-1, 'JavaScript'),
(LAST_INSERT_ID()-1, 'Python'),
(LAST_INSERT_ID(), 'Docker'),
(LAST_INSERT_ID(), 'Kubernetes');
"

# 3. Get site detail with categories
curl http://localhost:3000/api/site/$SLUG | jq

# 4. Cleanup
curl -X DELETE http://localhost:3000/api/purge-crawl/$SITE_ID
```

---

## 🎯 Best Practices

### 1. Code Organization

✅ **MVVM Pattern**: Tách biệt concerns  
✅ **Single Responsibility**: Mỗi file/class có 1 nhiệm vụ  
✅ **DRY (Don't Repeat Yourself)**: Tái sử dụng code  

### 2. Error Handling

✅ **Centralized Error Handler**: Xử lý lỗi tập trung  
✅ **Meaningful Error Messages**: Thông báo lỗi rõ ràng  
✅ **HTTP Status Codes**: Sử dụng đúng status codes  

### 3. Database

✅ **Connection Pooling**: Tái sử dụng connections  
✅ **Prepared Statements**: Tránh SQL injection  
✅ **Indexes**: Optimize query performance  

### 4. Security

✅ **Input Validation**: Validate tất cả input  
✅ **Type Safety**: TypeScript cho type checking  
✅ **Environment Variables**: Sensitive data trong .env  

---

## 🔮 Future Enhancements

Hệ thống đã được thiết kế sẵn để dễ dàng mở rộng:

### 1. Crawl Categories API

```typescript
// POST /api/crawl/:id/categories
// Crawl và lưu categories, sub_categories
```

### 2. Crawl Execution API

```typescript
// POST /api/crawl/:id/execute
// Trigger Puppeteer để thực hiện crawl
// Update status: INIT → RUNNING → DONE/ERROR
```

### 3. Queue System

- Thêm Redis/Bull để queue crawl tasks
- Background workers để process tasks
- Retry mechanism cho failed tasks

### 4. WebSocket

- Real-time progress updates
- Status notifications

### 5. Authentication & Authorization

- JWT-based authentication
- Role-based access control

---

## 📖 Snowflake ID Explained

Snowflake ID là thuật toán sinh ID phân tán của Twitter:

**Structure (64 bits):**

```
[41 bits: Timestamp] [5 bits: Datacenter] [5 bits: Worker] [12 bits: Sequence]
```

**Ưu điểm:**

✅ **Unique**: Đảm bảo unique trong hệ thống phân tán  
✅ **Time-ordered**: ID tăng dần theo thời gian  
✅ **High performance**: Có thể sinh hàng nghìn ID/giây  
✅ **No central coordination**: Không cần server trung tâm  

**Example:**

```
ID: 1734512345678901234
Timestamp: 2025-12-28 10:30:45
Datacenter: 1
Worker: 1
Sequence: 789
```

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Backend Architect - Senior Level

---

## 📞 Support

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub.

---

**Happy Coding! 🚀**
