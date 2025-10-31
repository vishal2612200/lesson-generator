# REST API Reference

API endpoints for lesson management.

## Base URL

```
http://localhost:3000/api  # Development
https://your-domain.com/api # Production
```

## Endpoints

### Create Lesson

**POST** `/api/lessons`

Create a new lesson and start generation.

**Request Body**:
```json
{
  "outline": "Introduction to Machine Learning\n• What is ML?\n• Types of algorithms"
}
```

**Response** (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "title": "Introduction to Machine Learning",
    "outline": "...",
    "status": "generated",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:05:00Z"
  }
}
```

**Note**: The API path creates lessons with status "generating" directly and performs synchronous generation. The response returns with status "generated" (success) or "failed" (error). The API path does NOT use status "queued" - that is only used by the worker path for asynchronous processing.

**Error Response** (400 Bad Request):
```json
{
  "error": "Outline is required"
}
```

**Error Response** (429 Too Many Requests):
```json
{
  "error": "Too Many Requests"
}
```

### List Lessons

**GET** `/api/lessons`

Get all lessons.

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Introduction to Machine Learning",
      "status": "generated",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:05:00Z"
    }
  ]
}
```

### Get Lesson Details

**GET** `/api/lessons/[id]`

Get lesson details with content.

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "title": "Introduction to Machine Learning",
    "outline": "...",
    "status": "generated",
    "content": {
      "typescript_source": "'use client';\n...",
      "compiled_js": "...",
      "blocks": null
    },
    "traces": [...],
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:05:00Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Lesson not found"
}
```

### Get Lesson Bundle

**GET** `/api/lessons/[id]/bundle`

Get bundle information for rendering lesson component. Used by ShadowRenderer to fetch module URL.

**Response** (200 OK):
```json
{
  "jsUrl": "/api/lessons/{id}/module",
  "cssText": "",
  "hash": ""
}
```

**Fields**:
- `jsUrl` - URL to the compiled JavaScript module
- `cssText` - CSS text (currently empty)
- `hash` - Content hash for cache busting (currently empty)

**Error Response** (404 Not Found):
```json
{
  "error": "Not found"
}
```

### Get Lesson Module

**GET** `/api/lessons/[id]/module`

Get compiled JavaScript module for lesson component. Transforms TypeScript source to ESM JavaScript using esbuild.

**Response** (200 OK):
- Content-Type: `text/javascript; charset=utf-8`
- Cache-Control: `no-store`
- Body: Compiled ESM JavaScript module

**Transformation Process**:
1. Fetches `typescript_source` from database
2. Strips all import statements using Babel parser
3. Transforms TSX → ESM JavaScript using esbuild
4. Adds React globals banner
5. Returns as ESM module

**Example Response**:
```javascript
const React = globalThis.React;
const ReactDOM = globalThis.ReactDOM;
const { useState, useEffect, useMemo, useCallback, useRef, Fragment } = React;

// Transformed component code...
export default function GeneratedLesson() {
  // Component implementation
}
```

**Error Response** (404 Not Found):
- Status: 404
- Body: `Not found`

**Error Response** (400 Bad Request):
- Status: 400
- Body: `No source`

## Rate Limiting

- **Limit**: 10 requests per minute per IP
- **Window**: 1 minute
- **Response**: 429 Too Many Requests

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

**Status Codes**:
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Next Steps

- **[Database Schema](/docs/api/database-schema)** - Database structure
- **[Types](/docs/api/types)** - TypeScript types

