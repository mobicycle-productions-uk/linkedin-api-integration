#!/usr/bin/env bun

// Get LinkedIn Member ID
import { readFileSync } from 'node:fs';

async function getMemberID() {
  console.log('🔍 Getting LinkedIn Member ID...\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using access token: ${accessToken.substring(0, 30)}...`);

  // Try different profile endpoints
  const endpoints = [
    'https://api.linkedin.com/v2/me',
    'https://api.linkedin.com/v2/people/~',
    'https://api.linkedin.com/v2/profile',
    'https://api.linkedin.com/rest/me'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Trying: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202511'
        }
      });

      const responseText = await response.text();
      console.log(`📋 Status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ Success! Response:');
        console.log(responseText);
        
        try {
          const data = JSON.parse(responseText);
          
          // Look for ID in common fields
          if (data.id) {
            console.log(`\n🎯 Found Member ID: ${data.id}`);
            console.log(`🔗 Member URN: urn:li:member:${data.id}`);
            return data.id;
          }
          
          if (data.sub) {
            console.log(`\n🎯 Found Person ID: ${data.sub}`);
            console.log(`🔗 Person URN: urn:li:person:${data.sub}`);
            return data.sub;
          }
          
        } catch (e) {
          console.log('📋 Raw response:', responseText);
        }
        break;
      } else {
        console.log(`❌ Failed - ${responseText.substring(0, 200)}`);
      }

    } catch (error) {
      console.log(`💥 Error: ${error}`);
    }
  }
}

getMemberID().catch(console.error);