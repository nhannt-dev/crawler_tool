# Crawler Server API

Server API để crawl thông tin từ các trang web sử dụng Node.js, Express và Puppeteer.

## Tính năng

- ✅ Crawl thông tin từ bất kỳ URL nào
- ✅ Lấy metadata (title, description, keywords, Open Graph tags)
- ✅ Trích xuất headings (h1, h2)
- ✅ Thu thập links và images
- ✅ Chụp screenshot trang web
- ✅ Sử dụng Snowflake ID để tạo unique request ID
- ✅ Error handling đầy đủ

## Cài đặt

### 1. Cài đặt MySQL

Đảm bảo bạn đã cài đặt MySQL Server trên máy.

### 2. Tạo database

```sql
CREATE DATABASE crawler_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Cấu hình database

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Sửa file `.env` với thông tin MySQL của bạn:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=crawler_db
```

### 4. Cài đặt dependencies

```bash
npm install
```

### 5. Chạy server

**Development mode (với nodemon):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## API Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Mô tả:** Kiểm tra server có hoạt động không

**Response:**
```json
{
  "success": true,
  "message": "Crawler server is running",
  "timestamp": "2025-12-27T10:30:00.000Z"
}
```

### 2. Crawl Website

**Endpoint:** `POST /api/crawl`

**Mô tả:** Crawl thông tin từ một URL và lưu vào database

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response thành công:**
```json
{
  "success": true,
  "requestId": "1234567890123456789",
  "timestamp": "2025-12-27T10:30:00.000Z",
  "data": {
    "title": "Example Domain",
    "url": "https://example.com/",
    "description": "Example website description",
    "keywords": "example, website, demo",
    "ogTitle": "Example Domain",
    "ogDescription": "This is an example",
    "ogImage": "https://example.com/image.jpg",
    "h1": ["Example Heading 1"],
    "h2": ["Example Heading 2"],
    "links": [
      {
        "text": "More information...",
        "href": "https://www.iana.org/domains/example"
      }
    ],
    "images": [
      {
        "alt": "Example Image",
        "src": "https://example.com/image.jpg"
      }
    ],
    "screenshot": "data:image/png;base64,iVBORw0KGg..."
  }
}
```

**Response lỗi (URL không hợp lệ):**
```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Response lỗi (Crawl thất bại):**
```json
{
  "success": false,
  "requestId": "1234567890123456789",
  "error": "Failed to crawl the URL",
  "message": "Error message details"
}
```

### 3. Crawl Category theo Selector

**Endpoint:** `POST /api/crawl/:requestId/category`

**Mô tả:** Crawl lại URL từ một requestId đã có và lấy dữ liệu theo CSS selector

**URL Parameters:**
- `requestId`: ID của lần crawl trước đó (lấy từ response của `/api/crawl`)

**Request Body:**
```json
{
  "selector": ".product-item",
  "subCategorySelector": ".sub-item"
}
```

**Tham số:**
- `selector` (required): CSS selector cho category chính
- `subCategorySelector` (optional): CSS selector cho sub_category bên trong mỗi category

**Ví dụ selectors:**

**Category đơn giản (không có sub_category):**
- `.product-item` - Lấy tất cả elements có class "product-item"
- `#main-content` - Lấy element có id "main-content"
- `h2.title` - Lấy tất cả thẻ h2 có class "title"

**Category có sub_category:**
- `selector: ".category"` + `subCategorySelector: ".sub-item"` - Lấy category và các sub items bên trong
- `selector: "nav > li"` + `subCategorySelector: "ul > li"` - Lấy menu chính và submenu
- `selector: ".product-group"` + `subCategorySelector: ".product"` - Lấy nhóm sản phẩm và từng sản phẩm

**Response thành công:**
```json
{
  "success": true,
  "requestId": "1234567890123456789",
  "url": "https://example.com",
  "selector": ".product-item",
  "subCategorySelector": ".sub-item",
  "totalCount": 15,
  "filteredCount": 12,
  "totalSubCategories": 38,
  "timestamp": "2025-12-27T10:30:00.000Z",
  "data": [
    {
      "index": 1,
      "text": "Product Name",
      "originalText": "Product Name",
      "html": "<span>Product Name</span>",
      "tagName": "div",
      "className": "product-item",
      "id": "",
      "href": null,
      "src": null,
      "sub_category": [
        {
          "index": 1,
          "text": "Sub Item 1",
          "originalText": "Sub Item 1",
          "html": "<span>Sub Item 1</span>",
          "tagName": "div",
          "className": "sub-item",
          "id": "",
          "href": null,
          "src": null
        },
        {
          "index": 2,
          "text": "Sub Item 2",
          "originalText": "Sub Item 2",
          "html": "<span>Sub Item 2</span>",
          "tagName": "div",
          "className": "sub-item",
          "id": "",
          "href": null,
          "src": null
        }
      ]
    },
    {
      "index": 2,
      "text": "Another Product",
      "originalText": "Another Product",
      "html": "<span>Another Product</span>",
      "tagName": "div",
      "className": "product-item featured",
      "id": "prod-2",
      "href": null,
      "src": null,
      "sub_category": []
    }
  ]
}
```

**Response lỗi (Thiếu selector):**
```json
{
  "success": false,
  "error": "Selector is required in request body"
}
```

**Response lỗi (Request ID không tồn tại):**
```json
{
  "success": false,
  "error": "Request ID not found"
}
```

**Response lỗi (Crawl gốc thất bại):**
```json
{
  "success": false,
  "error": "Original crawl was not successful",
  "url": "https://example.com"
}
```

### 4. Lấy lịch sử crawl

**Endpoint:** `GET /api/history`

**Query Parameters:**
- `limit` (optional): Số lượng records trả về (mặc định: 50)
- `offset` (optional): Vị trí bắt đầu (mặc định: 0)
- `status` (optional): Lọc theo trạng thái ('success' hoặc 'failed')

**Example:** `GET /api/history?limit=10&offset=0&status=success`

**Response:**
```json
{
  "success": true,
  "total": 100,
  "limit": 10,
  "offset": 0,
  "data": [
    {
      "id": "1234567890123456789",
      "url": "https://example.com",
      "title": "Example Domain",
      "description": "Example website",
      "status": "success",
      "error_message": null,
      "h1_count": 1,
      "h2_count": 3,
      "links_count": 15,
      "images_count": 5,
      "has_screenshot": true,
      "created_at": "2025-12-27T10:30:00.000Z"
    }
  ]
}
```

### 5. Lấy chi tiết crawl theo ID

**Endpoint:** `GET /api/history/:id`

**Example:** `GET /api/history/1234567890123456789`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1234567890123456789",
    "url": "https://example.com",
    "title": "Example Domain",
    "description": "Example website",
    "status": "success",
    "error_message": null,
    "h1_count": 1,
    "h2_count": 3,
    "links_count": 15,
    "images_count": 5,
    "has_screenshot": true,
    "created_at": "2025-12-27T10:30:00.000Z"
  }
}
```

### 6. Thống kê

**Endpoint:** `GET /api/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_crawls": 100,
    "successful_crawls": 85,
    "failed_crawls": 15,
    "unique_urls": 75
  }
}
```

## Ví dụ sử dụng

### Sử dụng cURL

```bash
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://example.com\"}"
```

### Sử dụng JavaScript (fetch)

```javascript
fetch('http://localhost:3000/api/crawl', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Sử dụng Postman

1. Mở Postman
2. Tạo request mới với method: **POST**
3. URL: `http://localhost:3000/api/crawl`
4. Headers: 
   - Key: `Content-Type`
   - Value: `application/json`
5. Body (chọn raw, JSON):
```json
{
  "url": "https://example.com"
}
```
6. Click **Send**

### Test API Crawl Category

**Bước 1:** Crawl một trang trước để lấy requestId
- Sử dụng API `/api/crawl` như hướng dẫn ở trên
- Copy `requestId` từ response

**Bước 2:** Tạo request mới
- Method: **POST**
- URL: `http://localhost:3000/api/crawl/{requestId}/category`
  - Thay `{requestId}` bằng ID đã copy (ví dụ: `http://localhost:3000/api/crawl/1234567890123456789/category`)

**Bước 3:** Setup Headers
- Click tab **Headers**
- Thêm: `Content-Type` = `application/json`

**Bước 4:** Setup Body
- Click tab **Body**
- Chọn **raw**
- Chọn **JSON**
- Paste:
```json
{
  "selector": ".product-item"
}
```

Hoặc với sub_category:
```json
{
  "selector": ".category",
  "subCategorySelector": ".sub-item"
}
```

**Ví dụ selectors:**
```json
{"selector": "h2"}
{"selector": ".card-title"}
{"selector": "article.post"}
{"selector": "#main-content a"}
{"selector": ".category", "subCategorySelector": ".sub-cat"}
{"selector": "nav > li", "subCategorySelector": "ul > li"}
```

**Bước 5:** Click **Send**

### Sử dụng Python (requests)

```python
import requests

url = "http://localhost:3000/api/crawl"
payload = {
    "url": "https://example.com"
}

response = requests.post(url, json=payload)
print(response.json())

# Crawl category
category_url = f"http://localhost:3000/api/crawl/{request_id}/category"
category_payload = {
    "selector": ".product-item"
}

category_response = requests.post(category_url, json=category_payload)
print(category_response.json())

# Crawl category với sub_category
category_with_sub_payload = {
    "selector": ".category",
    "subCategorySelector": ".sub-item"
}

category_sub_response = requests.post(category_url, json=category_with_sub_payload)
print(category_sub_response.json())
```

## Cấu trúc Response Data

### API /api/crawl

| Field | Type | Mô tả |
|-------|------|-------|
| title | string | Tiêu đề trang web |
| url | string | URL đầy đủ sau khi redirect (nếu có) |
| description | string | Meta description |
| keywords | string | Meta keywords |
| ogTitle | string | Open Graph title |
| ogDescription | string | Open Graph description |
| ogImage | string | Open Graph image URL |
| h1 | array | Mảng các thẻ H1 |
| h2 | array | Mảng các thẻ H2 |
| links | array | Mảng 50 links đầu tiên (text, href) |
| images | array | Mảng 20 images đầu tiên (alt, src) |
| screenshot | string | Screenshot dạng base64 |

### API /api/crawl/:requestId/category

| Field | Type | Mô tả |
|-------|------|-------|
| index | number | Thứ tự element (bắt đầu từ 1) |
| text | string | Nội dung text của element (bao gồm pseudo-elements) |
| originalText | string | Text gốc không bao gồm pseudo-elements |
| html | string | HTML bên trong element |
| tagName | string | Tên thẻ HTML (div, a, span...) |
| className | string | Class name của element |
| id | string | ID của element |
| href | string/null | Link nếu là thẻ a |
| src | string/null | Source nếu là img/video |
| sub_category | array | Mảng các sub_category (rỗng nếu không có) |

## Lưu ý

- Server timeout cho mỗi request là 30 giây
- Links giới hạn 50 items đầu tiên
- Images giới hạn 20 items đầu tiên
- Screenshot không lấy full page (chỉ viewport)
- Server sử dụng headless Chrome nên cần đủ RAM
- **API Category**: Cần có requestId hợp lệ từ crawl trước đó
- **Selector**: Sử dụng CSS selector chuẩn (giống như `document.querySelectorAll()`)
  - ⚠️ **Không hỗ trợ** pseudo-elements (`::before`, `::after`) trong selector
  - ✅ Ví dụ hợp lệ: `.menu > li`, `nav.main a.item`
  - ❌ Ví dụ không hợp lệ: `.menu::before > li`, `a::after`
- **Auto Filter**: API category tự động bỏ qua items có text rỗng, icon, "trang chủ" hoặc "home"
- **Database**: Tất cả kết quả crawl (bao gồm category) đều được lưu vào MySQL
- **Pseudo-elements**: API tự động lấy content từ `::before` và `::after` CSS pseudo-elements

## Use Cases cho API Category

### 1. Crawl danh sách sản phẩm (không có sub_category)
```json
{
  "selector": ".product-card"
}
```

### 2. Crawl danh mục menu với submenu
```json
{
  "selector": "nav.menu > li",
  "subCategorySelector": "ul.submenu > li"
}
```

### 3. Crawl categories và subcategories
```json
{
  "selector": ".category-item",
  "subCategorySelector": ".subcategory-item"
}
```

### 4. Crawl bài viết (không cần sub_category)
```json
{
  "selector": "article.post"
}
```

### 5. Crawl product groups với products
```json
{
  "selector": ".product-group",
  "subCategorySelector": ".product"
}
```

## Cấu hình

Có thể thay đổi port bằng cách set biến môi trường:

```bash
PORT=5000 npm start
```

## Dependencies

- **express**: Web framework
- **puppeteer**: Headless browser automation
- **snowflake-id**: Unique ID generator
- **mysql2**: MySQL client cho Node.js
- **dotenv**: Quản lý environment variables
- **nodemon**: Development auto-reload (dev dependency)

## Cấu trúc Database

### Bảng: crawl_history

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(50) | Primary key (Snowflake ID) |
| url | VARCHAR(2048) | URL được crawl |
| title | VARCHAR(500) | Tiêu đề trang |
| description | TEXT | Meta description |
| status | VARCHAR(20) | Trạng thái: 'success' hoặc 'failed' |
| error_message | TEXT | Thông báo lỗi (nếu có) |
| h1_count | INT | Số lượng thẻ H1 |
| h2_count | INT | Số lượng thẻ H2 |
| links_count | INT | Số lượng links |
| images_count | INT | Số lượng images |
| has_screenshot | BOOLEAN | Có screenshot không |
| created_at | TIMESTAMP | Thời gian tạo |

### Bảng: category_crawl

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Auto increment primary key |
| request_id | VARCHAR(50) | Foreign key đến crawl_history |
| selector | VARCHAR(500) | CSS selector đã sử dụng |
| total_items | INT | Tổng số items trước khi filter |
| filtered_items | INT | Số items sau khi filter |
| crawl_data | JSON | Dữ liệu crawl được (JSON) |
| status | VARCHAR(20) | Trạng thái: 'success' hoặc 'failed' |
| error_message | TEXT | Thông báo lỗi (nếu có) |
| created_at | TIMESTAMP | Thời gian tạo |

## License

ISC
