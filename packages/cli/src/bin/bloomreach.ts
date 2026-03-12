#!/usr/bin/env node

import { Command } from 'commander';
import {
  BloomreachClient,
  BloomreachDashboardsService,
  BloomreachPerformanceService,
  BloomreachScenariosService,
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

const scenarios = program
  .command('scenarios')
  .description('Manage Bloomreach Engagement scenarios');

scenarios
  .command('list')
  .description('List all scenarios in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status')
  .option('--tags <csv>', 'Filter by tags (comma-separated)')
  .option('--owner <owner>', 'Filter by owner')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      status?: string;
      tags?: string;
      owner?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const input: {
          project: string;
          status?: string;
          tags?: string[];
          owner?: string;
        } = {
          project: options.project,
        };
        if (options.status) input.status = options.status;
        if (options.tags) input.tags = options.tags.split(',').map(t => t.trim());
        if (options.owner) input.owner = options.owner;

        const result = await service.listScenarios(input);

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No scenarios found.');
            return;
          }
          for (const scenario of result) {
            console.log(`  ${scenario.name}`);
            console.log(`    Status: ${scenario.status}`);
            if (scenario.tags && scenario.tags.length > 0) {
              console.log(`    Tags:   ${scenario.tags.join(', ')}`);
            }
            console.log(`    ID:     ${scenario.id}`);
            console.log(`    URL:    ${scenario.url}`);
          }
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

scenarios
  .command('view')
  .description('View details of a specific scenario')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--scenario-id <id>', 'Scenario ID')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      scenarioId: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const result = await service.viewScenario({
          project: options.project,
          scenarioId: options.scenarioId,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Scenario: ${result.name}`);
          console.log(`  Status: ${result.status}`);
          console.log(`  Nodes:  ${result.nodes.length}`);
          if (result.triggerDescription) {
            console.log(`  Trigger: ${result.triggerDescription}`);
          }
          if (result.performance) {
            console.log(`  Performance: ${JSON.stringify(result.performance)}`);
          }
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

scenarios
  .command('create')
  .description('Prepare creation of a new scenario (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Scenario name')
  .option('--template-id <id>', 'Template ID to use')
  .option('--tags <csv>', 'Tags (comma-separated)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      templateId?: string;
      tags?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const result = service.prepareCreateScenario({
          project: options.project,
          name: options.name,
          templateId: options.templateId,
          tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Scenario creation prepared.');
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

scenarios
  .command('start')
  .description('Prepare starting a scenario (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--scenario-id <id>', 'Scenario ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      scenarioId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const result = service.prepareStartScenario({
          project: options.project,
          scenarioId: options.scenarioId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Scenario start prepared.');
          console.log(`  Scenario: ${options.scenarioId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
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

scenarios
  .command('stop')
  .description('Prepare stopping a scenario (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--scenario-id <id>', 'Scenario ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      scenarioId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const result = service.prepareStopScenario({
          project: options.project,
          scenarioId: options.scenarioId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Scenario stop prepared.');
          console.log(`  Scenario: ${options.scenarioId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
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

scenarios
  .command('clone')
  .description('Prepare cloning a scenario (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--scenario-id <id>', 'Scenario ID to clone')
  .option('--new-name <name>', 'Name for the cloned scenario')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      scenarioId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const result = service.prepareCloneScenario({
          project: options.project,
          scenarioId: options.scenarioId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Scenario clone prepared.');
          console.log(`  Source:   ${options.scenarioId}`);
          console.log(`  New name: ${options.newName ?? '(auto-generated)'}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
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

scenarios
  .command('archive')
  .description('Prepare archiving a scenario (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--scenario-id <id>', 'Scenario ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      scenarioId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachScenariosService(options.project);
        const result = service.prepareArchiveScenario({
          project: options.project,
          scenarioId: options.scenarioId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Scenario archive prepared.');
          console.log(`  Scenario: ${options.scenarioId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
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

program.parse();
