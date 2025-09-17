import type { Aie2eConfig } from './src/config';

const config: Aie2eConfig = {
  // To start a local MCP server with stdio transport:
  transportConfig: {
    transport: 'stdio',
    model: 'gpt-4o-mini',
    llmProvider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // For HTTP transport (requires a running server):
  // transportConfig: {
  //   transport: 'http',
  //   url: 'http://localhost:54321/mcp'
  // },

  // For custom stdio transport:
  // transportConfig: {
  //   transport: 'stdio',
  //   command: 'python',
  //   args: ['-m', 'aie2e.mcp_server'],
  //   llmProvider: 'openai',
  //   model: 'gpt-4o-mini',
  //   apiKey: process.env.OPENAI_API_KEY,
  //   headless: true, // Run browser in headless mode (no GUI)
  // },

  // Restrict navigation to specific domains
  // allowedDomains: ["https://*.example.com"],
  
  // Sensitive data for form filling
  // Keys in this object can be referenced in tasks using `x_keyname`
  // Values will be filled in automatically during test execution, without exposing the sensitive value to the LLM
  // See https://docs.browser-use.com/examples/templates/sensitive-data for details
  // sensitiveData: {
  //   'https://*.example.com': {
  //     'user': process.env.TEST_USERNAME || 'test-user@example.com', // Will be used to replace `x_user` in tasks
  //     'pass': process.env.TEST_PASSWORD || 'test-password123', // Will be used to replace `x_pass` in tasks
  //   },
  // },

  // Timeout for MCP tool calls in milliseconds - default: 300000 (5 minutes)
  // timeout: 600000, // 10 minutes for complex test suites
};

export default config;