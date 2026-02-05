#!/usr/bin/env bun

// Test LinkedIn's New Posts API (2025)
import { readFileSync } from 'node:fs';

async function testNewPostsAPI() {
  console.log('🚀 Testing LinkedIn NEW Posts API (2025)...\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token with w_member_social: ${accessToken.substring(0, 30)}...`);

  // Use the new Posts API format (2025)
  const postData = {
    "author": "urn:li:person:1129895808", // Try person URN first
    "commentary": "🎉 Testing LinkedIn's NEW Posts API (2025)! This post was created programmatically with the latest API format. #LinkedIn #PostsAPI #2025 #Success",
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    },
    "lifecycleState": "PUBLISHED",
    "isReshareDisabledByAuthor": false
  };

  console.log('📤 Using NEW Posts API endpoint...');
  console.log('📋 Post data:', JSON.stringify(postData, null, 2));

  try {
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202511'
      },
      body: JSON.stringify(postData)
    });

    const responseText = await response.text();
    console.log(`\n📋 Response status: ${response.status}`);
    console.log(`📋 Response body: ${responseText}`);

    if (response.ok) {
      console.log('\n🎉 SUCCESS! LinkedIn post created with NEW Posts API!');
      
      try {
        const postResult = JSON.parse(responseText);
        console.log(`✅ Post ID: ${postResult.id}`);
        console.log(`🔗 Full response:`, JSON.stringify(postResult, null, 2));
      } catch (e) {
        console.log('📋 Raw response:', responseText);
      }
    } else {
      console.log('\n❌ New Posts API failed, trying with member URN...');
      
      // Try with member URN instead
      postData.author = "urn:li:member:1129895808";
      console.log('📤 Retrying with member URN...');
      
      const retryResponse = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202511'
        },
        body: JSON.stringify(postData)
      });

      const retryResponseText = await retryResponse.text();
      console.log(`\n📋 Retry Response status: ${retryResponse.status}`);
      console.log(`📋 Retry Response body: ${retryResponseText}`);

      if (retryResponse.ok) {
        console.log('\n🎉 SUCCESS! LinkedIn post created with member URN!');
        try {
          const postResult = JSON.parse(retryResponseText);
          console.log(`✅ Post ID: ${postResult.id}`);
        } catch (e) {
          console.log('📋 Raw response:', retryResponseText);
        }
      }
    }

  } catch (error) {
    console.error('💥 Request failed:', error);
  }
}

testNewPostsAPI().catch(console.error);