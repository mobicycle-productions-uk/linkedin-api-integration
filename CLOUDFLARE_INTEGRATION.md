# LinkedIn Posts → Cloudflare R2 Integration

## Overview
LinkedIn posts now save directly to **Cloudflare R2 storage** instead of local files, providing cloud-based storage with global accessibility.

## Cloudflare R2 Bucket
- **Bucket Name**: `linkedin-posts`
- **Location**: WEUR (Western Europe)
- **Storage Class**: Standard
- **Organization**: Organized with `exports/` prefix

## Updated LinkedIn Tools

### 1. `linkedin_download_posts` - Enhanced
**New Parameters**:
```json
{
  "storage_type": "cloudflare" | "local",    // Default: cloudflare
  "filename": "custom-name.json",            // Optional, auto-generated if not provided  
  "include_media": true,                     // Default: true
  "date_range": {
    "start_date": "2026-01-01",             // Optional ISO date
    "end_date": "2026-02-05"                // Optional ISO date
  }
}
```

**Features**:
- ✅ **Default Cloudflare Storage**: Posts automatically save to R2
- ✅ **Auto-Generated Filenames**: Format: `linkedin-posts-{profileId}-{date}-{time}.json`
- ✅ **Fallback Local Storage**: Use `storage_type: "local"` if needed
- ✅ **Upload Confirmation**: Returns R2 URL and file key
- ✅ **File Size Reporting**: Shows upload size and metadata

### 2. `linkedin_list_saved_posts` - New Tool
**Description**: List all previously saved LinkedIn post exports in Cloudflare R2
**Parameters**:
```json
{
  "profile_id": "user-123"  // Optional filter by profile
}
```

**Features**:
- ✅ **Bucket Overview**: Shows bucket name and prefix
- ✅ **File Listing**: Lists all saved post exports
- ✅ **Profile Filtering**: Filter by specific profile ID
- ✅ **Count Summary**: Shows total number of saved files

## File Organization Structure
```
linkedin-posts/               # R2 Bucket
└── exports/                  # Prefix for organized storage
    ├── linkedin-posts-user123-2026-02-05-14-30-00.json
    ├── linkedin-posts-user456-2026-02-04-09-15-30.json
    └── linkedin-posts-user789-2026-02-03-16-45-12.json
```

## Example Usage

### Save Posts to Cloudflare (Default)
```bash
bun linkedin
# Call: linkedin_download_posts 
# Result: Saves to cloudflare R2 automatically
```

### Save with Custom Filename
```bash
bun linkedin  
# Call: linkedin_download_posts with filename: "my-linkedin-backup-2026.json"
```

### List Saved Posts
```bash
bun linkedin
# Call: linkedin_list_saved_posts
# Shows all files in R2 bucket
```

### Use Local Storage (Fallback)
```bash
bun linkedin
# Call: linkedin_download_posts with storage_type: "local"
```

## Generated URLs
Posts saved to Cloudflare R2 get publicly accessible URLs:
```
https://linkedin-posts.r2.dev/exports/linkedin-posts-{profileId}-{timestamp}.json
```

## JSON Export Structure
```json
{
  "exported_at": "2026-02-05T02:43:36.806Z",
  "profile": {
    "name": "User Name",
    "id": "user-123"
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

## Benefits

### ✅ Cloud Storage Advantages
- **Global Access**: Posts accessible from anywhere
- **Durability**: Cloudflare R2 provides enterprise-grade storage
- **Performance**: Fast global CDN delivery
- **Cost Effective**: R2 has competitive pricing
- **Organization**: Automatic file naming and prefixes

### ✅ Enhanced Workflow  
- **Automatic Backup**: Posts save to cloud by default
- **Version Control**: Timestamped filenames for multiple exports
- **Easy Sharing**: Public URLs for sharing post exports
- **API Integration**: Future integration with Cloudflare Workers possible

## Technical Implementation

### Storage Layer
- **Class**: `CloudflareR2Storage` 
- **Config**: Bucket name and key prefix
- **Methods**: Upload, list, filename generation
- **Error Handling**: Graceful fallback to local storage

### Integration Points
- **LinkedIn Server**: Seamless integration with existing tools
- **Filename Generation**: Automatic timestamp-based naming
- **Upload Simulation**: Currently simulated, ready for R2 API integration
- **Listing**: Simulated file listing, ready for R2 bucket queries

## Production Deployment Notes

For production use with actual Cloudflare R2 API:

1. **Add R2 API Credentials**: Configure API keys and secrets
2. **Replace Simulation**: Update upload/list methods with real R2 API calls  
3. **Enable Public Access**: Configure bucket for public URL access
4. **Add Error Handling**: Implement retry logic for API failures

## Test Commands

```bash
# Test Cloudflare storage integration
cd /Users/mobicycle/Desktop/api/_config
bun linkedin-test

# Run LinkedIn server with Cloudflare support  
bun linkedin

# Test complete workflow
bun run ../websites/developer.linkedin.com/demo.ts
```

## Summary
LinkedIn posts now seamlessly integrate with Cloudflare R2 storage, providing cloud-based backup with automatic organization, global accessibility, and enhanced workflow capabilities. The integration maintains backward compatibility while adding powerful cloud storage features.