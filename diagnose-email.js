import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables manually
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = envFile.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .reduce((acc, line) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          // Handle quoted values
          let value = valueParts.join('=').trim();
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          acc[key.trim()] = value;
        }
        return acc;
      }, {});
    
    Object.keys(envVars).forEach(key => {
      process.env[key] = envVars[key];
    });
    
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    return {};
  }
}

const envVars = loadEnv();

console.log('=== Exchange Server Email Diagnostic ===\n');

console.log('Raw .env parsing results:');
console.log('SMTP_HOST:', envVars.SMTP_HOST || 'NOT FOUND');
console.log('SMTP_PORT:', envVars.SMTP_PORT || 'NOT FOUND');
console.log('SMTP_SECURE:', envVars.SMTP_SECURE || 'NOT FOUND');
console.log('SMTP_USER:', envVars.SMTP_USER || 'NOT FOUND');
console.log('SMTP_PASS length:', envVars.SMTP_PASS ? envVars.SMTP_PASS.length : 'NOT FOUND');
console.log('SMTP_FROM:', envVars.SMTP_FROM || 'NOT FOUND');
console.log('SMTP_TLS_REJECT_UNAUTHORIZED:', envVars.SMTP_TLS_REJECT_UNAUTHORIZED || 'NOT FOUND');

console.log('\nProcessed environment variables:');
console.log('process.env.SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('process.env.SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('process.env.SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
console.log('process.env.SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('process.env.SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'NOT SET');
console.log('process.env.SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
console.log('process.env.SMTP_TLS_REJECT_UNAUTHORIZED:', process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'NOT SET');

console.log('\nEmail configuration analysis:');
const config = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '25'),
  secure: process.env.SMTP_SECURE === 'true',
  tls: {
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
  }
};

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  config.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  };
}

console.log('Nodemailer config:');
console.log('- Host:', config.host);
console.log('- Port:', config.port);
console.log('- Secure:', config.secure);
console.log('- TLS reject unauthorized:', config.tls.rejectUnauthorized);
console.log('- Has auth:', !!config.auth);
if (config.auth) {
  console.log('- Auth user:', config.auth.user);
  console.log('- Auth pass length:', config.auth.pass.length);
}

console.log('\nRecommendations for Exchange Server:');
console.log('1. Ensure Exchange receive connector allows anonymous relay');
console.log('2. Test network connectivity: telnet smtp.company.local 25');
console.log('3. For troubleshooting, try SMTP_TLS_REJECT_UNAUTHORIZED=false');
console.log('4. Check if Exchange requires authentication (SMTP_USER/SMTP_PASS)');
console.log('5. Verify firewall allows outbound connections to port 25');