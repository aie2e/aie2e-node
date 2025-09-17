import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
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

export async function loadConfig(configPath?: string): Promise<Aie2eConfig> {
    const resolvedConfigPath = configPath || findConfigFile();
    
    if (!resolvedConfigPath) {
        throw new Error('No aie2e configuration file found. Please create aie2e.config.ts or aie2e.config.js in your project root.');
    }

    if (configPath && !existsSync(configPath)) {
        throw new Error(`Configuration file not found at: ${configPath}`);
    }

    try {
        const configUrl = pathToFileURL(resolvedConfigPath).toString() + '?t=' + Date.now();
        const configModule = await import(configUrl);
        const transportConfig = {...defaultConfig.transportConfig, ...(configModule.default || configModule).transportConfig};
        const config: Aie2eConfig = {...defaultConfig, ...(configModule.default || configModule), transportConfig};

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
