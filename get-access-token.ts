#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CREDENTIALS_PATH = join(import.meta.dirname, 'credentials.json');

interface LinkedInCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  redirect_uri: string;
  expires_in: number;
  app_name: string;
  setup_completed: boolean;
  required_scopes: string[];
}

function loadCredentials(): LinkedInCredentials {
  const credentialsText = readFileSync(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(credentialsText);
}

function saveCredentials(credentials: LinkedInCredentials) {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

async function manualTokenSetup() {
  console.log('🔧 Manual LinkedIn Access Token Setup\n');
  
  const credentials = loadCredentials();
  
  console.log('📋 Since OAuth automation is having issues, here\'s how to get an access token manually:\n');
  
  console.log('1. 🌐 Open this URL in your browser (while logged into LinkedIn):');
  console.log(`   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${credentials.client_id}&redirect_uri=${encodeURIComponent(credentials.redirect_uri)}&scope=r_liteprofile%20r_emailaddress%20w_member_social%20w_organization_social&state=manual`);
  
  console.log('\n2. ✅ Click "Allow" to authorize the MobiCycle Posts app');
  
  console.log('\n3. 📋 Copy the authorization code from the redirect URL');
  console.log('   (It will be in the URL as: http://localhost:3000/callback?code=YOUR_CODE_HERE&state=manual)');
  
  console.log('\n4. 🔄 Then run this script to exchange the code for an access token:');
  console.log('   bun run exchange-token.ts YOUR_CODE_HERE');
  
  console.log('\n📝 Alternative: LinkedIn Developer Console');
  console.log('1. Visit: https://www.linkedin.com/developers/apps');
  console.log('2. Click on "MobiCycle Posts" app');
  console.log('3. Go to "Auth" tab');
  console.log('4. Generate a test access token');
  console.log('5. Copy and paste it when prompted');
  
  console.log('\nℹ️  Current app details:');
  console.log(`   App Name: ${credentials.app_name}`);
  console.log(`   Client ID: ${credentials.client_id}`);
  console.log(`   Redirect URI: ${credentials.redirect_uri}`);
  console.log(`   Required Scopes: ${credentials.required_scopes.join(', ')}`);
  
  console.log('\n⏳ Waiting for manual token input...');
  console.log('💡 If you have an access token ready, paste it here:');
  
  process.stdout.write('Access Token: ');
  
  // Simple input reading
  const token = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
  
  if (token && token.length > 10) {
    // Update credentials with the token
    const updatedCredentials = {
      ...credentials,
      access_token: token,
      token_obtained_at: new Date().toISOString(),
    };
    
    saveCredentials(updatedCredentials);
    
    console.log('\n✅ Access token saved to credentials.json!');
    console.log('🚀 You can now test LinkedIn API posting:');
    console.log('   bun run test-post.ts');
    
    // Test the token immediately
    console.log('\n🔍 Testing the access token...');
    
    try {
      const response = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName)', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const profile = await response.json();
        console.log(`✅ Token is valid! User: ${profile.firstName?.localized?.en_US} ${profile.lastName?.localized?.en_US}`);
        console.log('🎉 LinkedIn API integration is ready!');
      } else {
        console.log(`⚠️  Token test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`⚠️  Token test error: ${error.message}`);
    }
    
  } else {
    console.log('\n❌ No valid token provided. Please try again.');
  }
}

if (import.meta.main) {
  manualTokenSetup().catch(console.error);
}