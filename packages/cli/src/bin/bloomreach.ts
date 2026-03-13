#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import {
  BloomreachAccessManagementService,
  BloomreachAssetManagerService,
  BloomreachCampaignCalendarService,
  BloomreachCampaignSettingsService,
  BloomreachCatalogsService,
  BloomreachClient,
  BloomreachCustomersService,
  BloomreachDataManagerService,
  BloomreachDashboardsService,
  BloomreachEmailCampaignsService,
  BloomreachEvaluationSettingsService,
  BloomreachExportsService,
  BloomreachFlowsService,
  BloomreachIntegrationsService,
  BloomreachInitiativesService,
  BloomreachUseCasesService,
  BloomreachProjectSettingsService,
  BloomreachFunnelsService,
  BloomreachGeoAnalysesService,
  BloomreachImportsService,
  BloomreachMetricsService,
  BloomreachPerformanceService,
  BloomreachReportsService,
  BloomreachRetentionsService,
  BloomreachScenariosService,
  BloomreachSecuritySettingsService,
  BloomreachSegmentationsService,
  BloomreachSqlReportsService,
  BloomreachSurveysService,
  BloomreachTagManagerService,
  BloomreachTrendsService,
  BloomreachVouchersService,
  BloomreachWeblayersService,
  resolveApiConfig,
} from '@bloomreach-buddy/core';
import type {
  BloomreachApiConfig,
  CustomerIds,
  DataSelection,
  EmailCampaignABTestConfig,
  IntegrationCredentials,
  InitiativeItemReference,
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
  ImportMapping,
  ImportScheduleConfig,
  MetricAggregation,
  MetricFilter,
  RedemptionRules,
  ReportDateRange,
  ReportFilter,
  ReportGrouping,
  ReportSortConfig,
  RetentionFilter,
  SegmentCondition,
  SurveyDisplayConditions,
  SurveyQuestion,
  TagTriggerConditions,
  TrendFilter,
  WeblayerDisplayConditions,
  WeblayerABTestConfig,
  CreateCatalogInput,
  AddCatalogItemsInput,
  UpdateCatalogItemsInput,
} from '@bloomreach-buddy/core';

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function tryResolveApiConfig(projectToken?: string): BloomreachApiConfig | undefined {
  try {
    return resolveApiConfig(
      projectToken ? { projectToken } : undefined,
    );
  } catch {
    return undefined;
  }
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
  .requiredOption('--name <name>', 'Campaign name (max 200 characters)')
  .requiredOption('--subject <subject>', 'Email subject line (max 998 characters, RFC 2822)')
  .option('--template-type <type>', 'Template type: visual (drag-and-drop) or html (raw HTML)')
  .option('--audience <audience>', 'Audience segment identifier for recipient targeting')
  .option(
    '--schedule-type <type>',
    'Send schedule: immediate, scheduled (requires --scheduled-at), or recurring (requires --cron)',
  )
  .option('--scheduled-at <datetime>', 'ISO-8601 datetime for scheduled sends (e.g. 2026-04-01T10:00:00Z)')
  .option('--cron <expression>', 'Cron expression for recurring sends (e.g. "0 9 * * MON")')
  .option('--ab-variants <n>', 'Number of A/B test variants (2-10, includes control)')
  .option('--ab-split <percent>', 'A/B test split percentage (0-100, audience fraction for test)')
  .option('--ab-winner <criteria>', 'A/B test winner criteria: open_rate or click_rate')
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
  .option('--status <status>', 'Filter by status: active, inactive, draft, or archived')
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
  .description('View response counts, completion rates, and answer distribution for a survey')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID to retrieve results for')
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
  .requiredOption('--name <name>', 'Survey name (max 200 characters)')
  .requiredOption(
    '--questions <json>',
    'JSON array of questions: [{id, type, text, options?, required?}]. Types: multiple_choice, text, rating, nps. Max 50 questions, max 20 options per question.',
  )
  .option('--audience <audience>', 'Audience segment identifier for respondent targeting')
  .option('--page-url <url>', 'Page URL pattern where survey appears (e.g. /checkout)')
  .option('--trigger-event <event>', 'Trigger event name (e.g. cart_abandon)')
  .option('--delay-ms <ms>', 'Delay in milliseconds before showing the survey')
  .option(
    '--frequency <frequency>',
    'Display frequency: once, always, or once_per_session',
  )
  .option('--template-id <id>', 'Survey template ID for pre-built layouts')
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
  .description('Prepare starting a survey to begin collecting responses (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID to start')
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
  .description('Prepare stopping a survey to pause response collection (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID to stop')
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
  .description('Prepare archiving a survey for safe removal from active list (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--survey-id <id>', 'Survey ID to archive')
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
  .description(
    'List all funnel analyses in the project (note: requires browser automation — not yet available via API)',
  )
  .requiredOption('--project <project>', 'Bloomreach project token (UUID from Settings > Project)')
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
  .requiredOption(
    '--analysis-id <id>',
    'Funnel analysis ID (hex string from Bloomreach UI URL, e.g. "606488856f8cf6f848b20af8")',
  )
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
        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachFunnelsService(options.project, apiConfig);
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
  .option(
    '--granularity <granularity>',
    'Geographic granularity (country, region, city)',
    'country',
  )
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
  .description(
    'Manage Bloomreach customer profiles.\n\n' +
      'Requires API credentials via environment variables:\n' +
      '  BLOOMREACH_PROJECT_TOKEN  — Project token (UUID)\n' +
      '  BLOOMREACH_API_KEY_ID     — API key identifier\n' +
      '  BLOOMREACH_API_SECRET     — API secret\n' +
      '  BLOOMREACH_API_BASE_URL   — Optional (default: https://api.exponea.com)',
  );

customers
  .command('list')
  .description('List customer profiles in the project')
  .requiredOption('--project <project>', 'Bloomreach project token (UUID)')
  .option('--limit <limit>', 'Maximum number of customers to return (1-1000)', '50')
  .option('--offset <offset>', 'Offset for pagination', '0')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; limit: string; offset: string; json?: boolean }) => {
    try {
      const apiConfig = tryResolveApiConfig(options.project);
      const service = new BloomreachCustomersService(options.project, apiConfig);
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
  });

customers
  .command('search')
  .description('Search for a customer profile by identifier')
  .requiredOption('--project <project>', 'Bloomreach project token (UUID)')
  .requiredOption('--query <query>', 'Customer identifier value to search for (e.g. email address)')
  .option('--limit <limit>', 'Maximum number of customers to return (1-1000)', '50')
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
        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachCustomersService(options.project, apiConfig);
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
  .description('View full profile for a customer')
  .requiredOption('--project <project>', 'Bloomreach project token (UUID)')
  .requiredOption('--customer-id <customerId>', 'Customer identifier value')
  .option(
    '--id-type <idType>',
    'Type of the customer identifier: registered (default), cookie, or email',
    'registered',
  )
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; customerId: string; idType: string; json?: boolean }) => {
      try {
        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachCustomersService(options.project, apiConfig);
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
  .requiredOption('--project <project>', 'Bloomreach project token (UUID)')
  .requiredOption(
    '--customer-ids <json>',
    'JSON object of customer identifiers, e.g. \'{"registered":"user@example.com"}\'',
  )
  .requiredOption(
    '--properties <json>',
    'JSON object of customer properties, e.g. \'{"first_name":"Jane"}\'',
  )
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

        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachCustomersService(options.project, apiConfig);
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
  .requiredOption('--project <project>', 'Bloomreach project token (UUID)')
  .requiredOption('--customer-id <customerId>', 'Customer identifier value')
  .requiredOption(
    '--properties <json>',
    'JSON object of customer properties to update, e.g. \'{"tier":"gold"}\'',
  )
  .option(
    '--id-type <idType>',
    'Type of the customer identifier: registered (default), cookie, or email',
    'registered',
  )
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

        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachCustomersService(options.project, apiConfig);
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
  .description(
    'Prepare deletion (anonymization) of a customer profile (two-phase commit).\n' +
      'Bloomreach does not hard-delete customers; this anonymizes PII via the GDPR API.',
  )
  .requiredOption('--project <project>', 'Bloomreach project token (UUID)')
  .requiredOption('--customer-id <customerId>', 'Customer identifier value')
  .option(
    '--id-type <idType>',
    'Type of the customer identifier: registered (default), cookie, or email',
    'registered',
  )
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
        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachCustomersService(options.project, apiConfig);
        const result = service.prepareDeleteCustomer({
          project: options.project,
          customerId: options.customerId,
          idType: options.idType,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Customer deletion (anonymization) prepared.');
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
  .action(async (options: { project: string; limit: string; offset: string; json?: boolean }) => {
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
  });

vouchers
  .command('view-status')
  .description('View redemption status of vouchers in a pool')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--pool-id <id>', 'Voucher pool ID')
  .option('--voucher-code <code>', 'Specific voucher code to check')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; poolId: string; voucherCode?: string; json?: boolean }) => {
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
        const voucherCodes = options.codes ? (JSON.parse(options.codes) as string[]) : undefined;
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
          console.log(
            `  Vouchers: ${result.preview.voucherCount} (${result.preview.voucherSource})`,
          );
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
        const voucherCodes = options.codes ? (JSON.parse(options.codes) as string[]) : undefined;
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
          console.log(
            `  Vouchers: ${result.preview.voucherCount} (${result.preview.voucherSource})`,
          );
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
  .action(async (options: { project: string; poolId: string; note?: string; json?: boolean }) => {
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
  });

const assets = program
  .command('assets')
  .description('Manage Asset Manager templates, snippets, and files');

const assetEmailTemplates = assets.command('email-templates').description('Manage email templates');

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

const assetCustomRows = assets.command('custom-rows').description('Manage custom rows');

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
  .action(async (options: { project: string; fileId: string; note?: string; json?: boolean }) => {
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
  });

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
  .requiredOption(
    '--aggregation-type <type>',
    'Aggregation type (sum, count, average, min, max, unique)',
  )
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
  .option(
    '--aggregation-type <type>',
    'New aggregation type (sum, count, average, min, max, unique)',
  )
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
  .requiredOption(
    '--data-selection <json>',
    'JSON object: {"attributes":["a"],"events":["b"],"segments":["c"]}',
  )
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
  .requiredOption(
    '--schedule <json>',
    'JSON object: {"frequency":"weekly","daysOfWeek":[1,3,5],"time":"08:00","timezone":"UTC"}',
  )
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      exportId: string;
      schedule: string;
      note?: string;
      json?: boolean;
    }) => {
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
  .action(async (options: { project: string; type?: string; status?: string; json?: boolean }) => {
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
  });

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

const initiatives = program
  .command('initiatives')
  .description('Manage Bloomreach Engagement initiatives');

initiatives
  .command('list')
  .description('List all initiatives in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachInitiativesService(options.project);
      const result = await service.listInitiatives({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No initiatives found.');
          return;
        }
        for (const initiative of result) {
          console.log(`  ${initiative.name}`);
          console.log(`    Status: ${initiative.status}`);
          console.log(`    Tags:   ${initiative.tags.join(', ')}`);
          console.log(`    Items:  ${initiative.itemCount}`);
          console.log(`    ID:     ${initiative.id}`);
          console.log(`    URL:    ${initiative.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

initiatives
  .command('filter')
  .description('Filter initiatives by date, tags, owner, or status')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--start-date <date>', 'Filter by start date')
  .option('--end-date <date>', 'Filter by end date')
  .option('--tags <csv>', 'Filter by tags (comma-separated)')
  .option('--owner <owner>', 'Filter by owner')
  .option('--status <status>', 'Filter by status (active, archived, draft)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      startDate?: string;
      endDate?: string;
      tags?: string;
      owner?: string;
      status?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachInitiativesService(options.project);
        const input: {
          project: string;
          startDate?: string;
          endDate?: string;
          tags?: string[];
          owner?: string;
          status?: string;
        } = {
          project: options.project,
        };
        if (options.startDate) input.startDate = options.startDate;
        if (options.endDate) input.endDate = options.endDate;
        if (options.tags) input.tags = options.tags.split(',').map((tag) => tag.trim());
        if (options.owner) input.owner = options.owner;
        if (options.status) input.status = options.status;

        const result = await service.filterInitiatives(input);

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No initiatives found.');
            return;
          }
          for (const initiative of result) {
            console.log(`  ${initiative.name}`);
            console.log(`    Status: ${initiative.status}`);
            console.log(`    Tags:   ${initiative.tags.join(', ')}`);
            console.log(`    Items:  ${initiative.itemCount}`);
            console.log(`    ID:     ${initiative.id}`);
            console.log(`    URL:    ${initiative.url}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

initiatives
  .command('view')
  .description('View details of a specific initiative')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--initiative-id <id>', 'Initiative ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; initiativeId: string; json?: boolean }) => {
    try {
      const service = new BloomreachInitiativesService(options.project);
      const result = await service.viewInitiative({
        project: options.project,
        initiativeId: options.initiativeId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`  ${result.name}`);
        console.log(`    Status:      ${result.status}`);
        if (result.description) {
          console.log(`    Description: ${result.description}`);
        }
        console.log(`    Tags:        ${result.tags.join(', ')}`);
        if (result.items.length === 0) {
          console.log('    Items:       none');
        } else {
          console.log('    Items:');
          for (const item of result.items) {
            console.log(`      - ${item.type}: ${item.name} (${item.id})`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

initiatives
  .command('create')
  .description('Prepare creation of a new initiative (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Initiative name')
  .option('--description <description>', 'Initiative description')
  .option('--tags <csv>', 'Tags (comma-separated)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      description?: string;
      tags?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachInitiativesService(options.project);
        const result = service.prepareCreateInitiative({
          project: options.project,
          name: options.name,
          description: options.description,
          tags: options.tags ? options.tags.split(',').map((tag) => tag.trim()) : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Initiative creation prepared.');
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

initiatives
  .command('import')
  .description('Prepare importing initiative configuration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--configuration <json>', 'JSON configuration object')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; configuration: string; note?: string; json?: boolean }) => {
      try {
        const configuration = JSON.parse(options.configuration) as Record<string, unknown>;

        const service = new BloomreachInitiativesService(options.project);
        const result = service.prepareImportInitiative({
          project: options.project,
          configuration,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Initiative import prepared.');
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
    },
  );

initiatives
  .command('add-items')
  .description('Prepare adding items to an initiative (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--initiative-id <id>', 'Initiative ID')
  .requiredOption('--items <json>', 'JSON array of item references [{id, type}]')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      initiativeId: string;
      items: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const items = JSON.parse(options.items) as InitiativeItemReference[];

        const service = new BloomreachInitiativesService(options.project);
        const result = service.prepareAddItems({
          project: options.project,
          initiativeId: options.initiativeId,
          items,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Initiative add-items prepared.');
          console.log(`  Initiative: ${options.initiativeId}`);
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

initiatives
  .command('archive')
  .description('Prepare archiving an initiative (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--initiative-id <id>', 'Initiative ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; initiativeId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachInitiativesService(options.project);
        const result = service.prepareArchiveInitiative({
          project: options.project,
          initiativeId: options.initiativeId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Initiative archive prepared.');
          console.log(`  Initiative: ${options.initiativeId}`);
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

const projectSettings = program
  .command('project-settings')
  .description('Manage Bloomreach Engagement project settings');

projectSettings
  .command('view')
  .description('View general project settings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = await service.viewProjectSettings({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Name:          ${result.name}`);
        console.log(`Project type:  ${result.projectType}`);
        console.log(`Project token: ${result.projectToken}`);
        console.log(`Slug:          ${result.slug}`);
        if (result.baseUrl) {
          console.log(`Base URL:      ${result.baseUrl}`);
        }
        if (result.customUrl) {
          console.log(`Custom URL:    ${result.customUrl}`);
        }
        if (result.calendarType) {
          console.log(`Calendar type: ${result.calendarType}`);
        }
        console.log(`URL:           ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

projectSettings
  .command('token')
  .description('View the project token')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = await service.viewProjectToken({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Project token: ${result.projectToken}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

projectSettings
  .command('terms')
  .description('View terms and conditions')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = await service.viewTermsAndConditions({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Accepted: ${result.accepted}`);
        if (result.acceptedAt) {
          console.log(`Accepted at: ${result.acceptedAt}`);
        }
        if (result.version) {
          console.log(`Version: ${result.version}`);
        }
        if (result.dpaAccepted !== undefined) {
          console.log(`DPA accepted: ${result.dpaAccepted}`);
        }
        console.log(`URL: ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

projectSettings
  .command('update-name')
  .description('Prepare project name update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Project name')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; name: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = service.prepareUpdateProjectName({
        project: options.project,
        name: options.name,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Project name update prepared.');
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
  });

projectSettings
  .command('update-url')
  .description('Prepare custom URL update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--custom-url <customUrl>', 'Custom URL')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; customUrl: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachProjectSettingsService(options.project);
        const result = service.prepareUpdateCustomUrl({
          project: options.project,
          customUrl: options.customUrl,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Project custom URL update prepared.');
          console.log(`  Custom URL: ${options.customUrl}`);
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

projectSettings
  .command('update-terms')
  .description('Prepare terms and conditions update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--accepted <accepted>', 'Whether terms are accepted (true or false)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; accepted: string; note?: string; json?: boolean }) => {
    try {
      if (options.accepted !== 'true' && options.accepted !== 'false') {
        throw new Error('Option --accepted must be "true" or "false".');
      }

      const service = new BloomreachProjectSettingsService(options.project);
      const result = service.prepareUpdateTermsAndConditions({
        project: options.project,
        accepted: options.accepted === 'true',
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Project terms and conditions update prepared.');
        console.log(`  Accepted: ${options.accepted}`);
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
  });

const projectSettingsTags = projectSettings.command('tags').description('Manage custom tags');

projectSettingsTags
  .command('list')
  .description('List custom tags')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = await service.listCustomTags({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No custom tags found.');
          return;
        }
        for (const tag of result) {
          console.log(`  ${tag.name}`);
          console.log(`    ID:    ${tag.id}`);
          if (tag.color) {
            console.log(`    Color: ${tag.color}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

projectSettingsTags
  .command('create')
  .description('Prepare custom tag creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Tag name')
  .option('--color <color>', 'Tag color in hex format (e.g. #FF5733)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      color?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachProjectSettingsService(options.project);
        const result = service.prepareCreateCustomTag({
          project: options.project,
          name: options.name,
          color: options.color,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Custom tag creation prepared.');
          console.log(`  Name:    ${options.name}`);
          if (options.color) {
            console.log(`  Color:   ${options.color}`);
          }
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

projectSettingsTags
  .command('update')
  .description('Prepare custom tag update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID')
  .option('--name <name>', 'Tag name')
  .option('--color <color>', 'Tag color in hex format (e.g. #FF5733)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      tagId: string;
      name?: string;
      color?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachProjectSettingsService(options.project);
        const result = service.prepareUpdateCustomTag({
          project: options.project,
          tagId: options.tagId,
          name: options.name,
          color: options.color,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Custom tag update prepared.');
          console.log(`  Tag ID:  ${options.tagId}`);
          if (options.name) {
            console.log(`  Name:    ${options.name}`);
          }
          if (options.color) {
            console.log(`  Color:   ${options.color}`);
          }
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

projectSettingsTags
  .command('delete')
  .description('Prepare custom tag deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tag-id <id>', 'Tag ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tagId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = service.prepareDeleteCustomTag({
        project: options.project,
        tagId: options.tagId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Custom tag deletion prepared.');
        console.log(`  Tag ID:  ${options.tagId}`);
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

const projectSettingsVariables = projectSettings
  .command('variables')
  .description('Manage project variables');

projectSettingsVariables
  .command('list')
  .description('List project variables')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachProjectSettingsService(options.project);
      const result = await service.listProjectVariables({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No project variables found.');
          return;
        }
        for (const variable of result) {
          console.log(`  ${variable.name}`);
          console.log(`    Value: ${variable.value}`);
          if (variable.description) {
            console.log(`    Description: ${variable.description}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

projectSettingsVariables
  .command('create')
  .description('Prepare variable creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Variable name')
  .requiredOption('--value <value>', 'Variable value')
  .option('--description <description>', 'Variable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      value: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachProjectSettingsService(options.project);
        const result = service.prepareCreateProjectVariable({
          project: options.project,
          name: options.name,
          value: options.value,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Project variable creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Value:   ${options.value}`);
          if (options.description) {
            console.log(`  Description: ${options.description}`);
          }
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

projectSettingsVariables
  .command('update')
  .description('Prepare variable update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--variable-name <name>', 'Variable name')
  .option('--value <value>', 'Variable value')
  .option('--description <description>', 'Variable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      variableName: string;
      value?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachProjectSettingsService(options.project);
        const result = service.prepareUpdateProjectVariable({
          project: options.project,
          variableName: options.variableName,
          value: options.value,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Project variable update prepared.');
          console.log(`  Variable: ${options.variableName}`);
          if (options.value !== undefined) {
            console.log(`  Value:    ${options.value}`);
          }
          if (options.description !== undefined) {
            console.log(`  Description: ${options.description}`);
          }
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

projectSettingsVariables
  .command('delete')
  .description('Prepare variable deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--variable-name <name>', 'Variable name')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; variableName: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachProjectSettingsService(options.project);
        const result = service.prepareDeleteProjectVariable({
          project: options.project,
          variableName: options.variableName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Project variable deletion prepared.');
          console.log(`  Variable: ${options.variableName}`);
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

const campaignSettings = program
  .command('campaign-settings')
  .description('Manage Bloomreach campaign settings');

campaignSettings
  .command('defaults')
  .description('View campaign defaults')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.viewCampaignDefaults({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Campaign defaults');
        if (result.defaultSenderName) {
          console.log(`  Default sender name:  ${result.defaultSenderName}`);
        }
        if (result.defaultSenderEmail) {
          console.log(`  Default sender email: ${result.defaultSenderEmail}`);
        }
        if (result.defaultReplyToEmail) {
          console.log(`  Default reply-to:     ${result.defaultReplyToEmail}`);
        }
        if (result.defaultUtmSource) {
          console.log(`  Default UTM source:   ${result.defaultUtmSource}`);
        }
        if (result.defaultUtmMedium) {
          console.log(`  Default UTM medium:   ${result.defaultUtmMedium}`);
        }
        if (result.defaultUtmCampaign) {
          console.log(`  Default UTM campaign: ${result.defaultUtmCampaign}`);
        }
        console.log(`  URL:                  ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettings
  .command('update-defaults')
  .description('Prepare campaign defaults update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--default-sender-name <name>', 'Default sender name')
  .option('--default-sender-email <email>', 'Default sender email address')
  .option('--default-reply-to-email <email>', 'Default reply-to email address')
  .option('--default-utm-source <source>', 'Default UTM source parameter')
  .option('--default-utm-medium <medium>', 'Default UTM medium parameter')
  .option('--default-utm-campaign <campaign>', 'Default UTM campaign parameter')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      defaultSenderName?: string;
      defaultSenderEmail?: string;
      defaultReplyToEmail?: string;
      defaultUtmSource?: string;
      defaultUtmMedium?: string;
      defaultUtmCampaign?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateCampaignDefaults({
          project: options.project,
          defaultSenderName: options.defaultSenderName,
          defaultSenderEmail: options.defaultSenderEmail,
          defaultReplyToEmail: options.defaultReplyToEmail,
          defaultUtmSource: options.defaultUtmSource,
          defaultUtmMedium: options.defaultUtmMedium,
          defaultUtmCampaign: options.defaultUtmCampaign,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Campaign defaults update prepared.');
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

const campaignSettingsTimezones = campaignSettings
  .command('timezones')
  .description('Manage configured timezones');

campaignSettingsTimezones
  .command('list')
  .description('List configured timezones')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listTimezones({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No timezones found.');
          return;
        }
        for (const timezone of result) {
          console.log(`  ${timezone.name}`);
          console.log(`    ID: ${timezone.id}`);
          if (timezone.utcOffset) {
            console.log(`    UTC Offset: ${timezone.utcOffset}`);
          }
          if (timezone.isDefault) {
            console.log('    Default: yes');
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsTimezones
  .command('create')
  .description('Prepare timezone creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Timezone name (IANA format, e.g. "Europe/Prague")')
  .option('--utc-offset <offset>', 'UTC offset (e.g. "+01:00")')
  .option('--is-default', 'Set as default timezone')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      utcOffset?: string;
      isDefault?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateTimezone({
          project: options.project,
          name: options.name,
          utcOffset: options.utcOffset,
          isDefault: options.isDefault,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Timezone creation prepared.');
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

campaignSettingsTimezones
  .command('update')
  .description('Prepare timezone update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--timezone-id <id>', 'Timezone ID')
  .option('--name <name>', 'Timezone name (IANA format, e.g. "Europe/Prague")')
  .option('--utc-offset <offset>', 'UTC offset (e.g. "+01:00")')
  .option('--is-default', 'Set as default timezone')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      timezoneId: string;
      name?: string;
      utcOffset?: string;
      isDefault?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateTimezone({
          project: options.project,
          timezoneId: options.timezoneId,
          name: options.name,
          utcOffset: options.utcOffset,
          isDefault: options.isDefault,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Timezone update prepared.');
          console.log(`  Timezone ID: ${options.timezoneId}`);
          if (options.name) {
            console.log(`  Name:        ${options.name}`);
          }
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

campaignSettingsTimezones
  .command('delete')
  .description('Prepare timezone deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--timezone-id <id>', 'Timezone ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; timezoneId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareDeleteTimezone({
          project: options.project,
          timezoneId: options.timezoneId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Timezone deletion prepared.');
          console.log(`  Timezone ID: ${options.timezoneId}`);
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

const campaignSettingsLanguages = campaignSettings
  .command('languages')
  .description('Manage configured languages');

campaignSettingsLanguages
  .command('list')
  .description('List configured languages')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listLanguages({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No languages found.');
          return;
        }
        for (const language of result) {
          console.log(`  ${language.name}`);
          console.log(`    Code: ${language.code}`);
          if (language.isDefault) {
            console.log('    Default: yes');
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsLanguages
  .command('create')
  .description('Prepare language creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--code <code>', 'Language code (ISO 639-1, e.g. "en")')
  .requiredOption('--name <name>', 'Language name')
  .option('--is-default', 'Set as default language')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      code: string;
      name: string;
      isDefault?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateLanguage({
          project: options.project,
          code: options.code,
          name: options.name,
          isDefault: options.isDefault,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Language creation prepared.');
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

campaignSettingsLanguages
  .command('update')
  .description('Prepare language update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--language-code <code>', 'Language code to update')
  .option('--code <code>', 'Updated language code (ISO 639-1, e.g. "en")')
  .option('--name <name>', 'Updated language name')
  .option('--is-default', 'Set as default language')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      languageCode: string;
      code?: string;
      name?: string;
      isDefault?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateLanguage({
          project: options.project,
          languageCode: options.languageCode,
          code: options.code,
          name: options.name,
          isDefault: options.isDefault,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Language update prepared.');
          console.log(`  Language: ${options.languageCode}`);
          if (options.name) {
            console.log(`  Name:     ${options.name}`);
          }
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

campaignSettingsLanguages
  .command('delete')
  .description('Prepare language deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--language-code <code>', 'Language code')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; languageCode: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareDeleteLanguage({
          project: options.project,
          languageCode: options.languageCode,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Language deletion prepared.');
          console.log(`  Language: ${options.languageCode}`);
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

const campaignSettingsFonts = campaignSettings
  .command('fonts')
  .description('Manage configured fonts');

campaignSettingsFonts
  .command('list')
  .description('List configured fonts')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listFonts({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No fonts found.');
          return;
        }
        for (const font of result) {
          console.log(`  ${font.name}`);
          console.log(`    ID: ${font.id}`);
          console.log(`    Type: ${font.type}`);
          if (font.fileUrl) {
            console.log(`    File URL: ${font.fileUrl}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsFonts
  .command('create')
  .description('Prepare font creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Font name')
  .requiredOption('--type <type>', 'Font type')
  .option('--file-url <url>', 'Font file URL')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      fileUrl?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateFont({
          project: options.project,
          name: options.name,
          type: options.type,
          fileUrl: options.fileUrl,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Font creation prepared.');
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

campaignSettingsFonts
  .command('update')
  .description('Prepare font update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--font-id <id>', 'Font ID')
  .option('--name <name>', 'Updated font name')
  .option('--type <type>', 'Updated font type')
  .option('--file-url <url>', 'Updated font file URL')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      fontId: string;
      name?: string;
      type?: string;
      fileUrl?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateFont({
          project: options.project,
          fontId: options.fontId,
          name: options.name,
          type: options.type,
          fileUrl: options.fileUrl,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Font update prepared.');
          console.log(`  Font ID: ${options.fontId}`);
          if (options.name) {
            console.log(`  Name:    ${options.name}`);
          }
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

campaignSettingsFonts
  .command('delete')
  .description('Prepare font deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--font-id <id>', 'Font ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; fontId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = service.prepareDeleteFont({
        project: options.project,
        fontId: options.fontId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Font deletion prepared.');
        console.log(`  Font ID: ${options.fontId}`);
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

const campaignSettingsThroughput = campaignSettings
  .command('throughput')
  .description('Manage throughput policies');

campaignSettingsThroughput
  .command('list')
  .description('List throughput policies')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listThroughputPolicies({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No throughput policies found.');
          return;
        }
        for (const policy of result) {
          console.log(`  ${policy.name}`);
          console.log(`    ID: ${policy.id}`);
          if (policy.channel) {
            console.log(`    Channel: ${policy.channel}`);
          }
          if (policy.maxRate !== undefined) {
            console.log(`    Max rate: ${policy.maxRate}`);
          }
          if (policy.periodSeconds !== undefined) {
            console.log(`    Period seconds: ${policy.periodSeconds}`);
          }
          if (policy.description) {
            console.log(`    Description: ${policy.description}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsThroughput
  .command('create')
  .description('Prepare throughput policy creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Policy name')
  .option('--channel <channel>', 'Channel (email, sms, push, etc.)')
  .option('--max-rate <rate>', 'Maximum send rate per period')
  .option('--period-seconds <seconds>', 'Rate limit period in seconds')
  .option('--description <description>', 'Human-readable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      channel?: string;
      maxRate?: string;
      periodSeconds?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const maxRate = options.maxRate !== undefined ? parseInt(options.maxRate, 10) : undefined;
        const periodSeconds =
          options.periodSeconds !== undefined ? parseInt(options.periodSeconds, 10) : undefined;

        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateThroughputPolicy({
          project: options.project,
          name: options.name,
          channel: options.channel,
          maxRate,
          periodSeconds,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Throughput policy creation prepared.');
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

campaignSettingsThroughput
  .command('update')
  .description('Prepare throughput policy update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--policy-id <id>', 'Policy ID')
  .option('--name <name>', 'Updated policy name')
  .option('--channel <channel>', 'Updated channel')
  .option('--max-rate <rate>', 'Updated maximum send rate per period')
  .option('--period-seconds <seconds>', 'Updated rate limit period in seconds')
  .option('--description <description>', 'Updated human-readable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      policyId: string;
      name?: string;
      channel?: string;
      maxRate?: string;
      periodSeconds?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const maxRate = options.maxRate !== undefined ? parseInt(options.maxRate, 10) : undefined;
        const periodSeconds =
          options.periodSeconds !== undefined ? parseInt(options.periodSeconds, 10) : undefined;

        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateThroughputPolicy({
          project: options.project,
          policyId: options.policyId,
          name: options.name,
          channel: options.channel,
          maxRate,
          periodSeconds,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Throughput policy update prepared.');
          console.log(`  Policy ID: ${options.policyId}`);
          if (options.name) {
            console.log(`  Name:      ${options.name}`);
          }
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

campaignSettingsThroughput
  .command('delete')
  .description('Prepare throughput policy deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--policy-id <id>', 'Policy ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; policyId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = service.prepareDeleteThroughputPolicy({
        project: options.project,
        policyId: options.policyId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Throughput policy deletion prepared.');
        console.log(`  Policy ID: ${options.policyId}`);
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
  });

const campaignSettingsFrequency = campaignSettings
  .command('frequency')
  .description('Manage frequency policies');

campaignSettingsFrequency
  .command('list')
  .description('List frequency policies')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listFrequencyPolicies({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No frequency policies found.');
          return;
        }
        for (const policy of result) {
          console.log(`  ${policy.name}`);
          console.log(`    ID: ${policy.id}`);
          if (policy.policyType) {
            console.log(`    Policy type: ${policy.policyType}`);
          }
          if (policy.maxSends !== undefined) {
            console.log(`    Max sends: ${policy.maxSends}`);
          }
          if (policy.windowHours !== undefined) {
            console.log(`    Window hours: ${policy.windowHours}`);
          }
          if (policy.channels && policy.channels.length > 0) {
            console.log(`    Channels: ${policy.channels.join(', ')}`);
          }
          if (policy.description) {
            console.log(`    Description: ${policy.description}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsFrequency
  .command('create')
  .description('Prepare frequency policy creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Policy name')
  .option('--policy-type <type>', 'Policy type (global or per-campaign)')
  .option('--max-sends <count>', 'Maximum number of sends allowed')
  .option('--window-hours <hours>', 'Frequency window in hours')
  .option('--channels <channels>', 'Comma-separated channels (email,sms,push)')
  .option('--description <description>', 'Human-readable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      policyType?: string;
      maxSends?: string;
      windowHours?: string;
      channels?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const maxSends =
          options.maxSends !== undefined ? parseInt(options.maxSends, 10) : undefined;
        const windowHours =
          options.windowHours !== undefined ? parseInt(options.windowHours, 10) : undefined;
        const channels =
          options.channels !== undefined
            ? options.channels
                .split(',')
                .map((channel) => channel.trim())
                .filter((channel) => channel.length > 0)
            : undefined;

        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateFrequencyPolicy({
          project: options.project,
          name: options.name,
          policyType: options.policyType,
          maxSends,
          windowHours,
          channels,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Frequency policy creation prepared.');
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

campaignSettingsFrequency
  .command('update')
  .description('Prepare frequency policy update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--policy-id <id>', 'Policy ID')
  .option('--name <name>', 'Updated policy name')
  .option('--policy-type <type>', 'Updated policy type')
  .option('--max-sends <count>', 'Updated maximum sends')
  .option('--window-hours <hours>', 'Updated frequency window in hours')
  .option('--channels <channels>', 'Updated comma-separated channels')
  .option('--description <description>', 'Updated human-readable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      policyId: string;
      name?: string;
      policyType?: string;
      maxSends?: string;
      windowHours?: string;
      channels?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const maxSends =
          options.maxSends !== undefined ? parseInt(options.maxSends, 10) : undefined;
        const windowHours =
          options.windowHours !== undefined ? parseInt(options.windowHours, 10) : undefined;
        const channels =
          options.channels !== undefined
            ? options.channels
                .split(',')
                .map((channel) => channel.trim())
                .filter((channel) => channel.length > 0)
            : undefined;

        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateFrequencyPolicy({
          project: options.project,
          policyId: options.policyId,
          name: options.name,
          policyType: options.policyType,
          maxSends,
          windowHours,
          channels,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Frequency policy update prepared.');
          console.log(`  Policy ID: ${options.policyId}`);
          if (options.name) {
            console.log(`  Name:      ${options.name}`);
          }
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

campaignSettingsFrequency
  .command('delete')
  .description('Prepare frequency policy deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--policy-id <id>', 'Policy ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; policyId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = service.prepareDeleteFrequencyPolicy({
        project: options.project,
        policyId: options.policyId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Frequency policy deletion prepared.');
        console.log(`  Policy ID: ${options.policyId}`);
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
  });

const campaignSettingsConsents = campaignSettings
  .command('consents')
  .description('Manage consent categories');

campaignSettingsConsents
  .command('list')
  .description('List consents')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listConsents({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No consents found.');
          return;
        }
        for (const consent of result) {
          console.log(`  ${consent.category}`);
          console.log(`    ID: ${consent.id}`);
          if (consent.description) {
            console.log(`    Description: ${consent.description}`);
          }
          if (consent.consentType) {
            console.log(`    Consent type: ${consent.consentType}`);
          }
          if (consent.legitimateInterest !== undefined) {
            console.log(`    Legitimate interest: ${consent.legitimateInterest}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsConsents
  .command('create')
  .description('Prepare consent creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--category <category>', 'Consent category')
  .option('--description <description>', 'Human-readable description')
  .option('--consent-type <type>', 'Consent type (opt-in or opt-out)')
  .option('--legitimate-interest', 'Mark consent as legitimate interest')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      category: string;
      description?: string;
      consentType?: string;
      legitimateInterest?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateConsent({
          project: options.project,
          category: options.category,
          description: options.description,
          consentType: options.consentType,
          legitimateInterest: options.legitimateInterest,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Consent creation prepared.');
          console.log(`  Name:    ${options.category}`);
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

campaignSettingsConsents
  .command('update')
  .description('Prepare consent update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--consent-id <id>', 'Consent ID')
  .option('--category <category>', 'Updated consent category')
  .option('--description <description>', 'Updated description')
  .option('--consent-type <type>', 'Updated consent type')
  .option('--legitimate-interest', 'Mark consent as legitimate interest')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      consentId: string;
      category?: string;
      description?: string;
      consentType?: string;
      legitimateInterest?: boolean;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateConsent({
          project: options.project,
          consentId: options.consentId,
          category: options.category,
          description: options.description,
          consentType: options.consentType,
          legitimateInterest: options.legitimateInterest,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Consent update prepared.');
          console.log(`  Consent ID: ${options.consentId}`);
          if (options.category) {
            console.log(`  Category:   ${options.category}`);
          }
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

campaignSettingsConsents
  .command('delete')
  .description('Prepare consent deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--consent-id <id>', 'Consent ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; consentId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareDeleteConsent({
          project: options.project,
          consentId: options.consentId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Consent deletion prepared.');
          console.log(`  Consent ID: ${options.consentId}`);
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

const campaignSettingsUrlLists = campaignSettings
  .command('url-lists')
  .description('Manage global URL lists');

campaignSettingsUrlLists
  .command('list')
  .description('List URL lists')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listUrlLists({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No URL lists found.');
          return;
        }
        for (const list of result) {
          console.log(`  ${list.name}`);
          console.log(`    ID: ${list.id}`);
          console.log(`    List type: ${list.listType}`);
          if (list.urls && list.urls.length > 0) {
            console.log(`    URLs: ${list.urls.join(', ')}`);
          }
          if (list.description) {
            console.log(`    Description: ${list.description}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsUrlLists
  .command('create')
  .description('Prepare URL list creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'URL list name')
  .requiredOption('--list-type <type>', 'List type (allowlist or blocklist)')
  .option('--urls <urls>', 'Comma-separated URLs')
  .option('--description <description>', 'Human-readable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      listType: string;
      urls?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const urls =
          options.urls !== undefined
            ? options.urls
                .split(',')
                .map((url) => url.trim())
                .filter((url) => url.length > 0)
            : undefined;

        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreateUrlList({
          project: options.project,
          name: options.name,
          listType: options.listType,
          urls,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('URL list creation prepared.');
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

campaignSettingsUrlLists
  .command('update')
  .description('Prepare URL list update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--url-list-id <id>', 'URL list ID')
  .option('--name <name>', 'Updated URL list name')
  .option('--list-type <type>', 'Updated list type')
  .option('--urls <urls>', 'Updated comma-separated URLs')
  .option('--description <description>', 'Updated description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      urlListId: string;
      name?: string;
      listType?: string;
      urls?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const urls =
          options.urls !== undefined
            ? options.urls
                .split(',')
                .map((url) => url.trim())
                .filter((url) => url.length > 0)
            : undefined;

        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdateUrlList({
          project: options.project,
          urlListId: options.urlListId,
          name: options.name,
          listType: options.listType,
          urls,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('URL list update prepared.');
          console.log(`  URL list ID: ${options.urlListId}`);
          if (options.name) {
            console.log(`  Name:        ${options.name}`);
          }
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

campaignSettingsUrlLists
  .command('delete')
  .description('Prepare URL list deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--url-list-id <id>', 'URL list ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; urlListId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareDeleteUrlList({
          project: options.project,
          urlListId: options.urlListId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('URL list deletion prepared.');
          console.log(`  URL list ID: ${options.urlListId}`);
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

const campaignSettingsPageVariables = campaignSettings
  .command('page-variables')
  .description('Manage page variables');

campaignSettingsPageVariables
  .command('list')
  .description('List page variables')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachCampaignSettingsService(options.project);
      const result = await service.listPageVariables({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No page variables found.');
          return;
        }
        for (const variable of result) {
          console.log(`  ${variable.name}`);
          console.log(`    ID: ${variable.id}`);
          console.log(`    Value: ${variable.value}`);
          if (variable.description) {
            console.log(`    Description: ${variable.description}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

campaignSettingsPageVariables
  .command('create')
  .description('Prepare page variable creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Page variable name')
  .requiredOption('--value <value>', 'Page variable value')
  .option('--description <description>', 'Human-readable description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      value: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareCreatePageVariable({
          project: options.project,
          name: options.name,
          value: options.value,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Page variable creation prepared.');
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

campaignSettingsPageVariables
  .command('update')
  .description('Prepare page variable update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--page-variable-id <id>', 'Page variable ID')
  .option('--name <name>', 'Updated page variable name')
  .option('--value <value>', 'Updated page variable value')
  .option('--description <description>', 'Updated description')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      pageVariableId: string;
      name?: string;
      value?: string;
      description?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareUpdatePageVariable({
          project: options.project,
          pageVariableId: options.pageVariableId,
          name: options.name,
          value: options.value,
          description: options.description,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Page variable update prepared.');
          console.log(`  Page variable ID: ${options.pageVariableId}`);
          if (options.name) {
            console.log(`  Name:             ${options.name}`);
          }
          console.log(`  Token:            ${result.confirmToken}`);
          console.log(`  Expires:          ${new Date(result.expiresAtMs).toISOString()}`);
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

campaignSettingsPageVariables
  .command('delete')
  .description('Prepare page variable deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--page-variable-id <id>', 'Page variable ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; pageVariableId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachCampaignSettingsService(options.project);
        const result = service.prepareDeletePageVariable({
          project: options.project,
          pageVariableId: options.pageVariableId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Page variable deletion prepared.');
          console.log(`  Page variable ID: ${options.pageVariableId}`);
          console.log(`  Token:            ${result.confirmToken}`);
          console.log(`  Expires:          ${new Date(result.expiresAtMs).toISOString()}`);
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

const securitySettings = program
  .command('security-settings')
  .description('Manage Bloomreach security settings (SSH tunnels, 2FA)');

const securitySettingsSshTunnels = securitySettings
  .command('ssh-tunnels')
  .description('Manage SSH tunnel configurations');

securitySettingsSshTunnels
  .command('list')
  .description('List all configured SSH tunnels')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachSecuritySettingsService(options.project);
      const result = await service.listSshTunnels({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No SSH tunnels found.');
          return;
        }
        for (const tunnel of result) {
          console.log(`  ${tunnel.name} (${tunnel.host}:${tunnel.port})`);
          console.log(`    Username: ${tunnel.username}`);
          console.log(`    Status:   ${tunnel.status}`);
          console.log(`    ID:       ${tunnel.id}`);
          console.log(`    URL:      ${tunnel.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

securitySettingsSshTunnels
  .command('view')
  .description('View details of a configured SSH tunnel')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tunnel-id <id>', 'SSH tunnel ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tunnelId: string; json?: boolean }) => {
    try {
      const service = new BloomreachSecuritySettingsService(options.project);
      const result = await service.viewSshTunnel({
        project: options.project,
        tunnelId: options.tunnelId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`SSH Tunnel: ${result.name}`);
        console.log(`  Host:     ${result.host}:${result.port}`);
        console.log(`  Username: ${result.username}`);
        console.log(`  Status:   ${result.status}`);
        console.log(`  ID:       ${result.id}`);
        console.log(`  URL:      ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

securitySettingsSshTunnels
  .command('create')
  .description('Prepare SSH tunnel creation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'SSH tunnel name')
  .requiredOption('--host <host>', 'SSH tunnel host')
  .requiredOption('--port <port>', 'SSH tunnel port')
  .requiredOption('--username <username>', 'SSH tunnel username')
  .option('--password <password>', 'SSH tunnel password')
  .option('--host-key <key>', 'SSH host key fingerprint')
  .option('--database-type <type>', 'Database type for tunnel usage')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      host: string;
      port: string;
      username: string;
      password?: string;
      hostKey?: string;
      databaseType?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSecuritySettingsService(options.project);
        const result = service.prepareCreateSshTunnel({
          project: options.project,
          name: options.name,
          host: options.host,
          port: parseInt(options.port, 10),
          username: options.username,
          password: options.password,
          hostKey: options.hostKey,
          databaseType: options.databaseType,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('SSH tunnel creation prepared.');
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

securitySettingsSshTunnels
  .command('delete')
  .description('Prepare SSH tunnel deletion (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--tunnel-id <id>', 'SSH tunnel ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; tunnelId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachSecuritySettingsService(options.project);
      const result = service.prepareDeleteSshTunnel({
        project: options.project,
        tunnelId: options.tunnelId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('SSH tunnel deletion prepared.');
        console.log(`  Tunnel ID: ${options.tunnelId}`);
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
  });

const securitySettingsTwoStep = securitySettings
  .command('two-step')
  .description('Manage project two-step verification settings');

securitySettingsTwoStep
  .command('view')
  .description('View two-step verification settings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachSecuritySettingsService(options.project);
      const result = await service.viewTwoStepVerification({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Two-step verification (${options.project})`);
        console.log(`  Enabled:  ${result.enabled}`);
        console.log(`  Enforced: ${result.enforced ?? false}`);
        console.log(`  URL:      ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

securitySettingsTwoStep
  .command('enable')
  .description('Prepare enabling two-step verification (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachSecuritySettingsService(options.project);
      const result = service.prepareEnableTwoStep({
        project: options.project,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Enable two-step verification prepared.');
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

securitySettingsTwoStep
  .command('disable')
  .description('Prepare disabling two-step verification (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachSecuritySettingsService(options.project);
      const result = service.prepareDisableTwoStep({
        project: options.project,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('Disable two-step verification prepared.');
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

const evaluationSettings = program
  .command('evaluation-settings')
  .description('Manage Bloomreach evaluation settings');

const evaluationSettingsRevenueAttribution = evaluationSettings
  .command('revenue-attribution')
  .description('Manage revenue attribution settings');

evaluationSettingsRevenueAttribution
  .command('view')
  .description('View revenue attribution settings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachEvaluationSettingsService(options.project);
      const result = await service.viewRevenueAttribution({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Revenue attribution (${options.project})`);
        console.log(`  Model:    ${result.model}`);
        console.log(`  Window:   ${result.attributionWindow ?? 'n/a'}`);
        console.log(`  Channels: ${result.channels?.join(', ') ?? 'n/a'}`);
        console.log(`  URL:      ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

evaluationSettingsRevenueAttribution
  .command('configure')
  .description('Prepare revenue attribution configuration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--model <model>', 'Revenue attribution model')
  .option('--attribution-window <days>', 'Attribution window in days')
  .option('--channels <csv>', 'Comma-separated channels list')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      model: string;
      attributionWindow?: string;
      channels?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEvaluationSettingsService(options.project);
        const result = service.prepareConfigureRevenueAttribution({
          project: options.project,
          model: options.model,
          attributionWindow: options.attributionWindow
            ? parseInt(options.attributionWindow, 10)
            : undefined,
          channels: options.channels
            ? options.channels.split(',').map((channel) => channel.trim())
            : undefined,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Revenue attribution configuration prepared.');
          console.log(`  Model:   ${options.model}`);
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

const evaluationSettingsCurrency = evaluationSettings
  .command('currency')
  .description('Manage project currency settings');

evaluationSettingsCurrency
  .command('view')
  .description('View currency settings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachEvaluationSettingsService(options.project);
      const result = await service.viewCurrency({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Currency settings (${options.project})`);
        console.log(`  Code:   ${result.currencyCode}`);
        console.log(`  Symbol: ${result.currencySymbol ?? 'n/a'}`);
        console.log(`  URL:    ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

evaluationSettingsCurrency
  .command('set')
  .description('Prepare currency update (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--currency-code <code>', 'ISO 4217 currency code')
  .option('--currency-symbol <symbol>', 'Currency symbol')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      currencyCode: string;
      currencySymbol?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEvaluationSettingsService(options.project);
        const result = service.prepareSetCurrency({
          project: options.project,
          currencyCode: options.currencyCode,
          currencySymbol: options.currencySymbol,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Currency update prepared.');
          console.log(`  Currency: ${options.currencyCode}`);
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

const evaluationSettingsDashboards = evaluationSettings
  .command('dashboards')
  .description('Manage evaluation dashboard settings');

evaluationSettingsDashboards
  .command('view')
  .description('View evaluation dashboard settings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachEvaluationSettingsService(options.project);
      const result = await service.viewEvaluationDashboards({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Evaluation dashboards (${options.project})`);
        console.log(`  URL: ${result.url}`);
        for (const dashboard of result.dashboards) {
          console.log(`  - ${dashboard.id} (${dashboard.name}) enabled=${dashboard.enabled ?? false}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

evaluationSettingsDashboards
  .command('configure')
  .description('Prepare evaluation dashboards configuration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--dashboards <json>', 'JSON dashboard config array [{id, enabled}]')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      dashboards: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEvaluationSettingsService(options.project);
        const dashboards = JSON.parse(options.dashboards) as { id: string; enabled: boolean }[];
        const result = service.prepareConfigureEvaluationDashboards({
          project: options.project,
          dashboards,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Evaluation dashboards configuration prepared.');
          console.log(`  Dashboards: ${dashboards.length}`);
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

const evaluationSettingsVoucherMapping = evaluationSettings
  .command('voucher-mapping')
  .description('Manage voucher mapping settings');

evaluationSettingsVoucherMapping
  .command('view')
  .description('View voucher mapping settings')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachEvaluationSettingsService(options.project);
      const result = await service.viewVoucherMapping({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Voucher mapping (${options.project})`);
        console.log(`  Mapping field: ${result.mappingField ?? 'n/a'}`);
        console.log(`  Mapping type:  ${result.mappingType ?? 'n/a'}`);
        console.log(`  URL:           ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

evaluationSettingsVoucherMapping
  .command('configure')
  .description('Prepare voucher mapping configuration (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--mapping-field <field>', 'Voucher mapping field')
  .option('--mapping-type <type>', 'Voucher mapping type')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      mappingField: string;
      mappingType?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachEvaluationSettingsService(options.project);
        const result = service.prepareConfigureVoucherMapping({
          project: options.project,
          mappingField: options.mappingField,
          mappingType: options.mappingType,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Voucher mapping configuration prepared.');
          console.log(`  Field:   ${options.mappingField}`);
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

const weblayers = program
  .command('weblayers')
  .description('Manage Bloomreach Engagement weblayers');

weblayers
  .command('list')
  .description('List all weblayers in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status (active, inactive, draft, archived)')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; status?: string; json?: boolean }) => {
    try {
      const service = new BloomreachWeblayersService(options.project);
      const input: { project: string; status?: string } = { project: options.project };
      if (options.status) input.status = options.status;

      const result = await service.listWeblayers(input);

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No weblayers found.');
          return;
        }
        for (const weblayer of result) {
          console.log(`  ${weblayer.name}`);
          console.log(`    Status: ${weblayer.status}`);
          if (weblayer.displayType) {
            console.log(`    Type:   ${weblayer.displayType}`);
          }
          console.log(`    ID:     ${weblayer.id}`);
          console.log(`    URL:    ${weblayer.url}`);
        }
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

weblayers
  .command('view-performance')
  .description('View impressions, clicks and conversions for a weblayer')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--weblayer-id <id>', 'Weblayer ID')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      weblayerId: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachWeblayersService(options.project);
        const result = await service.viewWeblayerPerformance({
          project: options.project,
          weblayerId: options.weblayerId,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Weblayer Performance: ${result.weblayerId}`);
          console.log(`  Impressions:  ${result.impressions}`);
          console.log(`  Clicks:       ${result.clicks}`);
          console.log(`  Conversions:  ${result.conversions}`);
          console.log(`  CTR:          ${(result.clickThroughRate * 100).toFixed(1)}%`);
          console.log(`  Conv. Rate:   ${(result.conversionRate * 100).toFixed(1)}%`);
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

weblayers
  .command('create')
  .description('Prepare creation of a new weblayer (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Weblayer name')
  .option('--display-type <type>', 'Display type (overlay, banner, popup, slide_in)')
  .option('--template-id <id>', 'Template ID to use')
  .option('--audience <audience>', 'Audience segment identifier')
  .option('--page-url-filter <filter>', 'Page URL filter pattern')
  .option('--delay-ms <ms>', 'Display delay in milliseconds')
  .option('--scroll-percentage <n>', 'Show after scroll percentage (0-100)')
  .option('--frequency-cap <n>', 'Max impressions per visitor')
  .option('--ab-variants <n>', 'Number of A/B test variants')
  .option('--ab-split <percent>', 'A/B test split percentage')
  .option('--ab-winner <criteria>', 'A/B test winner criteria')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      displayType?: string;
      templateId?: string;
      audience?: string;
      pageUrlFilter?: string;
      delayMs?: string;
      scrollPercentage?: string;
      frequencyCap?: string;
      abVariants?: string;
      abSplit?: string;
      abWinner?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let displayConditions: WeblayerDisplayConditions | undefined;
        if (
          options.audience ||
          options.pageUrlFilter ||
          options.delayMs ||
          options.scrollPercentage ||
          options.frequencyCap
        ) {
          displayConditions = {
            audience: options.audience,
            pageUrlFilter: options.pageUrlFilter,
            delayMs: options.delayMs ? parseInt(options.delayMs, 10) : undefined,
            scrollPercentage: options.scrollPercentage
              ? parseInt(options.scrollPercentage, 10)
              : undefined,
            frequencyCap: options.frequencyCap
              ? parseInt(options.frequencyCap, 10)
              : undefined,
          };
        }

        let abTest: WeblayerABTestConfig | undefined;
        if (options.abVariants) {
          abTest = {
            enabled: true,
            variants: parseInt(options.abVariants, 10),
            splitPercentage: options.abSplit ? parseInt(options.abSplit, 10) : undefined,
            winnerCriteria: options.abWinner,
          };
        }

        const service = new BloomreachWeblayersService(options.project);
        const result = service.prepareCreateWeblayer({
          project: options.project,
          name: options.name,
          displayType: options.displayType,
          templateId: options.templateId,
          displayConditions,
          abTest,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Weblayer creation prepared.');
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

weblayers
  .command('start')
  .description('Prepare starting a weblayer (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--weblayer-id <id>', 'Weblayer ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      weblayerId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachWeblayersService(options.project);
        const result = service.prepareStartWeblayer({
          project: options.project,
          weblayerId: options.weblayerId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Weblayer start prepared.');
          console.log(`  Weblayer: ${options.weblayerId}`);
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

weblayers
  .command('stop')
  .description('Prepare stopping a weblayer (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--weblayer-id <id>', 'Weblayer ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      weblayerId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachWeblayersService(options.project);
        const result = service.prepareStopWeblayer({
          project: options.project,
          weblayerId: options.weblayerId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Weblayer stop prepared.');
          console.log(`  Weblayer: ${options.weblayerId}`);
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

weblayers
  .command('clone')
  .description('Prepare cloning a weblayer (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--weblayer-id <id>', 'Weblayer ID to clone')
  .option('--new-name <name>', 'Name for the cloned weblayer')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      weblayerId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachWeblayersService(options.project);
        const result = service.prepareCloneWeblayer({
          project: options.project,
          weblayerId: options.weblayerId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Weblayer clone prepared.');
          console.log(`  Source:   ${options.weblayerId}`);
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

weblayers
  .command('archive')
  .description('Prepare archiving a weblayer (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--weblayer-id <id>', 'Weblayer ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      weblayerId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachWeblayersService(options.project);
        const result = service.prepareArchiveWeblayer({
          project: options.project,
          weblayerId: options.weblayerId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Weblayer archive prepared.');
          console.log(`  Weblayer: ${options.weblayerId}`);
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

const reports = program
  .command('reports')
  .description('Manage Bloomreach Engagement reports');

reports
  .command('list')
  .description(
    'List all reports in the project (note: requires browser automation — not yet available via API)',
  )
  .requiredOption('--project <project>', 'Bloomreach project token (UUID from Settings > Project)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachReportsService(options.project);
        const result = await service.listReports({ project: options.project });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No reports found.');
            return;
          }
          for (const report of result) {
            console.log(`  ${report.name}`);
            console.log(`    Metrics:    ${report.metrics.join(', ')}`);
            console.log(`    Dimensions: ${report.dimensions.join(', ')}`);
            console.log(`    ID:         ${report.id}`);
            console.log(`    URL:        ${report.url}`);
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

reports
  .command('view-results')
  .description('View results of a specific report')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--report-id <id>',
    'Report analysis ID (hex string from Bloomreach UI URL, e.g. "606488856f8cf6f848b20af8")',
  )
  .option('--start-date <date>', 'Start date (ISO-8601)')
  .option('--end-date <date>', 'End date (ISO-8601)')
  .option('--sort-column <column>', 'Column to sort by')
  .option('--sort-order <order>', 'Sort order (asc or desc)')
  .option('--limit <n>', 'Maximum rows to return')
  .option('--format <format>', 'Output format: table (default) or csv', 'table')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      startDate?: string;
      endDate?: string;
      sortColumn?: string;
      sortOrder?: string;
      limit?: string;
      format: string;
      json?: boolean;
    }) => {
      try {
        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachReportsService(options.project, apiConfig);
        const input: {
          project: string;
          reportId: string;
          dateRange?: ReportDateRange;
          sort?: ReportSortConfig;
          limit?: number;
        } = {
          project: options.project,
          reportId: options.reportId,
        };

        if (options.startDate || options.endDate) {
          input.dateRange = {
            startDate: options.startDate,
            endDate: options.endDate,
          };
        }

        if (options.sortColumn && options.sortOrder) {
          input.sort = {
            column: options.sortColumn,
            order: options.sortOrder as 'asc' | 'desc',
          };
        }

        if (options.limit) {
          input.limit = parseInt(options.limit, 10);
        }

        const result = await service.viewReportResults(input);

        if (options.json) {
          printJson(result);
        } else if (options.format === 'csv') {
          console.log(result.columns.join(','));
          for (const row of result.rows) {
            console.log(row.join(','));
          }
        } else {
          console.log(`Report: ${result.reportName}`);
          console.log(`  Columns: ${result.columns.join(', ')}`);
          console.log(`  Rows:    ${result.rows.length} (total: ${result.totalRows})`);
          if (result.dateRange) {
            console.log(`  Date range: ${result.dateRange.startDate ?? '?'} – ${result.dateRange.endDate ?? '?'}`);
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

reports
  .command('create')
  .description('Prepare creation of a new report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Report name')
  .requiredOption('--metrics <csv>', 'Metrics (comma-separated)')
  .option('--dimensions <csv>', 'Dimensions (comma-separated)')
  .option('--start-date <date>', 'Start date (ISO-8601)')
  .option('--end-date <date>', 'End date (ISO-8601)')
  .option('--filters <json>', 'JSON array of filters')
  .option('--sort-column <column>', 'Column to sort by')
  .option('--sort-order <order>', 'Sort order (asc or desc)')
  .option('--grouping <json>', 'JSON array of grouping configs')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      metrics: string;
      dimensions?: string;
      startDate?: string;
      endDate?: string;
      filters?: string;
      sortColumn?: string;
      sortOrder?: string;
      grouping?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachReportsService(options.project);
        const input: {
          project: string;
          name: string;
          metrics: string[];
          dimensions?: string[];
          dateRange?: ReportDateRange;
          filters?: ReportFilter[];
          sort?: ReportSortConfig;
          grouping?: ReportGrouping[];
          operatorNote?: string;
        } = {
          project: options.project,
          name: options.name,
          metrics: options.metrics.split(',').map(m => m.trim()),
        };

        if (options.dimensions) {
          input.dimensions = options.dimensions.split(',').map(d => d.trim());
        }

        if (options.startDate || options.endDate) {
          input.dateRange = {
            startDate: options.startDate,
            endDate: options.endDate,
          };
        }

        if (options.filters) {
          input.filters = JSON.parse(options.filters);
        }

        if (options.sortColumn && options.sortOrder) {
          input.sort = {
            column: options.sortColumn,
            order: options.sortOrder as 'asc' | 'desc',
          };
        }

        if (options.grouping) {
          input.grouping = JSON.parse(options.grouping);
        }

        if (options.note) {
          input.operatorNote = options.note;
        }

        const result = service.prepareCreateReport(input);

        if (options.json) {
          printJson(result);
        } else {
          console.log('Report creation prepared.');
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

reports
  .command('export')
  .description('Prepare export of a report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--report-id <id>',
    'Report analysis ID (hex string from Bloomreach UI URL)',
  )
  .requiredOption('--format <format>', 'Export format (csv or xlsx)')
  .option('--start-date <date>', 'Start date (ISO-8601)')
  .option('--end-date <date>', 'End date (ISO-8601)')
  .option('--filters <json>', 'JSON array of filters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      format: string;
      startDate?: string;
      endDate?: string;
      filters?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachReportsService(options.project);
        const input: {
          project: string;
          reportId: string;
          format: string;
          dateRange?: ReportDateRange;
          filters?: ReportFilter[];
          operatorNote?: string;
        } = {
          project: options.project,
          reportId: options.reportId,
          format: options.format,
        };

        if (options.startDate || options.endDate) {
          input.dateRange = {
            startDate: options.startDate,
            endDate: options.endDate,
          };
        }

        if (options.filters) {
          input.filters = JSON.parse(options.filters);
        }

        if (options.note) {
          input.operatorNote = options.note;
        }

        const result = service.prepareExportReport(input);

        if (options.json) {
          printJson(result);
        } else {
          console.log('Report export prepared.');
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

reports
  .command('clone')
  .description('Prepare cloning of a report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--report-id <id>',
    'Report analysis ID (hex string from Bloomreach UI URL)',
  )
  .option('--new-name <name>', 'Name for the cloned report')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachReportsService(options.project);
        const result = service.prepareCloneReport({
          project: options.project,
          reportId: options.reportId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Report clone prepared.');
          console.log(`  Source:   ${options.reportId}`);
          console.log(`  New name: ${options.newName || '(auto-generated)'}`);
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

reports
  .command('archive')
  .description('Prepare archiving of a report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--report-id <id>',
    'Report analysis ID (hex string from Bloomreach UI URL)',
  )
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachReportsService(options.project);
        const result = service.prepareArchiveReport({
          project: options.project,
          reportId: options.reportId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Report archive prepared.');
          console.log(`  Report: ${options.reportId}`);
          console.log(`  Token:  ${result.confirmToken}`);
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

const segmentations = program
  .command('segmentations')
  .description('Manage Bloomreach Engagement customer segmentations');

segmentations
  .command('list')
  .description(
    'List all segmentations in the project (note: requires browser automation — not yet available via API)',
  )
  .requiredOption('--project <project>', 'Bloomreach project token (UUID from Settings > Project)')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachSegmentationsService(options.project);
      const result = await service.listSegmentations({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No segmentations found.');
          return;
        }
        for (const seg of result) {
          console.log(`  ${seg.name}`);
          console.log(`    Customers: ${seg.customerCount ?? 'unknown'}`);
          console.log(`    ID:        ${seg.id}`);
          console.log(`    URL:       ${seg.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

segmentations
  .command('view-size')
  .description('View the number of customers matching a segmentation')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--segmentation-id <id>',
    'Segmentation analysis ID (hex string from Bloomreach UI URL, e.g. "606488856f8cf6f848b20af8")',
  )
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; segmentationId: string; json?: boolean }) => {
    try {
      const apiConfig = tryResolveApiConfig(options.project);
      const service = new BloomreachSegmentationsService(options.project, apiConfig);
      const result = await service.viewSegmentSize({
        project: options.project,
        segmentationId: options.segmentationId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Segment Size: ${result.segmentationId}`);
        console.log(`  Customers: ${result.customerCount}`);
        console.log(`  Computed:  ${result.computedAt}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

segmentations
  .command('view-customers')
  .description('Browse customers matching a segmentation')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--segmentation-id <id>',
    'Segmentation analysis ID (hex string from Bloomreach UI URL, e.g. "606488856f8cf6f848b20af8")',
  )
  .option('--limit <n>', 'Maximum number of customers to return')
  .option('--offset <n>', 'Offset for pagination')
  .option('--format <format>', 'Output format: table (default) or csv', 'table')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      segmentationId: string;
      limit?: string;
      offset?: string;
      format: string;
      json?: boolean;
    }) => {
      try {
        const apiConfig = tryResolveApiConfig(options.project);
        const service = new BloomreachSegmentationsService(options.project, apiConfig);
        const result = await service.viewSegmentCustomers({
          project: options.project,
          segmentationId: options.segmentationId,
          limit: options.limit !== undefined ? parseInt(options.limit, 10) : undefined,
          offset: options.offset !== undefined ? parseInt(options.offset, 10) : undefined,
        });

        if (options.json) {
          printJson(result);
        } else if (options.format.toLowerCase() === 'csv') {
          console.log('customerId,attributes');
          for (const customer of result.customers) {
            const escapedCustomerId = customer.customerId.replaceAll('"', '""');
            const attributesJson = JSON.stringify(customer.attributes ?? {}).replaceAll('"', '""');
            console.log(`"${escapedCustomerId}","${attributesJson}"`);
          }
        } else {
          console.log(`Segment Customers: ${result.segmentationId}`);
          console.log(`  Total:  ${result.total}`);
          console.log(`  Shown:  ${result.customers.length}`);
          console.log(`  Offset: ${result.offset}`);
          for (const customer of result.customers) {
            console.log(`    ${customer.customerId}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

segmentations
  .command('create')
  .description('Prepare creation of a new segmentation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Segmentation name')
  .requiredOption(
    '--conditions <json>',
    'JSON array of conditions, e.g. [{"type":"customer_attribute","attribute":"email","operator":"is_set"}]',
  )
  .option('--operator <op>', 'Logical operator for conditions (and, or)', 'and')
  .option('--start-date <date>', 'Start date for event conditions (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date for event conditions (YYYY-MM-DD)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      conditions: string;
      operator: string;
      startDate?: string;
      endDate?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const conditions = JSON.parse(options.conditions) as SegmentCondition[];
        const dateRange =
          options.startDate || options.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : undefined;

        const service = new BloomreachSegmentationsService(options.project);
        const result = service.prepareCreateSegmentation({
          project: options.project,
          name: options.name,
          conditions,
          logicalOperator: options.operator as 'and' | 'or',
          dateRange,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Segmentation creation prepared.');
          console.log(`  Name:     ${options.name}`);
          console.log(`  Operator: ${options.operator}`);
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

segmentations
  .command('clone')
  .description('Prepare cloning a segmentation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--segmentation-id <id>',
    'Segmentation analysis ID (hex string from Bloomreach UI URL, e.g. "606488856f8cf6f848b20af8")',
  )
  .option('--new-name <name>', 'Name for the cloned segmentation')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      segmentationId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSegmentationsService(options.project);
        const result = service.prepareCloneSegmentation({
          project: options.project,
          segmentationId: options.segmentationId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Segmentation clone prepared.');
          console.log(`  Source:   ${options.segmentationId}`);
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

segmentations
  .command('archive')
  .description('Prepare archiving a segmentation (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption(
    '--segmentation-id <id>',
    'Segmentation analysis ID (hex string from Bloomreach UI URL, e.g. "606488856f8cf6f848b20af8")',
  )
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; segmentationId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachSegmentationsService(options.project);
        const result = service.prepareArchiveSegmentation({
          project: options.project,
          segmentationId: options.segmentationId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Segmentation archive prepared.');
          console.log(`  Segmentation: ${options.segmentationId}`);
          console.log(`  Token:        ${result.confirmToken}`);
          console.log(`  Expires:      ${new Date(result.expiresAtMs).toISOString()}`);
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

const sqlReports = program
  .command('sql-reports')
  .description('Manage Bloomreach SQL reports (beta)');

sqlReports
  .command('list')
  .description('List all SQL reports in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status (saved, running, completed, failed, archived)')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; status?: string; json?: boolean }) => {
    try {
      const service = new BloomreachSqlReportsService(options.project);
      const result = await service.listSqlReports({
        project: options.project,
        status: options.status,
      });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No SQL reports found.');
          return;
        }
        for (const report of result) {
          const truncatedQuery =
            report.query.length > 80 ? `${report.query.slice(0, 80)}...` : report.query;
          console.log(`  ${report.name}`);
          console.log(`    Status: ${report.status}`);
          console.log(`    Query:  ${truncatedQuery}`);
          console.log(`    ID:     ${report.id}`);
          console.log(`    URL:    ${report.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

sqlReports
  .command('view')
  .description('View details of a specific SQL report')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--report-id <id>', 'SQL report ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; reportId: string; json?: boolean }) => {
    try {
      const service = new BloomreachSqlReportsService(options.project);
      const result = await service.viewSqlReport({
        project: options.project,
        reportId: options.reportId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`SQL Report: ${result.name}`);
        console.log(`  Status:         ${result.status}`);
        console.log(`  Query:          ${result.query}`);
        console.log(`  Parameters:     ${JSON.stringify(result.parameters ?? {}, null, 2)}`);
        console.log(`  Last executed:  ${result.lastExecutedAt ?? 'never'}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

sqlReports
  .command('create')
  .description('Prepare creation of a new SQL report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Report name')
  .requiredOption('--query <sql>', 'SQL query string')
  .option('--parameters <json>', 'JSON object of query parameters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      query: string;
      parameters?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const parameters = options.parameters
          ? (JSON.parse(options.parameters) as Record<string, string>)
          : undefined;

        const service = new BloomreachSqlReportsService(options.project);
        const result = service.prepareCreateSqlReport({
          project: options.project,
          name: options.name,
          query: options.query,
          parameters,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('SQL report creation prepared.');
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

sqlReports
  .command('execute')
  .description('Prepare execution of a SQL report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--report-id <id>', 'SQL report ID')
  .option('--parameters <json>', 'JSON object of query parameters')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      parameters?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const parameters = options.parameters
          ? (JSON.parse(options.parameters) as Record<string, string>)
          : undefined;

        const service = new BloomreachSqlReportsService(options.project);
        const result = service.prepareExecuteSqlReport({
          project: options.project,
          reportId: options.reportId,
          parameters,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('SQL report execution prepared.');
          console.log(`  Report:  ${options.reportId}`);
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

sqlReports
  .command('export-results')
  .description('Prepare export of SQL report results (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--report-id <id>', 'SQL report ID')
  .option('--format <format>', 'Export format (json, csv)', 'json')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      format: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSqlReportsService(options.project);
        const result = service.prepareExportSqlReportResults({
          project: options.project,
          reportId: options.reportId,
          format: options.format,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('SQL report results export prepared.');
          console.log(`  Report:  ${options.reportId}`);
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

sqlReports
  .command('clone')
  .description('Prepare cloning a SQL report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--report-id <id>', 'SQL report ID to clone')
  .option('--new-name <name>', 'Name for the cloned report')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      reportId: string;
      newName?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachSqlReportsService(options.project);
        const result = service.prepareCloneSqlReport({
          project: options.project,
          reportId: options.reportId,
          newName: options.newName,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('SQL report clone prepared.');
          console.log(`  Source:   ${options.reportId}`);
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

sqlReports
  .command('archive')
  .description('Prepare archiving a SQL report (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--report-id <id>', 'SQL report ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; reportId: string; note?: string; json?: boolean }) => {
    try {
      const service = new BloomreachSqlReportsService(options.project);
      const result = service.prepareArchiveSqlReport({
        project: options.project,
        reportId: options.reportId,
        operatorNote: options.note,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log('SQL report archive prepared.');
        console.log(`  Report:   ${options.reportId}`);
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
  });

const catalogs = program.command('catalogs').description('Manage Bloomreach Engagement catalogs');

catalogs
  .command('list')
  .description('List all catalogs in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const apiConfig = resolveApiConfig();
      const service = new BloomreachCatalogsService(options.project, apiConfig);
      const result = await service.listCatalogs({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No catalogs found.');
          return;
        }
        console.log(`Found ${result.length} catalog(s):\n`);
        for (const catalog of result) {
          console.log(`  ${catalog.name}`);
          console.log(`    ID: ${catalog.id}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

catalogs
  .command('view-items')
  .description('View items in a specific catalog')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--catalog-id <id>', 'Catalog ID')
  .option('--page <n>', 'Page number')
  .option('--page-size <n>', 'Page size')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      catalogId: string;
      page?: string;
      pageSize?: string;
      json?: boolean;
    }) => {
      try {
        const apiConfig = resolveApiConfig();
        const service = new BloomreachCatalogsService(options.project, apiConfig);
        const result = await service.viewCatalogItems({
          project: options.project,
          catalogId: options.catalogId,
          page: options.page !== undefined ? parseInt(options.page, 10) : undefined,
          pageSize: options.pageSize !== undefined ? parseInt(options.pageSize, 10) : undefined,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log(`Catalog Items: ${options.catalogId}`);
          console.log(`  Total: ${result.totalCount}`);
          console.log(`  Page:  ${result.page}`);
          console.log(`  Size:  ${result.pageSize}`);
          if (result.items.length === 0) {
            console.log('  Items: none');
          } else {
            console.log('  Items:');
            for (const item of result.items) {
              console.log(`    ${item.id}: ${JSON.stringify(item.properties)}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

catalogs
  .command('create')
  .description('Prepare creation of a new catalog (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Catalog name')
  .requiredOption(
    '--schema <json>',
    'JSON object mapping field names to types, e.g. \'{"sku":"string","price":"number"}\'. Valid types: string, long text, number, boolean, date, datetime, duration, list, url, json',
  )
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      schema: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const schema = JSON.parse(options.schema) as CreateCatalogInput['schema'];

        const apiConfig = resolveApiConfig();
        const service = new BloomreachCatalogsService(options.project, apiConfig);
        const result = service.prepareCreateCatalog({
          project: options.project,
          name: options.name,
          schema,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Catalog creation prepared.');
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

catalogs
  .command('add-items')
  .description('Prepare adding items to a catalog (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--catalog-id <id>', 'Catalog ID')
  .option('--items <json>', 'JSON array of catalog item property objects')
  .option('--items-file <path>', 'Path to JSON file containing items array (alternative to --items)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      catalogId: string;
      items?: string;
      itemsFile?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let items: AddCatalogItemsInput['items'];
        if (options.itemsFile) {
          items = JSON.parse(readFileSync(options.itemsFile, 'utf-8')) as AddCatalogItemsInput['items'];
        } else if (options.items) {
          items = JSON.parse(options.items) as AddCatalogItemsInput['items'];
        } else {
          console.error('Error: Either --items or --items-file is required.');
          process.exit(1);
        }

        const apiConfig = resolveApiConfig();
        const service = new BloomreachCatalogsService(options.project, apiConfig);
        const result = service.prepareAddCatalogItems({
          project: options.project,
          catalogId: options.catalogId,
          items,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Catalog add-items prepared.');
          console.log(`  Catalog: ${options.catalogId}`);
          console.log(`  Items:   ${items.length}`);
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

catalogs
  .command('update-items')
  .description('Prepare updating catalog items (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--catalog-id <id>', 'Catalog ID')
  .option('--items <json>', 'JSON array of item updates [{id, properties}]')
  .option('--items-file <path>', 'Path to JSON file containing items array (alternative to --items)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      catalogId: string;
      items?: string;
      itemsFile?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        let items: UpdateCatalogItemsInput['items'];
        if (options.itemsFile) {
          items = JSON.parse(readFileSync(options.itemsFile, 'utf-8')) as UpdateCatalogItemsInput['items'];
        } else if (options.items) {
          items = JSON.parse(options.items) as UpdateCatalogItemsInput['items'];
        } else {
          console.error('Error: Either --items or --items-file is required.');
          process.exit(1);
        }

        const apiConfig = resolveApiConfig();
        const service = new BloomreachCatalogsService(options.project, apiConfig);
        const result = service.prepareUpdateCatalogItems({
          project: options.project,
          catalogId: options.catalogId,
          items,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Catalog update-items prepared.');
          console.log(`  Catalog: ${options.catalogId}`);
          console.log(`  Items:   ${items.length}`);
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

catalogs
  .command('delete')
  .description('Prepare deletion of a catalog (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--catalog-id <id>', 'Catalog ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; catalogId: string; note?: string; json?: boolean }) => {
      try {
        const apiConfig = resolveApiConfig();
        const service = new BloomreachCatalogsService(options.project, apiConfig);
        const result = service.prepareDeleteCatalog({
          project: options.project,
          catalogId: options.catalogId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Catalog deletion prepared.');
          console.log(`  Catalog: ${options.catalogId}`);
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

const imports = program
  .command('imports')
  .description('Manage Bloomreach data imports');

imports
  .command('list')
  .description('List all data imports in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--status <status>', 'Filter by status (pending, processing, completed, failed, cancelled, scheduled)')
  .option('--type <type>', 'Filter by type (csv, api)')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; status?: string; type?: string; json?: boolean }) => {
    try {
      const service = new BloomreachImportsService(options.project);
      const input: { project: string; status?: string; type?: string } = {
        project: options.project,
      };
      if (options.status) input.status = options.status;
      if (options.type) input.type = options.type;

      const result = await service.listImports(input);

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No imports found.');
          return;
        }
        for (const imp of result) {
          console.log(`  ${imp.name}`);
          console.log(`    Status:    ${imp.status}`);
          console.log(`    Type:      ${imp.type}`);
          console.log(`    Source:    ${imp.source}`);
          console.log(`    Progress:  ${imp.rowsProcessed}/${imp.rowsTotal} rows`);
          console.log(`    Errors:    ${imp.errors}`);
          console.log(`    Warnings:  ${imp.warnings}`);
          console.log(`    ID:        ${imp.id}`);
          console.log(`    URL:       ${imp.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

imports
  .command('view-status')
  .description('View detailed status of a specific import')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--import-id <id>', 'Import ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; importId: string; json?: boolean }) => {
    try {
      const service = new BloomreachImportsService(options.project);
      const result = await service.viewImportStatus({
        project: options.project,
        importId: options.importId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Import: ${result.name}`);
        console.log(`  Status:     ${result.status}`);
        console.log(`  Type:       ${result.type}`);
        console.log(`  Source:     ${result.source}`);
        console.log(`  Progress:   ${result.rowsProcessed}/${result.rowsTotal} rows`);
        console.log(`  Errors:     ${result.errors}`);
        console.log(`  Warnings:   ${result.warnings}`);
        console.log(`  Created:    ${result.createdAt}`);
        if (result.startedAt) console.log(`  Started:    ${result.startedAt}`);
        if (result.completedAt) console.log(`  Completed:  ${result.completedAt}`);
        if (result.errorDetails.length > 0) {
          console.log('  Error Details:');
          for (const err of result.errorDetails) {
            console.log(`    Row ${err.row}, Column "${err.column}": ${err.message}`);
          }
        }
        if (result.warningDetails.length > 0) {
          console.log('  Warning Details:');
          for (const warn of result.warningDetails) {
            console.log(`    Row ${warn.row}, Column "${warn.column}": ${warn.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

imports
  .command('create')
  .description('Prepare creation of a new data import (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Import name')
  .requiredOption('--type <type>', 'Import type (csv, api)')
  .requiredOption('--source <source>', 'Data source URL (CSV file URL or API endpoint)')
  .requiredOption('--mapping <json>', 'JSON array of mappings [{sourceColumn, targetProperty, transformationType?}]')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      source: string;
      mapping: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const mapping = JSON.parse(options.mapping) as ImportMapping[];

        const service = new BloomreachImportsService(options.project);
        const result = service.prepareCreateImport({
          project: options.project,
          name: options.name,
          type: options.type,
          source: options.source,
          mapping,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Import creation prepared.');
          console.log(`  Name:    ${options.name}`);
          console.log(`  Type:    ${options.type}`);
          console.log(`  Source:  ${options.source}`);
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

imports
  .command('schedule')
  .description('Prepare scheduling a recurring data import (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'Import name')
  .requiredOption('--type <type>', 'Import type (csv, api)')
  .requiredOption('--source <source>', 'Data source URL (CSV file URL or API endpoint)')
  .requiredOption('--mapping <json>', 'JSON array of mappings [{sourceColumn, targetProperty, transformationType?}]')
  .requiredOption('--frequency <frequency>', 'Schedule frequency (daily, weekly, monthly, custom)')
  .option('--cron <expression>', 'Cron expression for custom frequency')
  .option('--start-date <date>', 'Schedule start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'Schedule end date (YYYY-MM-DD)')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      name: string;
      type: string;
      source: string;
      mapping: string;
      frequency: string;
      cron?: string;
      startDate?: string;
      endDate?: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const mapping = JSON.parse(options.mapping) as ImportMapping[];
        const schedule: ImportScheduleConfig = {
          frequency: options.frequency,
          cronExpression: options.cron,
          startDate: options.startDate,
          endDate: options.endDate,
          isActive: true,
        };

        const service = new BloomreachImportsService(options.project);
        const result = service.prepareScheduleImport({
          project: options.project,
          name: options.name,
          type: options.type,
          source: options.source,
          mapping,
          schedule,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Import schedule prepared.');
          console.log(`  Name:      ${options.name}`);
          console.log(`  Type:      ${options.type}`);
          console.log(`  Source:    ${options.source}`);
          console.log(`  Frequency: ${options.frequency}`);
          if (options.cron) console.log(`  Cron:      ${options.cron}`);
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

imports
  .command('cancel')
  .description('Prepare cancellation of an in-progress import (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--import-id <id>', 'Import ID to cancel')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; importId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachImportsService(options.project);
        const result = service.prepareCancelImport({
          project: options.project,
          importId: options.importId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Import cancellation prepared.');
          console.log(`  Import: ${options.importId}`);
          console.log(`  Token:  ${result.confirmToken}`);
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

const useCases = program
  .command('use-cases')
  .description('Browse and deploy Bloomreach Use Case Center templates');

useCases
  .command('list')
  .description('List all available use case templates')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--category <category>', 'Filter by goal category (awareness, acquisition, retention, optimization)')
  .option('--tag <tag>', 'Filter by tag (new, essentials, popular)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; category?: string; tag?: string; json?: boolean }) => {
      try {
        const service = new BloomreachUseCasesService(options.project);
        const input: { project: string; category?: string; tag?: string } = {
          project: options.project,
        };
        if (options.category) input.category = options.category;
        if (options.tag) input.tag = options.tag;

        const result = await service.listUseCases(input);

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No use cases found.');
            return;
          }
          for (const useCase of result) {
            console.log(`  ${useCase.name}`);
            console.log(`    Category: ${useCase.goalCategory}`);
            console.log(`    Tags:     ${useCase.tags.join(', ')}`);
            if (useCase.readinessStatus) {
              console.log(`    Ready:    ${useCase.readinessStatus}`);
            }
            console.log(`    ID:       ${useCase.id}`);
            console.log(`    URL:      ${useCase.url}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

useCases
  .command('search')
  .description('Search use case templates by keyword')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--query <query>', 'Search keyword')
  .option('--category <category>', 'Filter by goal category (awareness, acquisition, retention, optimization)')
  .option('--tag <tag>', 'Filter by tag (new, essentials, popular)')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      query: string;
      category?: string;
      tag?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachUseCasesService(options.project);
        const result = await service.searchUseCases({
          project: options.project,
          query: options.query,
          category: options.category,
          tag: options.tag,
        });

        if (options.json) {
          printJson(result);
        } else {
          if (result.length === 0) {
            console.log('No use cases match the search.');
            return;
          }
          for (const useCase of result) {
            console.log(`  ${useCase.name}`);
            console.log(`    Category: ${useCase.goalCategory}`);
            console.log(`    Tags:     ${useCase.tags.join(', ')}`);
            if (useCase.readinessStatus) {
              console.log(`    Ready:    ${useCase.readinessStatus}`);
            }
            console.log(`    ID:       ${useCase.id}`);
            console.log(`    URL:      ${useCase.url}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  );

useCases
  .command('view')
  .description('View details of a specific use case template')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--use-case-id <id>', 'Use case ID')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; useCaseId: string; json?: boolean }) => {
    try {
      const service = new BloomreachUseCasesService(options.project);
      const result = await service.viewUseCase({
        project: options.project,
        useCaseId: options.useCaseId,
      });

      if (options.json) {
        printJson(result);
      } else {
        console.log(`Use Case: ${result.name}`);
        console.log(`  Category:     ${result.goalCategory}`);
        console.log(`  Tags:         ${result.tags.join(', ')}`);
        console.log(`  Description:  ${result.description}`);
        if (result.longDescription) {
          console.log(`  Details:      ${result.longDescription}`);
        }
        if (result.requiredIntegrations.length > 0) {
          console.log(`  Integrations: ${result.requiredIntegrations.join(', ')}`);
        }
        if (result.channelsUsed.length > 0) {
          console.log(`  Channels:     ${result.channelsUsed.join(', ')}`);
        }
        if (result.readinessStatus) {
          console.log(`  Readiness:    ${result.readinessStatus}`);
        }
        console.log(`  URL:          ${result.url}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

useCases
  .command('project-list')
  .description('List use cases deployed in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachUseCasesService(options.project);
      const result = await service.listProjectUseCases({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No use cases deployed in this project.');
          return;
        }
        for (const useCase of result) {
          console.log(`  ${useCase.name}`);
          console.log(`    Category: ${useCase.goalCategory}`);
          if (useCase.status) {
            console.log(`    Status:   ${useCase.status}`);
          }
          if (useCase.deployedAt) {
            console.log(`    Deployed: ${useCase.deployedAt}`);
          }
          console.log(`    ID:       ${useCase.id}`);
          console.log(`    URL:      ${useCase.url}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

useCases
  .command('deploy')
  .description('Prepare deployment of a use case template (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--use-case-id <id>', 'Use case ID to deploy')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; useCaseId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachUseCasesService(options.project);
        const result = service.prepareDeployUseCase({
          project: options.project,
          useCaseId: options.useCaseId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Use case deployment prepared.');
          console.log(`  Use Case: ${options.useCaseId}`);
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

useCases
  .command('favorite')
  .description('Prepare favoriting a use case (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--use-case-id <id>', 'Use case ID to favorite')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; useCaseId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachUseCasesService(options.project);
        const result = service.prepareFavoriteUseCase({
          project: options.project,
          useCaseId: options.useCaseId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Use case favorite prepared.');
          console.log(`  Use Case: ${options.useCaseId}`);
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

useCases
  .command('unfavorite')
  .description('Prepare unfavoriting a use case (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--use-case-id <id>', 'Use case ID to unfavorite')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; useCaseId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachUseCasesService(options.project);
        const result = service.prepareUnfavoriteUseCase({
          project: options.project,
          useCaseId: options.useCaseId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Use case unfavorite prepared.');
          console.log(`  Use Case: ${options.useCaseId}`);
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

const access = program
  .command('access')
  .description('Manage project access, team members, and API keys');

access
  .command('list-members')
  .description('List all team members in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAccessManagementService(options.project);
      const result = await service.listTeamMembers({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No team members found.');
          return;
        }
        for (const member of result) {
          console.log(`  ${member.email}`);
          if (member.name) {
            console.log(`    Name:   ${member.name}`);
          }
          console.log(`    Role:   ${member.role}`);
          console.log(`    Status: ${member.status}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

access
  .command('invite')
  .description('Prepare inviting a team member (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--email <email>', 'Team member email address')
  .requiredOption('--role <role>', 'Team member role')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      email: string;
      role: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAccessManagementService(options.project);
        const result = service.prepareInviteTeamMember({
          project: options.project,
          email: options.email,
          role: options.role,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Team member invitation prepared.');
          console.log(`  Email:   ${options.email}`);
          console.log(`  Role:    ${options.role}`);
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

access
  .command('update-role')
  .description('Prepare updating a team member role (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--member-id <id>', 'Team member ID')
  .requiredOption('--role <role>', 'Updated team member role')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: {
      project: string;
      memberId: string;
      role: string;
      note?: string;
      json?: boolean;
    }) => {
      try {
        const service = new BloomreachAccessManagementService(options.project);
        const result = service.prepareUpdateMemberRole({
          project: options.project,
          memberId: options.memberId,
          role: options.role,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Team member role update prepared.');
          console.log(`  Member ID: ${options.memberId}`);
          console.log(`  Role:      ${options.role}`);
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

access
  .command('remove-member')
  .description('Prepare removing a team member (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--member-id <id>', 'Team member ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; memberId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachAccessManagementService(options.project);
        const result = service.prepareRemoveTeamMember({
          project: options.project,
          memberId: options.memberId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('Team member removal prepared.');
          console.log(`  Member ID: ${options.memberId}`);
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

access
  .command('list-api-keys')
  .description('List all API keys in the project')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .option('--json', 'Output as JSON')
  .action(async (options: { project: string; json?: boolean }) => {
    try {
      const service = new BloomreachAccessManagementService(options.project);
      const result = await service.listApiKeys({ project: options.project });

      if (options.json) {
        printJson(result);
      } else {
        if (result.length === 0) {
          console.log('No API keys found.');
          return;
        }
        for (const apiKey of result) {
          console.log(`  ${apiKey.name}`);
          console.log(`    Public Key: ${apiKey.publicKey}`);
          console.log(`    Status:     ${apiKey.status}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

access
  .command('create-api-key')
  .description('Prepare creating an API key (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--name <name>', 'API key name')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; name: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachAccessManagementService(options.project);
        const result = service.prepareCreateApiKey({
          project: options.project,
          name: options.name,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('API key creation prepared.');
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

access
  .command('delete-api-key')
  .description('Prepare deleting an API key (two-phase commit)')
  .requiredOption('--project <project>', 'Bloomreach project identifier')
  .requiredOption('--api-key-id <id>', 'API key ID')
  .option('--note <note>', 'Operator note for audit trail')
  .option('--json', 'Output as JSON')
  .action(
    async (options: { project: string; apiKeyId: string; note?: string; json?: boolean }) => {
      try {
        const service = new BloomreachAccessManagementService(options.project);
        const result = service.prepareDeleteApiKey({
          project: options.project,
          apiKeyId: options.apiKeyId,
          operatorNote: options.note,
        });

        if (options.json) {
          printJson(result);
        } else {
          console.log('API key deletion prepared.');
          console.log(`  API key ID: ${options.apiKeyId}`);
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

program.parse();
