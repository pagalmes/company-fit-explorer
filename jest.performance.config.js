/**
 * Jest configuration specifically for performance regression tests
 * Based on 2024 React testing best practices
 */

module.exports = {
  ...require('./jest.config.js'),
  
  // Focus on performance tests
  testMatch: [
    '<rootDir>/src/**/__tests__/*performance*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/*infiniteLoop*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/*ApiCallMonitoring*.test.{ts,tsx}'
  ],
  
  // Set stricter timeouts to catch infinite loops faster
  testTimeout: 10000, // 10 seconds max per test
  
  // Enable additional debugging for performance issues
  verbose: true,
  
  // Custom test environment with performance monitoring
  setupFilesAfterEnv: [
    '<rootDir>/src/utils/testSetup.ts',
    '<rootDir>/src/utils/performanceTestSetup.ts'
  ],
  
  // Fail fast on infinite loops
  bail: 1,
  
  // Memory and timing limits
  maxWorkers: 1, // Single worker to better detect performance issues
  
  // Custom reporters for performance metrics
  reporters: [
    'default',
    [
      'jest-performance-reporter',
      {
        threshold: 100, // Fail if test takes more than 100ms
        outputFile: 'performance-report.json'
      }
    ]
  ]
};