#!/usr/bin/env bun

// LinkedIn API Test with Correct Format
import { readFileSync } from 'node:fs';

interface Credentials {
  access_token: string;
  client_id: string;
  client_secret: string;
}

async function testLinkedInAPI() {
  console.log('🚀 Testing LinkedIn API with correct format...\n');

  // Load credentials
  const credentialsPath = './credentials.json';
  const credentials: Credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token: ${accessToken.substring(0, 30)}...`);

  // Step 1: Get user profile to obtain Person URN
  console.log('\n📋 Getting user profile...');
  try {
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.log(`❌ Profile fetch failed: ${profileResponse.status}`);
      console.log(`🔍 Error response: ${errorText}`);
      return;
    }

    const profileData = await profileResponse.json();
    console.log('✅ Profile data received:');
    console.log(JSON.stringify(profileData, null, 2));

    // Extract person URN from sub field
    const personUrn = `urn:li:person:${profileData.sub}`;
    console.log(`👤 Person URN: ${personUrn}`);

    // Step 2: Create a LinkedIn post
    console.log('\n📝 Creating LinkedIn post...');
    const postData = {
      "author": personUrn,
      "lifecycleState": "PUBLISHED",
      "specificContent": {
        "com.linkedin.ugc.ShareContent": {
          "shareCommentary": {
            "text": "🚀 Successfully testing LinkedIn API integration! Excited about automated posting capabilities. #LinkedIn #API #Integration"
          },
          "shareMediaCategory": "NONE"
        }
      },
      "visibility": {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    console.log('📤 Post content:', JSON.stringify(postData, null, 2));

    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.log(`❌ Post failed: ${postResponse.status}`);
      console.log(`🔍 Error response: ${errorText}`);
      return;
    }

    const postResult = await postResponse.json();
    console.log('🎉 Post created successfully!');
    console.log('✅ Post ID:', postResult.id);
    console.log('🔗 Response:', JSON.stringify(postResult, null, 2));

  } catch (error) {
    console.error('💥 API test failed:', error);
  }
}

// Run the test
testLinkedInAPI().catch(console.error);