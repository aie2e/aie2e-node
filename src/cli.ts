#!/usr/bin/env node

import { main } from './client.js';

// Run the main function with command line arguments
main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
});