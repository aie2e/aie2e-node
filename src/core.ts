import type { Aie2eConfig, TransportConfig } from './config.js';

export const STOP_ON_FAILURE = true;

export interface TestAction {
    action: string;
    arguments: Record<string, any>;
}

export interface TestCase {
    task: string;
    initial_actions?: TestAction[];
    use_vision?: boolean;
}

export interface TestSession {
    description: string;
    tests: TestCase[];
    allowedDomains?: string[];
}

export interface TestSuite {
    testSessions: TestSession[];
    allowedDomains?: string[];
    sensitiveData?: Record<string, string | Record<string, string>>;
    transportConfig?: TransportConfig;
    timeout?: number;
}

export interface TestCaseInfo {
    type: 'test_case_info';
    session_description: string;
    task: string;
    test_number: number;
    total_tests: number;
}

export interface TestCaseResult {
    type: 'test_case_result';
    passed: boolean;
    run_time: number;
    final_result: string;
    errors?: (string | null)[];
    test_number: number;
    total_tests: number;
}

export interface TestSessionInfo {
    type: 'test_session_info';
    description: string;
    total_tests: number;
}

export interface TestSessionResult {
    type: 'test_session_result';
    passed: boolean;
    run_time: number;
    description: string;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
}

export interface TestSessionOptions {
    allowedDomains?: string[];
}

export function isTestCaseInfo(obj: any): obj is TestCaseInfo {
    return obj?.type === 'test_case_info';
}

export function isTestCaseResult(obj: any): obj is TestCaseResult {
    return obj?.type === 'test_case_result';
}

export function isTestSessionInfo(obj: any): obj is TestSessionInfo {
    return obj?.type === 'test_session_info';
}

export function isTestSessionResult(obj: any): obj is TestSessionResult {
    return obj?.type === 'test_session_result';
}


function createTestSuiteProvider(config: Aie2eConfig) {
    const testSuite: TestSuite = { 
        testSessions: [], 
        allowedDomains: config.allowedDomains, 
        sensitiveData: config.sensitiveData,
        transportConfig: config.transportConfig,
        timeout: config.timeout
    };
    return {
        getTestSuite: () => testSuite,
        addSession: (session: TestSession) => {
            testSuite.testSessions.push(session);
        }
    };
}

let suiteProvider: ReturnType<typeof createTestSuiteProvider> | null = null;

export function initializeTestSuite(config: Aie2eConfig) {
    if (!suiteProvider) {
        suiteProvider = createTestSuiteProvider(config);
    }
    return suiteProvider;
}

function getTestSuiteProvider() {
    if (!suiteProvider) {
        throw new Error('Test suite not initialized. Call initializeTestSuite(config) first.');
    }
    return suiteProvider;
}

export const testSession = (description: string, options?: TestSessionOptions) => {
    const suiteProvider = getTestSuiteProvider();
    const suite = suiteProvider.getTestSuite();
    const session: TestSession = { 
        description, 
        tests: [], 
        allowedDomains: options?.allowedDomains ?? suite.allowedDomains 
    };
    
    const api = {
        description: (desc: string) => {
            session.description = desc;
            return api;
        },
        testCase: (task: string, options: Partial<Omit<TestCase, 'task'>> = {}) => {
            const test: TestCase = { task, initial_actions: [], ...options };
            session.tests.push(test);
            return api;
        },
        commit: () => { 
            const provider = getTestSuiteProvider();
            provider.addSession(session);
            return api;
        }
    };

    return api;
}

export const testCase = (task: string, options: Partial<Omit<TestCase, 'task'>> = {}): void => {
    const provider = getTestSuiteProvider();
    const suite = provider.getTestSuite();
    const session: TestSession = { description: '', tests: [], allowedDomains: suite.allowedDomains };
    const test: TestCase = { task, initial_actions: [], ...options };
    session.tests.push(test);
    provider.addSession(session);
}

export const getTestSuite = (): TestSuite => {
    const provider = getTestSuiteProvider();
    return provider.getTestSuite();
}
