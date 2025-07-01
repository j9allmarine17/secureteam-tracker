import nodemailer from 'nodemailer';
import { loadEnvironment } from './server/env.js';

// Load environment variables
loadEnvironment();

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
  console.log('EMAIL_ADMIN_RECIPIENTS:', process.env.EMAIL_ADMIN_RECIPIENTS || 'NOT SET');
  console.log('EMAIL_NOTIFICATIONS_ENABLED:', process.env.EMAIL_NOTIFICATIONS_ENABLED || 'NOT SET');
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
    
    // Test sending email if admin recipients are configured
    const adminEmails = process.env.EMAIL_ADMIN_RECIPIENTS?.split(',').map(email => email.trim());
    if (adminEmails && adminEmails.length > 0 && adminEmails[0]) {
      console.log('\nTesting email send...');
      const testEmail = adminEmails[0];
      
      const mailOptions = {
        from: process.env.SMTP_FROM || `"SecureTeam Tracker" <noreply@${config.host}>`,
        to: testEmail,
        subject: 'SecureTeam Tracker - Email Configuration Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Email Configuration Test Successful</h2>
            <p>This is a test email to verify Exchange server SMTP relay configuration.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #16a34a;">
              <p><strong>Configuration Status:</strong> ✅ Working</p>
              <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Server:</strong> ${config.host}:${config.port}</p>
            </div>
            <p>Email notifications are ready for use in SecureTeam Tracker.</p>
          </div>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent SUCCESSFULLY');
      console.log('Message ID:', result.messageId);
      console.log('Sent to:', testEmail);
    } else {
      console.log('ℹ️  Skipping email send test (no admin recipients configured)');
    }
    
  } catch (error) {
    console.error('❌ Email test FAILED:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);
    console.error('Error responseCode:', error.responseCode);
    
    console.log('\n🔧 Troubleshooting suggestions:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('- Exchange server may not be running or accessible');
      console.log('- Check if port 25 is blocked by firewall');
      console.log('- Verify network connectivity to smtp.company.local');
      console.log('- Test with: telnet smtp.company.local 25');
    } else if (error.code === 'ENOTFOUND') {
      console.log('- DNS resolution failed for smtp.company.local');
      console.log('- Check DNS configuration');
      console.log('- Verify hostname is correct');
    } else if (error.responseCode === 550 || error.responseCode === 553) {
      console.log('- SMTP relay may be restricted');
      console.log('- Check Exchange receive connector permissions');
      console.log('- Verify sender/recipient restrictions');
    } else if (error.code === 'EAUTH') {
      console.log('- Authentication failed');
      console.log('- Verify service account credentials');
      console.log('- Check if account is locked or password expired');
    } else if (error.message.includes('TLS') || error.message.includes('SSL')) {
      console.log('- TLS/SSL connection issue');
      console.log('- Try setting SMTP_TLS_REJECT_UNAUTHORIZED=false');
      console.log('- Check Exchange TLS configuration');
    }
    
    console.log('\n📋 For Exchange Server troubleshooting:');
    console.log('1. Check Exchange receive connector allows anonymous relay');
    console.log('2. Verify connector accepts connections from your network');
    console.log('3. Review Exchange transport logs');
    console.log('4. Test with PowerShell: Send-MailMessage command');
  }
}

// Run the test
testEmailConfiguration().catch(console.error);