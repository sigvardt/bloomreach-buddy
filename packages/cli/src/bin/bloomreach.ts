#!/usr/bin/env node

import { Command } from 'commander';
import {
  BloomreachAssetManagerService,
  BloomreachCampaignCalendarService,
  BloomreachClient,
  BloomreachCustomersService,
  BloomreachDataManagerService,
  BloomreachDashboardsService,
  BloomreachEmailCampaignsService,
  BloomreachExportsService,
  BloomreachFlowsService,
  BloomreachIntegrationsService,
  BloomreachFunnelsService,
  BloomreachGeoAnalysesService,
  BloomreachMetricsService,
  BloomreachPerformanceService,
  BloomreachRetentionsService,
  BloomreachScenariosService,
  BloomreachSurveysService,
  BloomreachTagManagerService,
  BloomreachTrendsService,
  BloomreachVouchersService,
} from '@bloomreach-buddy/core';
import type {
  CustomerIds,
  DataSelection,
  EmailCampaignABTestConfig,
  IntegrationCredentials,
  IntegrationSettings,
  EmailCampaignSchedule,
  EventPropertyDefinition,
  ExportDestination,
  ExportSchedule,
  FlowEvent,
  FlowFilter,
  FunnelFilter,
  FunnelStep,
  GeoFilter,
  MetricAggregation,
  MetricFilter,
  RedemptionRules,
  RetentionFilter,
  SurveyDisplayConditions,
  SurveyQuestion,
  TagTriggerConditions,
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; dashboardId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; dashboardId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; startDate?: string; endDate?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .option(
    '--channel <channel>',
    'Filter to specific channel (email, sms, push, whatsapp, weblayer, in_app_message)',
  )
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

performance
  .command('usage')
  .description('View Bloomreach billing, event-tracking and usage statistics')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

performance
  .command('overview')
  .description('View high-level project statistics')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

performance
  .command('health')
  .description('View project health and data-quality indicators')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

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
        if (options.tags) input.tags = options.tags.split(',').map((t) => t.trim());
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .action(async (options: { project: string; scenarioId: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

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
          tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined,
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; scenarioId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; scenarioId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; scenarioId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .option(
    '--status <status>',
    'Filter by status (draft, scheduled, sending, sent, paused, archived)',
  )
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; status?: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

emailCampaigns
  .command('view-results')
  .description('View delivery and engagement metrics for an email campaign')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--campaign-id <id>', 'Email campaign ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; campaignId: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

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
            splitPercentage: options.abSplit ? parseInt(options.abSplit, 10) : undefined,
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; campaignId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; campaignId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .action(async (options: { project: string; status?: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

surveys
  .command('view-results')
  .description('View responses and analytics for a survey')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; surveyId: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

surveys
  .command('create')
  .description('Prepare creation of a new on-site survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Survey name')
  .requiredOption(
    '--questions <json>',
    'JSON array of questions [{id, type, text, options?, required?}]',
  )
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .action(async (options: { project: string; surveyId: string; note?: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

surveys
  .command('stop')
  .description('Prepare stopping a survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; surveyId: string; note?: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

surveys
  .command('archive')
  .description('Prepare archiving a survey (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; surveyId: string; note?: string; json?: boolean }) => {
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

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
    async (options: { project: string; startDate?: string; endDate?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .option(
    '--status <status>',
    'Campaign status (draft, scheduled, running, paused, stopped, finished)',
  )
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .option(
    '--status <status>',
    'Campaign status filter (draft, scheduled, running, paused, stopped, finished)',
  )
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const trends = program.command('trends').description('Manage Bloomreach Engagement trend analyses');

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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
  .option(
    '--granularity <granularity>',
    'Time granularity (hourly, daily, weekly, monthly)',
    'daily',
  )
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
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<string, string>;
        }

        const service = new BloomreachTrendsService(options.project);
        const result = service.prepareCreateTrendAnalysis({
          project: options.project,
          name: options.name,
          events: options.events.split(',').map((event) => event.trim()),
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; analysisId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<string, string>;
        }

        const service = new BloomreachFunnelsService(options.project);
        const result = service.prepareCreateFunnelAnalysis({
          project: options.project,
          name: options.name,
          steps,
          timeLimitMs:
            options.timeLimitMs !== undefined ? parseInt(options.timeLimitMs, 10) : undefined,
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async (options: { project: string; analysisId: string; note?: string; json?: boolean }) => {
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
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const retentions = program
  .command('retentions')
  .description('Manage Bloomreach Engagement retention analyses');

retentions
  .command('list')
  .description('List all retention analyses in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachRetentionsService(options.project);
      const result = await service.listRetentionAnalyses({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No retention analyses found.');
          return;
        }
        for (const retention of result) {
          console.log(`  ${retention.name}`);
          console.log(`    Cohort event: ${retention.cohortEvent}`);
          console.log(`    Return event: ${retention.returnEvent}`);
          console.log(`    Granularity:  ${retention.granularity}`);
          console.log(`    ID:           ${retention.id}`);
          console.log(`    URL:          ${retention.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

retentions
  .command('view-results')
  .description('View cohort retention data for a retention analysis')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Retention analysis ID')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--granularity <granularity>', 'Time granularity (daily, weekly, monthly)')
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
        const service = new BloomreachRetentionsService(options.project);
        const result = await service.viewRetentionResults({
          project: options.project,
          analysisId: options.analysisId,
          startDate: options.startDate,
          endDate: options.endDate,
          granularity: options.granularity,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Retention Analysis: ${result.analysisName}`);
          console.log(`  Cohort event: ${result.cohortEvent}`);
          console.log(`  Return event: ${result.returnEvent}`);
          console.log(`  Granularity:  ${result.granularity}`);
          console.log(`  Date range:   ${result.startDate} to ${result.endDate}`);
          if (result.cohorts.length === 0) {
            console.log('  Cohorts: none');
          } else {
            console.log('  Cohorts:');
            for (const cohort of result.cohorts) {
              console.log(`    ${JSON.stringify(cohort)}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

retentions
  .command('create')
  .description('Prepare creation of a new retention analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Retention analysis name')
  .requiredOption('--cohort-event <event>', 'Cohort event name')
  .requiredOption('--return-event <event>', 'Return event name')
  .option('--granularity <granularity>', 'Time granularity (daily, weekly, monthly)', 'daily')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--customer-attributes <json>', 'JSON object of customer attribute filters')
  .option('--event-properties <json>', 'JSON object of event property filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      cohortEvent: string;
      returnEvent: string;
      granularity: string;
      startDate?: string;
      endDate?: string;
      customerAttributes?: string;
      eventProperties?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const filters: RetentionFilter = {};
        if (options.customerAttributes) {
          filters.customerAttributes = JSON.parse(options.customerAttributes) as Record<
            string,
            string
          >;
        }
        if (options.eventProperties) {
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<string, string>;
        }

        const dateRange =
          options.startDate || options.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : undefined;

        const service = new BloomreachRetentionsService(options.project);
        const result = service.prepareCreateRetentionAnalysis({
          project: options.project,
          name: options.name,
          cohortEvent: options.cohortEvent,
          returnEvent: options.returnEvent,
          granularity: options.granularity,
          dateRange,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Retention analysis creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

retentions
  .command('clone')
  .description('Prepare cloning a retention analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Retention analysis ID to clone')
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
        const service = new BloomreachRetentionsService(options.project);
        const result = service.prepareCloneRetentionAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Retention analysis clone prepared.');
          console.log(`  Source:   ${options.analysisId}`);
          console.log(`  New name: ${options.newName ?? '(auto-generated)'}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

retentions
  .command('archive')
  .description('Prepare archiving a retention analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Retention analysis ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; analysisId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachRetentionsService(options.project);
        const result = service.prepareArchiveRetentionAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Retention analysis archive prepared.');
          console.log(`  Analysis: ${options.analysisId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const flows = program
  .command('flows')
  .description('Manage Bloomreach Engagement flow analyses (Sankey-style journey visualization)');

flows
  .command('list')
  .description('List all flow analyses in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachFlowsService(options.project);
      const result = await service.listFlowAnalyses({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No flow analyses found.');
          return;
        }
        for (const flow of result) {
          console.log(`  ${flow.name}`);
          console.log(`    Starting event: ${flow.startingEvent}`);
          console.log(`    Events:         ${flow.events.length}`);
          console.log(`    Max depth:      ${flow.maxJourneyDepth ?? 'none'}`);
          console.log(`    ID:             ${flow.id}`);
          console.log(`    URL:            ${flow.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

flows
  .command('view-results')
  .description('View journey paths, volumes and drop-offs for a flow analysis')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Flow analysis ID')
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
        const service = new BloomreachFlowsService(options.project);
        const result = await service.viewFlowResults({
          project: options.project,
          analysisId: options.analysisId,
          startDate: options.startDate,
          endDate: options.endDate,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Flow Analysis: ${result.analysisName}`);
          console.log(`  Starting event:  ${result.startingEvent}`);
          console.log(`  Date range:      ${result.startDate} to ${result.endDate}`);
          console.log(`  Total journeys:  ${result.totalJourneys}`);
          console.log(`  Max depth:       ${result.maxJourneyDepth ?? 'none'}`);
          if (result.paths.length === 0) {
            console.log('  Paths: none');
          } else {
            console.log('  Top paths:');
            for (const path of result.paths) {
              console.log(
                `    ${path.events.join(' → ')} | volume=${path.volume}, conversion=${path.conversionRate}`,
              );
            }
          }
          if (result.dropOffs.length > 0) {
            console.log('  Drop-offs:');
            for (const dropOff of result.dropOffs) {
              console.log(
                `    After ${dropOff.afterEvent}: volume=${dropOff.volume}, rate=${dropOff.dropOffRate}`,
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

flows
  .command('create')
  .description('Prepare creation of a new flow analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Flow analysis name')
  .requiredOption('--starting-event <event>', 'Starting event for the journey')
  .requiredOption('--events <json>', 'JSON array of events to track [{order, eventName, label?}]')
  .option('--max-journey-depth <n>', 'Maximum journey depth (1-20)')
  .option('--customer-attributes <json>', 'JSON object of customer attribute filters')
  .option('--event-properties <json>', 'JSON object of event property filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      startingEvent: string;
      events: string;
      maxJourneyDepth?: string;
      customerAttributes?: string;
      eventProperties?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const events = JSON.parse(options.events) as FlowEvent[];
        const filters: FlowFilter = {};
        if (options.customerAttributes) {
          filters.customerAttributes = JSON.parse(options.customerAttributes) as Record<
            string,
            string
          >;
        }
        if (options.eventProperties) {
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<string, string>;
        }

        const service = new BloomreachFlowsService(options.project);
        const result = service.prepareCreateFlowAnalysis({
          project: options.project,
          name: options.name,
          startingEvent: options.startingEvent,
          events,
          maxJourneyDepth:
            options.maxJourneyDepth !== undefined
              ? parseInt(options.maxJourneyDepth, 10)
              : undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Flow analysis creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

flows
  .command('clone')
  .description('Prepare cloning a flow analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Flow analysis ID to clone')
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
        const service = new BloomreachFlowsService(options.project);
        const result = service.prepareCloneFlowAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Flow analysis clone prepared.');
          console.log(`  Source:   ${options.analysisId}`);
          console.log(`  New name: ${options.newName ?? '(auto-generated)'}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

flows
  .command('archive')
  .description('Prepare archiving a flow analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Flow analysis ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; analysisId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachFlowsService(options.project);
        const result = service.prepareArchiveFlowAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Flow analysis archive prepared.');
          console.log(`  Analysis: ${options.analysisId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const geoAnalyses = program
  .command('geo-analyses')
  .description('Manage Bloomreach Engagement geo analyses');

geoAnalyses
  .command('list')
  .description('List all geo analyses in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachGeoAnalysesService(options.project);
      const result = await service.listGeoAnalyses({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No geo analyses found.');
          return;
        }
        for (const analysis of result) {
          console.log(`  ${analysis.name}`);
          console.log(`    Attribute:   ${analysis.attribute}`);
          console.log(`    Granularity: ${analysis.granularity}`);
          console.log(`    ID:          ${analysis.id}`);
          console.log(`    URL:         ${analysis.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

geoAnalyses
  .command('view-results')
  .description('View geographic distribution data for a geo analysis')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Geo analysis ID')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('--granularity <granularity>', 'Geographic granularity (country, region, city)')
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
        const service = new BloomreachGeoAnalysesService(options.project);
        const result = await service.viewGeoResults({
          project: options.project,
          analysisId: options.analysisId,
          startDate: options.startDate,
          endDate: options.endDate,
          granularity: options.granularity,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Geo Analysis: ${result.analysisName}`);
          console.log(`  Attribute:   ${result.attribute}`);
          console.log(`  Granularity: ${result.granularity}`);
          console.log(`  Date range:  ${result.startDate} to ${result.endDate}`);
          if (result.dataPoints.length === 0) {
            console.log('  Data points: none');
          } else {
            console.log('  Data points:');
            for (const dataPoint of result.dataPoints) {
              console.log(
                `    ${dataPoint.location}: count=${dataPoint.count}, percentage=${dataPoint.percentage}%`,
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

geoAnalyses
  .command('create')
  .description('Prepare creation of a new geo analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Geo analysis name')
  .requiredOption('--attribute <attribute>', 'Event or customer attribute for geographic mapping')
  .option('--granularity <granularity>', 'Geographic granularity (country, region, city)', 'country')
  .option('--customer-attributes <json>', 'JSON object of customer attribute filters')
  .option('--event-properties <json>', 'JSON object of event property filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      attribute: string;
      granularity: string;
      customerAttributes?: string;
      eventProperties?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const filters: GeoFilter = {};
        if (options.customerAttributes) {
          filters.customerAttributes = JSON.parse(options.customerAttributes) as Record<
            string,
            string
          >;
        }
        if (options.eventProperties) {
          filters.eventProperties = JSON.parse(options.eventProperties) as Record<string, string>;
        }

        const service = new BloomreachGeoAnalysesService(options.project);
        const result = service.prepareCreateGeoAnalysis({
          project: options.project,
          name: options.name,
          attribute: options.attribute,
          granularity: options.granularity,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Geo analysis creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

geoAnalyses
  .command('clone')
  .description('Prepare cloning a geo analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Geo analysis ID to clone')
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
        const service = new BloomreachGeoAnalysesService(options.project);
        const result = service.prepareCloneGeoAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Geo analysis clone prepared.');
          console.log(`  Source:   ${options.analysisId}`);
          console.log(`  New name: ${options.newName ?? '(auto-generated)'}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

geoAnalyses
  .command('archive')
  .description('Prepare archiving a geo analysis (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--analysis-id <id>', 'Geo analysis ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; analysisId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachGeoAnalysesService(options.project);
        const result = service.prepareArchiveGeoAnalysis({
          project: options.project,
          analysisId: options.analysisId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Geo analysis archive prepared.');
          console.log(`  Analysis: ${options.analysisId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const customers = program
  .command('customers')
  .description('Manage Bloomreach customer profiles');

customers
  .command('list')
  .description('List customer profiles in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--limit <limit>', 'Maximum number of customers to return', '50')
  .option('--offset <offset>', 'Offset for pagination', '0')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; limit: string; offset: string; json?: boolean }) => {
      try {
        const service = new BloomreachCustomersService(options.project);
        const result = await service.listCustomers({
          project: options.project,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
        });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No customers found.');
            return;
          }

          for (const customer of result) {
            const identifiers = Object.entries(customer.customerIds)
              .map(([key, value]) => `${key}=${value}`)
              .join(', ');
            console.log(`  ${identifiers || '(no customer IDs)'}`);
            console.log(`    Properties: ${Object.keys(customer.properties).length}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

customers
  .command('search')
  .description('Search customer profiles by query')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--query <query>', 'Search query')
  .option('--limit <limit>', 'Maximum number of customers to return', '50')
  .option('--offset <offset>', 'Offset for pagination', '0')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      query: string;
      limit: string;
      offset: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCustomersService(options.project);
        const result = await service.searchCustomers({
          project: options.project,
          query: options.query,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
        });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No matching customers found.');
            return;
          }

          for (const customer of result) {
            const identifiers = Object.entries(customer.customerIds)
              .map(([key, value]) => `${key}=${value}`)
              .join(', ');
            console.log(`  ${identifiers || '(no customer IDs)'}`);
            console.log(`    Properties: ${Object.keys(customer.properties).length}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

customers
  .command('view')
  .description('View details for a customer profile')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--customer-id <customerId>', 'Customer identifier value')
  .option('--id-type <idType>', 'Identifier type', 'registered')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      customerId: string;
      idType: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCustomersService(options.project);
        const result = await service.viewCustomer({
          project: options.project,
          customerId: options.customerId,
          idType: options.idType,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer Profile');
          console.log('----------------');
          console.log('  Customer IDs:');
          for (const [idType, value] of Object.entries(result.customerIds)) {
            console.log(`    ${idType}: ${value}`);
          }
          console.log(`  Properties: ${Object.keys(result.properties).length}`);
          console.log(`  Events: ${result.events.length}`);
          console.log(`  Segments: ${result.segments.length}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

customers
  .command('create')
  .description('Prepare creation of a customer profile (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--customer-ids <json>', 'JSON object of customer identifiers')
  .requiredOption('--properties <json>', 'JSON object of customer properties')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      customerIds: string;
      properties: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const customerIds = JSON.parse(options.customerIds) as CustomerIds;
        const properties = JSON.parse(options.properties) as Record<string, unknown>;

        const service = new BloomreachCustomersService(options.project);
        const result = service.prepareCreateCustomer({
          project: options.project,
          customerIds,
          properties,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer creation prepared.');
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

customers
  .command('update')
  .description('Prepare update of a customer profile (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--customer-id <customerId>', 'Customer identifier value')
  .requiredOption('--properties <json>', 'JSON object of customer properties')
  .option('--id-type <idType>', 'Identifier type', 'registered')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      customerId: string;
      properties: string;
      idType: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const properties = JSON.parse(options.properties) as Record<string, unknown>;

        const service = new BloomreachCustomersService(options.project);
        const result = service.prepareUpdateCustomer({
          project: options.project,
          customerId: options.customerId,
          idType: options.idType,
          properties,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer update prepared.');
          console.log(`  Customer: ${options.customerId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

customers
  .command('delete')
  .description('Prepare deletion of a customer profile (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--customer-id <customerId>', 'Customer identifier value')
  .option('--id-type <idType>', 'Identifier type', 'registered')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      customerId: string;
      idType: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCustomersService(options.project);
        const result = service.prepareDeleteCustomer({
          project: options.project,
          customerId: options.customerId,
          idType: options.idType,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer deletion prepared.');
          console.log(`  Customer: ${options.customerId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const vouchers = program
  .command('vouchers')
  .description('Manage Bloomreach voucher pools and discount codes');

vouchers
  .command('list')
  .description('List all voucher pools in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--limit <limit>', 'Maximum number of pools to return', '50')
  .option('--offset <offset>', 'Offset for pagination', '0')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; limit: string; offset: string; json?: boolean }) => {
      try {
        const service = new BloomreachVouchersService(options.project);
        const result = await service.listVoucherPools({
          project: options.project,
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
        });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No voucher pools found.');
            return;
          }
          for (const pool of result) {
            console.log(`  ${pool.name}`);
            console.log(`    Status:   ${pool.status}`);
            console.log(`    Vouchers: ${pool.voucherCount} total, ${pool.redeemedCount} redeemed`);
            console.log(`    ID:       ${pool.id}`);
            console.log(`    URL:      ${pool.url}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

vouchers
  .command('view-status')
  .description('View redemption status of vouchers in a pool')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--pool-id <id>', 'Voucher pool ID')
  .option('--voucher-code <code>', 'Specific voucher code to check')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      poolId: string;
      voucherCode?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachVouchersService(options.project);
        const result = await service.viewVoucherStatus({
          project: options.project,
          poolId: options.poolId,
          voucherCode: options.voucherCode,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Voucher Pool: ${result.name}`);
          console.log(`  Status:   ${result.status}`);
          console.log(`  Vouchers: ${result.voucherCount} total, ${result.redeemedCount} redeemed`);
          if (result.vouchers.length > 0) {
            console.log('  Codes:');
            for (const voucher of result.vouchers) {
              const redeemed =
                voucher.status === 'redeemed' ? ` (redeemed: ${voucher.redeemedAt})` : '';
              console.log(`    ${voucher.code} [${voucher.status}]${redeemed}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

vouchers
  .command('create')
  .description('Prepare creation of a new voucher pool (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Voucher pool name')
  .option('--description <description>', 'Pool description')
  .option('--codes <json>', 'JSON array of voucher codes ["CODE-1", "CODE-2"]')
  .option('--auto-generate <count>', 'Number of voucher codes to auto-generate')
  .option('--max-redemptions <n>', 'Maximum redemptions per voucher')
  .option('--expires-at <datetime>', 'ISO-8601 expiration date for vouchers')
  .option('--single-use', 'Mark vouchers as single-use')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      description?: string;
      codes?: string;
      autoGenerate?: string;
      maxRedemptions?: string;
      expiresAt?: string;
      singleUse?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const voucherCodes = options.codes
          ? (JSON.parse(options.codes) as string[])
          : undefined;
        const autoGenerateCount = options.autoGenerate
          ? parseInt(options.autoGenerate, 10)
          : undefined;

        let redemptionRules: RedemptionRules | undefined;
        if (options.maxRedemptions || options.expiresAt || options.singleUse) {
          redemptionRules = {
            maxRedemptions: options.maxRedemptions
              ? parseInt(options.maxRedemptions, 10)
              : undefined,
            expiresAt: options.expiresAt,
            singleUse: options.singleUse,
          };
        }

        const service = new BloomreachVouchersService(options.project);
        const result = service.prepareCreateVoucherPool({
          project: options.project,
          name: options.name,
          description: options.description,
          voucherCodes,
          autoGenerateCount,
          redemptionRules,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Voucher pool creation prepared.');
          console.log(`  Name:     ${options.name}`);
          console.log(`  Vouchers: ${result.preview.voucherCount} (${result.preview.voucherSource})`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

vouchers
  .command('add')
  .description('Prepare adding voucher codes to an existing pool (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--pool-id <id>', 'Voucher pool ID')
  .option('--codes <json>', 'JSON array of voucher codes ["CODE-1", "CODE-2"]')
  .option('--auto-generate <count>', 'Number of voucher codes to auto-generate')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      poolId: string;
      codes?: string;
      autoGenerate?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const voucherCodes = options.codes
          ? (JSON.parse(options.codes) as string[])
          : undefined;
        const autoGenerateCount = options.autoGenerate
          ? parseInt(options.autoGenerate, 10)
          : undefined;

        const service = new BloomreachVouchersService(options.project);
        const result = service.prepareAddVouchers({
          project: options.project,
          poolId: options.poolId,
          voucherCodes,
          autoGenerateCount,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Add vouchers prepared.');
          console.log(`  Pool:     ${options.poolId}`);
          console.log(`  Vouchers: ${result.preview.voucherCount} (${result.preview.voucherSource})`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

vouchers
  .command('delete')
  .description('Prepare deletion of a voucher pool (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--pool-id <id>', 'Voucher pool ID to delete')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; poolId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachVouchersService(options.project);
        const result = service.prepareDeleteVoucherPool({
          project: options.project,
          poolId: options.poolId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Voucher pool deletion prepared.');
          console.log(`  Pool:    ${options.poolId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const assets = program
  .command('assets')
  .description('Manage Asset Manager templates, snippets, and files');

const assetEmailTemplates = assets
  .command('email-templates')
  .description('Manage email templates');

assetEmailTemplates
  .command('list')
  .description('List all email templates in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAssetManagerService(options.project);
      const result = await service.listEmailTemplates({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No email templates found.');
          return;
        }

        for (const template of result) {
          console.log(`  ${template.name}`);
          console.log(`    Status:  ${template.status}`);
          console.log(`    Builder: ${template.builderType ?? 'n/a'}`);
          console.log(`    ID:      ${template.id}`);
          console.log(`    URL:     ${template.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

assetEmailTemplates
  .command('create')
  .description('Prepare creation of an email template (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Template name')
  .option('--builder-type <type>', 'Builder type (visual, html)')
  .option('--html-content <html>', 'Initial HTML content')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      builderType?: string;
      htmlContent?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareCreateEmailTemplate({
          project: options.project,
          name: options.name,
          builderType: options.builderType,
          htmlContent: options.htmlContent,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Email template creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const assetWeblayerTemplates = assets
  .command('weblayer-templates')
  .description('Manage weblayer templates');

assetWeblayerTemplates
  .command('list')
  .description('List all weblayer templates in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAssetManagerService(options.project);
      const result = await service.listWeblayerTemplates({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No weblayer templates found.');
          return;
        }

        for (const template of result) {
          console.log(`  ${template.name}`);
          console.log(`    Status: ${template.status}`);
          console.log(`    ID:     ${template.id}`);
          console.log(`    URL:    ${template.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

assetWeblayerTemplates
  .command('create')
  .description('Prepare creation of a weblayer template (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Template name')
  .option('--html-content <html>', 'Initial HTML content')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      htmlContent?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareCreateWeblayerTemplate({
          project: options.project,
          name: options.name,
          htmlContent: options.htmlContent,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Weblayer template creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const assetBlocks = assets.command('blocks').description('Manage content blocks');

assetBlocks
  .command('list')
  .description('List all blocks in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAssetManagerService(options.project);
      const result = await service.listBlocks({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No blocks found.');
          return;
        }

        for (const block of result) {
          console.log(`  ${block.name}`);
          console.log(`    Status: ${block.status}`);
          console.log(`    ID:     ${block.id}`);
          console.log(`    URL:    ${block.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

assetBlocks
  .command('create')
  .description('Prepare creation of a block (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Block name')
  .option('--html-content <html>', 'Initial HTML content')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      htmlContent?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareCreateBlock({
          project: options.project,
          name: options.name,
          htmlContent: options.htmlContent,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Block creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const assetCustomRows = assets
  .command('custom-rows')
  .description('Manage custom rows');

assetCustomRows
  .command('list')
  .description('List all custom rows in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAssetManagerService(options.project);
      const result = await service.listCustomRows({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No custom rows found.');
          return;
        }

        for (const customRow of result) {
          console.log(`  ${customRow.name}`);
          console.log(`    Status: ${customRow.status}`);
          console.log(`    ID:     ${customRow.id}`);
          console.log(`    URL:    ${customRow.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

assetCustomRows
  .command('create')
  .description('Prepare creation of a custom row (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Custom row name')
  .option('--html-content <html>', 'Initial HTML content')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      htmlContent?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareCreateCustomRow({
          project: options.project,
          name: options.name,
          htmlContent: options.htmlContent,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Custom row creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const assetSnippets = assets.command('snippets').description('Manage snippets');

assetSnippets
  .command('list')
  .description('List all snippets in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAssetManagerService(options.project);
      const result = await service.listSnippets({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No snippets found.');
          return;
        }

        for (const snippet of result) {
          console.log(`  ${snippet.name}`);
          console.log(`    Language: ${snippet.language}`);
          console.log(`    ID:       ${snippet.id}`);
          console.log(`    URL:      ${snippet.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

assetSnippets
  .command('create')
  .description('Prepare creation of a snippet (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Snippet name')
  .requiredOption('--language <language>', 'Snippet language (jinja, html)')
  .requiredOption('--content <content>', 'Snippet content')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      language: string;
      content: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareCreateSnippet({
          project: options.project,
          name: options.name,
          language: options.language,
          content: options.content,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Snippet creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

assetSnippets
  .command('edit')
  .description('Prepare editing a snippet (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--snippet-id <id>', 'Snippet ID')
  .option('--name <name>', 'Snippet name')
  .option('--language <language>', 'Snippet language (jinja, html)')
  .option('--content <content>', 'Snippet content')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      snippetId: string;
      name?: string;
      language?: string;
      content?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareEditSnippet({
          project: options.project,
          snippetId: options.snippetId,
          name: options.name,
          language: options.language,
          content: options.content,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Snippet edit prepared.');
          console.log(`  Snippet: ${options.snippetId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const assetFiles = assets.command('files').description('Manage files');

assetFiles
  .command('list')
  .description('List all files in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--category <category>', 'File category (image, document, font, other)')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; category?: string; json?: boolean }) => {
    try {
      const service = new BloomreachAssetManagerService(options.project);
      const input: { project: string; category?: string } = { project: options.project };
      if (options.category) input.category = options.category;

      const result = await service.listFiles(input);

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No files found.');
          return;
        }

        for (const file of result) {
          console.log(`  ${file.name}`);
          console.log(`    Category: ${file.category}`);
          console.log(`    MIME:     ${file.mimeType}`);
          console.log(`    ID:       ${file.id}`);
          console.log(`    URL:      ${file.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

assetFiles
  .command('upload')
  .description('Prepare uploading a file (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'File name')
  .requiredOption('--mime-type <type>', 'MIME type')
  .option('--file-size <size>', 'File size in bytes')
  .option('--category <category>', 'File category (image, document, font, other)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      mimeType: string;
      fileSize?: string;
      category?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const fileSize = options.fileSize ? parseInt(options.fileSize, 10) : undefined;

        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareUploadFile({
          project: options.project,
          name: options.name,
          mimeType: options.mimeType,
          fileSize,
          category: options.category,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('File upload prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

assetFiles
  .command('delete')
  .description('Prepare deleting a file (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--file-id <id>', 'File ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; fileId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareDeleteFile({
          project: options.project,
          fileId: options.fileId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('File deletion prepared.');
          console.log(`  File:    ${options.fileId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

assets
  .command('clone')
  .description('Prepare cloning a template (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--template-id <id>', 'Template ID')
  .requiredOption(
    '--asset-type <type>',
    'Asset type (email_template, weblayer_template, block, custom_row)',
  )
  .option('--new-name <name>', 'Name for the cloned template')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      templateId: string;
      assetType: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareCloneTemplate({
          project: options.project,
          templateId: options.templateId,
          assetType: options.assetType,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Template clone prepared.');
          console.log(`  Template: ${options.templateId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

assets
  .command('archive')
  .description('Prepare archiving a template (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--template-id <id>', 'Template ID')
  .requiredOption(
    '--asset-type <type>',
    'Asset type (email_template, weblayer_template, block, custom_row)',
  )
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      templateId: string;
      assetType: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAssetManagerService(options.project);
        const result = service.prepareArchiveTemplate({
          project: options.project,
          templateId: options.templateId,
          assetType: options.assetType,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Template archive prepared.');
          console.log(`  Template: ${options.templateId}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

const tagManager = program
  .command('tag-manager')
  .description('Manage Bloomreach Tag Manager JavaScript tags');

tagManager
  .command('list')
  .description('List all managed JavaScript tags')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status (enabled, disabled)')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; status?: string; json?: boolean }) => {
    try {
      const service = new BloomreachTagManagerService(options.project);
      const result = await service.listTags({
        project: options.project,
        status: options.status,
      });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No managed tags found.');
          return;
        }

        for (const tag of result) {
          console.log(`  ${tag.name}`);
          console.log(`    Status:   ${tag.status}`);
          if (tag.priority !== undefined) {
            console.log(`    Priority: ${tag.priority}`);
          }
          console.log(`    ID:       ${tag.id}`);
          console.log(`    URL:      ${tag.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

tagManager
  .command('view')
  .description('View details of a specific managed tag')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tagId: string; json?: boolean }) => {
    try {
      const service = new BloomreachTagManagerService(options.project);
      const result = await service.viewTag({
        project: options.project,
        tagId: options.tagId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Tag: ${result.name}`);
        console.log(`  Status:   ${result.status}`);
        if (result.priority !== undefined) {
          console.log(`  Priority: ${result.priority}`);
        }
        console.log(`  JS code:  ${result.jsCode.slice(0, 200)}`);
        console.log(`  Trigger:  ${JSON.stringify(result.triggerConditions)}`);
        console.log(`  URL:      ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

tagManager
  .command('create')
  .description('Prepare creation of a new managed JavaScript tag (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Tag name')
  .requiredOption('--js-code <code>', 'JavaScript code for the tag')
  .option('--page-url <url>', 'Page URL pattern for trigger condition')
  .option('--events <csv>', 'Trigger event names (comma-separated)')
  .option('--customer-attributes <json>', 'Customer attribute conditions as JSON object')
  .option('--priority <n>', 'Execution priority (positive integer, lower = higher)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      jsCode: string;
      pageUrl?: string;
      events?: string;
      customerAttributes?: string;
      priority?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let triggerConditions: TagTriggerConditions | undefined;
        if (options.pageUrl || options.events || options.customerAttributes) {
          triggerConditions = {
            pageUrl: options.pageUrl,
            events: options.events ? options.events.split(',').map((e) => e.trim()) : undefined,
            customerAttributes: options.customerAttributes
              ? (JSON.parse(options.customerAttributes) as Record<string, string>)
              : undefined,
          };
        }

        const service = new BloomreachTagManagerService(options.project);
        const result = service.prepareCreateTag({
          project: options.project,
          name: options.name,
          jsCode: options.jsCode,
          triggerConditions,
          priority: options.priority ? parseInt(options.priority, 10) : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Tag creation prepared.');
          console.log(`  Tag:     ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

tagManager
  .command('enable')
  .description('Prepare enabling a managed tag (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID to enable')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tagId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachTagManagerService(options.project);
      const result = service.prepareEnableTag({
        project: options.project,
        tagId: options.tagId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Tag enable prepared.');
        console.log(`  Tag:     ${options.tagId}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

tagManager
  .command('disable')
  .description('Prepare disabling a managed tag (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID to disable')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tagId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachTagManagerService(options.project);
      const result = service.prepareDisableTag({
        project: options.project,
        tagId: options.tagId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Tag disable prepared.');
        console.log(`  Tag:     ${options.tagId}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

tagManager
  .command('edit')
  .description('Prepare editing a managed tag (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID to edit')
  .option('--name <name>', 'New tag name')
  .option('--js-code <code>', 'New JavaScript code')
  .option('--page-url <url>', 'New page URL pattern for trigger condition')
  .option('--events <csv>', 'New trigger event names (comma-separated)')
  .option('--customer-attributes <json>', 'New customer attribute conditions as JSON object')
  .option('--priority <n>', 'New execution priority')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      tagId: string;
      name?: string;
      jsCode?: string;
      pageUrl?: string;
      events?: string;
      customerAttributes?: string;
      priority?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let triggerConditions: TagTriggerConditions | undefined;
        if (options.pageUrl || options.events || options.customerAttributes) {
          triggerConditions = {
            pageUrl: options.pageUrl,
            events: options.events ? options.events.split(',').map((e) => e.trim()) : undefined,
            customerAttributes: options.customerAttributes
              ? (JSON.parse(options.customerAttributes) as Record<string, string>)
              : undefined,
          };
        }

        const service = new BloomreachTagManagerService(options.project);
        const result = service.prepareEditTag({
          project: options.project,
          tagId: options.tagId,
          name: options.name,
          jsCode: options.jsCode,
          triggerConditions,
          priority: options.priority ? parseInt(options.priority, 10) : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Tag edit prepared.');
          console.log(`  Tag:     ${options.tagId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

tagManager
  .command('delete')
  .description('Prepare deletion of a managed tag (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID to delete')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tagId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachTagManagerService(options.project);
      const result = service.prepareDeleteTag({
        project: options.project,
        tagId: options.tagId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Tag deletion prepared.');
        console.log(`  Tag:     ${options.tagId}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

const metrics = program
  .command('metrics')
  .description('Manage custom computed metrics (Data & Assets > Metrics)');

metrics
  .command('list')
  .description('List all custom computed metrics in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachMetricsService(options.project);
      const result = await service.listMetrics({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No metrics found.');
          return;
        }
        for (const metric of result) {
          console.log(`  ${metric.name}`);
          console.log(`    ID:          ${metric.id}`);
          console.log(`    Aggregation: ${metric.aggregation.aggregationType}`);
          console.log(`    URL:         ${metric.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

metrics
  .command('create')
  .description('Prepare creation of a custom metric (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Metric name')
  .requiredOption('--event-name <eventName>', 'Event name for aggregation')
  .requiredOption('--aggregation-type <type>', 'Aggregation type (sum, count, average, min, max, unique)')
  .option('--property-name <prop>', 'Event property name for property-based aggregations')
  .option('--description <desc>', 'Metric description')
  .option('--filters <json>', 'JSON object of metric filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      eventName: string;
      aggregationType: string;
      propertyName?: string;
      description?: string;
      filters?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const filters = options.filters ? (JSON.parse(options.filters) as MetricFilter) : undefined;
        const aggregation: MetricAggregation = {
          eventName: options.eventName,
          aggregationType: options.aggregationType,
          propertyName: options.propertyName,
        };

        const service = new BloomreachMetricsService(options.project);
        const result = service.prepareCreateMetric({
          project: options.project,
          name: options.name,
          description: options.description,
          aggregation,
          filters,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Metric creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

metrics
  .command('edit')
  .description('Prepare editing a custom metric (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--metric-id <id>', 'Metric ID')
  .option('--name <name>', 'New metric name')
  .option('--event-name <eventName>', 'New event name for aggregation')
  .option('--aggregation-type <type>', 'New aggregation type (sum, count, average, min, max, unique)')
  .option('--property-name <prop>', 'New event property name for property-based aggregations')
  .option('--description <desc>', 'New metric description')
  .option('--filters <json>', 'JSON object of metric filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      metricId: string;
      name?: string;
      eventName?: string;
      aggregationType?: string;
      propertyName?: string;
      description?: string;
      filters?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let aggregation: MetricAggregation | undefined;
        if (options.eventName || options.aggregationType || options.propertyName) {
          aggregation = {
            eventName: options.eventName ?? '',
            aggregationType: options.aggregationType ?? '',
            propertyName: options.propertyName,
          };
        }
        const filters = options.filters ? (JSON.parse(options.filters) as MetricFilter) : undefined;

        const service = new BloomreachMetricsService(options.project);
        const result = service.prepareEditMetric({
          project: options.project,
          metricId: options.metricId,
          name: options.name,
          description: options.description,
          aggregation,
          filters,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Metric edit prepared.');
          console.log(`  Metric:  ${options.metricId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

metrics
  .command('delete')
  .description('Prepare deletion of a custom metric (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--metric-id <id>', 'Metric ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; metricId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachMetricsService(options.project);
      const result = service.prepareDeleteMetric({
        project: options.project,
        metricId: options.metricId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Metric deletion prepared.');
        console.log(`  Metric:  ${options.metricId}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

const dataManager = program
  .command('data-manager')
  .description(
    'Manage Bloomreach data schema (customer properties, events, definitions, mapping, content sources)',
  );

dataManager
  .command('list-properties')
  .description('List all customer property definitions')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachDataManagerService(options.project);
      const result = await service.listCustomerProperties({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No customer properties found.');
          return;
        }
        for (const prop of result) {
          console.log(`  ${prop.name}`);
          console.log(`    Type:  ${prop.type}`);
          if (prop.group) console.log(`    Group: ${prop.group}`);
          if (prop.description) console.log(`    Desc:  ${prop.description}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

dataManager
  .command('add-property')
  .description('Prepare addition of a new customer property (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Property name')
  .requiredOption('--type <type>', 'Property type (string, number, boolean, date, list, json)')
  .option('--description <desc>', 'Property description')
  .option('--group <group>', 'Property group assignment')
  .option('--required', 'Mark property as required')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      description?: string;
      group?: string;
      required?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareAddCustomerProperty({
          project: options.project,
          name: options.name,
          type: options.type,
          description: options.description,
          group: options.group,
          isRequired: options.required,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer property addition prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('edit-property')
  .description('Prepare editing an existing customer property (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--property-name <name>', 'Property name to edit')
  .option('--description <desc>', 'New property description')
  .option('--type <type>', 'New property type')
  .option('--group <group>', 'New property group assignment')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      propertyName: string;
      description?: string;
      type?: string;
      group?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareEditCustomerProperty({
          project: options.project,
          propertyName: options.propertyName,
          description: options.description,
          type: options.type,
          group: options.group,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer property edit prepared.');
          console.log(`  Name:    ${options.propertyName}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('list-events')
  .description('List all event definitions')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachDataManagerService(options.project);
      const result = await service.listEvents({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No event definitions found.');
          return;
        }
        for (const event of result) {
          console.log(`  ${event.name}`);
          console.log(`    Type:       ${event.type}`);
          console.log(`    Properties: ${event.properties?.length ?? 0}`);
          if (event.description) console.log(`    Desc:       ${event.description}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

dataManager
  .command('add-event')
  .description('Prepare addition of a new event definition (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Event name')
  .requiredOption('--type <type>', 'Event type (string, number, boolean, date, list, json)')
  .option('--description <desc>', 'Event description')
  .option(
    '--properties <json>',
    'JSON array of event properties [{name, type, description?, isRequired?}]',
  )
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      description?: string;
      properties?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const properties = options.properties
          ? (JSON.parse(options.properties) as EventPropertyDefinition[])
          : undefined;

        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareAddEventDefinition({
          project: options.project,
          name: options.name,
          type: options.type,
          description: options.description,
          properties,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Event addition prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('list-definitions')
  .description('List all data definitions')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachDataManagerService(options.project);
      const result = await service.listFieldDefinitions({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No definitions found.');
          return;
        }
        for (const definition of result) {
          console.log(`  ${definition.name}`);
          console.log(`    Type:     ${definition.type}`);
          if (definition.category) console.log(`    Category: ${definition.category}`);
          if (definition.description) console.log(`    Desc:     ${definition.description}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

dataManager
  .command('add-definition')
  .description('Prepare addition of a new definition (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Definition name')
  .requiredOption('--type <type>', 'Definition type')
  .option('--description <desc>', 'Definition description')
  .option('--category <category>', 'Definition category')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      description?: string;
      category?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareAddFieldDefinition({
          project: options.project,
          name: options.name,
          type: options.type,
          description: options.description,
          category: options.category,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Definition addition prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('edit-definition')
  .description('Prepare editing an existing definition (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--definition-id <id>', 'Definition ID')
  .option('--name <name>', 'New definition name')
  .option('--type <type>', 'New definition type')
  .option('--description <desc>', 'New definition description')
  .option('--category <category>', 'New definition category')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      definitionId: string;
      name?: string;
      type?: string;
      description?: string;
      category?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareEditFieldDefinition({
          project: options.project,
          definitionId: options.definitionId,
          name: options.name,
          type: options.type,
          description: options.description,
          category: options.category,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Definition edit prepared.');
          console.log(`  Definition: ${options.definitionId}`);
          console.log(`  Token:      ${result.confirmToken}`);
          console.log(`  Expires:    ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('list-mappings')
  .description('List all source-to-target mappings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachDataManagerService(options.project);
      const result = await service.listMappings({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No mappings found.');
          return;
        }
        for (const mapping of result) {
          console.log(`  ${mapping.sourceField} -> ${mapping.targetField}`);
          if (mapping.transformationType) {
            console.log(`    Transform: ${mapping.transformationType}`);
          }
          if (mapping.isActive !== undefined) {
            console.log(`    Active:    ${mapping.isActive}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

dataManager
  .command('configure-mapping')
  .description('Prepare mapping configuration between source and target fields (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--source-field <field>', 'Source field name')
  .requiredOption('--target-field <field>', 'Target field name')
  .option(
    '--transformation-type <type>',
    'Transformation type (direct, concatenate, split, format, lookup)',
  )
  .option('--active', 'Set mapping as active')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      sourceField: string;
      targetField: string;
      transformationType?: string;
      active?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareConfigureMapping({
          project: options.project,
          sourceField: options.sourceField,
          targetField: options.targetField,
          transformationType: options.transformationType,
          isActive: options.active,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Mapping configuration prepared.');
          console.log(`  Mapping: ${options.sourceField} -> ${options.targetField}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('list-content-sources')
  .description('List all content sources')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachDataManagerService(options.project);
      const result = await service.listContentSources({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No content sources found.');
          return;
        }
        for (const source of result) {
          console.log(`  ${source.name}`);
          console.log(`    Type: ${source.sourceType}`);
          console.log(`    URL:  ${source.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

dataManager
  .command('add-content-source')
  .description('Prepare addition of a content source (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Content source name')
  .requiredOption('--source-type <type>', 'Source type (api, csv, webhook, database, sftp)')
  .requiredOption('--url <url>', 'Content source URL')
  .option('--configuration <json>', 'JSON object with source-specific configuration')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      sourceType: string;
      url: string;
      configuration?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const configuration = options.configuration
          ? (JSON.parse(options.configuration) as Record<string, unknown>)
          : undefined;

        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareAddContentSource({
          project: options.project,
          name: options.name,
          sourceType: options.sourceType,
          url: options.url,
          configuration,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Content source addition prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('edit-content-source')
  .description('Prepare editing of an existing content source (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--source-id <id>', 'Content source ID')
  .option('--name <name>', 'New content source name')
  .option('--url <url>', 'New content source URL')
  .option('--configuration <json>', 'JSON object with source-specific configuration')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      sourceId: string;
      name?: string;
      url?: string;
      configuration?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const configuration = options.configuration
          ? (JSON.parse(options.configuration) as Record<string, unknown>)
          : undefined;

        const service = new BloomreachDataManagerService(options.project);
        const result = service.prepareEditContentSource({
          project: options.project,
          sourceId: options.sourceId,
          name: options.name,
          url: options.url,
          configuration,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Content source edit prepared.');
          console.log(`  Source:  ${options.sourceId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

dataManager
  .command('save-changes')
  .description('Prepare saving pending Data Manager changes (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachDataManagerService(options.project);
      const result = service.prepareSaveChanges({
        project: options.project,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Data Manager save prepared.');
        console.log(`  Project: ${options.project}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

const exportsCmd = program
  .command('exports')
  .description('Manage Bloomreach exports (list, status, history, create, run, schedule, delete)');

exportsCmd
  .command('list')
  .description('List all configured exports')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachExportsService(options.project);
      const result = await service.listExports({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No exports found.');
          return;
        }
        for (const exportItem of result) {
          console.log(`  ${exportItem.name}`);
          console.log(`    Type:   ${exportItem.exportType}`);
          console.log(`    Status: ${exportItem.status}`);
          console.log(`    URL:    ${exportItem.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

exportsCmd
  .command('status')
  .description('View export status')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--export-id <id>', 'Export ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; exportId: string; json?: boolean }) => {
    try {
      const service = new BloomreachExportsService(options.project);
      const result = await service.viewExportStatus({
        project: options.project,
        exportId: options.exportId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Export status for ${options.exportId}`);
        console.log(`  Status:      ${result.status}`);
        console.log(`  Started:     ${result.startedAt ?? 'N/A'}`);
        console.log(`  Completed:   ${result.completedAt ?? 'N/A'}`);
        console.log(`  File:        ${result.fileLocation ?? 'N/A'}`);
        console.log(`  RecordCount: ${result.recordCount ?? 'N/A'}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

exportsCmd
  .command('history')
  .description('View export history')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--export-id <id>', 'Export ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; exportId: string; json?: boolean }) => {
    try {
      const service = new BloomreachExportsService(options.project);
      const result = await service.viewExportHistory({
        project: options.project,
        exportId: options.exportId,
      });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No export history found.');
          return;
        }
        console.log(`Export history for ${options.exportId}`);
        for (const entry of result) {
          console.log(`  ${entry.id}`);
          console.log(`    Status:      ${entry.status}`);
          console.log(`    Started:     ${entry.startedAt ?? 'N/A'}`);
          console.log(`    Completed:   ${entry.completedAt ?? 'N/A'}`);
          console.log(`    File:        ${entry.fileLocation ?? 'N/A'}`);
          console.log(`    RecordCount: ${entry.recordCount ?? 'N/A'}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

exportsCmd
  .command('create')
  .description('Prepare creation of a new export (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Export name')
  .requiredOption('--export-type <type>', 'Export type (customers, events)')
  .requiredOption('--data-selection <json>', 'JSON object: {"attributes":["a"],"events":["b"],"segments":["c"]}')
  .requiredOption('--destination <json>', 'JSON object: {"type":"sftp","host":"...","path":"..."}')
  .option('--schedule <json>', 'JSON object: {"frequency":"daily","time":"09:00","timezone":"UTC"}')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      exportType: string;
      dataSelection: string;
      destination: string;
      schedule?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const dataSelection = JSON.parse(options.dataSelection) as DataSelection;
        const destination = JSON.parse(options.destination) as ExportDestination;
        const schedule = options.schedule
          ? (JSON.parse(options.schedule) as ExportSchedule)
          : undefined;

        const service = new BloomreachExportsService(options.project);
        const result = service.prepareCreateExport({
          project: options.project,
          name: options.name,
          exportType: options.exportType,
          dataSelection,
          destination,
          schedule,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Export creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

exportsCmd
  .command('run')
  .description('Prepare triggering an immediate export (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--export-id <id>', 'Export ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; exportId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachExportsService(options.project);
      const result = service.prepareRunExport({
        project: options.project,
        exportId: options.exportId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Export run prepared.');
        console.log(`  Export:  ${options.exportId}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

exportsCmd
  .command('schedule')
  .description('Prepare configuring a recurring schedule (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--export-id <id>', 'Export ID')
  .requiredOption('--schedule <json>', 'JSON object: {"frequency":"weekly","daysOfWeek":[1,3,5],"time":"08:00","timezone":"UTC"}')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; exportId: string; schedule: string; note?: string; json?: boolean }) => {
      try {
        const schedule = JSON.parse(options.schedule) as ExportSchedule;

        const service = new BloomreachExportsService(options.project);
        const result = service.prepareScheduleExport({
          project: options.project,
          exportId: options.exportId,
          schedule,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Export schedule prepared.');
          console.log(`  Export:  ${options.exportId}`);
          console.log(`  Token:   ${result.confirmToken}`);
          console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

exportsCmd
  .command('delete')
  .description('Prepare deletion of an export (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--export-id <id>', 'Export ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; exportId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachExportsService(options.project);
      const result = service.prepareDeleteExport({
        project: options.project,
        exportId: options.exportId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Export deletion prepared.');
        console.log(`  Export:  ${options.exportId}`);
        console.log(`  Token:   ${result.confirmToken}`);
        console.log(`  Expires: ${new Date(result.expiresAtMs).toISOString()}`);
        console.log('');
        console.log('To confirm, run:');
        console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

const integrations = program
  .command('integrations')
  .description('Manage Bloomreach Engagement third-party integrations');

integrations
  .command('list')
  .description('List all configured integrations in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option(
    '--type <type>',
    'Filter by integration type (esp, sms, push, ad_platform, webhook, analytics, crm, custom)',
  )
  .option('--status <status>', 'Filter by status (active, inactive, error, pending)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; type?: string; status?: string; json?: boolean }) => {
      try {
        const service = new BloomreachIntegrationsService(options.project);
        const input: { project: string; type?: string; status?: string } = {
          project: options.project,
        };
        if (options.type) input.type = options.type;
        if (options.status) input.status = options.status;

        const result = await service.listIntegrations(input);

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No integrations found.');
            return;
          }
          for (const integration of result) {
            console.log(`  ${integration.name}`);
            console.log(`    Type:     ${integration.type}`);
            console.log(`    Provider: ${integration.provider}`);
            console.log(`    Status:   ${integration.status}`);
            console.log(`    ID:       ${integration.id}`);
            console.log(`    URL:      ${integration.url}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

integrations
  .command('view')
  .description('View details of a specific integration')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--integration-id <id>', 'Integration ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; integrationId: string; json?: boolean }) => {
    try {
      const service = new BloomreachIntegrationsService(options.project);
      const result = await service.viewIntegration({
        project: options.project,
        integrationId: options.integrationId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Integration: ${result.name}`);
        console.log(`  Type:       ${result.type}`);
        console.log(`  Provider:   ${result.provider}`);
        console.log(`  Status:     ${result.status}`);
        console.log(`  Settings:   ${Object.keys(result.settings).length} keys`);
        if (result.lastTestedAt) {
          console.log(`  Last test:  ${result.lastTestedAt} (${result.lastTestResult})`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

integrations
  .command('create')
  .description('Prepare creation of a new integration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Integration name')
  .requiredOption(
    '--type <type>',
    'Integration type (esp, sms, push, ad_platform, webhook, analytics, crm, custom)',
  )
  .requiredOption('--provider <provider>', 'Provider name (e.g. SendGrid, Twilio)')
  .option('--credentials <json>', 'JSON object of integration credentials')
  .option('--settings <json>', 'JSON object of integration settings')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      provider: string;
      credentials?: string;
      settings?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const credentials = options.credentials
          ? (JSON.parse(options.credentials) as IntegrationCredentials)
          : undefined;
        const settings = options.settings
          ? (JSON.parse(options.settings) as IntegrationSettings)
          : undefined;

        const service = new BloomreachIntegrationsService(options.project);
        const result = service.prepareCreateIntegration({
          project: options.project,
          name: options.name,
          type: options.type as 'esp',
          provider: options.provider,
          credentials,
          settings,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Integration creation prepared.');
          console.log(`  Name:     ${options.name}`);
          console.log(`  Type:     ${options.type}`);
          console.log(`  Provider: ${options.provider}`);
          console.log(`  Token:    ${result.confirmToken}`);
          console.log(`  Expires:  ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

integrations
  .command('configure')
  .description('Prepare configuration update of an integration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--integration-id <id>', 'Integration ID')
  .option('--credentials <json>', 'JSON object of updated credentials')
  .option('--settings <json>', 'JSON object of updated settings')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      integrationId: string;
      credentials?: string;
      settings?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const credentials = options.credentials
          ? (JSON.parse(options.credentials) as IntegrationCredentials)
          : undefined;
        const settings = options.settings
          ? (JSON.parse(options.settings) as IntegrationSettings)
          : undefined;

        const service = new BloomreachIntegrationsService(options.project);
        const result = service.prepareConfigureIntegration({
          project: options.project,
          integrationId: options.integrationId,
          credentials,
          settings,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Integration configuration prepared.');
          console.log(`  Integration: ${options.integrationId}`);
          console.log(`  Token:       ${result.confirmToken}`);
          console.log(`  Expires:     ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

integrations
  .command('enable')
  .description('Prepare enabling an integration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--integration-id <id>', 'Integration ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; integrationId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachIntegrationsService(options.project);
        const result = service.prepareEnableIntegration({
          project: options.project,
          integrationId: options.integrationId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Integration enable prepared.');
          console.log(`  Integration: ${options.integrationId}`);
          console.log(`  Token:       ${result.confirmToken}`);
          console.log(`  Expires:     ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

integrations
  .command('disable')
  .description('Prepare disabling an integration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--integration-id <id>', 'Integration ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; integrationId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachIntegrationsService(options.project);
        const result = service.prepareDisableIntegration({
          project: options.project,
          integrationId: options.integrationId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Integration disable prepared.');
          console.log(`  Integration: ${options.integrationId}`);
          console.log(`  Token:       ${result.confirmToken}`);
          console.log(`  Expires:     ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

integrations
  .command('delete')
  .description('Prepare deletion of an integration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--integration-id <id>', 'Integration ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; integrationId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachIntegrationsService(options.project);
        const result = service.prepareDeleteIntegration({
          project: options.project,
          integrationId: options.integrationId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Integration deletion prepared.');
          console.log(`  Integration: ${options.integrationId}`);
          console.log(`  Token:       ${result.confirmToken}`);
          console.log(`  Expires:     ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

integrations
  .command('test')
  .description('Prepare testing integration connectivity (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--integration-id <id>', 'Integration ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; integrationId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachIntegrationsService(options.project);
        const result = service.prepareTestIntegration({
          project: options.project,
          integrationId: options.integrationId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Integration test prepared.');
          console.log(`  Integration: ${options.integrationId}`);
          console.log(`  Token:       ${result.confirmToken}`);
          console.log(`  Expires:     ${new Date(result.expiresAtMs).toISOString()}`);
          console.log('');
          console.log('To confirm, run:');
          console.log(`  bloomreach actions confirm --token ${result.confirmToken}`);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

program.parse();
