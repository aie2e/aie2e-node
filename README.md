# AIE2E - AI-Powered End-to-End Testing (Node.js Client)

A powerful end-to-end testing framework that uses AI to automate browser interactions and test web applications. This is the Node.js client that connects to the AIE2E MCP server for intelligent browser automation.

## Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.8 (for the MCP server)
- **Chrome or Chromium browser** (automatically managed by the server)
- An API key for one of the supported LLM providers

## Installation

### 1. Install the Client

```bash
npm install --save-dev aie2e
```

### 2. Create a Python Environment for the Server

It's recommended to create a virtual environment to avoid conflicts:

```bash
# Create virtual environment
python -m venv aie2e-env

# Activate it
# On macOS/Linux:
source aie2e-env/bin/activate
# On Windows:
aie2e-env\Scripts\activate
```

## Quick Start

### 1. Set up Environment Variables

Create a `.env` file in your project root:

```bash
# Copy the example and edit with your API keys
OPENAI_API_KEY=your-openai-api-key-here
# ANTHROPIC_API_KEY=your-anthropic-api-key-here  
# GOOGLE_API_KEY=your-google-api-key-here
```

### 2. Create Configuration File

Create `aie2e.config.ts` in your project root:

```typescript
import type { Aie2eConfig } from 'aie2e';

export default {
    transportConfig: {
        // Configure stdio transport to automatically run the local
        // Python server for test automation
        transport: "stdio",
        model: "gpt-4o-mini",
        llmProvider: "openai" as const,
        apiKey: process.env.OPENAI_API_KEY
    }
} as Aie2eConfig;
```

See [aie2e.config.example.ts](aie2e.config.example.ts) for more configuration options and examples.

### 3. Create Test Files

Create `aie2e-tests/mytest.test.ts`:

```typescript
import { testCase, testSession } from 'aie2e';

// Simple test
testCase('Navigate to https://example.com and verify it loads');

```

See the [example-tests](example-tests) folder for additional test examples

### 4. Run Tests

```bash
# Run all tests
npx aie2e ./aie2e-tests

# Run a specific test file
npx aie2e ./aie2e-tests/login.test.ts

```

## Configuration

### Environment Variables

AIE2E automatically loads environment variables from a `.env` file in your project root. Create a `.env` file based on the provided `.env.example`:

```bash
# Copy the example file and edit with your actual API keys
OPENAI_API_KEY=your-actual-openai-api-key
GOOGLE_API_KEY=your-actual-google-api-key
# ... etc
```

**Important:** Never commit your `.env` file to version control. Add it to your `.gitignore`:
```
.env
```

### Transport Configuration

AIE2E supports two transport mechanisms for connecting to the MCP server:

#### Stdio Transport (Default)

The stdio transport launches the MCP server as a subprocess:

```typescript
export default {
    // Stdio transport
    transportConfig: {
        transport: "stdio",
        model: "gpt-4",
        llmProvider: "openai" as const,
        apiKey: process.env.OPENAI_API_KEY,
        // Optional customization of the command to invoke the server
        command: "uvx",
        args: ["--from", "aie2e", "aie2e-server"]
    }
} as Aie2eConfig;
```

#### HTTP Transport

The HTTP transport connects to a running MCP server via HTTP:

```typescript
export default {
    // HTTP transport
    transportConfig: {
        transport: "http",
        url: "http://localhost:54321/mcp"
    }
} as Aie2eConfig;
```

See the [AIE2E Server](https://github.com/aie2e/aie2e-server) project for instructions to install
and run the MCP server with HTTP transport.

## Supported LLM Providers

Any provider/model supported by [Browser Use](https://github.com/browser-use/browser-use) should be available to use.

Testing so far has been focused on OpenAI and Google providers. We've had good luck with GPT-4o-mini.
Try some others and see what works!

- OpenAI (`openai`)
- Anthropic (`anthropic`)
- Google (`google`)
- Ollama (`ollama`)
- AWS Bedrock (`aws-bedrock`)
- Anthropic Bedrock (`anthropic-bedrock`)
- Azure OpenAI (`azure-openai`)
- DeepSeek (`deepseek`)
- Groq (`groq`)
- OpenRouter (`openrouter`)

## CLI Usage

```bash
# Run tests with default config
npx aie2e ./aie2e-tests

# Use custom config file
npx aie2e --config ./custom.config.ts ./aie2e-tests

```

## Troubleshooting

### Connection Issues

**"Connection refused" or MCP server errors**
- Verify server is installed: `uvx --from aie2e aie2e-server --help`
- For HTTP transport, ensure server is started before running tests
- Try stdio transport (default) which manages the server automatically

### Test Issues

**Run the server with HTTP transport to see more details of the testing agent**
- If tests are not working as expected, running the server manually is a great way
to see more information about the process the test agent is using and any problems it encounters
- Try manually installing the [AIE2E Server](https://github.com/aie2e/aie2e-server) and running it in HTTP mode
- Edit the `aie2e.config.ts` file to use HTTP transport and connect to the running server
- Review the output from the server to see all the steps the agent is taking to run the tests

**Tests hanging or timing out**
- Increase timeout in config: `timeout: 600000` (10 minutes)
- Check API key is valid and has sufficient credits
- Verify target website is accessible

**Browser errors**
- Ensure Chrome/Chromium is installed
- On Linux: `sudo apt-get install chromium-browser`
- On macOS: `brew install chromium`

### Configuration File Options

The configuration file supports the following options:

## Configuration Options

### Core Configuration

#### `transportConfig` (required)
Configuration for how to connect to the MCP server. Can be either stdio or HTTP transport.

#### `allowedDomains` (optional)
- **Type**: `string[]`
- **Default**: `undefined` (no restrictions)
- **Description**: Array of allowed domains for navigation. Supports wildcards.
- **Example**: `["https://*.example.com", "https://test.mysite.com"]`

#### `sensitiveData` (optional)
- **Type**: `Record<string, string | Record<string, string>>`
- **Default**: `undefined`
- **Description**: Object containing sensitive data for form filling. Keys can be domain patterns, values can be strings or objects with field mappings.
- **Example**:
```typescript
sensitiveData: {
  "https://*.example.com": {
    username: "testuser@example.com",
    password: "securepassword123"
  }
}
```

#### `timeout` (optional)
- **Type**: `number`
- **Default**: `300000` (5 minutes)
- **Description**: Timeout in milliseconds for MCP tool calls.

### Stdio Transport Configuration

#### `transport` (required)
- **Type**: `"stdio"`
- **Description**: Use stdio transport to automatically launch the MCP server as a subprocess.

#### `model` (required for stdio)
- **Type**: `string`
- **Description**: The LLM model to use for test automation.
- **Examples**: `"gpt-4o-mini"`, `"gpt-4"`, `"gemini-2.5-pro"`, `"claude-3-sonnet"`

#### `llmProvider` (required for stdio)
- **Type**: `"openai" | "anthropic" | "google" | "ollama" | "aws-bedrock" | "anthropic-bedrock" | "azure-openai" | "deepseek" | "groq" | "openrouter"`
- **Description**: The LLM provider to use.

#### `apiKey` (optional)
- **Type**: `string`
- **Description**: API key for the LLM provider. Not required for local providers like Ollama.
- **Note**: Can be provided via environment variables (recommended).

#### `command` (optional)
- **Type**: `string`
- **Default**: `"uvx"`
- **Description**: Command to run the MCP server.

#### `args` (optional)
- **Type**: `string[]`
- **Default**: `["--from", "aie2e", "aie2e-server"]`
- **Description**: Arguments for the server command.

#### `headless` (optional)
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Run browser in headless mode (no GUI). Useful for CI/CD environments.

### HTTP Transport Configuration

#### `transport` (required)
- **Type**: `"http"`
- **Description**: Use HTTP transport to connect to a manually started MCP server.

#### `url` (optional)
- **Type**: `string`
- **Default**: `"http://localhost:3001/sse"`
- **Description**: URL of the running MCP server.
