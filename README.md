# AIE2E - AI-Powered End-to-End Testing

An open framework for end-to-end testing of web projects using agentic AI. This module allows test cases to be specified in plain language and committed to the code repository and provides a test runner that can be used in the local development environment or as part of a build pipeline. It makes use of the [AIE2E MCP server](https://github.com/aie2e/aie2e-server) which can either be launched automatically or run as a standalone HTTP server.

## Motivation

Traditional browser automation testing can be fragile and difficult to maintain. A small change in the UI can cause the automated tests to fail completely. Even tools that use AI to assist in writing tests are vulnerable to the tests being overly coupled to the UI implementation details and becoming a bottleneck for development. Agentic AI testing allows for specifying the testing steps and acceptance criteria in plain language to focus on the functional requirements.

Other solutions taking a similar approach are services locked into a closed ecosystem. This tool leverages [Browser-Use](https://github.com/browser-use/browser-use), an open AI browser automation tool, and allows for connecting to the LLM of your choice, including local models.

## Limitations

Like all AI tools, this can make mistakes. It is not intended to replace rigorous unit or integration testing. Instead, this tool provides an additional way to navigate an application and check functionality the way a human tester would.

The AI testing process is slower and more resource intensive than standard browser automation. Consider this when designing your test strategy.

## Use Case

```typescript
testCase(`
- Go to https://www.wikipedia.org
- Use the search box to search for "artificial intelligence" and open the main article
- Verify the article header is "Artificial intelligence"
`);

testCase(`Steps to execute:
- Go to https://www.openstreetmap.org
- Search for "Chicago"
- Verify the map is visible and displays the location "Chicago"`, {
    use_vision: true
});
```

```
=========================================================================
Test session started:
=========================================================================
📋 Starting test session with 1 test(s)...
🔄 [1/1]
- Go to https://www.wikipedia.org
- Search for "artificial intelligence" and open the main article
- Verify the article header is "Artificial intelligence"

✅ [1/1] PASSED
   Successfully navigated to Wikipedia, searched for 'artificial intelligence',
   opened the main article, and verified that the article header is 'Artificial
   intelligence'. All steps of the user request have been completed successfully.



=========================================================================
Test session completed:
Result: ✅ PASSED
Tests: 1/1 passed (0 failed)
=========================================================================

=========================================================================
Test session started:
=========================================================================
📋 Starting test session with 1 test(s)...
🔄 [1/1] Steps to execute:
- Go to https://www.openstreetmap.org
- Search for "Chicago"
- Verify the map is visible and displays the location "Chicago"
✅ [1/1] PASSED
   Successfully navigated to OpenStreetMap, searched for 'Chicago', and verified
   that the map displays Chicago correctly. The test case has passed.



=========================================================================
Test session completed:
Result: ✅ PASSED
Tests: 1/1 passed (0 failed)
=========================================================================
MCP server connection closed


=========================================================================
🎉 All tests passed!
Tests: 2/2 passed (0 failed)
=========================================================================
```

## Prerequisites

- **Node.js** >= 18.0.0
- If using automatic management of the local MCP server
  - **[uv](https://docs.astral.sh/uv/) Python package manager**
  - An API key for one of the supported LLM providers

## Quick Start

### 1. Install uv Python package manager 
See the [uv documentation](https://docs.astral.sh/uv/getting-started/installation/) for installation instructions

### 2. Install the Testing Framework
In the root of the project to be tested:

```bash
npm install --save-dev aie2e
```

### 3. Set up Environment Variables

Create a `.env` file in your project root:

```bash
# Copy the example and edit with your API keys
OPENAI_API_KEY=your-openai-api-key-here
# ANTHROPIC_API_KEY=your-anthropic-api-key-here  
# GOOGLE_API_KEY=your-google-api-key-here
```

### 4. Create Configuration File

Create `aie2e.config.toml` in your project root:

```toml
[transport]
type = "stdio"
model = "gpt-4o-mini"
llm_provider = "openai"
api_key = "${OPENAI_API_KEY}"
```

See [aie2e.config.example.toml](aie2e.config.example.toml) for more configuration options and examples.

### 5. Create Test Files

Create `aie2e-tests/mytest.test.ts`:

```typescript
import { testCase } from 'aie2e';

// Simple test
testCase('Verify that the page loads successfully', { initial_actions: [
  // Initial navigation action - replace with the url where your application is available
  // Alternatively, describe in the text of the test case how to navigate to the destination
  { action: "go_to_url", arguments: { url: "https://example.com" }} 
]});

```

See the [example-tests](example-tests) folder for additional test examples

### 6. Run Tests

Execute the test runner and see the results.

In the project root, run
```bash
npx aie2e ./aie2e-tests
```

## Writing Tests

### Test Structure

AIE2E test files are TypeScript files that use natural language descriptions to define test cases. Tests are specified using human-readable instructions rather than code-based automation scripts.

### Independent Test Cases
Each test defined by a `testCase()` at the top level will run individually in its own browser session

```typescript
import { testCase } from 'aie2e';

// The simplest test uses the `testCase` function with a descriptive string:
testCase('Navigate to the homepage and verify the title contains "Welcome"');

// Test cases can include additional configuration options
testCase(`Steps to execute:
- Fill in the first name field with "John".
- Fill in the age field with "25".
- Submit the form.
Acceptance Criteria:
- The form should submit successfully without any validation errors.`, {
    initial_actions: [
        { action: "go_to_url", arguments: { url: "https://example.com/form" }}
    ],
    use_vision: true
});
```

#### Test Case Options

- **`initial_actions`**: Array of actions to perform before the main test
  - An action can be one of the Browser-Use [available tools](https://docs.browser-use.com/customize/tools/available)
  - Example: `{ action: "go_to_url", arguments: { url: "https://example.com" }}`

- **`use_vision`**: Boolean flag to enable visual analysis of the page
  - Useful for tests that need to verify visual elements or layouts
  - Default: `false`

### Test Sessions

For tests that need to maintain state across multiple test cases, use `testSession()`
The test cases in a session will be executed sequentially in the same browser. Each test will start in the state the previous test ended in.

```typescript
import { testSession } from 'aie2e';

// Test session description is for organization only, it does not affect the LLM prompt
testSession("User login and dashboard flow", {
    allowedDomains: ["https://*.example.com"]
})
    // See the Sensitive Data configuration section for more info on handling credentials and other sensitive information
    .testCase('Log in with the username "x_user" and the password "x_pass"', {
        initial_actions: [
            { action: "go_to_url", arguments: { url: "https://example.com/login" }}
        ]
    })
    .testCase('Click on the "Dashboard" button to navigate to the dashboard page. The Profile section should be visible on the page.')
    .testCase('Verify the contents of the Profile section on the current page.
    Acceptance Criteria:
    - The Name field value is "John"
    - The Age field value is "25"')
    .commit(); // The test session must be committed in order to run!
```

#### Test Session Options

- **`allowedDomains`**: Array of allowed domain patterns for navigation
  - Supports wildcards (e.g., `"https://*.example.com"`)
  - This will override the allowed domains in the configuration file for this session

### Writing Effective Test Descriptions

Use clear, specific language that describes both the actions and expected outcomes:

#### Good Examples:
```typescript
testCase(`Steps to execute:
- Navigate to https://example.com/email
- Fill in the email field with "user@example.com"
- Click the "Submit" button
Acceptance Criteria:
- The user should be redirected to a success page
- A welcome message should be displayed containing the email: "user@example.com"`);
```

#### Writing Guidelines:

1. **Be Specific**: Include exact text, field names, and expected outcomes
2. **Use Natural Language**: Write as if explaining to a human tester
3. **Include Acceptance Criteria**: Clearly state what constitutes success
4. **Describe User Actions**: Focus on what a user would do, not implementation details



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

```toml
[transport]
type = "stdio"
model = "gpt-4"
llm_provider = "openai"
api_key = "${OPENAI_API_KEY}"
# Optional customization of the command to invoke the server
command = "uvx"
args = ["--from", "aie2e", "aie2e-server"]
```

#### HTTP Transport

The HTTP transport connects to a running MCP server via HTTP:

```toml
[transport]
type = "http"
url = "http://localhost:54321/mcp"
```

See the [AIE2E Server](https://github.com/aie2e/aie2e-server) project for instructions to install
and run the MCP server with HTTP transport.

## Supported LLM Providers

Any provider/model supported by [Browser Use](https://github.com/browser-use/browser-use) should be available to use.

Testing so far has been focused on OpenAI and Google providers. We've had good luck with GPT-4o-mini.
Ollama may need some additional tweaking currently. Try some others and see what works!

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
npx aie2e --config ./custom.config.toml ./aie2e-tests

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
- Edit the `aie2e.config.toml` file to use HTTP transport and connect to the running server
- Review the output from the server to see all the steps the agent is taking to run the tests

**Tests hanging or timing out**
- Increase timeout in config: `timeout: 600000` (10 minutes)
- Check API key is valid and has sufficient credits
- Verify target website is accessible

**Browser errors**
- See the [Playwright](https://playwright.dev/docs/browsers) or [Browser-Use](https://docs.browser-use.com/quickstart) documentation for troubleshooting tips

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
- **Description**: Object containing sensitive data for form filling. The domain key specifies where the sensitive data may be used, including wildcard patterns. For each data pair, the key is the alias and the value is the sensitive data string. When writing test cases, use the pattern `x_alias` in place of the sensitive string to prevent leaking information to the LLM provider. The alias will be translated to the sensitive string when passed to the browser if within the allowed domain.
- **Example**:
```toml
[sensitive_data."https://*.example.com"]
user = "testuser@example.com"  # Will be used to replace `x_user` in tasks
pass = "securepassword123"     # Will be used to replace `x_pass` in tasks
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
