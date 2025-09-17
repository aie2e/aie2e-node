import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { isTestSessionResult, TestSuite, type TestSession, type TestSessionResult } from './core.js';
import { isHttpTransportConfig, isStdioTransportConfig } from './config.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
    APP_NAME,
    APP_VERSION,
    MCP_TOOLS
} from './constants.js';

export interface McpTestResult {
    passed: boolean;
    run_time: number;
    final_result: string;
    errors?: string[];
}

export interface McpSessionResult {
    passed: boolean;
    run_time: number;
    description: string;
}

export interface McpProgressNotification {
    type: 'session_info' | 'test_case_info' | 'test_case_result' | 'test_session_result' | 'error';
    data: any;
}

export class McpBrowserClient {
    private client: Client | null = null;
    private transport: Transport | null = null;
    private notificationHandlers: ((notification: McpProgressNotification) => void)[] = [];
    private customNotificationHandler?: (notification: any) => void;

    constructor(private testSuite: TestSuite, notificationHandler?: (notification: any) => void) {
        this.customNotificationHandler = notificationHandler;
    }

    async connect(): Promise<void> {
        try {
            const transportConfig = this.testSuite.transportConfig;
            
            if (!transportConfig) {
                throw new Error('No transport configuration provided');
            }

            if (isHttpTransportConfig(transportConfig)) {
                const url = transportConfig.url;
                if (!url) {
                    throw new Error('HTTP transport requires a URL to be specified');
                }
                try {
                    new URL(url); // Validate URL format
                } catch {
                    throw new Error(`Invalid HTTP transport URL: ${url}`);
                }
                this.transport = new StreamableHTTPClientTransport(new URL(url));
                process.stderr.write(`Connecting to AIE2E MCP server via HTTP: ${url}\n`);
            } else if (isStdioTransportConfig(transportConfig)) {
                const command = transportConfig.command;
                const baseArgs = transportConfig.args || [];

                if (command !== undefined && !command.trim()) {
                    throw new Error('Stdio transport command cannot be empty');
                }

                const args = [
                    ...baseArgs,
                    '--model', transportConfig.model,
                    '--llm-provider', transportConfig.llmProvider
                ];

                if (transportConfig.apiKey) {
                    args.push('--api-key', transportConfig.apiKey);
                }

                if (transportConfig.headless) {
                    args.push('--headless');
                }

                this.transport = new StdioClientTransport({
                    command: command!,
                    args,
                });
                process.stderr.write('Connecting to AIE2E MCP server via stdio\n');
            } else {
                throw new Error('Unsupported transport configuration');
            }

            this.client = new Client(
                { name: APP_NAME, version: APP_VERSION },
                { capabilities: {} }
            );

            await this.client.connect(this.transport);

            this.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification: any) => {
                if (this.customNotificationHandler) {
                    this.customNotificationHandler(notification);
                }
            });
            
            this.transport.onclose = () => {
                process.stderr.write('MCP server connection closed\n');
            };

            this.transport.onerror = (error) => {
                process.stderr.write(`MCP server error: ${error}\n`);
            };

            process.stderr.write('Connected to AIE2E MCP server\n');
        } catch (error) {
            throw new Error(`Failed to connect to MCP server: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.client) {
                await this.client.close();
                this.client = null;
            }
        } catch (error) {
            process.stderr.write(`Error closing MCP client: ${error}\n`);
        }

        try {
            if (this.transport) {
                await this.transport.close();
                this.transport = null;
            }
        } catch (error) {
            process.stderr.write(`Error closing MCP transport: ${error}\n`);
        }
    }

    addNotificationHandler(handler: (notification: McpProgressNotification) => void): void {
        this.notificationHandlers.push(handler);
    }

    removeNotificationHandler(handler: (notification: McpProgressNotification) => void): void {
        const index = this.notificationHandlers.indexOf(handler);
        if (index > -1) {
            this.notificationHandlers.splice(index, 1);
        }
    }

    async runTestSession(session: TestSession): Promise<TestSessionResult> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        const toolArguments = {
            description: session.description,
            tests: session.tests,
            allowed_domains: session.allowedDomains,
            sensitive_data: this.testSuite.sensitiveData,
        };

        const requestOptions = this.testSuite.timeout ? { timeout: this.testSuite.timeout } : undefined;

        const result = await this.client.callTool({
                    name: MCP_TOOLS.RUN_TEST_SESSION,
                    arguments: toolArguments
                }, undefined, requestOptions);

        if (result.isError) {
            const error = (result.content as any)?.[0]?.text || JSON.stringify(result.content, null, 2);
            throw new Error(`MCP tool call error: ${error}`);
        }

        let parsedContent: unknown;
        try {
            const contentText = (result.content as any)?.[0]?.text;
            if (typeof contentText === 'string') {
                parsedContent = JSON.parse(contentText);
            } else {
                parsedContent = result.content;
            }
        } catch {
            parsedContent = result.content;
        }

        if (isTestSessionResult(parsedContent)) {
            return parsedContent;
        } else {
            throw new Error('Unexpected MCP tool result format. Tool result: ' + JSON.stringify(result, null, 2));
        }
    }
}