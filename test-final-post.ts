#!/usr/bin/env bun

// Final LinkedIn Post Test with Correct Member URN
import { readFileSync } from 'node:fs';

async function postToLinkedIn() {
  console.log('🚀 Testing LinkedIn Post with Member URN: urn:li:member:1129895808\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token: ${accessToken.substring(0, 30)}...`);

  const postData = {
    "author": "urn:li:member:1129895808",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "🎉 Successfully integrated LinkedIn API! This post was created programmatically using the correct member URN format. #LinkedIn #API #Integration #Success"
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  console.log('📤 Posting with correct member URN...');
  console.log('📋 Post data:', JSON.stringify(postData, null, 2));

  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
      console.log('\n🎉 SUCCESS! LinkedIn post created successfully!');
      
      try {
        const postResult = JSON.parse(responseText);
        console.log(`✅ Post ID: ${postResult.id}`);
        console.log(`🔗 Full response:`, JSON.stringify(postResult, null, 2));
      } catch (e) {
        console.log('📋 Raw response:', responseText);
      }
    } else {
      console.log('\n❌ Post failed. Error details:');
      try {
        const error = JSON.parse(responseText);
        console.log('🔍 Error:', JSON.stringify(error, null, 2));
      } catch (e) {
        console.log('🔍 Raw error:', responseText);
      }
    }

  } catch (error) {
    console.error('💥 Request failed:', error);
  }
}

postToLinkedIn().catch(console.error);