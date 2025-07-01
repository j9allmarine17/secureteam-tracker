// Production entry point - ES module version
// This avoids tsx loader issues

import { register } from 'tsx/esm/api';

// Register tsx for TypeScript support
register();

// Import and run the TypeScript server
await import('./index.ts');