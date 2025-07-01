export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Length check
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Special character check
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Common password patterns (basic check)
  const commonPatterns = [
    /(.)\1{2,}/, // Three or more repeated characters
    /123456/, // Sequential numbers
    /abcdef/, // Sequential letters
    /qwerty/i, // Keyboard patterns
    /password/i, // Common word "password"
    /admin/i, // Common word "admin"
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push("Password contains common patterns and is too predictable");
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
} {
  let score = 0;
  
  // Length scoring
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  // Bonus for multiple special characters
  const specialChars = password.match(/[^a-zA-Z0-9]/g);
  if (specialChars && specialChars.length > 1) score += 1;
  
  // Bonus for mixed case and numbers together
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) score += 1;

  let label = "Very Weak";
  if (score >= 2) label = "Weak";
  if (score >= 4) label = "Fair";
  if (score >= 6) label = "Good";
  if (score >= 8) label = "Strong";

  return { score, label };
}