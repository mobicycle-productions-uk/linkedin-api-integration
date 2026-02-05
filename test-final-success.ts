#!/usr/bin/env bun

// Final LinkedIn Post Test with Correct Person URN
import { readFileSync } from 'node:fs';

async function postToLinkedInSuccess() {
  console.log('🚀 Final LinkedIn Post Test with Correct Person URN...\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token with w_member_social: ${accessToken.substring(0, 30)}...`);

  // From the error message, the correct person URN is: urn:li:person:ipU44U3TU6
  const postData = {
    "author": "urn:li:person:ipU44U3TU6",
    "commentary": "🎉 SUCCESS! LinkedIn API integration working perfectly! This post was created programmatically using the new Posts API with the correct person URN. #LinkedIn #API #Integration #Success #PostsAPI",
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    },
    "lifecycleState": "PUBLISHED",
    "isReshareDisabledByAuthor": false
  };

  console.log('📤 Using NEW Posts API with correct person URN: urn:li:person:ipU44U3TU6');
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
      console.log('\n🎉🎉🎉 ABSOLUTE SUCCESS! LinkedIn post created successfully! 🎉🎉🎉');
      
      try {
        const postResult = JSON.parse(responseText);
        console.log(`✅ Post ID: ${postResult.id}`);
        console.log(`🔗 Full response:`, JSON.stringify(postResult, null, 2));
        
        // Update credentials with correct person URN
        console.log('\n📝 Updating credentials with correct person URN...');
        const updatedCredentials = {
          ...credentials,
          person_urn: "urn:li:person:ipU44U3TU6",
          person_id: "ipU44U3TU6",
          last_successful_post: new Date().toISOString(),
          api_working: true
        };
        
        const fs = require('fs');
        fs.writeFileSync('./credentials.json', JSON.stringify(updatedCredentials, null, 2));
        console.log('✅ Credentials updated with working person URN!');
        
      } catch (e) {
        console.log('📋 Raw success response:', responseText);
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

postToLinkedInSuccess().catch(console.error);