#!/usr/bin/env bun

// LinkedIn Post with Unique Content
import { readFileSync } from 'node:fs';

async function postUniqueContent() {
  console.log('🚀 Creating unique LinkedIn post...\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  const timestamp = new Date().toISOString();
  const uniqueContent = `✅ LinkedIn API Integration Confirmed Working! 

🔧 Technical Details:
• API Endpoint: /rest/posts (2025)
• Person URN: urn:li:person:ipU44U3TU6
• OAuth Scope: w_member_social
• Status: Production Ready ✨

Posted at: ${timestamp}

#LinkedInAPI #APIIntegration #MobiCycle #TechSuccess #Programming`;

  const postData = {
    "author": "urn:li:person:ipU44U3TU6",
    "commentary": uniqueContent,
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    },
    "lifecycleState": "PUBLISHED",
    "isReshareDisabledByAuthor": false
  };

  console.log('📤 Posting unique content...');

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

    if (response.ok) {
      console.log('🎉 SUCCESS! Unique post created successfully!');
      console.log('✅ LinkedIn API integration confirmed working!');
    } else {
      console.log(`📋 Response: ${responseText}`);
    }

  } catch (error) {
    console.error('💥 Request failed:', error);
  }
}

postUniqueContent().catch(console.error);