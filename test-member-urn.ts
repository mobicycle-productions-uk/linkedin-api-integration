#!/usr/bin/env bun

// Test LinkedIn posting with member URN format
import { readFileSync } from 'node:fs';

async function testMemberURN() {
  console.log('🚀 Testing LinkedIn posting with member URN format...\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token: ${accessToken.substring(0, 30)}...`);

  // The error message told us we need urn:li:member:\d+
  // Let's try posting without an author first to see what happens
  const ugcPostData = {
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "🎉 Testing LinkedIn posting! This should work now with the correct headers. #LinkedIn #API #Success"
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    console.log('📤 Testing post WITHOUT author field first...');
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202511'
      },
      body: JSON.stringify(ugcPostData)
    });

    const responseText = await response.text();
    console.log(`📋 Response status: ${response.status}`);
    console.log(`📋 Response: ${responseText}`);

    if (response.ok) {
      console.log('🎉 Post created successfully without explicit author!');
    } else {
      console.log('❌ Post failed - checking if LinkedIn auto-detects author...');
    }

  } catch (error) {
    console.log('❌ Request failed:', error);
  }

  // Also try with some common member ID patterns  
  console.log('\n📤 If auto-detection failed, the token might contain member info...');
  console.log('🔍 Access token structure analysis:');
  
  // LinkedIn access tokens sometimes contain encoded member information
  // Let's see if we can decode any useful info
  try {
    // Access tokens often have base64 encoded sections
    const tokenParts = accessToken.split('.');
    console.log(`📊 Token has ${tokenParts.length} parts (dots separated)`);
    
    for (let i = 0; i < tokenParts.length; i++) {
      const part = tokenParts[i];
      console.log(`📋 Part ${i + 1} length: ${part.length} chars`);
      
      // Try to decode if it looks like base64
      if (part.length > 10 && /^[A-Za-z0-9+/=_-]+$/.test(part)) {
        try {
          const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
          if (decoded.includes('{') || decoded.includes('member') || decoded.includes('person')) {
            console.log(`🔍 Decoded part ${i + 1}:`, decoded);
          }
        } catch (e) {
          // Not base64, ignore
        }
      }
    }
  } catch (error) {
    console.log('🔍 Token analysis failed:', error);
  }
}

testMemberURN().catch(console.error);