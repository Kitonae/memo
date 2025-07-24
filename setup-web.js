#!/usr/bin/env node

/**
 * Setup verification for Jekyll GitHub Pages deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Jekyll GitHub Pages Setup Verification\n');

let allGood = true;

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}: ${filePath}`);
        return true;
    } else {
        console.log(`❌ ${description}: ${filePath} (MISSING)`);
        allGood = false;
        return false;
    }
}

// Check Jekyll files
console.log('📁 Checking Jekyll configuration...');
checkFile('_config.yml', 'Jekyll config');
checkFile('Gemfile', 'Ruby dependencies');
checkFile('index.html', 'Root redirect page');

// Check web directory
console.log('\n📁 Checking web application...');
checkFile('web/index.html', 'Web app main page');
checkFile('web/app.js', 'Application logic');
checkFile('web/styles.css', 'Styling');
checkFile('web/data.js', 'Vocabulary data');

// Check GitHub Actions
console.log('\n📁 Checking deployment...');
checkFile('.github/workflows/deploy.yml', 'GitHub Actions workflow');

// Generate/verify web data
console.log('\n🏗️ Verifying vocabulary data...');
try {
    const words = JSON.parse(fs.readFileSync('words.json', 'utf8'));
    console.log(`📊 Found ${words.length} words in vocabulary`);
    
    if (fs.existsSync('web/data.js')) {
        const dataContent = fs.readFileSync('web/data.js', 'utf8');
        if (dataContent.includes('VOCABULARY_DATA')) {
            console.log('✅ web/data.js contains vocabulary data');
        } else {
            console.log('❌ web/data.js missing VOCABULARY_DATA');
            allGood = false;
        }
    } else {
        console.log('❌ web/data.js missing - run: node -e "..." to generate');
        allGood = false;
    }
} catch (error) {
    console.log(`❌ Error checking vocabulary: ${error.message}`);
    allGood = false;
}

// Final status
console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('🎉 Jekyll setup complete! Ready for GitHub Pages.');
    console.log('\n📋 Next steps:');
    console.log('1. Commit and push:');
    console.log('   git add .');
    console.log('   git commit -m "Add Jekyll GitHub Pages setup"');
    console.log('   git push origin main');
    console.log('\n2. Enable GitHub Pages:');
    console.log('   - Repository Settings → Pages');
    console.log('   - Source: "GitHub Actions"');
    console.log('   - Save');
    console.log('\n3. Your site will be at:');
    console.log('   https://kitonae.github.io/memo/');
    console.log('   (redirects to https://kitonae.github.io/memo/web/)');
} else {
    console.log('❌ Setup incomplete. Fix issues above.');
    process.exit(1);
}