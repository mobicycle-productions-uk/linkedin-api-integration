#!/usr/bin/env node

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const PORT = 3000;
const CREDENTIALS_PATH = join(process.cwd(), '..', 'linkedin', 'credentials.json');

function loadCredentials() {
  const credentialsText = readFileSync(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(credentialsText);
}

function saveCredentials(credentials: any) {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

async function exchangeCodeForToken(code: string) {
  const credentials = loadCredentials();
  
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: credentials.redirect_uri,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function startOAuthServer() {
  const credentials = loadCredentials();
  
  // Check if we have the required credentials
  if (credentials.client_id === 'YOUR_LINKEDIN_CLIENT_ID') {
    console.log('❌ Please update credentials.json with your actual LinkedIn app credentials');
    process.exit(1);
  }

  // Generate OAuth URL
  const state = Math.random().toString(36).substring(2);
  const scopes = ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'w_organization_social'];
  const scopeString = scopes.join(' ');
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${credentials.client_id}&redirect_uri=${encodeURIComponent(credentials.redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopeString)}`;

  console.log('🚀 LinkedIn OAuth Server Started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('🔗 Open this URL in your browser to authorize:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('✅ After authorization, you\'ll be redirected back and the token will be saved automatically');
  console.log('❌ Press Ctrl+C to stop the server');

  const server = Bun.serve({
    port: PORT,
    fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          return new Response(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
                <p><strong>Error:</strong> ${error}</p>
                <p><strong>Description:</strong> ${url.searchParams.get('error_description') || 'Unknown error'}</p>
                <p>Please try again or check your LinkedIn app configuration.</p>
              </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' },
            status: 400,
          });
        }

        if (!code) {
          return new Response(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #d32f2f;">❌ Missing Authorization Code</h1>
                <p>No authorization code received from LinkedIn.</p>
              </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' },
            status: 400,
          });
        }

        // Exchange code for token
        exchangeCodeForToken(code)
          .then(tokenData => {
            // Save token to credentials
            const updatedCredentials = {
              ...loadCredentials(),
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_in: tokenData.expires_in,
              token_obtained_at: new Date().toISOString(),
            };
            
            saveCredentials(updatedCredentials);
            
            console.log('');
            console.log('✅ SUCCESS! Access token saved to credentials.json');
            console.log(`🔑 Token: ${tokenData.access_token.substring(0, 20)}...`);
            console.log(`⏰ Expires in: ${tokenData.expires_in} seconds`);
            console.log('');
            console.log('🎉 You can now use the LinkedIn MCP server tools!');
            console.log('💡 Try: linkedin_get_profile, linkedin_list_manageable_entities, linkedin_create_post');
            
            return new Response(`
              <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5;">
                  <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0077b5;">✅ LinkedIn Authorization Complete!</h1>
                    <p style="font-size: 18px; margin: 20px 0;">Access token saved successfully!</p>
                    <div style="background: #f0f8ff; padding: 20px; border-radius: 4px; margin: 20px 0;">
                      <p><strong>Token:</strong> ${tokenData.access_token.substring(0, 30)}...</p>
                      <p><strong>Expires in:</strong> ${tokenData.expires_in} seconds</p>
                    </div>
                    <p style="color: #666;">You can now close this window and use the LinkedIn MCP server tools!</p>
                    <p style="font-size: 14px; color: #888; margin-top: 30px;">
                      The server will automatically shut down in 10 seconds...
                    </p>
                  </div>
                </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' },
            });
          })
          .catch(error => {
            console.error('❌ Token exchange failed:', error.message);
            
            return new Response(`
              <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                  <h1 style="color: #d32f2f;">❌ Token Exchange Failed</h1>
                  <p><strong>Error:</strong> ${error.message}</p>
                  <p>Please check your LinkedIn app configuration and try again.</p>
                </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' },
              status: 500,
            });
          });

        // Delay to allow response to be sent, then exit
        setTimeout(() => {
          console.log('🛑 Shutting down OAuth server...');
          process.exit(0);
        }, 10000);

        return new Response('Processing...', { status: 202 });
      }

      // Default response for other paths
      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>🔗 LinkedIn OAuth Server</h1>
            <p>This server handles LinkedIn OAuth callbacks.</p>
            <p>Please use the authorization URL shown in the console.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    },
  });

  return server;
}

// Start the server
if (import.meta.main) {
  try {
    startOAuthServer();
  } catch (error) {
    console.error('❌ Failed to start OAuth server:', error.message);
    process.exit(1);
  }
}