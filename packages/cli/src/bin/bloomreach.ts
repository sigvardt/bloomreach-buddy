#!/usr/bin/env node

import { Command } from 'commander';
import {
  BloomreachClient,
  BloomreachDashboardsService,
  BloomreachPerformanceService,
} from '@bloomreach-buddy/core';

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

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

const dashboards = program
  .command('dashboards')
  .description('Manage Bloomreach Engagement dashboards');

dashboards
  .command('list')
  .description('List all dashboards in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachDashboardsService(options.project);
      const result = await service.listDashboards({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No dashboards found.');
          return;
        }
        for (const dashboard of result) {
          const home = dashboard.isHome ? ' [HOME]' : '';
          console.log(`  ${dashboard.name}${home} (${dashboard.analysisCount} analyses)`);
          console.log(`    ID:  ${dashboard.id}`);
          console.log(`    URL: ${dashboard.url}`);
        }
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

dashboards
  .command('create')
  .description('Prepare creation of a new dashboard (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Dashboard name')
  .option('--analyses <json>', 'JSON array of analyses [{id, name}]')
  .option('--layout-columns <n>', 'Number of grid columns (1-6)', '2')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      analyses?: string;
      layoutColumns: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const analyses = options.analyses
          ? (JSON.parse(options.analyses) as { id: string; name: string }[])
          : undefined;

        const service = new BloomreachDashboardsService(options.project);
        const result = service.prepareCreateDashboard({
          project: options.project,
          name: options.name,
          analyses,
          layout: { columns: parseInt(options.layoutColumns, 10) },
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Dashboard creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

dashboards
  .command('set-home')
  .description('Prepare setting a dashboard as the project home (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--dashboard-id <id>', 'Dashboard ID to set as home')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      dashboardId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDashboardsService(options.project);
        const result = service.prepareSetHomeDashboard({
          project: options.project,
          dashboardId: options.dashboardId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Set-home-dashboard prepared.');
          console.log(`  Dashboard: ${options.dashboardId}`);
          console.log(`  Token:     ${result.confirmToken}`);
          console.log(`  Expires:   ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

dashboards
  .command('delete')
  .description('Prepare deletion of a dashboard (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--dashboard-id <id>', 'Dashboard ID to delete')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      dashboardId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDashboardsService(options.project);
        const result = service.prepareDeleteDashboard({
          project: options.project,
          dashboardId: options.dashboardId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Dashboard deletion prepared.');
          console.log(`  Dashboard: ${options.dashboardId}`);
          console.log(`  Token:     ${result.confirmToken}`);
          console.log(`  Expires:   ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

const performance = program
  .command('performance')
  .description('View Bloomreach Engagement performance dashboards');

performance
  .command('project')
  .description('View project-wide revenue and conversion KPIs')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      startDate?: string;
      endDate?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachPerformanceService(options.project);
        const dateRange =
          options.startDate || options.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : undefined;
        const result = await service.viewProjectPerformance({
          project: options.project,
          dateRange,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Project Performance: ${result.project}`);
          console.log(`  Source: ${result.source_url}`);
          printJson(result.metrics);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

performance
  .command('channel')
  .description('View per-channel engagement, deliverability and revenue metrics')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--channel <channel>', 'Filter to specific channel (email, sms, push, whatsapp, weblayer, in_app_message)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      startDate?: string;
      endDate?: string;
      channel?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachPerformanceService(options.project);
        const dateRange =
          options.startDate || options.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : undefined;
        const result = await service.viewChannelPerformance({
          project: options.project,
          dateRange,
          channel: options.channel,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Channel Performance: ${result.project}`);
          console.log(`  Source: ${result.source_url}`);
          printJson(result.metrics);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

performance
  .command('usage')
  .description('View Bloomreach billing, event-tracking and usage statistics')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; json?: boolean }) => {
      try {
        const service = new BloomreachPerformanceService(options.project);
        const result = await service.viewBloomreachUsage({
          project: options.project,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Bloomreach Usage: ${result.project}`);
          console.log(`  Source: ${result.source_url}`);
          printJson(result.metrics);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

performance
  .command('overview')
  .description('View high-level project statistics')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; json?: boolean }) => {
      try {
        const service = new BloomreachPerformanceService(options.project);
        const result = await service.viewProjectOverview({
          project: options.project,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Project Overview: ${result.project}`);
          console.log(`  Source: ${result.source_url}`);
          printJson(result.metrics);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

performance
  .command('health')
  .description('View project health and data-quality indicators')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; json?: boolean }) => {
      try {
        const service = new BloomreachPerformanceService(options.project);
        const result = await service.viewProjectHealth({
          project: options.project,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Project Health: ${result.project}`);
          console.log(`  Source: ${result.source_url}`);
          printJson(result.metrics);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

program.parse();
