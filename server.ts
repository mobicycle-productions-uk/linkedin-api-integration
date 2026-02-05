#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import process from 'process';
import { LinkedInOAuthSchema } from '../types.js';
import { CloudflareR2Storage } from './cloudflare-storage.js';

const CREDENTIALS_PATH = join(process.cwd(), 'linkedin', 'credentials.json');

function loadCredentials() {
  try {
    const credentialsText = readFileSync(CREDENTIALS_PATH, 'utf-8');
    const config = JSON.parse(credentialsText);
    return LinkedInOAuthSchema.parse(config);
  } catch (error) {
    throw new Error(`Failed to load LinkedIn OAuth credentials: ${error}`);
  }
}

const server = new Server(
  {
    name: 'linkedin-api-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'linkedin_oauth_url',
        description: 'Generate LinkedIn OAuth authorization URL',
        inputSchema: {
          type: 'object',
          properties: {
            scopes: {
              type: 'array',
              items: { type: 'string' },
              description: 'OAuth scopes (default: ["r_liteprofile", "r_emailaddress", "w_member_social"])',
              default: ["r_liteprofile", "r_emailaddress", "w_member_social"]
            },
          },
        },
      },
      {
        name: 'linkedin_exchange_token',
        description: 'Exchange authorization code for access token',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Authorization code from OAuth callback',
            },
            state: {
              type: 'string',
              description: 'State parameter for CSRF protection',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'linkedin_get_profile',
        description: 'Get your LinkedIn profile information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'linkedin_get_posts',
        description: 'Get your LinkedIn posts/shares with detailed information',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of posts to retrieve (max 50, default 20)',
              default: 20,
            },
            include_stats: {
              type: 'boolean',
              description: 'Include engagement stats (likes, comments, shares)',
              default: true,
            },
            author_type: {
              type: 'string',
              enum: ['personal', 'organization'],
              description: 'Get posts from personal profile or organization',
              default: 'personal',
            },
            author_id: {
              type: 'string',
              description: 'For organization posts: organization URN',
            },
          },
        },
      },
      {
        name: 'linkedin_download_posts',
        description: 'Download all your LinkedIn posts to a JSON file',
        inputSchema: {
          type: 'object',
          properties: {
            output_path: {
              type: 'string',
              description: 'Path to save the posts JSON file',
            },
            include_media: {
              type: 'boolean',
              description: 'Include media/image URLs in export',
              default: true,
            },
            date_range: {
              type: 'object',
              properties: {
                start_date: {
                  type: 'string',
                  description: 'Start date (YYYY-MM-DD)',
                },
                end_date: {
                  type: 'string',
                  description: 'End date (YYYY-MM-DD)',
                },
              },
            },
          },
          required: ['output_path'],
        },
      },
      {
        name: 'linkedin_search_people',
        description: 'Search for people on LinkedIn',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for people',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'linkedin_list_manageable_entities',
        description: 'List companies and organizations you can post on behalf of',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'linkedin_list_groups',
        description: 'List groups you are a member of',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'linkedin_create_post',
        description: 'Create a new LinkedIn post (personal, company page, or group)',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text content of the post',
            },
            visibility: {
              type: 'string',
              enum: ['PUBLIC', 'CONNECTIONS'],
              description: 'Who can see the post (default: PUBLIC)',
              default: 'PUBLIC',
            },
            author_type: {
              type: 'string',
              enum: ['personal', 'organization'],
              description: 'Type of author (personal or organization)',
              default: 'personal',
            },
            author_id: {
              type: 'string',
              description: 'For organization posts: company URN (e.g., urn:li:organization:123456)',
            },
            group_id: {
              type: 'string',
              description: 'For group posts: group URN (e.g., urn:li:group:123456)',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'linkedin_get_my_posts',
        description: 'Get your own LinkedIn posts/activity',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of posts to retrieve (default: 20)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'linkedin_download_posts',
        description: 'Download all your LinkedIn posts to Cloudflare R2 storage',
        inputSchema: {
          type: 'object',
          properties: {
            storage_type: {
              type: 'string',
              description: 'Storage type: "cloudflare" or "local"',
              enum: ['cloudflare', 'local'],
              default: 'cloudflare',
            },
            filename: {
              type: 'string',
              description: 'Custom filename (optional, auto-generated if not provided)',
            },
            include_media: {
              type: 'boolean',
              description: 'Include media URLs and information',
              default: true,
            },
            date_range: {
              type: 'object',
              description: 'Filter posts by date range',
              properties: {
                start_date: {
                  type: 'string',
                  description: 'Start date (ISO string)',
                },
                end_date: {
                  type: 'string', 
                  description: 'End date (ISO string)',
                },
              },
            },
          },
        },
      },
      {
        name: 'linkedin_list_saved_posts',
        description: 'List previously saved LinkedIn post exports in Cloudflare R2',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'Profile ID to filter exports (optional)',
            },
          },
        },
      },
    ],
  };
});

async function makeLinkedInRequest(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'cache-control': 'no-cache',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const credentials = loadCredentials();
  
  switch (request.params.name) {
    case 'linkedin_oauth_url': {
      const { scopes = ["r_liteprofile", "r_emailaddress", "w_member_social"] } = request.params.arguments as {
        scopes?: string[];
      };
      
      const state = Math.random().toString(36).substring(2);
      const scopeString = scopes.join(' ');
      
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${credentials.client_id}&redirect_uri=${encodeURIComponent(credentials.redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopeString)}`;
      
      return {
        content: [
          {
            type: 'text',
            text: `🔗 LinkedIn OAuth Authorization\n\n📋 Copy this URL and open in browser:\n${authUrl}\n\n🔑 State: ${state}\n\n📝 After authorization, copy the 'code' parameter from the redirect URL and use linkedin_exchange_token`,
          },
        ],
      };
    }

    case 'linkedin_exchange_token': {
      const { code, state } = request.params.arguments as { code: string; state?: string };
      
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: credentials.redirect_uri,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
        }),
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Access Token Retrieved\n\n🔑 Access Token: ${tokenData.access_token}\n⏱️ Expires in: ${tokenData.expires_in} seconds\n\n💾 Save this token to your credentials.json file to use other LinkedIn tools`,
          },
        ],
      };
    }

    case 'linkedin_get_profile': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }
      
      try {
        const profile = await makeLinkedInRequest('https://api.linkedin.com/v2/me', credentials.access_token);
        
        return {
          content: [
            {
              type: 'text',
              text: `👤 LinkedIn Profile\n\n📛 Name: ${profile.localizedFirstName} ${profile.localizedLastName}\n🆔 ID: ${profile.id}\n🌐 Headline: ${profile.headline || 'Not available'}\n📍 Location: ${profile.location || 'Not available'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to get profile: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'linkedin_get_posts': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }
      
      const { count = 20, include_stats = true, author_type = 'personal', author_id } = request.params.arguments as {
        count?: number;
        include_stats?: boolean;
        author_type?: 'personal' | 'organization';
        author_id?: string;
      };
      
      try {
        let authorUrn: string;
        
        if (author_type === 'organization' && author_id) {
          authorUrn = author_id;
        } else {
          // Get user's person URN
          const profile = await makeLinkedInRequest('https://api.linkedin.com/v2/me', credentials.access_token);
          authorUrn = `urn:li:person:${profile.id}`;
        }
        
        // Use UGC Posts API (newer LinkedIn API)
        const postsUrl = `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=${encodeURIComponent(authorUrn)}&count=${Math.min(count, 50)}&sortBy=LAST_MODIFIED`;
        const postsData = await makeLinkedInRequest(postsUrl, credentials.access_token);
        
        if (!postsData.elements || postsData.elements.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📝 No posts found for ${author_type === 'organization' ? 'organization' : 'personal profile'}.\n\n💡 This could be because:\n• Posts are private/restricted\n• No posts exist for this account\n• API permissions insufficient`,
              },
            ],
          };
        }

        let formattedPosts = '';
        
        for (let i = 0; i < postsData.elements.length; i++) {
          const post = postsData.elements[i];
          const postNum = i + 1;
          
          // Extract post content
          const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
          const text = shareContent?.shareCommentary?.text || 'No text content';
          
          // Format creation time
          const createdTime = post.created?.time ? new Date(post.created.time).toLocaleString() : 'Unknown date';
          
          // Get post ID
          const postId = post.id?.replace('urn:li:ugcPost:', '') || 'Unknown';
          
          // Get lifecycle state
          const status = post.lifecycleState || 'UNKNOWN';
          
          formattedPosts += `📄 Post ${postNum}\n`;
          formattedPosts += `   ID: ${postId}\n`;
          formattedPosts += `   📅 Created: ${createdTime}\n`;
          formattedPosts += `   📊 Status: ${status}\n`;
          
          // Add media information if present
          const media = shareContent?.media;
          if (media && media.length > 0) {
            formattedPosts += `   🖼️  Media: ${media.length} item(s)\n`;
          }
          
          // Add engagement stats if requested
          if (include_stats) {
            try {
              // Get social actions (likes, comments, shares)
              const socialUrl = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(post.id)}`;
              const socialData = await makeLinkedInRequest(socialUrl, credentials.access_token);
              
              const likes = socialData.likesSummary?.totalLikes || 0;
              const comments = socialData.commentsSummary?.totalComments || 0;
              
              formattedPosts += `   👍 Likes: ${likes} | 💬 Comments: ${comments}\n`;
            } catch (error) {
              formattedPosts += `   📊 Stats: Unable to retrieve\n`;
            }
          }
          
          formattedPosts += `   📝 Content: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}\n`;
          formattedPosts += '\n';
        }
        
        const authorType = author_type === 'organization' ? 'Organization' : 'Personal';
        
        return {
          content: [
            {
              type: 'text',
              text: `📝 ${authorType} LinkedIn Posts (${postsData.elements.length} of ${postsData.paging?.total || 'unknown'})\n\n${formattedPosts}💡 Use linkedin_download_posts to export all posts to a file`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to get posts: ${error.message}\n\n💡 Common issues:\n• API rate limit exceeded\n• Insufficient permissions\n• Posts are private/restricted`,
            },
          ],
        };
      }
    }

    case 'linkedin_download_posts': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }

      const { 
        storage_type = 'cloudflare', 
        filename, 
        include_media = true, 
        date_range 
      } = request.params.arguments as {
        storage_type?: 'cloudflare' | 'local';
        filename?: string;
        include_media?: boolean;
        date_range?: {
          start_date?: string;
          end_date?: string;
        };
      };

      try {
        // Get user's person URN
        const profile = await makeLinkedInRequest('https://api.linkedin.com/v2/me', credentials.access_token);
        const personUrn = `urn:li:person:${profile.id}`;
        
        // Get all posts (paginate if necessary)
        const allPosts: any[] = [];
        let start = 0;
        const batchSize = 50;
        
        console.log('📥 Downloading posts...');
        
        while (true) {
          const postsUrl = `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=${encodeURIComponent(personUrn)}&count=${batchSize}&start=${start}&sortBy=LAST_MODIFIED`;
          const postsData = await makeLinkedInRequest(postsUrl, credentials.access_token);
          
          if (!postsData.elements || postsData.elements.length === 0) {
            break;
          }
          
          allPosts.push(...postsData.elements);
          start += batchSize;
          
          // Stop if we've retrieved all available posts
          if (postsData.elements.length < batchSize) {
            break;
          }
        }

        // Filter by date range if specified
        let filteredPosts = allPosts;
        if (date_range?.start_date || date_range?.end_date) {
          filteredPosts = allPosts.filter(post => {
            if (!post.created?.time) return true;
            
            const postDate = new Date(post.created.time);
            const startDate = date_range.start_date ? new Date(date_range.start_date) : new Date('1970-01-01');
            const endDate = date_range.end_date ? new Date(date_range.end_date) : new Date();
            
            return postDate >= startDate && postDate <= endDate;
          });
        }

        // Format posts for export
        const exportData = {
          exported_at: new Date().toISOString(),
          profile: {
            name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
            id: profile.id,
          },
          total_posts: filteredPosts.length,
          date_range: date_range || 'all_time',
          posts: filteredPosts.map(post => {
            const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
            
            return {
              id: post.id,
              created: post.created?.time ? new Date(post.created.time).toISOString() : null,
              modified: post.lastModified?.time ? new Date(post.lastModified.time).toISOString() : null,
              status: post.lifecycleState,
              text: shareContent?.shareCommentary?.text || '',
              media: include_media ? shareContent?.media || [] : undefined,
              visibility: post.visibility,
              author: post.author,
            };
          }),
        };

        // Save to storage
        let saveResult: any;
        let resultMessage: string;

        if (storage_type === 'cloudflare') {
          // Initialize Cloudflare R2 storage
          const storage = new CloudflareR2Storage({
            bucket: 'linkedin-posts',
            keyPrefix: 'exports'
          });

          const generatedFilename = filename || storage.generateFilename(profile.id);
          
          // Upload to Cloudflare R2
          saveResult = await storage.uploadPosts(exportData, generatedFilename);
          
          if (saveResult.success) {
            resultMessage = `✅ Posts Uploaded to Cloudflare R2!\n\n☁️  Storage: Cloudflare R2 (linkedin-posts bucket)\n📁 File: ${saveResult.key}\n🔗 URL: ${saveResult.url}\n📊 Total Posts: ${exportData.total_posts}\n📅 Date Range: ${date_range ? `${date_range.start_date || 'beginning'} to ${date_range.end_date || 'now'}` : 'All time'}\n💾 File Size: ${Math.round(JSON.stringify(exportData).length / 1024)} KB\n\n🎯 Export includes:\n• Post text and metadata\n• Creation/modification dates\n• Post status and visibility\n${include_media ? '• Media URLs and information' : '• Media excluded'}\n\n☁️ Your posts are now safely stored in the cloud!`;
          } else {
            resultMessage = `❌ Failed to upload to Cloudflare: ${saveResult.error}`;
          }
        } else {
          // Local file storage (fallback)
          const localPath = filename || `linkedin-posts-${profile.id}-${new Date().toISOString().split('T')[0]}.json`;
          writeFileSync(localPath, JSON.stringify(exportData, null, 2));
          
          resultMessage = `✅ Posts Downloaded Successfully!\n\n📁 File: ${localPath}\n📊 Total Posts: ${exportData.total_posts}\n📅 Date Range: ${date_range ? `${date_range.start_date || 'beginning'} to ${date_range.end_date || 'now'}` : 'All time'}\n💾 File Size: ${Math.round(JSON.stringify(exportData).length / 1024)} KB\n\n🎯 Export includes:\n• Post text and metadata\n• Creation/modification dates\n• Post status and visibility\n${include_media ? '• Media URLs and information' : '• Media excluded'}\n\n📂 Open the JSON file to view your complete post history!`;
        }

        return {
          content: [
            {
              type: 'text',
              text: resultMessage,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to download posts: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'linkedin_list_manageable_entities': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }

      try {
        const response = await makeLinkedInRequest('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee', credentials.access_token);
        
        if (!response.elements || response.elements.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '🏢 No manageable organizations found.\n\nYou need admin access to post on behalf of companies.',
              },
            ],
          };
        }

        const organizations = response.elements.map((acl: any, index: number) => {
          const orgId = acl.organization?.replace('urn:li:organization:', '') || 'Unknown';
          return `${index + 1}. Organization URN: ${acl.organization}\n   Role: ${acl.role}\n   Org ID: ${orgId}`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `🏢 Manageable Organizations (${response.elements.length})\n\n${organizations}\n\nUse the Organization URN with linkedin_create_post`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to get manageable entities: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'linkedin_list_groups': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }

      try {
        const response = await makeLinkedInRequest('https://api.linkedin.com/v2/groupMemberships?q=member', credentials.access_token);
        
        if (!response.elements || response.elements.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '👥 No group memberships found.',
              },
            ],
          };
        }

        const groups = response.elements.map((membership: any, index: number) => {
          const groupId = membership.group?.replace('urn:li:group:', '') || 'Unknown';
          return `${index + 1}. Group URN: ${membership.group}\n   Group ID: ${groupId}`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `👥 Your Groups (${response.elements.length})\n\n${groups}\n\nUse the Group URN with linkedin_create_post`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to get groups: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'linkedin_search_people': {
      const { query, limit = 10 } = request.params.arguments as {
        query: string;
        limit?: number;
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `LinkedIn People Search API call\nQuery: ${query}\nLimit: ${limit}\n[Search functionality requires additional API permissions]`,
          },
        ],
      };
    }

    case 'linkedin_create_post': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }

      const { text, visibility = 'PUBLIC', author_type = 'personal', author_id, group_id } = request.params.arguments as {
        text: string;
        visibility?: 'PUBLIC' | 'CONNECTIONS';
        author_type?: 'personal' | 'organization';
        author_id?: string;
        group_id?: string;
      };

      try {
        let postData: any;
        
        if (group_id) {
          // Group post
          postData = {
            author: group_id,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: text
                },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': visibility
            }
          };
        } else if (author_type === 'organization' && author_id) {
          // Company/Organization post
          postData = {
            author: author_id,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: text
                },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': visibility
            }
          };
        } else {
          // Personal post - get user's person URN
          const profile = await makeLinkedInRequest('https://api.linkedin.com/v2/me', credentials.access_token);
          const personUrn = `urn:li:person:${profile.id}`;
          
          postData = {
            author: personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: text
                },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': visibility
            }
          };
        }

        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Post creation failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const result = await response.json();
        const postType = group_id ? 'Group' : author_type === 'organization' ? 'Company' : 'Personal';
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ ${postType} Post Created Successfully!\n\n📝 Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n👁️ Visibility: ${visibility}\n🆔 Post ID: ${result.id}\n\n🎉 Your post is now live on LinkedIn!`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to create post: ${error.message}\n\n💡 Tip: Make sure you have the correct permissions and URNs for company/group posts.`,
            },
          ],
        };
      }
    }

    case 'linkedin_get_my_posts': {
      if (!credentials.access_token) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ No access token found. Use linkedin_oauth_url and linkedin_exchange_token first.',
            },
          ],
        };
      }
      
      const { limit = 20 } = request.params.arguments as {
        limit?: number;
      };

      try {
        // Get user's person URN
        const profile = await makeLinkedInRequest('https://api.linkedin.com/v2/me', credentials.access_token);
        const personUrn = `urn:li:person:${profile.id}`;
        
        // Use UGC Posts API to get personal posts
        const postsUrl = `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=${encodeURIComponent(personUrn)}&count=${Math.min(limit, 50)}&sortBy=LAST_MODIFIED`;
        const postsData = await makeLinkedInRequest(postsUrl, credentials.access_token);
        
        if (!postsData.elements || postsData.elements.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📝 No posts found on your personal profile.\n\n💡 This could be because:\n• Posts are private/restricted\n• No posts exist on this account\n• API permissions insufficient`,
              },
            ],
          };
        }

        let formattedPosts = '';
        
        for (let i = 0; i < postsData.elements.length; i++) {
          const post = postsData.elements[i];
          const postNum = i + 1;
          
          // Extract post content
          const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
          const text = shareContent?.shareCommentary?.text || 'No text content';
          
          // Format creation time
          const createdTime = post.created?.time ? new Date(post.created.time).toLocaleString() : 'Unknown date';
          
          // Get post ID
          const postId = post.id?.replace('urn:li:ugcPost:', '') || 'Unknown';
          
          formattedPosts += `📄 Post ${postNum}\n`;
          formattedPosts += `   ID: ${postId}\n`;
          formattedPosts += `   📅 Created: ${createdTime}\n`;
          formattedPosts += `   📝 Content: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}\n`;
          formattedPosts += '\n';
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `📱 Your LinkedIn Posts (${postsData.elements.length} shown)\n\n${formattedPosts}💡 Use linkedin_download_posts to export all posts to a file`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to get posts: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'linkedin_list_saved_posts': {
      const { profile_id } = request.params.arguments as {
        profile_id?: string;
      };

      try {
        // Initialize Cloudflare R2 storage
        const storage = new CloudflareR2Storage({
          bucket: 'linkedin-posts',
          keyPrefix: 'exports'
        });

        // Get list of saved posts
        const savedPosts = await storage.listPosts(profile_id);
        const bucketInfo = storage.getBucketInfo();

        let formattedList = '';
        savedPosts.forEach((filename, index) => {
          formattedList += `📄 ${index + 1}. ${filename}\n`;
        });

        return {
          content: [
            {
              type: 'text',
              text: `☁️ Saved LinkedIn Posts in Cloudflare R2\n\n🗂️  Bucket: ${bucketInfo.bucket}\n📁 Prefix: ${bucketInfo.keyPrefix}\n📊 Total Files: ${savedPosts.length}\n\n📋 Files:\n${formattedList}\n💡 Use these filenames with download tools to retrieve specific exports.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to list saved posts: ${error.message}`,
            },
          ],
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LinkedIn MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});