#!/usr/bin/env node

import { Command } from 'commander';
import { BloomreachClient } from '@bloomreach-buddy/core';

const program = new Command();

program
  .name('bloomreach')
  .description('AI-powered Bloomreach integration toolkit')
  .version('0.0.1');

program
  .command('status')
  .description('Check the current Bloomreach connection status')
  .action(async () => {
    const client = new BloomreachClient({
      environment: process.env.BLOOMREACH_ENVIRONMENT ?? 'not-configured',
      apiToken: process.env.BLOOMREACH_API_TOKEN ?? '',
    });

    const result = await client.status();

    console.log('Bloomreach Status');
    console.log('-----------------');
    console.log(`Environment: ${result.environment}`);
    console.log(`Connected:   ${result.connected}`);
  });

program.parse();
