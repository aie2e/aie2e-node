/**
 * Application constants and configuration values
 */

// Application metadata
export const APP_NAME = 'aie2e-client';
export const APP_VERSION = '0.1.1';

// Default configuration
export const DEFAULT_CONFIG = {
    transportConfig: {
        transport: 'stdio' as const,
        command: 'uvx',
        args: ['--from', 'aie2e', 'aie2e-server'],
        model: 'gpt-4o-mini',
        llmProvider: 'openai' as const,
        headless: false,
    },
    timeout: 300000 // 5 minutes
};

export const DEFAULT_HTTP_URL = 'http://localhost:3001/sse';

// Configuration file names and search paths
export const CONFIG_FILE_NAMES = ['aie2e.config.ts', 'aie2e.config.js'] as const;
export const CONFIG_SEARCH_SUBDIRS = ['config', '.config'] as const;

// Supported LLM providers
export const VALID_LLM_PROVIDERS = [
    'ollama',
    'openai',
    'anthropic',
    'google',
    'aws-bedrock',
    'anthropic-bedrock',
    'azure-openai',
    'deepseek',
    'groq',
    'openrouter'
] as const;

// Transport types
export const TRANSPORT_TYPES = ['stdio', 'http'] as const;

// MCP tool names
export const MCP_TOOLS = {
    RUN_TEST_SESSION: 'run_test_session'
} as const;

// File extensions for test files
export const TEST_FILE_EXTENSIONS = ['.ts', '.js'] as const;

// Exit codes
export const EXIT_CODES = {
    SUCCESS: 0,
    FAILURE: 1
} as const;

// Console output symbols and formatting
export const CONSOLE_SYMBOLS = {
    SUCCESS: '✅',
    FAILURE: '❌',
    INFO: '📋',
    RUNNING: '🔄',
    CELEBRATION: '🎉',
    WARNING: '⚠️'
} as const;

// Spinner configuration
export const TEST_CASE_SPINNER = {
    FRAMES: [
        '🌑 ',
        '🌒 ',
        '🌓 ',
        '🌔 ',
        '🌕 ',
        '🌖 ',
        '🌗 ',
        '🌘 '
    ] as string[],
    INTERVAL: 80,
    TEXT: 'Running test case...'
};



// Test session formatting
export const TEST_SESSION_FORMATTING = {
    SEPARATOR: '=========================================================================',
    INDENTATION: '   '
} as const;