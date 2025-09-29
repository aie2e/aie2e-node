import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { parse as parseToml } from 'smol-toml';
import { config } from 'dotenv';
import {
    VALID_LLM_PROVIDERS,
    DEFAULT_CONFIG,
    CONFIG_FILE_NAMES,
    CONFIG_SEARCH_SUBDIRS,
    TRANSPORT_TYPES
} from './constants.js';

// Load environment variables from .env file in the project root
config();

export type LlmProvider = typeof VALID_LLM_PROVIDERS[number];

export interface StdioTransportConfig {
    transport: 'stdio';
    command?: string;
    args?: string[];
    model: string;
    llmProvider: LlmProvider;
    apiKey?: string;
    headless?: boolean;
}

export interface HttpTransportConfig {
    transport: 'http';
    url: string;
}

export type TransportConfig = StdioTransportConfig | HttpTransportConfig;

export function isStdioTransportConfig(config: TransportConfig): config is StdioTransportConfig {
    return config.transport === 'stdio';
}

export function isHttpTransportConfig(config: TransportConfig): config is HttpTransportConfig {
    return config.transport === 'http';
}

export interface Aie2eConfig {
    allowedDomains?: string[];
    sensitiveData?: Record<string, string | Record<string, string>>;
    transportConfig?: TransportConfig;
    timeout?: number; // Timeout in milliseconds for MCP tool calls
}

const defaultConfig: Aie2eConfig = {...DEFAULT_CONFIG};

function findConfigFile(): string | null {
    const configNames = CONFIG_FILE_NAMES;
    const searchPaths = [
        process.cwd(),
        ...CONFIG_SEARCH_SUBDIRS.map(dir => path.join(process.cwd(), dir))
    ];

    for (const searchPath of searchPaths) {
        for (const configName of configNames) {
            const configPath = path.join(searchPath, configName);
            if (existsSync(configPath)) {
                return configPath;
            }
        }
    }
    return null;
}

export function loadConfig(configPath?: string): Aie2eConfig {
    const resolvedConfigPath = configPath || findConfigFile();

    if (!resolvedConfigPath) {
        throw new Error('No aie2e configuration file found. Please create aie2e.config.toml in your project root.');
    }

    if (configPath && !existsSync(configPath)) {
        throw new Error(`Configuration file not found at: ${configPath}`);
    }

    try {
        const configContent = readFileSync(resolvedConfigPath, 'utf-8');
        const tomlData = parseToml(configContent);

        const rawTransportConfig = (typeof tomlData.transport === 'object' && tomlData.transport !== null) ? {
                transport: (tomlData.transport as any).type as 'stdio' | 'http',
                model: substituteEnvironmentVariables((tomlData.transport as any).model),
                llmProvider: (tomlData.transport as any).llm_provider,
                apiKey: substituteEnvironmentVariables((tomlData.transport as any).api_key),
                command: substituteEnvironmentVariables((tomlData.transport as any).command),
                args: (tomlData.transport as any).args,
                headless: (tomlData.transport as any).headless,
                url: substituteEnvironmentVariables((tomlData.transport as any).url)
            } : {};
        const transportConfig: TransportConfig = {
                ...defaultConfig.transportConfig,
                ...Object.fromEntries(
                    Object.entries(rawTransportConfig).filter(([_, value]) => value !== undefined)
                )
            } as TransportConfig;

        const config: Aie2eConfig = {
            ...defaultConfig,
            timeout: typeof tomlData.timeout === 'number' ? tomlData.timeout : defaultConfig.timeout,
            allowedDomains: Array.isArray(tomlData.allowed_domains) ? tomlData.allowed_domains as string[] : undefined,
            sensitiveData: typeof tomlData.sensitive_data === 'object' && tomlData.sensitive_data !== null ?
                processEnvironmentVariablesInObject(tomlData.sensitive_data as Record<string, any>) : undefined,
            transportConfig,
        };

        if (config.transportConfig) {
            if (!TRANSPORT_TYPES.includes(config.transportConfig.transport as any)) {
                throw new Error(`Configuration file ${resolvedConfigPath} has invalid transport '${config.transportConfig.transport}'. Valid transports: ${TRANSPORT_TYPES.join(', ')}`);
            }
        }

        return config;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Configuration file')) {
            throw error;
        }
        throw new Error(`Failed to load config file at ${resolvedConfigPath}: ${error}`);
    }
}

function substituteEnvironmentVariables(value: any): any {
    if (typeof value !== 'string') {
        return value;
    }

    const envVarRegex = /\$\{([^:}]+)(?::([^}]*))?\}/g;
    return value.replace(envVarRegex, (match, varName, defaultValue) => {
        return process.env[varName] || defaultValue || '';
    });
}

function processEnvironmentVariablesInObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = substituteEnvironmentVariables(value);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = processEnvironmentVariablesInObject(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}
