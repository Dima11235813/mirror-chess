#!/usr/bin/env node

/**
 * Test Naming Convention Validator
 * 
 * Enforces our testing strategy:
 * - .test.ts files: Unit tests (no testing-library allowed)
 * - .spec.ts files: Integration tests (testing-library allowed)
 * - .e2e.ts files: E2E tests (Playwright)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function logError(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function findTestFiles(dir, extensions) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        for (const ext of extensions) {
          if (item.endsWith(ext)) {
            files.push(fullPath);
            break;
          }
        }
      }
    }
  }
  
  walkDir(dir);
  return files;
}

function validateTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const violations = [];
  
  // Check file naming convention
  if (fileName.includes('.test.') && fileName.includes('.spec.')) {
    violations.push('File has both .test. and .spec. extensions');
  }
  
  if (fileName.includes('.e2e.') && !filePath.includes('prj-mgmt')) {
    violations.push('E2E tests must be in prj-mgmt folder');
  }
  
  // Check content based on file type
  if (fileName.includes('.test.')) {
    // Unit tests - no testing-library allowed
    if (content.includes('@testing-library/')) {
      violations.push('Testing library imports not allowed in unit tests (.test.ts)');
    }
    
    // Unit tests should focus on pure logic
    if (content.includes('render(') || content.includes('screen.') || content.includes('fireEvent.')) {
      violations.push('DOM testing utilities not allowed in unit tests (.test.ts)');
    }
  }
  
  if (fileName.includes('.spec.')) {
    // Integration tests - should use testing-library
    if (!content.includes('@testing-library/') && !content.includes('vitest')) {
      violations.push('Integration tests (.spec.ts) should use testing-library for component testing');
    }
  }
  
  if (fileName.includes('.e2e.')) {
    // E2E tests - should use Playwright
    if (!content.includes('playwright') && !content.includes('test(')) {
      violations.push('E2E tests (.e2e.ts) should use Playwright');
    }
  }
  
  return violations;
}

function main() {
  console.log('🔍 Validating test naming conventions...\n');
  
  const violations = [];
  const warnings = [];
  
  // Find all test files
  const testFiles = findTestFiles('src', ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']);
  const e2eFiles = findTestFiles('prj-mgmt', ['.e2e.ts']);
  
  // Validate test files
  for (const file of testFiles) {
    const fileViolations = validateTestFile(file);
    if (fileViolations.length > 0) {
      violations.push({
        file,
        violations: fileViolations
      });
    }
  }
  
  // Validate E2E files
  for (const file of e2eFiles) {
    const fileViolations = validateTestFile(file);
    if (fileViolations.length > 0) {
      violations.push({
        file,
        violations: fileViolations
      });
    }
  }
  
  // Report results
  if (violations.length > 0) {
    console.error('\n🚨 Test naming convention violations found:');
    console.error('=====================================\n');
    
    for (const { file, violations: fileViolations } of violations) {
      logError(`${file}:`);
      for (const violation of fileViolations) {
        console.error(`  - ${violation}`);
      }
      console.error('');
    }
    
    console.error('❌ Build failed due to test naming convention violations.');
    console.error('Please fix the above issues before building.');
    process.exit(1);
  }
  
  logSuccess('All test files follow naming conventions');
  logSuccess(`Found ${testFiles.length} test files and ${e2eFiles.length} E2E files`);
  
  // Summary
  const unitTests = testFiles.filter(f => f.includes('.test.'));
  const integrationTests = testFiles.filter(f => f.includes('.spec.'));
  
  console.log('\n📊 Test Summary:');
  console.log(`  Unit tests (.test.*): ${unitTests.length}`);
  console.log(`  Integration tests (.spec.*): ${integrationTests.length}`);
  console.log(`  E2E tests (.e2e.*): ${e2eFiles.length}`);
  
  logSuccess('Test naming conventions validated successfully!');
}

main();
