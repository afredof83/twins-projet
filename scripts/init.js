#!/usr/bin/env node

/**
 * Initialization Script for Digital Twin Profile System
 * Run this after setting up your environment variables
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing Digital Twin Profile System...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found!');
    console.log('📝 Please copy .env.example to .env.local and fill in your values:');
    console.log('   cp .env.example .env.local\n');
    process.exit(1);
}

console.log('✅ Environment file found\n');

// Step 1: Generate Prisma Client
console.log('📦 Step 1: Generating Prisma Client...');
try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma Client generated\n');
} catch (error) {
    console.error('❌ Failed to generate Prisma Client');
    process.exit(1);
}

// Step 2: Push database schema
console.log('🗄️  Step 2: Pushing database schema...');
try {
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Database schema pushed\n');
} catch (error) {
    console.error('❌ Failed to push database schema');
    console.log('💡 Make sure your DATABASE_URL is correct in .env.local');
    process.exit(1);
}

// Step 3: Instructions for pgvector migration
console.log('🧠 Step 3: pgvector Setup');
console.log('⚠️  MANUAL STEP REQUIRED:');
console.log('   1. Open your Supabase SQL Editor');
console.log('   2. Run the SQL from: prisma/migrations/001_setup_pgvector.sql');
console.log('   3. This will enable pgvector and create the semantic search function\n');

// Step 4: Verify installation
console.log('✅ Core setup complete!\n');
console.log('📋 Next steps:');
console.log('   1. Complete the pgvector migration (see Step 3 above)');
console.log('   2. Run: npm run dev');
console.log('   3. Navigate to: http://localhost:3000/profile/new');
console.log('   4. Create your first digital twin profile!\n');

console.log('🔐 Security Reminder:');
console.log('   - Your master password is NEVER stored on the server');
console.log('   - Save your BIP39 recovery phrase in a safe place');
console.log('   - Loss of both = permanent data loss\n');

console.log('🎉 Happy coding!\n');
