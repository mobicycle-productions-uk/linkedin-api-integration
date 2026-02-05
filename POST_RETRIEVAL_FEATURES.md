# LinkedIn Post Retrieval Features

## Overview
The LinkedIn MCP server now includes comprehensive post retrieval functionality using LinkedIn's UGC Posts API v2, replacing the deprecated Shares API.

## Available Tools

### 1. `linkedin_get_posts`
**Description**: Get LinkedIn posts with advanced filtering and metadata
**Parameters**:
- `count` (number, default: 20): Number of posts to retrieve
- `include_stats` (boolean, default: true): Include engagement statistics  
- `author_type` (string): 'personal' or 'organization'
- `author_id` (string): Organization URN for company posts

**Features**:
- ✅ LinkedIn UGC Posts API v2 integration
- ✅ Post metadata (ID, creation time, status)
- ✅ Engagement statistics (likes, comments)
- ✅ Media information detection
- ✅ Content preview (150 characters)
- ✅ Support for personal and organization posts

### 2. `linkedin_get_my_posts` 
**Description**: Get your personal LinkedIn posts
**Parameters**:
- `limit` (number, default: 20): Number of posts to retrieve

**Features**:
- ✅ Personal profile posts only
- ✅ Simplified interface
- ✅ Post metadata and content preview

### 3. `linkedin_download_posts`
**Description**: Download all posts to a JSON file with pagination
**Parameters**:
- `output_path` (string, required): File path to save posts
- `include_media` (boolean, default: true): Include media URLs
- `date_range` (object, optional): Filter by date range
  - `start_date` (string): ISO date string
  - `end_date` (string): ISO date string

**Features**:
- ✅ Complete post history download
- ✅ Automatic pagination (50 posts per batch)
- ✅ Date range filtering
- ✅ Comprehensive JSON export
- ✅ File size reporting
- ✅ Export metadata tracking

## Technical Implementation

### API Integration
- **API**: LinkedIn UGC Posts API v2 (`/v2/ugcPosts`)
- **Authentication**: OAuth 2.0 Bearer token
- **Protocol**: LinkedIn REST API v2.0.0
- **Pagination**: Start/count based pagination
- **Sorting**: LAST_MODIFIED (newest first)

### Data Structure
```json
{
  "exported_at": "2026-02-05T02:35:56.806Z",
  "profile": {
    "name": "User Name",
    "id": "user-id"
  },
  "total_posts": 150,
  "date_range": "all_time",
  "posts": [
    {
      "id": "urn:li:ugcPost:123456789",
      "created": "2026-01-15T10:30:00.000Z",
      "modified": "2026-01-15T10:30:00.000Z", 
      "status": "PUBLISHED",
      "text": "Post content...",
      "media": [...],
      "visibility": {...},
      "author": "urn:li:person:123456"
    }
  ]
}
```

### Error Handling
- ✅ OAuth token validation
- ✅ API rate limit handling
- ✅ Missing permissions detection
- ✅ Network error recovery
- ✅ Empty result handling

## Usage Examples

### Get Recent Posts
```bash
bun linkedin
# Call: linkedin_get_posts with count: 10, include_stats: true
```

### Download All Posts
```bash
bun linkedin  
# Call: linkedin_download_posts with output_path: "my-posts.json"
```

### Filter by Date Range
```bash
bun linkedin
# Call: linkedin_download_posts with date_range: {start_date: "2025-01-01", end_date: "2025-12-31"}
```

## Requirements

### LinkedIn App Permissions
- `r_liteprofile`: Read basic profile
- `w_member_social`: Read/write personal posts
- `w_organization_social`: Read/write organization posts

### Authentication Flow
1. Create LinkedIn Developer App
2. Update `credentials.json` with app details
3. Run OAuth flow: `bun linkedin-auth`
4. Use tools with valid access token

## Supported Post Types
- ✅ Personal profile posts
- ✅ Company/organization page posts  
- ✅ Text posts with commentary
- ✅ Posts with media (images, videos, documents)
- ✅ Shared content posts

## Limitations
- LinkedIn API rate limits apply (varies by app)
- Private/restricted posts may not be accessible
- Some engagement data requires additional API calls
- Media URLs are references, not downloaded files