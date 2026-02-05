#!/usr/bin/env bun

// LinkedIn API 2025 - Correct Endpoints and Format
import { readFileSync } from 'node:fs';

async function testLinkedInAPI2025() {
  console.log('🚀 Testing LinkedIn API 2025 with correct endpoints...\n');

  // Load credentials
  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token: ${accessToken.substring(0, 30)}...`);

  // Test 1: Try new Posts API endpoint
  console.log('\n📝 Testing new Posts API endpoint...');
  const postData = {
    "author": "urn:li:person:PLACEHOLDER", // We'll see what error gives us the correct format
    "commentary": "🎉 Testing LinkedIn Posts API 2025! This is a test post from the new LinkedIn API. #LinkedIn #API #2025",
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    },
    "lifecycleState": "PUBLISHED",
    "isReshareDisabledByAuthor": false
  };

  try {
    console.log('📤 Using NEW Posts API: https://api.linkedin.com/rest/posts');
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202511' // November 2025 version
      },
      body: JSON.stringify(postData)
    });

    const responseText = await response.text();
    console.log(`📋 Posts API Response status: ${response.status}`);
    console.log(`📋 Posts API Response: ${responseText}`);

    if (response.ok) {
      console.log('🎉 New Posts API worked!');
      return;
    }

  } catch (error) {
    console.log('❌ New Posts API failed:', error);
  }

  // Test 2: Try ugcPosts API with correct 2025 headers
  console.log('\n📝 Testing ugcPosts API with 2025 headers...');
  const ugcPostData = {
    "author": "urn:li:person:PLACEHOLDER",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "🔄 Testing ugcPosts API with 2025 headers! #LinkedIn #ugcPosts #API"
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    console.log('📤 Using ugcPosts API with 2025 headers: https://api.linkedin.com/v2/ugcPosts');
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202511' // This was missing before!
      },
      body: JSON.stringify(ugcPostData)
    });

    const responseText = await response.text();
    console.log(`📋 ugcPosts Response status: ${response.status}`);
    console.log(`📋 ugcPosts Response: ${responseText}`);

    if (response.ok) {
      console.log('🎉 ugcPosts API worked with 2025 headers!');
    }

  } catch (error) {
    console.log('❌ ugcPosts API failed:', error);
  }

  // Test 3: Get profile to find Person URN  
  console.log('\n📋 Testing profile endpoints to get Person URN...');
  
  // Try different profile endpoints
  const profileEndpoints = [
    'https://api.linkedin.com/v2/me',
    'https://api.linkedin.com/v2/people/~',
    'https://api.linkedin.com/rest/me'
  ];

  for (const endpoint of profileEndpoints) {
    try {
      console.log(`🔍 Trying: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202511'
        }
      });

      const responseText = await response.text();
      console.log(`📋 ${endpoint} - Status: ${response.status}`);
      console.log(`📋 Response: ${responseText.substring(0, 200)}...`);
      
      if (response.ok) {
        console.log(`✅ ${endpoint} worked!`);
        break;
      }

    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error);
    }
  }
}

testLinkedInAPI2025().catch(console.error);