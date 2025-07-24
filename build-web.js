#!/usr/bin/env node

/**
 * Build script for the web version of Japanese SRS
 * Converts words.json to web/data.js for browser consumption
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️  Building web version...');

try {
    // Read the vocabulary data
    const wordsPath = path.join(__dirname, 'words.json');
    const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
    
    // Generate JavaScript file with embedded data
    const jsContent = `// Auto-generated from words.json - do not edit manually
// Generated on: ${new Date().toISOString()}
// Word count: ${words.length}

const VOCABULARY_DATA = ${JSON.stringify(words, null, 2)};
`;
    
    // Write to web directory
    const webDataPath = path.join(__dirname, 'web', 'data.js');
    fs.writeFileSync(webDataPath, jsContent, 'utf8');
    
    console.log(`✅ Generated web/data.js with ${words.length} words`);
    console.log('🌐 Web version is ready!');
    console.log('');
    console.log('To test locally:');
    console.log('  cd web && python -m http.server 8080');
    console.log('  Then visit: http://localhost:8080');
    console.log('');
    console.log('To deploy to GitHub Pages:');
    console.log('  git add . && git commit -m "Update web version" && git push');
    
} catch (error) {
    console.error('❌ Error building web version:', error.message);
    process.exit(1);
}
