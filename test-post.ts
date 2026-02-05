#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CREDENTIALS_PATH = join(import.meta.dirname, 'credentials.json');

interface LinkedInCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  redirect_uri: string;
}

function loadCredentials(): LinkedInCredentials {
  const credentialsText = readFileSync(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(credentialsText);
}

async function testLinkedInAPI() {
  console.log('🔍 Testing LinkedIn API Access...\n');
  
  const credentials = loadCredentials();
  
  // For this test, we'll use a temporary access token that needs to be obtained manually
  // In production, this would come from the OAuth flow
  const accessToken = credentials.access_token || 'YOUR_ACCESS_TOKEN_HERE';
  
  if (accessToken === 'YOUR_ACCESS_TOKEN_HERE' || !accessToken) {
    console.log('❌ No access token found!');
    console.log('📋 To get an access token:');
    console.log('1. Visit: https://www.linkedin.com/developers/apps/862cvuio6esv0k/auth');
    console.log('2. Generate an access token manually');
    console.log('3. Update credentials.json with the token');
    console.log('4. Run this script again');
    return;
  }

  console.log(`🔑 Using access token: ${accessToken.substring(0, 20)}...`);

  try {
    // First get user profile to get the correct member ID  
    console.log('\n📋 Getting user profile...');
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let userId;
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      userId = profile.id;
      console.log(`✅ User ID: ${userId}`);
    } else {
      console.log(`⚠️ Profile fetch failed: ${profileResponse.status}, using fallback approach`);
      // Try a minimal post without author - LinkedIn should infer from token
      userId = null;
    }
    
    console.log('\n📝 Testing LinkedIn post creation...');
    
    const postContent = userId ? {
      author: `urn:li:member:${userId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: "Excited about the growing potential of sustainable transportation solutions. The shift toward electric mobility is creating new opportunities across industries. #sustainability #innovation"
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    } : {
      // Minimal post structure if we can't get user ID
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: "Excited about the growing potential of sustainable transportation solutions. The shift toward electric mobility is creating new opportunities across industries. #sustainability #innovation"
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postContent),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      throw new Error(`Post API error: ${postResponse.status} ${postResponse.statusText}\n${errorText}`);
    }

    const postResult = await postResponse.json();
    console.log('✅ Post created successfully!');
    console.log(`🔗 Post ID: ${postResult.id}`);
    console.log(`📄 Content: ${postContent.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text}`);

    console.log('\n🎉 LinkedIn API integration is working!');
    console.log('💡 You can now use the MCP server tools for LinkedIn posting.');

  } catch (error) {
    console.error('❌ LinkedIn API test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n🔄 The access token may be expired or invalid.');
      console.log('📋 To refresh:');
      console.log('1. Complete OAuth flow: cd /Users/mobicycle/Desktop/api/_config && bun linkedin-auth');
      console.log('2. Or manually generate new token from LinkedIn Developer Console');
    }
  }
}

if (import.meta.main) {
  testLinkedInAPI().catch(console.error);
}