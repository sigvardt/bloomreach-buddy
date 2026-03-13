#!/usr/bin/env node

import { Command } from 'commander';
import {
  BloomreachClient,
  BloomreachCampaignCalendarService,
  BloomreachDashboardsService,
  BloomreachEmailCampaignsService,
  BloomreachFunnelsService,
  BloomreachPerformanceService,
  BloomreachScenariosService,
  BloomreachTrendsService,
  BloomreachSurveysService,
} from '@bloomreach-buddy/core';
import type {
  EmailCampaignSchedule,
  EmailCampaignABTestConfig,
  FunnelStep,
  FunnelFilter,
  SurveyQuestion,
  SurveyDisplayConditions,
  TrendFilter,
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

const emailCampaigns = program
  .command('email-campaigns')
  .description('Manage Bloomreach Engagement email campaigns');

emailCampaigns
  .command('list')
  .description('List all email campaigns in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status (draft, scheduled, sending, sent, paused, archived)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      status?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEmailCampaignsService(options.project);
        const input: { project: string; status?: string } = {
          project: options.project,
        };
        if (options.status) input.status = options.status;

        const result = await service.listEmailCampaigns(input);

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No email campaigns found.');
            return;
          }
          for (const campaign of result) {
            console.log(`  ${campaign.name}`);
            console.log(`    Status:  ${campaign.status}`);
            console.log(`    Subject: ${campaign.subjectLine}`);
            console.log(`    ID:      ${campaign.id}`);
            console.log(`    URL:     ${campaign.url}`);
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

emailCampaigns
  .command('view-results')
  .description('View delivery and engagement metrics for an email campaign')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--campaign-id <id>', 'Email campaign ID')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      campaignId: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEmailCampaignsService(options.project);
        const result = await service.viewCampaignResults({
          project: options.project,
          campaignId: options.campaignId,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Campaign Results: ${result.campaignId}`);
          console.log(`  Sent:         ${result.sent}`);
          console.log(`  Delivered:    ${result.delivered}`);
          console.log(`  Opened:       ${result.opened}`);
          console.log(`  Clicked:      ${result.clicked}`);
          console.log(`  Bounced:      ${result.bounced}`);
          console.log(`  Unsubscribed: ${result.unsubscribed}`);
          console.log(`  Open Rate:    ${(result.openRate * 100).toFixed(1)}%`);
          console.log(`  CTR:          ${(result.clickThroughRate * 100).toFixed(1)}%`);
          console.log(`  Revenue:      ${result.revenue}`);
        }
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

emailCampaigns
  .command('create')
  .description('Prepare creation of a new email campaign (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Campaign name')
  .requiredOption('--subject <subject>', 'Email subject line')
  .option('--template-type <type>', 'Template type (visual, html)')
  .option('--audience <audience>', 'Audience segment identifier')
  .option('--schedule-type <type>', 'Send schedule (immediate, scheduled, recurring)')
  .option('--scheduled-at <datetime>', 'ISO-8601 datetime for scheduled sends')
  .option('--cron <expression>', 'Cron expression for recurring sends')
  .option('--ab-variants <n>', 'Number of A/B test variants')
  .option('--ab-split <percent>', 'A/B test split percentage')
  .option('--ab-winner <criteria>', 'A/B test winner criteria (open_rate, click_rate)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      subject: string;
      templateType?: string;
      audience?: string;
      scheduleType?: string;
      scheduledAt?: string;
      cron?: string;
      abVariants?: string;
      abSplit?: string;
      abWinner?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let schedule: EmailCampaignSchedule | undefined;
        if (options.scheduleType) {
          schedule = {
            type: options.scheduleType as 'immediate' | 'scheduled' | 'recurring',
            scheduledAt: options.scheduledAt,
            cronExpression: options.cron,
          };
        }

        let abTest: EmailCampaignABTestConfig | undefined;
        if (options.abVariants) {
          abTest = {
            enabled: true,
            variants: parseInt(options.abVariants, 10),
            splitPercentage: options.abSplit
              ? parseInt(options.abSplit, 10)
              : undefined,
            winnerCriteria: options.abWinner,
          };
        }

        const service = new BloomreachEmailCampaignsService(options.project);
        const result = service.prepareCreateEmailCampaign({
          project: options.project,
          name: options.name,
          subjectLine: options.subject,
          templateType: options.templateType,
          audience: options.audience,
          schedule,
          abTest,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Email campaign creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Subject: ${options.subject}`);
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

emailCampaigns
  .command('send')
  .description('Prepare sending an email campaign (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--campaign-id <id>', 'Email campaign ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      campaignId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEmailCampaignsService(options.project);
        const result = service.prepareSendEmailCampaign({
          project: options.project,
          campaignId: options.campaignId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Email campaign send prepared.');
          console.log(`  Campaign: ${options.campaignId}`);
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

emailCampaigns
  .command('clone')
  .description('Prepare cloning an email campaign (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--campaign-id <id>', 'Email campaign ID to clone')
  .option('--new-name <name>', 'Name for the cloned campaign')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      campaignId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEmailCampaignsService(options.project);
        const result = service.prepareCloneEmailCampaign({
          project: options.project,
          campaignId: options.campaignId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Email campaign clone prepared.');
          console.log(`  Source:   ${options.campaignId}`);
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

emailCampaigns
  .command('archive')
  .description('Prepare archiving an email campaign (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--campaign-id <id>', 'Email campaign ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      campaignId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEmailCampaignsService(options.project);
        const result = service.prepareArchiveEmailCampaign({
          project: options.project,
          campaignId: options.campaignId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Email campaign archive prepared.');
          console.log(`  Campaign: ${options.campaignId}`);
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

const surveys = program
  .command('surveys')
  .description('Manage Bloomreach Engagement on-site surveys');

surveys
  .command('list')
  .description('List all surveys in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status (active, inactive, draft, archived)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      status?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSurveysService(options.project);
        const input: { project: string; status?: string } = {
          project: options.project,
        };
        if (options.status) input.status = options.status;

        const result = await service.listSurveys(input);

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No surveys found.');
            return;
          }
          for (const survey of result) {
            console.log(`  ${survey.name}`);
            console.log(`    Status:    ${survey.status}`);
            console.log(`    Questions: ${survey.questions.length}`);
            console.log(`    ID:        ${survey.id}`);
            console.log(`    URL:       ${survey.url}`);
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

surveys
  .command('view-results')
  .description('View responses and analytics for a survey')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      surveyId: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSurveysService(options.project);
        const result = await service.viewSurveyResults({
          project: options.project,
          surveyId: options.surveyId,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Survey Results: ${result.surveyId}`);
          console.log(`  Total Responses:  ${result.totalResponses}`);
          console.log(`  Completion Rate:  ${(result.completionRate * 100).toFixed(1)}%`);
          for (const dist of result.responseDistribution) {
            console.log(`  Question: ${dist.questionText}`);
            for (const [answer, count] of Object.entries(dist.answers)) {
              console.log(`    ${answer}: ${count}`);
            }
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

surveys
  .command('create')
  .description('Prepare creation of a new on-site survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Survey name')
  .requiredOption('--questions <json>', 'JSON array of questions [{id, type, text, options?, required?}]')
  .option('--audience <audience>', 'Target audience segment')
  .option('--page-url <url>', 'Page URL where survey appears')
  .option('--trigger-event <event>', 'Trigger event name')
  .option('--delay-ms <ms>', 'Delay before showing survey (ms)')
  .option('--frequency <frequency>', 'Display frequency (once, always, once_per_session)')
  .option('--template-id <id>', 'Survey template ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      questions: string;
      audience?: string;
      pageUrl?: string;
      triggerEvent?: string;
      delayMs?: string;
      frequency?: string;
      templateId?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const questions: SurveyQuestion[] = JSON.parse(options.questions) as SurveyQuestion[];

        let displayConditions: SurveyDisplayConditions | undefined;
        if (
          options.audience ||
          options.pageUrl ||
          options.triggerEvent ||
          options.delayMs ||
          options.frequency
        ) {
          displayConditions = {
            audience: options.audience,
            pageUrl: options.pageUrl,
            triggerEvent: options.triggerEvent,
            delayMs: options.delayMs ? parseInt(options.delayMs, 10) : undefined,
            frequency: options.frequency,
          };
        }

        const service = new BloomreachSurveysService(options.project);
        const result = service.prepareCreateSurvey({
          project: options.project,
          name: options.name,
          questions,
          displayConditions,
          templateId: options.templateId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Survey creation prepared.');
          console.log(`  Name:      ${options.name}`);
          console.log(`  Questions: ${questions.length}`);
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

surveys
  .command('start')
  .description('Prepare starting a survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      surveyId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSurveysService(options.project);
        const result = service.prepareStartSurvey({
          project: options.project,
          surveyId: options.surveyId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Survey start prepared.');
          console.log(`  Survey:  ${options.surveyId}`);
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

surveys
  .command('stop')
  .description('Prepare stopping a survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      surveyId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSurveysService(options.project);
        const result = service.prepareStopSurvey({
          project: options.project,
          surveyId: options.surveyId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Survey stop prepared.');
          console.log(`  Survey:  ${options.surveyId}`);
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

surveys
  .command('archive')
  .description('Prepare archiving a survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      surveyId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSurveysService(options.project);
        const result = service.prepareArchiveSurvey({
          project: options.project,
          surveyId: options.surveyId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Survey archive prepared.');
          console.log(`  Survey:  ${options.surveyId}`);
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

const campaignCalendar = program
  .command('campaigns-calendar')
  .description('View and manage the Bloomreach campaign calendar');

campaignCalendar
  .command('view')
  .description('View campaign calendar for a date range')
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
        const service = new BloomreachCampaignCalendarService(options.project);
        const result = await service.viewCampaignCalendar({
          project: options.project,
          startDate: options.startDate,
          endDate: options.endDate,
        });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No campaigns found in calendar.');
            return;
          }
          for (const entry of result) {
            console.log(`  ${entry.name}`);
            console.log(`    Type:    ${entry.type}`);
            console.log(`    Channel: ${entry.channel}`);
            console.log(`    Status:  ${entry.status}`);
            console.log(`    Start:   ${entry.startDate}`);
            console.log(`    End:     ${entry.endDate}`);
            console.log(`    URL:     ${entry.url}`);
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

campaignCalendar
  .command('filter')
  .description('Filter campaign calendar by type, status, or channel')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--type <type>', 'Campaign type (email, sms, push, in_app, weblayer, webhook)')
  .option('--status <status>', 'Campaign status (draft, scheduled, running, paused, stopped, finished)')
  .option('--channel <channel>', 'Channel (email, sms, push, in_app, weblayer, webhook)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      startDate?: string;
      endDate?: string;
      type?: string;
      status?: string;
      channel?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignCalendarService(options.project);
        const result = await service.filterCampaignCalendar({
          project: options.project,
          startDate: options.startDate,
          endDate: options.endDate,
          type: options.type,
          status: options.status,
          channel: options.channel,
        });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No campaigns match the filters.');
            return;
          }
          for (const entry of result) {
            console.log(`  ${entry.name}`);
            console.log(`    Type:    ${entry.type}`);
            console.log(`    Channel: ${entry.channel}`);
            console.log(`    Status:  ${entry.status}`);
            console.log(`    Start:   ${entry.startDate}`);
            console.log(`    End:     ${entry.endDate}`);
            console.log(`    URL:     ${entry.url}`);
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

campaignCalendar
  .command('export')
  .description('Prepare export of campaign calendar data (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--type <type>', 'Campaign type filter (email, sms, push, in_app, weblayer, webhook)')
  .option('--status <status>', 'Campaign status filter (draft, scheduled, running, paused, stopped, finished)')
  .option('--channel <channel>', 'Channel filter (email, sms, push, in_app, weblayer, webhook)')
  .option('--format <format>', 'Export format (json, csv)', 'json')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      startDate?: string;
      endDate?: string;
      type?: string;
      status?: string;
      channel?: string;
      format: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignCalendarService(options.project);
        const result = service.prepareExportCalendar({
          project: options.project,
          startDate: options.startDate,
          endDate: options.endDate,
          type: options.type,
          status: options.status,
          channel: options.channel,
          format: options.format,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Calendar export prepared.');
          console.log(`  Format:  ${options.format}`);
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

const trends = program
  .command('trends')
  .description('Manage Bloomreach Engagement trend analyses');

trends
  .command('list')
  .description('List all trend analyses in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachTrendsService(options.project);
      const result = await service.listTrendAnalyses({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No trend analyses found.');
          return;
        }
        for (const trend of result) {
          console.log(`  ${trend.name}`);
          console.log(`    Events:      ${trend.events.join(', ')}`);
          console.log(`    Granularity: ${trend.granularity}`);
          console.log(`    ID:          ${trend.id}`);
          console.log(`    URL:         ${trend.url}`);
        }
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

trends
  .command('view-results')
  .description('View time-series data for a trend analysis')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Trend analysis ID')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--granularity <granularity>', 'Time granularity (hourly, daily, weekly, monthly)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      analysisId: string;
      startDate?: string;
      endDate?: string;
      granularity?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachTrendsService(options.project);
        const result = await service.viewTrendResults({
          project: options.project,
          analysisId: options.analysisId,
          startDate: options.startDate,
          endDate: options.endDate,
          granularity: options.granularity,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Trend Analysis: ${result.analysisName}`);
          console.log(`  Granularity: ${result.granularity}`);
          console.log(`  Date range:  ${result.startDate} to ${result.endDate}`);
          if (result.dataPoints.length === 0) {
            console.log('  Data points: none');
          } else {
            console.log('  Data points:');
            for (const dataPoint of result.dataPoints) {
              console.log(`    ${JSON.stringify(dataPoint)}`);
            }
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

trends
  .command('create')
  .description('Prepare creation of a new trend analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Trend analysis name')
  .requiredOption('--events <csv>', 'Events to track (comma-separated)')
  .option('--granularity <granularity>', 'Time granularity (hourly, daily, weekly, monthly)', 'daily')
  .option('--customer-attributes <json>', 'JSON object of customer attribute filters')
  .option('--event-properties <json>', 'JSON object of event property filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      events: string;
      granularity: string;
      customerAttributes?: string;
      eventProperties?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const filters: TrendFilter = {};
        if (options.customerAttributes) {
          filters.customerAttributes = JSON.parse(options.customerAttributes) as Record<
            string,
            string
          >;
        }
        if (options.eventProperties) {
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<
            string,
            string
          >;
        }

        const service = new BloomreachTrendsService(options.project);
        const result = service.prepareCreateTrendAnalysis({
          project: options.project,
          name: options.name,
          events: options.events.split(',').map(event => event.trim()),
          granularity: options.granularity,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Trend analysis creation prepared.');
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

trends
  .command('clone')
  .description('Prepare cloning a trend analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Trend analysis ID to clone')
  .option('--new-name <name>', 'Name for the cloned analysis')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      analysisId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachTrendsService(options.project);
        const result = service.prepareCloneTrendAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Trend analysis clone prepared.');
          console.log(`  Source:   ${options.analysisId}`);
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

trends
  .command('archive')
  .description('Prepare archiving a trend analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Trend analysis ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      analysisId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachTrendsService(options.project);
        const result = service.prepareArchiveTrendAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Trend analysis archive prepared.');
          console.log(`  Analysis: ${options.analysisId}`);
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

const funnels = program
  .command('funnels')
  .description('Manage Bloomreach Engagement funnel analyses');

funnels
  .command('list')
  .description('List all funnel analyses in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachFunnelsService(options.project);
      const result = await service.listFunnelAnalyses({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No funnel analyses found.');
          return;
        }
        for (const funnel of result) {
          console.log(`  ${funnel.name}`);
          console.log(`    Steps:      ${funnel.steps.length}`);
          console.log(`    Time limit: ${funnel.timeLimitMs ?? 'none'}`);
          console.log(`    ID:         ${funnel.id}`);
          console.log(`    URL:        ${funnel.url}`);
        }
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

funnels
  .command('view-results')
  .description('View conversion rates and drop-off data for a funnel analysis')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Funnel analysis ID')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      analysisId: string;
      startDate?: string;
      endDate?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachFunnelsService(options.project);
        const result = await service.viewFunnelResults({
          project: options.project,
          analysisId: options.analysisId,
          startDate: options.startDate,
          endDate: options.endDate,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Funnel Analysis: ${result.analysisName}`);
          console.log(`  Date range: ${result.startDate} to ${result.endDate}`);
          console.log(`  Overall conversion rate: ${result.overallConversionRate}`);
          if (result.steps.length === 0) {
            console.log('  Steps: none');
          } else {
            console.log('  Steps:');
            for (const step of result.steps) {
              console.log(
                `    ${step.step}. ${step.label ?? step.eventName} | entered=${step.entered}, completed=${step.completed}, conversion=${step.conversionRate}, drop-off=${step.dropOffRate}`,
              );
            }
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

funnels
  .command('create')
  .description('Prepare creation of a new funnel analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Funnel analysis name')
  .requiredOption('--steps <json>', 'JSON array of funnel steps [{order, eventName, label?}]')
  .option('--time-limit-ms <ms>', 'Maximum time between steps in milliseconds')
  .option('--customer-attributes <json>', 'JSON object of customer attribute filters')
  .option('--event-properties <json>', 'JSON object of event property filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      steps: string;
      timeLimitMs?: string;
      customerAttributes?: string;
      eventProperties?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const steps = JSON.parse(options.steps) as FunnelStep[];
        const filters: FunnelFilter = {};
        if (options.customerAttributes) {
          filters.customerAttributes = JSON.parse(options.customerAttributes) as Record<
            string,
            string
          >;
        }
        if (options.eventProperties) {
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<
            string,
            string
          >;
        }

        const service = new BloomreachFunnelsService(options.project);
        const result = service.prepareCreateFunnelAnalysis({
          project: options.project,
          name: options.name,
          steps,
          timeLimitMs:
            options.timeLimitMs !== undefined
              ? parseInt(options.timeLimitMs, 10)
              : undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Funnel analysis creation prepared.');
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

funnels
  .command('clone')
  .description('Prepare cloning a funnel analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Funnel analysis ID to clone')
  .option('--new-name <name>', 'Name for the cloned analysis')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      analysisId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachFunnelsService(options.project);
        const result = service.prepareCloneFunnelAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Funnel analysis clone prepared.');
          console.log(`  Source:   ${options.analysisId}`);
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

funnels
  .command('archive')
  .description('Prepare archiving a funnel analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Funnel analysis ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      analysisId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachFunnelsService(options.project);
        const result = service.prepareArchiveFunnelAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Funnel analysis archive prepared.');
          console.log(`  Analysis: ${options.analysisId}`);
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
