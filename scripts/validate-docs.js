#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * Validates that all TrueSpend v4.2 documentation maintains consistency
 * with the Single Source of Truth (SSOT).
 * 
 * Run: node scripts/validate-docs.js
 */

const fs = require('fs');
const path = require('path');

// SSOT Values from implementation-timeline-v4.2.md
const SSOT = {
  totalWeeks: 51,
  totalPhases: 16,
  totalStoryPoints: 677,
  architectureLayers: 21,
  currentWeek: 35,
  currentProgress: 58,
};

const ERRORS = [];
const WARNINGS = [];

console.log('🔍 TrueSpend v4.2 Documentation Validator\n');
console.log('📋 Checking against SSOT values:');
console.log(`  - Total Weeks: ${SSOT.totalWeeks}`);
console.log(`  - Total Phases: ${SSOT.totalPhases}`);
console.log(`  - Total Story Points: ${SSOT.totalStoryPoints}`);
console.log(`  - Architecture Layers: ${SSOT.architectureLayers}`);
console.log(`  - Current Week: ${SSOT.currentWeek}`);
console.log(`  - Current Progress: ${SSOT.currentProgress}%\n`);

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    ERRORS.push(`❌ Cannot read file: ${filePath}`);
    return null;
  }
}

/**
 * Check for value in file
 */
function checkValue(filePath, searchPattern, expectedValue, description) {
  const content = readFile(filePath);
  if (!content) return;

  const regex = new RegExp(searchPattern, 'gi');
  const matches = content.match(regex);

  if (!matches) {
    ERRORS.push(`❌ ${filePath}: Missing ${description} (expected: ${expectedValue})`);
  } else {
    const foundValues = matches.map(m => m.match(/\d+/)?.[0]);
    const hasCorrectValue = foundValues.some(v => parseInt(v) === expectedValue);
    
    if (!hasCorrectValue) {
      ERRORS.push(`❌ ${filePath}: Incorrect ${description} (found: ${foundValues.join(', ')}, expected: ${expectedValue})`);
    }
  }
}

/**
 * Check for deprecated terminology
 */
function checkDeprecated(filePath, deprecatedTerms) {
  const content = readFile(filePath);
  if (!content) return;

  deprecatedTerms.forEach(term => {
    if (content.includes(term)) {
      WARNINGS.push(`⚠️  ${filePath}: Contains deprecated term "${term}"`);
    }
  });
}

/**
 * Validate documentation files
 */
function validateFiles() {
  const filesToCheck = [
    'docs/TIMELINE_HIERARCHY.md',
    'docs/DASHBOARD_README.md',
    'docs/PHASE_LAYER_MAPPING.md',
    'docs/PHASE_1_2_3_QUICK_REFERENCE.md',
    'docs/IMPLEMENTATION_COMPLETE.md',
    'README.md',
  ];

  console.log('📁 Validating documentation files...\n');

  filesToCheck.forEach(file => {
    if (!fileExists(file)) {
      ERRORS.push(`❌ File not found: ${file}`);
      return;
    }

    console.log(`  Checking ${file}...`);

    // Check total weeks
    checkValue(file, '(\\d+)\\s+weeks?', SSOT.totalWeeks, 'total weeks');

    // Check total phases
    checkValue(file, '(\\d+)\\s+phases?', SSOT.totalPhases, 'total phases');

    // Check story points
    checkValue(file, '(\\d+)\\s+SP', SSOT.totalStoryPoints, 'story points');

    // Check architecture layers
    checkValue(file, '(\\d+)[-\\s]layer', SSOT.architectureLayers, 'architecture layers');

    // Check current week
    checkValue(file, 'Week\\s+(\\d+)', SSOT.currentWeek, 'current week');

    // Check deprecated terminology
    checkDeprecated(file, ['Phase 2.5', '19 layers', '632 SP', 'Week 32']);
  });
}

/**
 * Validate code files
 */
function validateCode() {
  console.log('\n💻 Validating code files...\n');

  const codeFiles = [
    { path: 'src/hooks/useV42Metrics.ts', checks: ['phase13Completion', '677'] },
    { path: 'src/hooks/useTimelineData.ts', checks: ['currentWeek = 35', 'totalWeeks = 51'] },
    { path: 'src/hooks/useProjectData.ts', checks: ['currentWeek = 35', '677'] },
    { path: 'src/pages/dashboard/Overview.tsx', checks: ['677 SP', '21 layers'] },
  ];

  codeFiles.forEach(({ path: file, checks }) => {
    if (!fileExists(file)) {
      ERRORS.push(`❌ Code file not found: ${file}`);
      return;
    }

    console.log(`  Checking ${file}...`);
    const content = readFile(file);

    checks.forEach(check => {
      if (!content.includes(check)) {
        ERRORS.push(`❌ ${file}: Missing "${check}"`);
      }
    });
  });
}

/**
 * Validate new documentation files exist
 */
function validateNewFiles() {
  console.log('\n📝 Validating new documentation files...\n');

  const newFiles = [
    'docs/00-MASTER-INDEX.md',
    'docs/PHASE_COMPLETION_DEFINITIONS.md',
    'docs/ARCHITECTURE_SUMMARY.md',
  ];

  newFiles.forEach(file => {
    console.log(`  Checking ${file}...`);
    if (!fileExists(file)) {
      ERRORS.push(`❌ New file not created: ${file}`);
    }
  });
}

/**
 * Print results
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');

  if (ERRORS.length === 0 && WARNINGS.length === 0) {
    console.log('✅ ALL CHECKS PASSED! Documentation is consistent.\n');
    return 0;
  }

  if (ERRORS.length > 0) {
    console.log(`❌ Found ${ERRORS.length} error(s):\n`);
    ERRORS.forEach(error => console.log(error));
    console.log('');
  }

  if (WARNINGS.length > 0) {
    console.log(`⚠️  Found ${WARNINGS.length} warning(s):\n`);
    WARNINGS.forEach(warning => console.log(warning));
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`Summary: ${ERRORS.length} errors, ${WARNINGS.length} warnings`);
  console.log('='.repeat(60) + '\n');

  return ERRORS.length > 0 ? 1 : 0;
}

/**
 * Main execution
 */
function main() {
  validateFiles();
  validateCode();
  validateNewFiles();
  
  const exitCode = printResults();
  
  if (exitCode === 0) {
    console.log('✨ Documentation unification successful!\n');
  } else {
    console.log('❌ Documentation validation failed. Please fix the errors above.\n');
  }

  process.exit(exitCode);
}

// Run validator
main();
