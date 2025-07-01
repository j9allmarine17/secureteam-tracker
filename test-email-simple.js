import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailConfiguration() {
  console.log('=== Email Configuration Test ===\n');
  
  // Display current configuration
  console.log('Configuration from .env:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
  console.log('SMTP_TLS_REJECT_UNAUTHORIZED:', process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'NOT SET');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '[CONFIGURED]' : 'NOT SET');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
  console.log('');

  // Create transporter configuration
  const config = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: process.env.SMTP_SECURE === 'true',
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
    }
  };

  // Add authentication if credentials are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    };
  }

  console.log('Nodemailer Configuration:');
  console.log(JSON.stringify({
    ...config,
    auth: config.auth ? { user: config.auth.user, pass: '[REDACTED]' } : undefined
  }, null, 2));
  console.log('');

  try {
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransporter(config);
    
    console.log('Testing connection...');
    await transporter.verify();
    console.log('✅ Connection test SUCCESSFUL');
    
  } catch (error) {
    console.error('❌ Email test FAILED:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);
    console.error('Error responseCode:', error.responseCode);
    
    console.log('\n🔧 Exchange Server Troubleshooting:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('- Exchange server may not be running or accessible');
      console.log('- Check if port 25 is blocked by firewall');
      console.log('- Test connectivity: telnet smtp.company.local 25');
    } else if (error.code === 'ENOTFOUND') {
      console.log('- DNS resolution failed for smtp.company.local');
      console.log('- Check DNS configuration or use IP address');
    } else if (error.responseCode >= 500) {
      console.log('- Exchange server internal error');
      console.log('- Check Exchange receive connector configuration');
      console.log('- Review Exchange transport logs');
    } else if (error.responseCode === 550 || error.responseCode === 553) {
      console.log('- SMTP relay restrictions');
      console.log('- Check receive connector permissions');
      console.log('- Verify anonymous relay is allowed');
    }
    
    console.log('\nFor your Exchange setup, try:');
    console.log('1. Set SMTP_TLS_REJECT_UNAUTHORIZED=false in .env');
    console.log('2. Verify Exchange receive connector allows anonymous relay');
    console.log('3. Check network connectivity from this server to Exchange');
  }
}

testEmailConfiguration().catch(console.error);