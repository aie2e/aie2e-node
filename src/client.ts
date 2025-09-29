import { getTestSuite, initializeTestSuite, type TestSessionResult, type TestSession, type TestSuite, type TestCase, type TestCaseResult, isTestCaseInfo, isTestSessionInfo, isTestCaseResult, isTestSessionResult } from './core.js';
import { loadConfig } from './config.js';
import { McpBrowserClient, type McpTestResult, type McpSessionResult } from './mcp-client.js';
import { readdirSync, statSync } from 'fs';
import path, { join, extname } from 'path';
import { pathToFileURL } from 'url';
import yoctoSpinner from 'yocto-spinner';
import {
    TEST_CASE_SPINNER,
    CONSOLE_SYMBOLS,
    TEST_SESSION_FORMATTING,
    TEST_FILE_EXTENSIONS,
    EXIT_CODES
} from './constants.js';

const testCaseSpinner = yoctoSpinner({
    text: TEST_CASE_SPINNER.TEXT,
    spinner: {
        frames: TEST_CASE_SPINNER.FRAMES,
        interval: TEST_CASE_SPINNER.INTERVAL
    }
});

const handleNotification = (notification: unknown) => {
    const rawData = (notification as any)?.params?.data?.msg;
    if (!rawData) {
        return;
    }

    let notificationData: unknown;
    try {
        notificationData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (error) {
        notificationData = rawData;
    }

    if (isTestSessionInfo(notificationData)) {
        process.stdout.write(`${CONSOLE_SYMBOLS.INFO} Starting test session with ${notificationData.total_tests} test(s)...\n`);
    } else if (isTestCaseInfo(notificationData)) {
        process.stdout.write(`${CONSOLE_SYMBOLS.RUNNING} [${notificationData.test_number}/${notificationData.total_tests}] ${notificationData.task}\n`);
        testCaseSpinner.start();
    } else if (isTestCaseResult(notificationData)) {
        testCaseSpinner.stop();
        const icon = notificationData.passed ? CONSOLE_SYMBOLS.SUCCESS : CONSOLE_SYMBOLS.FAILURE;
        const status = notificationData.passed ? 'PASSED' : 'FAILED';
        process.stdout.write(`${icon} [${notificationData.test_number}/${notificationData.total_tests}] ${status} (${notificationData.run_time.toFixed(2)}s)\n`);
                            
        if (notificationData.final_result) {
            // Show the detailed result with proper indentation
            const lines = notificationData.final_result.split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    process.stdout.write(`${TEST_SESSION_FORMATTING.INDENTATION}${line}\n`);
                }
            }
            process.stdout.write('\n');
        }

        if (notificationData.errors && notificationData.errors.length > 0) {
            process.stdout.write(`\n${TEST_SESSION_FORMATTING.INDENTATION}Errors:\n`);
            notificationData.errors.forEach((error: string | null, index: number) => {
                if (error) {
                    process.stdout.write(`${TEST_SESSION_FORMATTING.INDENTATION}${index + 1}. ${error}\n`);
                }
            });
        }
    } else if (isTestSessionResult(notificationData)) {
        const icon = notificationData.passed ? CONSOLE_SYMBOLS.CELEBRATION : CONSOLE_SYMBOLS.FAILURE;
        process.stdout.write(`${icon} Session completed: ${notificationData.passed_tests}/${notificationData.total_tests} tests passed (${notificationData.run_time.toFixed(2)}s total)\n`);
    } else {
        process.stderr.write(`${CONSOLE_SYMBOLS.WARNING} Warning: Received unknown notification. Data: ${JSON.stringify(notification)}\n`);
    }
};

async function runTestsStream(session: TestSession, mcpClient: McpBrowserClient): Promise<{ run_time: number, passed: boolean, passed_tests: number, total_tests: number }> {
    process.stdout.write(`
${TEST_SESSION_FORMATTING.SEPARATOR}
Test session started: ${session.description}
${TEST_SESSION_FORMATTING.SEPARATOR}\n`);

    const totalTests = session.tests.length;
    
    const sessionResult = await mcpClient.runTestSession(session).catch((error) => {
        process.stderr.write(`Error running test session: ${error}\n`);
        return { run_time: 0, passed: false, passed_tests: 0, total_tests: totalTests, description: session.description, failed_tests: totalTests };
    }).finally(() => testCaseSpinner.stop());

    process.stdout.write(`\n
${TEST_SESSION_FORMATTING.SEPARATOR}
Test session completed: ${sessionResult.description}
Result: ${sessionResult.passed ? `${CONSOLE_SYMBOLS.SUCCESS} PASSED` : `${CONSOLE_SYMBOLS.FAILURE} FAILED`}
Tests: ${sessionResult.passed_tests}/${sessionResult.total_tests} passed (${sessionResult.failed_tests} failed)
Total run time: ${sessionResult.run_time.toFixed(2)}s
${TEST_SESSION_FORMATTING.SEPARATOR}\n`);
    return { 
        run_time: sessionResult.run_time, 
        passed: sessionResult.passed,
        passed_tests: sessionResult.passed_tests,
        total_tests: sessionResult.total_tests
    };
}

async function runTestSuite(): Promise<boolean> {
    process.stdout.write('AIE2E tests starting\n');
    const testSuite = getTestSuite();
    let allPassed = true;
    let totalRunTime = 0;
    let totalPassedTests = 0;
    let totalTests = 0;
    
    const mcpClient = new McpBrowserClient(testSuite, handleNotification);
    
    try {
        await mcpClient.connect();

        const cleanup = async () => {
            await mcpClient.disconnect();
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', cleanup);
        
        for (const testRun of testSuite.testSessions) {
            const suiteResult = await runTestsStream(testRun, mcpClient).catch((error) => {
                process.stderr.write(`Error running test suite: ${error}\n`);
            });
            if (suiteResult) {
                allPassed = allPassed && suiteResult.passed;
                totalRunTime += suiteResult.run_time;
                totalPassedTests += suiteResult.passed_tests;
                totalTests += suiteResult.total_tests;
            } else {
                allPassed = false;
            }
        }
    } finally {
        await mcpClient.disconnect();
    }

    testCaseSpinner.stop();
    const totalFailedTests = totalTests - totalPassedTests;
    const statusIcon = allPassed ? CONSOLE_SYMBOLS.CELEBRATION : CONSOLE_SYMBOLS.FAILURE;
    const statusText = allPassed ? 'All tests passed!' : 'Tests failed.';

    process.stdout.write(`\n
${TEST_SESSION_FORMATTING.SEPARATOR}
${statusIcon} ${statusText}
Tests: ${totalPassedTests}/${totalTests} passed (${totalFailedTests} failed)
Total run time: ${totalRunTime.toFixed(2)}s
${TEST_SESSION_FORMATTING.SEPARATOR}\n\n`);

    return allPassed;
}


const importTestFiles = async (testFiles: string[]) => {
    for (const testFile of testFiles) {
        process.stdout.write(`${testFile}\n`);
        await import(pathToFileURL(testFile).toString());
    }
};

function parseArgs(args: string[]): { configPath?: string; testFilesPath?: string; } {
    let configPath: string | undefined;
    let testFilesPath: string | undefined;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--config' || arg === '-c') {
            if (i + 1 < args.length) {
                configPath = args[i + 1];
                i++; // Skip the next argument since it's the config path
            } else {
                process.stderr.write('--config option requires a path argument\n');
                process.exit(EXIT_CODES.FAILURE);
            }
        } else if (arg && !arg.startsWith('-')) {
            testFilesPath = arg;
        }
    }
    
    return { configPath, testFilesPath };
}

export const main = async (args: string[]) => {
    const { configPath, testFilesPath } = parseArgs(args);
    
    if (!testFilesPath) {
        process.stderr.write('Usage: aie2e [--config <config-path>] <test-files-path>\n');
        process.stderr.write('\n');
        process.stderr.write('Options:\n');
        process.stderr.write('  --config, -c <path>  Path to configuration file\n');
        process.stderr.write('\n');
        process.stderr.write('Arguments:\n');
        process.stderr.write('  <test-files-path>    Path to the test files directory\n');
        process.exit(EXIT_CODES.FAILURE);
    }

    // Load config and initialize test suite before importing test files
    try {
        const config = await loadConfig(configPath);
        initializeTestSuite(config);
    } catch (error) {
        process.stderr.write(`Error loading configuration: ${error}\n`);
        process.exit(EXIT_CODES.FAILURE);
    }

    try {
        const absolutePath = path.resolve(testFilesPath);
        const stats = statSync(absolutePath);
        
        let testFiles: string[] = [];
        
        if (stats.isFile()) {
            testFiles = [absolutePath];
        } else if (stats.isDirectory()) {
            testFiles = readdirSync(absolutePath, {recursive: true})
                .map(file => typeof file === 'string' ? file : file.toString())
                .filter(file => TEST_FILE_EXTENSIONS.includes(extname(file) as any))
                .map(file => join(absolutePath, file));
        } else {
            process.stderr.write(`Path "${testFilesPath}" is neither a file nor a directory\n`);
            process.exit(EXIT_CODES.FAILURE);
        }

        if (testFiles.length === 0) {
            process.stderr.write(`No test files found in "${testFilesPath}"\n`);
            process.exit(EXIT_CODES.FAILURE);
        }
        await importTestFiles(testFiles).catch((error) => {
            process.stderr.write(`Error importing test file: ${error}\n`);
            process.exit(EXIT_CODES.FAILURE);
        });
    } catch (error) {
        process.stderr.write(`Error reading test files from path \"${testFilesPath}\"\n`);
        process.exit(EXIT_CODES.FAILURE);
    }

    const allPassed = await runTestSuite().catch((error) => {
        process.stderr.write(`Error running test suite: ${error}\n`);
        process.exit(EXIT_CODES.FAILURE);
    });
    process.exit(allPassed ? EXIT_CODES.SUCCESS : EXIT_CODES.FAILURE);
};
