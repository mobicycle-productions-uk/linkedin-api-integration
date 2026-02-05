#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// LinkedIn API configuration
const CREDENTIALS_PATH = join(import.meta.dirname, 'credentials.json');
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

interface LinkedInCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  redirect_uri: string;
  expires_in: number;
  token_obtained_at?: string;
  app_name: string;
  setup_completed: boolean;
  required_scopes: string[];
}

function loadCredentials(): LinkedInCredentials {
  try {
    const credentialsText = readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(credentialsText);
  } catch (error) {
    throw new Error(`Failed to load credentials from ${CREDENTIALS_PATH}: ${error}`);
  }
}

function saveCredentials(credentials: LinkedInCredentials) {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

async function makeLinkedInAPIRequest(endpoint: string, method = 'GET', body?: any) {
  const credentials = loadCredentials();
  
  if (!credentials.access_token) {
    throw new Error('No access token available. Please complete OAuth authorization first.');
  }

  const url = `${LINKEDIN_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${credentials.access_token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Create and start the MCP server
const server = new Server(
  {
    name: "linkedin-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "linkedin_get_profile",
        description: "Get current user's LinkedIn profile information",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "linkedin_list_manageable_entities",
        description: "List organizations and company pages you can post to",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "linkedin_create_post",
        description: "Create a new LinkedIn post (personal or organization)",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Text content of the post",
            },
            entityUrn: {
              type: "string",
              description: "Optional: URN of organization to post as (defaults to personal)",
            },
            visibility: {
              type: "string",
              enum: ["PUBLIC", "CONNECTIONS"],
              description: "Post visibility (defaults to PUBLIC)",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "linkedin_get_posts",
        description: "Retrieve recent posts from your LinkedIn account",
        inputSchema: {
          type: "object",
          properties: {
            count: {
              type: "number",
              description: "Number of posts to retrieve (max 100, default 20)",
            },
            entityUrn: {
              type: "string",
              description: "Optional: URN of organization to get posts from",
            },
          },
        },
      },
      {
        name: "linkedin_check_auth",
        description: "Check current authentication status and token validity",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "linkedin_check_auth": {
        const credentials = loadCredentials();
        
        if (!credentials.access_token) {
          return {
            content: [
              {
                type: "text",
                text: "❌ No access token found. Please run OAuth authorization:\ncd /Users/mobicycle/Desktop/api/_config && bun linkedin-auth",
              },
            ],
          };
        }

        // Test token validity by making a simple API call
        try {
          const profile = await makeLinkedInAPIRequest('/people/~:(id,firstName,lastName)');
          return {
            content: [
              {
                type: "text", 
                text: `✅ Authentication valid!\n🔑 Token: ${credentials.access_token.substring(0, 20)}...\n👤 User: ${profile.firstName?.localized?.en_US} ${profile.lastName?.localized?.en_US}\n📅 Setup: ${credentials.token_obtained_at || 'Unknown'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Token expired or invalid: ${error}\nPlease re-run OAuth: cd /Users/mobicycle/Desktop/api/_config && bun linkedin-auth`,
              },
            ],
          };
        }
      }

      case "linkedin_get_profile": {
        const profile = await makeLinkedInAPIRequest('/people/~:(id,firstName,lastName,emailAddress,profilePicture)');
        
        return {
          content: [
            {
              type: "text",
              text: `👤 LinkedIn Profile:\n📧 ${profile.emailAddress}\n📛 ${profile.firstName?.localized?.en_US} ${profile.lastName?.localized?.en_US}\n🆔 ${profile.id}`,
            },
          ],
        };
      }

      case "linkedin_list_manageable_entities": {
        const entities = await makeLinkedInAPIRequest('/organizationAcls?q=roleAssignee');
        
        const organizations = entities.elements?.map((entity: any) => ({
          name: entity.organization?.name?.localized?.en_US || entity.organization?.vanityName || 'Unknown',
          urn: entity.organization?.entityUrn || entity.organization,
          role: entity.role,
        })) || [];

        return {
          content: [
            {
              type: "text",
              text: `📊 Manageable Organizations (${organizations.length}):\n\n${organizations.map((org: any, i: number) => 
                `${i + 1}. ${org.name}\n   URN: ${org.urn}\n   Role: ${org.role}`
              ).join('\n\n') || 'No organizations found'}`,
            },
          ],
        };
      }

      case "linkedin_create_post": {
        const { content, entityUrn, visibility = "PUBLIC" } = args as any;
        
        if (!content) {
          throw new Error("Post content is required");
        }

        // Get current user profile to construct author URN
        const profile = await makeLinkedInAPIRequest('/people/~:(id)');
        const authorUrn = entityUrn || `urn:li:person:${profile.id}`;

        const postData = {
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": visibility,
          },
        };

        const result = await makeLinkedInAPIRequest('/ugcPosts', 'POST', postData);
        
        return {
          content: [
            {
              type: "text",
              text: `✅ LinkedIn post created successfully!\n🔗 Post ID: ${result.id}\n👤 Author: ${authorUrn}\n📄 Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            },
          ],
        };
      }

      case "linkedin_get_posts": {
        const { count = 20, entityUrn } = args as any;
        
        // Get current user profile if no entity specified
        let authorUrn = entityUrn;
        if (!authorUrn) {
          const profile = await makeLinkedInAPIRequest('/people/~:(id)');
          authorUrn = `urn:li:person:${profile.id}`;
        }

        const posts = await makeLinkedInAPIRequest(
          `/ugcPosts?q=authors&authors=${encodeURIComponent(authorUrn)}&count=${Math.min(count, 100)}&sortBy=LAST_MODIFIED`
        );
        
        const formattedPosts = posts.elements?.map((post: any, i: number) => {
          const content = post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || 'No content';
          const created = new Date(post.created?.time || 0).toLocaleDateString();
          
          return `${i + 1}. ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}\n   📅 ${created}\n   🆔 ${post.id}`;
        }).join('\n\n') || 'No posts found';

        return {
          content: [
            {
              type: "text",
              text: `📝 Recent LinkedIn Posts (${posts.elements?.length || 0}):\n\n${formattedPosts}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LinkedIn MCP Server running on stdio");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}