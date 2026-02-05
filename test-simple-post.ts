#!/usr/bin/env bun

// Simple LinkedIn Post Test - Using known Person ID
import { readFileSync } from 'node:fs';

async function testLinkedInPost() {
  console.log('🚀 Testing LinkedIn Post API...\n');

  // Load credentials
  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token: ${accessToken.substring(0, 30)}...`);

  // For now, let's try posting without the Person URN to see what error we get
  const postData = {
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "🎉 Testing LinkedIn API integration! This post was created programmatically. #LinkedIn #API #Automation"
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  console.log('📤 Attempting post without author URN first to see what happens...');
  
  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });

    const responseText = await response.text();
    console.log(`📋 Response status: ${response.status}`);
    console.log(`📋 Response body: ${responseText}`);

    if (response.ok) {
      console.log('🎉 Post created successfully!');
    } else {
      console.log('❌ Post failed - this will tell us what Person URN format is needed');
    }

  } catch (error) {
    console.error('💥 Request failed:', error);
  }
}

testLinkedInPost().catch(console.error);