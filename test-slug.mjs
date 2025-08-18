import { generateSlugFromName } from './src/lib/slug.ts';

// Test the basic slug generation function
console.log('Testing basic slug generation:');
console.log(generateSlugFromName('Acme Inc.'));           // Expected: 'acme-inc'
console.log(generateSlugFromName('Test Company!!!'));     // Expected: 'test-company'
console.log(generateSlugFromName('   Multiple   Spaces   '));  // Expected: 'multiple-spaces'
console.log(generateSlugFromName('Special@#$%Characters')); // Expected: 'specialcharacters'
console.log(generateSlugFromName(''));                     // Expected: 'workspace'

// Note: generateUniqueSlug requires database connection, so we'll just test basic function
console.log('\nBasic slug generation tests completed!');
