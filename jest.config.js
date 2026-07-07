process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  // Prefer TypeScript sources over any stale compiled .js output in src/.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, 'marked'])],
};
