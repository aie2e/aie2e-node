import { testCase } from '../src/core.js';

testCase('Verify that the page loads successfully', {initial_actions: [
    { action: "go_to_url", arguments: { url: "https://example.com" } }
]});