#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CREDENTIALS_PATH = join(import.meta.dirname, 'credentials.json');

function loadCredentials() {
  const credentialsText = readFileSync(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(credentialsText);
}

function saveCredentials(credentials: any) {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

async function testLinkedInWithManualToken() {
  console.log('🔧 LinkedIn API Manual Token Test');
  console.log('==================================\n');
  
  console.log('📋 To get a LinkedIn access token manually:');
  console.log('1. Visit: https://www.linkedin.com/developers/tools/oauth?clientId=78yk5phyudy3k1');
  console.log('2. Click "Create token"');
  console.log('3. Select scopes: profile, w_member_social, email');
  console.log('4. Complete OAuth flow and copy the token');
  console.log('5. Or use curl/Postman with client credentials');
  console.log('\n💡 Alternative: Use any working LinkedIn access token you have\n');
  
  console.log('🔑 Please paste your LinkedIn access token:');
  
  // Read token from stdin
  process.stdout.write('Token: ');
  const token = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
  
  if (!token || token.length < 20) {
    console.log('❌ Invalid token. Please provide a valid LinkedIn access token.');
    return;
  }
  
  console.log(`\n✅ Token received: ${token.substring(0, 20)}...`);
  
  // Save token to credentials
  const credentials = loadCredentials();
  credentials.access_token = token;
  credentials.token_obtained_at = new Date().toISOString();
  credentials.setup_completed = true;
  saveCredentials(credentials);
  
  console.log('💾 Token saved to credentials.json');
  
  // Test the token
  console.log('\n🧪 Testing LinkedIn API...');
  
  try {
    // Test 1: Get user profile
    console.log('📋 Test 1: Getting user profile...');
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log('✅ Profile retrieved successfully!');
      console.log(`   User ID: ${profile.id}`);
      console.log(`   Name: ${profile.firstName?.localized?.en_US || 'N/A'} ${profile.lastName?.localized?.en_US || 'N/A'}`);
      
      // Test 2: Create a LinkedIn post
      console.log('\n📝 Test 2: Creating LinkedIn post...');
      
      const postContent = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: "🎉 LinkedIn API integration successful! Testing automated posting for MobiCycle. #ClimateAction #SustainableTech #Innovation #API"
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202501',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postContent),
      });

      if (postResponse.ok) {
        const postResult = await postResponse.json();
        console.log('✅ LinkedIn post created successfully!');
        console.log(`   Post ID: ${postResult.id}`);
        console.log(`   Content: ${postContent.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text}`);
        console.log('\n🎉 LinkedIn API integration is WORKING PERFECTLY!');
        console.log('🚀 You can now use the LinkedIn posting functionality in your applications!');
      } else {
        const errorText = await postResponse.text();
        console.log(`❌ Post creation failed: ${postResponse.status}`);
        console.log(`   Response: ${errorText}`);
        
        if (postResponse.status === 403) {
          console.log('\n💡 Post failed but profile worked. Token might need w_member_social scope.');
        }
      }
      
    } else {
      const errorText = await profileResponse.text();
      console.log(`❌ Profile fetch failed: ${profileResponse.status}`);
      console.log(`   Response: ${errorText}`);
      
      if (profileResponse.status === 401) {
        console.log('\n🔄 Token is invalid or expired. Please get a new token.');
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

if (import.meta.main) {
  await testLinkedInWithManualToken();
}