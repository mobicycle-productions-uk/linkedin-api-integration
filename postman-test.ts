#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs';
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

function saveCredentials(credentials: any) {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

async function testWithManualToken() {
  console.log('🔧 LinkedIn API Test (Postman-style)');
  console.log('=====================================\n');
  
  const credentials = loadCredentials();
  
  // Check if we have a token
  if (!credentials.access_token || credentials.access_token === '') {
    console.log('❌ No access token found in credentials.json');
    console.log('\n📋 To get an access token:');
    console.log('1. Visit: https://www.linkedin.com/developers/tools/oauth/token-generator');
    console.log('2. Enter Client ID: ' + credentials.client_id);
    console.log('3. Select scopes: profile, w_member_social, email');
    console.log('4. Click "Create token" and authorize');
    console.log('5. Copy the token and paste it below when prompted');
    
    // Prompt for manual token entry
    console.log('\n🔑 Please enter your access token:');
    process.stdout.write('Token: ');
    
    // Simple input reading
    const token = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });
    
    if (!token) {
      console.log('❌ No token provided. Exiting.');
      return;
    }
    
    // Save the token
    credentials.access_token = token;
    credentials.token_obtained_at = new Date().toISOString();
    saveCredentials(credentials);
    
    console.log('✅ Token saved to credentials.json');
  }
  
  const accessToken = credentials.access_token;
  console.log(`\n🔑 Using token: ${accessToken.substring(0, 20)}...`);
  
  // Test 1: Get user profile
  console.log('\n📋 Test 1: Getting user profile...');
  try {
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202501',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log('✅ Profile retrieved successfully');
      console.log(`   User ID: ${profile.id}`);
      console.log(`   Name: ${profile.firstName?.localized?.en_US || 'N/A'} ${profile.lastName?.localized?.en_US || 'N/A'}`);
      console.log(`   Full data:`, JSON.stringify(profile, null, 2));
      
      // Test 2: Create a LinkedIn post
      console.log('\n📝 Test 2: Creating LinkedIn post...');
      
      const postContent = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: "🚀 Testing LinkedIn API integration! Excited about sustainable transportation and climate tech innovations. #ClimateAction #SustainableTech #Innovation"
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };

      console.log('📤 Post payload:', JSON.stringify(postContent, null, 2));

      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202501',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postContent),
      });

      if (postResponse.ok) {
        const postResult = await postResponse.json();
        console.log('✅ Post created successfully!');
        console.log(`   Post ID: ${postResult.id}`);
        console.log(`   Post URN: ${postResult.id}`);
        console.log(`   Content: ${postContent.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text}`);
        console.log('\n🎉 LinkedIn API integration is fully working!');
      } else {
        const errorText = await postResponse.text();
        console.log(`❌ Post creation failed: ${postResponse.status}`);
        console.log(`   Response: ${errorText}`);
      }
      
    } else {
      const errorText = await profileResponse.text();
      console.log(`❌ Profile fetch failed: ${profileResponse.status}`);
      console.log(`   Response: ${errorText}`);
      
      if (profileResponse.status === 401) {
        console.log('\n🔄 Token may be expired or have insufficient permissions');
        console.log('💡 Try generating a new token with these scopes: profile, w_member_social, email');
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Test 3: Alternative with Client Credentials flow (for app-only auth)
async function testClientCredentialsFlow() {
  console.log('\n🔧 Test 3: Client Credentials Flow...');
  const credentials = loadCredentials();
  
  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('✅ Client credentials token obtained');
      console.log(`   Token: ${tokenData.access_token.substring(0, 20)}...`);
      console.log(`   Expires in: ${tokenData.expires_in} seconds`);
    } else {
      const errorText = await tokenResponse.text();
      console.log(`❌ Client credentials failed: ${tokenResponse.status}`);
      console.log(`   Response: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Client credentials test failed:', error.message);
  }
}

if (import.meta.main) {
  console.log('LinkedIn API Test Suite');
  console.log('Choose test method:');
  console.log('1. Manual token (recommended) - You provide token from LinkedIn Developer Tools');
  console.log('2. Client credentials - App-only authentication');
  
  // For now, run the manual token test
  await testWithManualToken();
  
  // Uncomment to test client credentials
  // await testClientCredentialsFlow();
}