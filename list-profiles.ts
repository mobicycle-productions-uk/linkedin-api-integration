#!/usr/bin/env bun

// List all profiles and data accessible with current LinkedIn token
import { readFileSync } from 'node:fs';

async function listAccessibleProfiles() {
  console.log('🔍 Checking all accessible LinkedIn profiles and data...\n');

  const credentials = JSON.parse(readFileSync('./credentials.json', 'utf-8'));
  const accessToken = credentials.access_token;

  console.log(`🔑 Using token with scopes: w_member_social`);
  console.log(`👤 Known Person URN: urn:li:person:ipU44U3TU6\n`);

  // Test various profile and user endpoints
  const endpoints = [
    // Profile endpoints
    { name: 'User Info (OAuth)', url: 'https://api.linkedin.com/v2/userinfo' },
    { name: 'Profile v2', url: 'https://api.linkedin.com/v2/me' },
    { name: 'People endpoint', url: 'https://api.linkedin.com/v2/people/~' },
    { name: 'Profile (legacy)', url: 'https://api.linkedin.com/v1/people/~' },
    { name: 'Profile REST', url: 'https://api.linkedin.com/rest/me' },
    
    // People endpoints with specific URN
    { name: 'People by URN', url: 'https://api.linkedin.com/v2/people/(id:ipU44U3TU6)' },
    { name: 'Person profiles', url: 'https://api.linkedin.com/rest/people/(id:ipU44U3TU6)' },
    
    // Company/Organization endpoints
    { name: 'Organizations', url: 'https://api.linkedin.com/v2/organizations' },
    { name: 'Company pages', url: 'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee' },
    { name: 'Managed organizations', url: 'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee' },
    
    // Posts and content
    { name: 'UGC Posts', url: 'https://api.linkedin.com/v2/ugcPosts?q=author&author=urn:li:person:ipU44U3TU6' },
    { name: 'Posts REST', url: 'https://api.linkedin.com/rest/posts?q=author&author=urn:li:person:ipU44U3TU6' },
    { name: 'Shares', url: 'https://api.linkedin.com/v2/shares?q=owner&owner=urn:li:person:ipU44U3TU6' },
    
    // Additional profile data
    { name: 'Email address', url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))' },
    { name: 'Contact info', url: 'https://api.linkedin.com/v2/people/(id:ipU44U3TU6)?projection=(id,firstName,lastName,emailAddress)' }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`🔍 Testing: ${endpoint.name}`);
    
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202511'
        }
      });

      const responseText = await response.text();
      const status = response.status;
      
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: status,
        success: status >= 200 && status < 300,
        data: status < 400 ? responseText.substring(0, 200) : responseText.substring(0, 100)
      });

      if (status >= 200 && status < 300) {
        console.log(`  ✅ ${status} - Success`);
        if (responseText.length > 0) {
          console.log(`  📋 Data: ${responseText.substring(0, 150)}...`);
        }
      } else {
        console.log(`  ❌ ${status} - ${responseText.substring(0, 80)}...`);
      }
      
    } catch (error) {
      console.log(`  💥 Error: ${error.message}`);
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: 'ERROR',
        success: false,
        data: error.message
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 SUMMARY OF ACCESSIBLE PROFILES AND DATA:');
  console.log('=' * 60);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`\n✅ ACCESSIBLE ENDPOINTS (${successful.length}):`);
    successful.forEach(result => {
      console.log(`  • ${result.name}: ${result.status}`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ BLOCKED/FAILED ENDPOINTS (${failed.length}):`);
    failed.forEach(result => {
      console.log(`  • ${result.name}: ${result.status}`);
    });
  }
  
  console.log(`\n🎯 CURRENT ACCESS SUMMARY:`);
  console.log(`  • Total endpoints tested: ${results.length}`);
  console.log(`  • Successful: ${successful.length}`);
  console.log(`  • Failed/Blocked: ${failed.length}`);
  console.log(`  • Token scope: w_member_social`);
  console.log(`  • Primary capability: Posting content ✅`);
}

listAccessibleProfiles().catch(console.error);