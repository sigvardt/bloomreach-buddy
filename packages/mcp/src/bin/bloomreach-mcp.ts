#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as core from '@bloomreach-buddy/core';
import {
  BloomreachBuddyError,
  BloomreachDatabase,
  TwoPhaseCommitService,
  type ActionExecutor,
} from '@bloomreach-buddy/core';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as toolNames from '../index.js';
import { toToolResult, toErrorResult } from '../toolResults.js';
import { isPlainObject, validateToolArgValueAgainstSchema } from '../toolSchema.js';
import type { BloomreachMcpInputSchema } from '../toolSchema.js';

const projectId = process.env.BLOOMREACH_PROJECT ?? '';

// Build API config from environment variables (if credentials are available)
const apiConfig: core.BloomreachApiConfig | undefined =
  process.env.BLOOMREACH_PROJECT_TOKEN &&
  process.env.BLOOMREACH_API_KEY_ID &&
  process.env.BLOOMREACH_API_SECRET
    ? {
        baseUrl: process.env.BLOOMREACH_API_BASE_URL || 'https://api.exponea.com',
        projectToken: process.env.BLOOMREACH_PROJECT_TOKEN,
        apiKeyId: process.env.BLOOMREACH_API_KEY_ID,
        apiSecret: process.env.BLOOMREACH_API_SECRET,
      }
    : undefined;

function collectAllExecutors(
  config?: core.BloomreachApiConfig,
): Record<string, ActionExecutor> {
  const executors: Record<string, ActionExecutor> = {};
  const factories: Array<() => Record<string, ActionExecutor>> = [
    () => core.createCustomerActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createDashboardActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createScenarioActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createEmailCampaignActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createSurveyActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createCampaignCalendarActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createTrendActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createFunnelActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createRetentionActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createFlowActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createGeoAnalysisActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createVoucherActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createAssetManagerActionExecutors() as Record<string, ActionExecutor>,
    () => core.createTagManagerActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createMetricActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createDataManagerActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createExportActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createIntegrationActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createInitiativeActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createProjectSettingsActionExecutors() as Record<string, ActionExecutor>,
    () => core.createCampaignSettingsActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createSecuritySettingsActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createEvaluationSettingsActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createWeblayerActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createReportActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createSegmentationActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createSqlReportActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createCatalogActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createImportsActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createUseCaseActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createAccessActionExecutors(config) as Record<string, ActionExecutor>,
    () => core.createRecommendationActionExecutors() as Record<string, ActionExecutor>,
    () => core.createChannelSettingsActionExecutors() as Record<string, ActionExecutor>,
  ];

  for (const factory of factories) {
    Object.assign(executors, factory());
  }

  return executors;
}

const dbPath = process.env.BLOOMREACH_BUDDY_DB_PATH ?? join(homedir(), '.bloomreach-buddy', 'state.db');
const db = new BloomreachDatabase(dbPath);
const allExecutors = collectAllExecutors(apiConfig);
const twoPhaseCommit = new TwoPhaseCommitService(db, allExecutors);

interface InputSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
}

interface InputSchema {
  type: 'object';
  properties: Record<string, InputSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

interface ToolRoute {
  name: string;
  description: string;
  inputSchema: InputSchema;
  serviceClass?: string;
  methodName?: string;
}

type ServiceMethod = (input: Record<string, unknown>) => unknown;
type ServiceInstance = Record<string, ServiceMethod>;
type ServiceConstructor = new (
  project: string,
  apiConfig?: core.BloomreachApiConfig,
) => ServiceInstance;

function getProject(args: Record<string, unknown>): string {
  const projectFromArgs = typeof args.project === 'string' ? args.project.trim() : '';
  const project = projectFromArgs || projectId.trim();
  if (!project) {
    throw new BloomreachBuddyError('CONFIG_MISSING', 'Missing project. Provide `project` argument or BLOOMREACH_PROJECT env var.', { missing: ['BLOOMREACH_PROJECT'] });
  }
  return project;
}

function getServiceConstructor(serviceClass: string): ServiceConstructor {
  const coreExports = core as unknown as Record<string, unknown>;
  const candidate = coreExports[serviceClass];
  if (typeof candidate !== 'function') {
    throw new BloomreachBuddyError('TARGET_NOT_FOUND', `Missing service constructor: ${serviceClass}`);
  }
  return candidate as ServiceConstructor;
}

function createInputSchema(requiredProject: boolean): InputSchema {
  return {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
      },
    },
    required: requiredProject ? ['project'] : undefined,
    additionalProperties: true,
  };
}

function normalizeInput(args: Record<string, unknown>, project: string): Record<string, unknown> {
  const input: Record<string, unknown> = { ...args, project };
  if (typeof input.note === 'string' && typeof input.operatorNote !== 'string') {
    input.operatorNote = input.note;
  }
  return input;
}

const tools: ToolRoute[] = [
  {
    name: toolNames.BLOOMREACH_STATUS_TOOL,
    description:
      'Check Bloomreach MCP connectivity and authentication state. Use when starting a session or after credential changes. Returns an object with `connected` and `environment` fields; requires valid Bloomreach environment and token configuration for full verification.',
    inputSchema: createInputSchema(false),
  },
  {
    name: toolNames.BLOOMREACH_SESSION_OPEN_LOGIN_TOOL,
    description:
      'Open a headed browser window for manual Bloomreach authentication. ' +
      'The user must complete login (including any CAPTCHA challenges) in the visible browser window. ' +
      'Session cookies are captured and encrypted for future headless use. ' +
      'Returns authentication status with a timedOut flag indicating if login completed within the timeout period.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'Browser profile name (default: "default")',
        },
        timeoutMs: {
          type: 'number',
          description: 'Login timeout in milliseconds (default: 300000 — 5 minutes)',
        },
        loginUrl: {
          type: 'string',
          description: 'Override the login URL (default: https://eu.login.bloomreach.com/)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: toolNames.BLOOMREACH_ACTIONS_CONFIRM_TOOL,
    description:
      'Confirm and execute a previously prepared action using its confirmation token. ' +
      'The token is returned by any prepare_* tool. Once confirmed, the action is executed ' +
      'and cannot be confirmed again. Tokens expire after 30 minutes.',
    inputSchema: {
      type: 'object',
      properties: {
        confirmToken: {
          type: 'string',
          description: 'The confirmation token returned by the prepare_* tool.',
        },
      },
      required: ['confirmToken'],
      additionalProperties: false,
    },
  },
  {
    name: toolNames.BLOOMREACH_ACTIONS_LIST_TOOL,
    description:
      'List prepared actions with optional status filter. ' +
      'Returns a summary of each action including its ID, type, status, expiry, and preview.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: "prepared", "executed", or "failed".',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of actions to return (default 50).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: toolNames.BLOOMREACH_DASHBOARDS_LIST_TOOL,
    description:
      'List all dashboards in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDashboardsService',
    methodName: 'listDashboards',
  },
  {
    name: toolNames.BLOOMREACH_DASHBOARDS_PREPARE_CREATE_TOOL,
    description:
      'Create a new dashboard. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new dashboard.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDashboardsService',
    methodName: 'prepareCreateDashboard',
  },
  {
    name: toolNames.BLOOMREACH_DASHBOARDS_PREPARE_SET_HOME_TOOL,
    description:
      'Set a dashboard as the project home. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        dashboardId: {
          type: 'string',
          description: 'ID of the dashboard. Use bloomreach.dashboards.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDashboardsService',
    methodName: 'prepareSetHomeDashboard',
  },
  {
    name: toolNames.BLOOMREACH_DASHBOARDS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a dashboard. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        dashboardId: {
          type: 'string',
          description: 'ID of the dashboard. Use bloomreach.dashboards.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDashboardsService',
    methodName: 'prepareDeleteDashboard',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_PROJECT_TOOL,
    description:
      'View project-wide revenue and conversion KPIs. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewProjectPerformance',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_CHANNEL_TOOL,
    description:
      'View per-channel engagement, deliverability and revenue metrics. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewChannelPerformance',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_USAGE_TOOL,
    description:
      'View Bloomreach billing, event-tracking and usage statistics. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewBloomreachUsage',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_OVERVIEW_TOOL,
    description:
      'View high-level project statistics. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewProjectOverview',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_HEALTH_TOOL,
    description:
      'View project health and data-quality indicators. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewProjectHealth',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_LIST_TOOL,
    description:
      'List all scenarios in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'listScenarios',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_VIEW_TOOL,
    description:
      'View details of a specific scenario. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        scenarioId: {
          type: 'string',
          description: 'ID of the scenario. Use bloomreach.scenarios.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'viewScenario',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_PREPARE_CREATE_TOOL,
    description:
      'Create a new scenario. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new scenario.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'prepareCreateScenario',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_PREPARE_START_TOOL,
    description:
      'Start a scenario. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        scenarioId: {
          type: 'string',
          description: 'ID of the scenario. Use bloomreach.scenarios.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'prepareStartScenario',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_PREPARE_STOP_TOOL,
    description:
      'Stop a scenario. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        scenarioId: {
          type: 'string',
          description: 'ID of the scenario. Use bloomreach.scenarios.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'prepareStopScenario',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing scenario. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        scenarioId: {
          type: 'string',
          description: 'ID of the scenario. Use bloomreach.scenarios.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'prepareCloneScenario',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a scenario, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        scenarioId: {
          type: 'string',
          description: 'ID of the scenario. Use bloomreach.scenarios.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachScenariosService',
    methodName: 'prepareArchiveScenario',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_LIST_TOOL,
    description:
      'List all email campaigns in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'listEmailCampaigns',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_VIEW_RESULTS_TOOL,
    description:
      'View delivery and engagement metrics for an email campaign. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'viewCampaignResults',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_PREPARE_CREATE_TOOL,
    description:
      'Create a new email campaign. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new email campaign.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'prepareCreateEmailCampaign',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_PREPARE_SEND_TOOL,
    description:
      'Send an email campaign. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        campaignId: {
          type: 'string',
          description: 'ID of the email campaign. Use bloomreach.email_campaigns.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'prepareSendEmailCampaign',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing email campaign. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        campaignId: {
          type: 'string',
          description: 'ID of the email campaign. Use bloomreach.email_campaigns.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'prepareCloneEmailCampaign',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive an email campaign, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        campaignId: {
          type: 'string',
          description: 'ID of the email campaign. Use bloomreach.email_campaigns.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'prepareArchiveEmailCampaign',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_SEND_TRANSACTIONAL_TOOL,
    description:
      'Send a transactional email via the Bloomreach Email API. Use for order confirmations, password resets, welcome emails, and other triggered messages. Requires an integration ID and either a template ID or raw HTML content. Returns { success, response }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'Bloomreach email integration ID.',
        },
        campaignName: {
          type: 'string',
          description: 'Optional campaign name for tracking purposes.',
        },
        recipient: {
          type: 'object',
          description: 'Recipient object with customerIds (map) and email (string).',
        },
        emailContent: {
          type: 'object',
          description:
            'Email content with templateId or html, plus optional subject, senderAddress, senderName, params.',
        },
      },
      required: ['project', 'integrationId', 'recipient', 'emailContent'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'sendTransactionalEmail',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_PREPARE_SEND_TRANSACTIONAL_TOOL,
    description:
      'Send a transactional email (order confirmation, password reset, welcome, etc.). Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'Bloomreach email integration ID.',
        },
        campaignName: {
          type: 'string',
          description: 'Optional campaign name for tracking purposes.',
        },
        recipient: {
          type: 'object',
          description: 'Recipient object with customerIds (map) and email (string).',
        },
        emailContent: {
          type: 'object',
          description:
            'Email content with templateId or html, plus optional subject, senderAddress, senderName, params.',
        },
      },
      required: ['project', 'integrationId', 'recipient', 'emailContent'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'prepareSendTransactionalEmail',
  },
  {
    name: toolNames.BLOOMREACH_SURVEYS_LIST_TOOL,
    description:
      'List all surveys in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSurveysService',
    methodName: 'listSurveys',
  },
  {
    name: toolNames.BLOOMREACH_SURVEYS_VIEW_RESULTS_TOOL,
    description:
      'View responses and analytics for a survey. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        surveyId: {
          type: 'string',
          description: 'ID of the survey. Use bloomreach.surveys.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSurveysService',
    methodName: 'viewSurveyResults',
  },
  {
    name: toolNames.BLOOMREACH_SURVEYS_PREPARE_CREATE_TOOL,
    description:
      'Create a new on-site survey. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new survey.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSurveysService',
    methodName: 'prepareCreateSurvey',
  },
  {
    name: toolNames.BLOOMREACH_SURVEYS_PREPARE_START_TOOL,
    description:
      'Start a survey. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        surveyId: {
          type: 'string',
          description: 'ID of the survey. Use bloomreach.surveys.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSurveysService',
    methodName: 'prepareStartSurvey',
  },
  {
    name: toolNames.BLOOMREACH_SURVEYS_PREPARE_STOP_TOOL,
    description:
      'Stop a survey. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        surveyId: {
          type: 'string',
          description: 'ID of the survey. Use bloomreach.surveys.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSurveysService',
    methodName: 'prepareStopSurvey',
  },
  {
    name: toolNames.BLOOMREACH_SURVEYS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a survey, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        surveyId: {
          type: 'string',
          description: 'ID of the survey. Use bloomreach.surveys.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSurveysService',
    methodName: 'prepareArchiveSurvey',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGNS_CALENDAR_VIEW_TOOL,
    description:
      'View campaign calendar for a date range. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachCampaignCalendarService',
    methodName: 'viewCampaignCalendar',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGNS_CALENDAR_FILTER_TOOL,
    description:
      'Filter campaign calendar by type, status, or channel. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
        filters: {
          type: 'object',
          description: 'Filtering options for narrowing results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignCalendarService',
    methodName: 'filterCampaignCalendar',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGNS_CALENDAR_PREPARE_EXPORT_TOOL,
    description:
      'Export campaign calendar data. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignCalendarService',
    methodName: 'prepareExportCalendar',
  },
  {
    name: toolNames.BLOOMREACH_TRENDS_LIST_TOOL,
    description:
      'List all trend analyses in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrendsService',
    methodName: 'listTrendAnalyses',
  },
  {
    name: toolNames.BLOOMREACH_TRENDS_VIEW_RESULTS_TOOL,
    description:
      'View time-series data for a trend analysis. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrendsService',
    methodName: 'viewTrendResults',
  },
  {
    name: toolNames.BLOOMREACH_TRENDS_PREPARE_CREATE_TOOL,
    description:
      'Create a new trend analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new trend analysis.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrendsService',
    methodName: 'prepareCreateTrendAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_TRENDS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing trend analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrendsService',
    methodName: 'prepareCloneTrendAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_TRENDS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a trend analysis, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrendsService',
    methodName: 'prepareArchiveTrendAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_FUNNELS_LIST_TOOL,
    description:
      'List all funnel analyses in the project. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFunnelsService',
    methodName: 'listFunnelAnalyses',
  },
  {
    name: toolNames.BLOOMREACH_FUNNELS_VIEW_RESULTS_TOOL,
    description:
      'View conversion rates and drop-off data for a funnel analysis. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFunnelsService',
    methodName: 'viewFunnelResults',
  },
  {
    name: toolNames.BLOOMREACH_FUNNELS_PREPARE_CREATE_TOOL,
    description:
      'Create a new funnel analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new funnel analysis.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFunnelsService',
    methodName: 'prepareCreateFunnelAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_FUNNELS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing funnel analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFunnelsService',
    methodName: 'prepareCloneFunnelAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_FUNNELS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a funnel analysis, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFunnelsService',
    methodName: 'prepareArchiveFunnelAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_RETENTIONS_LIST_TOOL,
    description:
      'List all retention analyses in the project. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachRetentionsService',
    methodName: 'listRetentionAnalyses',
  },
  {
    name: toolNames.BLOOMREACH_RETENTIONS_VIEW_RESULTS_TOOL,
    description:
      'View cohort retention data for a retention analysis. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachRetentionsService',
    methodName: 'viewRetentionResults',
  },
  {
    name: toolNames.BLOOMREACH_RETENTIONS_PREPARE_CREATE_TOOL,
    description:
      'Create a new retention analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new retention analysis.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachRetentionsService',
    methodName: 'prepareCreateRetentionAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_RETENTIONS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing retention analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachRetentionsService',
    methodName: 'prepareCloneRetentionAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_RETENTIONS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a retention analysis, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachRetentionsService',
    methodName: 'prepareArchiveRetentionAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_FLOWS_LIST_TOOL,
    description:
      'List all flow analyses in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFlowsService',
    methodName: 'listFlowAnalyses',
  },
  {
    name: toolNames.BLOOMREACH_FLOWS_VIEW_RESULTS_TOOL,
    description:
      'View journey paths, volumes and drop-offs for a flow analysis. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFlowsService',
    methodName: 'viewFlowResults',
  },
  {
    name: toolNames.BLOOMREACH_FLOWS_PREPARE_CREATE_TOOL,
    description:
      'Create a new flow analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new flow analysis.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFlowsService',
    methodName: 'prepareCreateFlowAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_FLOWS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing flow analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFlowsService',
    methodName: 'prepareCloneFlowAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_FLOWS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a flow analysis, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachFlowsService',
    methodName: 'prepareArchiveFlowAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_GEO_ANALYSES_LIST_TOOL,
    description:
      'List all geo analyses in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachGeoAnalysesService',
    methodName: 'listGeoAnalyses',
  },
  {
    name: toolNames.BLOOMREACH_GEO_ANALYSES_VIEW_RESULTS_TOOL,
    description:
      'View geographic distribution data for a geo analysis. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachGeoAnalysesService',
    methodName: 'viewGeoResults',
  },
  {
    name: toolNames.BLOOMREACH_GEO_ANALYSES_PREPARE_CREATE_TOOL,
    description:
      'Create a new geo analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new geo analysis.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachGeoAnalysesService',
    methodName: 'prepareCreateGeoAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_GEO_ANALYSES_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing geo analysis. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachGeoAnalysesService',
    methodName: 'prepareCloneGeoAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_GEO_ANALYSES_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a geo analysis, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        analysisId: {
          type: 'string',
          description: 'ID of the analysis. Use the corresponding list tool to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachGeoAnalysesService',
    methodName: 'prepareArchiveGeoAnalysis',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_LIST_TOOL,
    description:
      'List customer profiles in the project. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'listCustomers',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_SEARCH_TOOL,
    description:
      'Search customer profiles by query. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
        query: {
          type: 'string',
          description: 'Search query string.',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project', 'query'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'searchCustomers',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_VIEW_TOOL,
    description:
      'View details for a customer profile. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerId: {
          type: 'string',
          description: 'Customer identifier (e.g., registered ID or email).',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'viewCustomer',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_PREPARE_CREATE_TOOL,
    description:
      'Create a customer profile. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new customer profile.',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
        properties: {
          type: 'object',
          description: 'Customer properties payload.',
        },
        customerIds: {
          type: 'object',
          description: 'Customer identifier map (registered/email/cookie etc.).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'prepareCreateCustomer',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_PREPARE_UPDATE_TOOL,
    description:
      'Update an existing customer profile. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerId: {
          type: 'string',
          description: 'Customer identifier (e.g., registered ID or email).',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
        properties: {
          type: 'object',
          description: 'Customer properties payload.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'prepareUpdateCustomer',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a customer profile. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerId: {
          type: 'string',
          description: 'Customer identifier (e.g., registered ID or email).',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'prepareDeleteCustomer',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_TRACK_EVENT_TOOL,
    description:
      'Track a customer event via the Bloomreach Tracking API. Use for recording purchases, page views, custom events, and other customer actions. Returns { success, response }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description: 'Customer identifier map (registered/email/cookie etc.).',
        },
        eventType: {
          type: 'string',
          description: 'Event type name (e.g. "purchase", "page_view", "cart_update").',
        },
        timestamp: {
          type: 'number',
          description: 'Unix timestamp of the event. Defaults to current time if omitted.',
        },
        properties: {
          type: 'object',
          description: 'Event properties payload (e.g. { total_price: 99.99, item_count: 3 }).',
        },
      },
      required: ['project', 'customerIds', 'eventType'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'trackEvent',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_BATCH_COMMANDS_TOOL,
    description:
      'Execute multiple tracking commands in a single batch request. Supports customers/events, customers (update), and other tracking operations. Returns { success, response }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        commands: {
          type: 'array',
          description:
            'Array of batch command objects, each with "name" (e.g. "customers/events") and "data" fields.',
        },
      },
      required: ['project', 'commands'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'trackBatchCommands',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_EXPORT_EVENTS_TOOL,
    description:
      'Export events for a specific customer. Returns event history filtered by optional event types. Returns { success, events }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description: 'Customer identifier map (registered/email/cookie etc.).',
        },
        eventTypes: {
          type: 'array',
          description: 'Optional list of event type names to filter by.',
        },
      },
      required: ['project', 'customerIds'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'exportCustomerEvents',
  },
  {
    name: toolNames.BLOOMREACH_CUSTOMERS_EXPORT_ONE_TOOL,
    description:
      'Export full data for a single customer including properties, IDs, and optional attributes. Returns { success, customer }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description: 'Customer identifier map (registered/email/cookie etc.).',
        },
        attributes: {
          type: 'array',
          description: 'Optional list of attribute descriptors to include in the export.',
        },
      },
      required: ['project', 'customerIds'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCustomersService',
    methodName: 'exportSingleCustomer',
  },
  {
    name: toolNames.BLOOMREACH_VOUCHERS_LIST_TOOL,
    description:
      'List all voucher pools in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachVouchersService',
    methodName: 'listVoucherPools',
  },
  {
    name: toolNames.BLOOMREACH_VOUCHERS_VIEW_STATUS_TOOL,
    description:
      'View redemption status of vouchers in a pool. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        voucherPoolId: {
          type: 'string',
          description: 'ID of the voucher pool. Use bloomreach.vouchers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachVouchersService',
    methodName: 'viewVoucherStatus',
  },
  {
    name: toolNames.BLOOMREACH_VOUCHERS_PREPARE_CREATE_TOOL,
    description:
      'Create a new voucher pool. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new voucher pool.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachVouchersService',
    methodName: 'prepareCreateVoucherPool',
  },
  {
    name: toolNames.BLOOMREACH_VOUCHERS_PREPARE_ADD_TOOL,
    description:
      'Add voucher codes to an existing pool. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        voucherPoolId: {
          type: 'string',
          description: 'ID of the voucher pool. Use bloomreach.vouchers.list to find available IDs.',
        },
        vouchers: {
          type: 'array',
          description: 'Voucher codes to add to the pool.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachVouchersService',
    methodName: 'prepareAddVouchers',
  },
  {
    name: toolNames.BLOOMREACH_VOUCHERS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a voucher pool. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        voucherPoolId: {
          type: 'string',
          description: 'ID of the voucher pool. Use bloomreach.vouchers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachVouchersService',
    methodName: 'prepareDeleteVoucherPool',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_EMAIL_TEMPLATES_LIST_TOOL,
    description:
      'List all email templates in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'listEmailTemplates',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_EMAIL_TEMPLATES_PREPARE_CREATE_TOOL,
    description:
      'Create an email template. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new email template.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCreateEmailTemplate',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_WEBLAYER_TEMPLATES_LIST_TOOL,
    description:
      'List all weblayer templates in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'listWeblayerTemplates',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_WEBLAYER_TEMPLATES_PREPARE_CREATE_TOOL,
    description:
      'Create a weblayer template. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new weblayer template.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCreateWeblayerTemplate',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_BLOCKS_LIST_TOOL,
    description:
      'List all blocks in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'listBlocks',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_BLOCKS_PREPARE_CREATE_TOOL,
    description:
      'Create a block. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new block.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCreateBlock',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_CUSTOM_ROWS_LIST_TOOL,
    description:
      'List all custom rows in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'listCustomRows',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_CUSTOM_ROWS_PREPARE_CREATE_TOOL,
    description:
      'Create a custom row. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new custom row.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCreateCustomRow',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_SNIPPETS_LIST_TOOL,
    description:
      'List all snippets in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'listSnippets',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_SNIPPETS_PREPARE_CREATE_TOOL,
    description:
      'Create a snippet. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new snippet.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCreateSnippet',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_SNIPPETS_PREPARE_EDIT_TOOL,
    description:
      'Update an existing snippet. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareEditSnippet',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_FILES_LIST_TOOL,
    description:
      'List all files in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'listFiles',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_FILES_PREPARE_UPLOAD_TOOL,
    description:
      'Upload a file. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareUploadFile',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_FILES_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a file. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareDeleteFile',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing template. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCloneTemplate',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a template, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareArchiveTemplate',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_LIST_TOOL,
    description:
      'List all managed JavaScript tags. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'listTags',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_VIEW_TOOL,
    description:
      'View details of a specific managed tag. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'viewTag',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_PREPARE_CREATE_TOOL,
    description:
      'Create a new managed JavaScript tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new managed tag.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'prepareCreateTag',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_PREPARE_ENABLE_TOOL,
    description:
      'Enable a managed tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'prepareEnableTag',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_PREPARE_DISABLE_TOOL,
    description:
      'Disable a managed tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'prepareDisableTag',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_PREPARE_EDIT_TOOL,
    description:
      'Update an existing managed tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'prepareEditTag',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a managed tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTagManagerService',
    methodName: 'prepareDeleteTag',
  },
  {
    name: toolNames.BLOOMREACH_METRICS_LIST_TOOL,
    description:
      'List all custom computed metrics in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachMetricsService',
    methodName: 'listMetrics',
  },
  {
    name: toolNames.BLOOMREACH_METRICS_PREPARE_CREATE_TOOL,
    description:
      'Create a custom metric. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new metric.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachMetricsService',
    methodName: 'prepareCreateMetric',
  },
  {
    name: toolNames.BLOOMREACH_METRICS_PREPARE_EDIT_TOOL,
    description:
      'Update an existing custom metric. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        metricId: {
          type: 'string',
          description: 'ID of the metric. Use bloomreach.metrics.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachMetricsService',
    methodName: 'prepareEditMetric',
  },
  {
    name: toolNames.BLOOMREACH_METRICS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a custom metric. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        metricId: {
          type: 'string',
          description: 'ID of the metric. Use bloomreach.metrics.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachMetricsService',
    methodName: 'prepareDeleteMetric',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_PROPERTIES_TOOL,
    description:
      'List all customer property definitions. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'listCustomerProperties',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_ADD_PROPERTY_TOOL,
    description:
      'Add a new customer property. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerId: {
          type: 'string',
          description: 'Customer identifier (e.g., registered ID or email).',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddCustomerProperty',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_EDIT_PROPERTY_TOOL,
    description:
      'Update an existing customer property. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerId: {
          type: 'string',
          description: 'Customer identifier (e.g., registered ID or email).',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareEditCustomerProperty',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_EVENTS_TOOL,
    description:
      'List all event definitions. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'listEvents',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_ADD_EVENT_TOOL,
    description:
      'Add a new event definition. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddEventDefinition',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_DEFINITIONS_TOOL,
    description:
      'List all data definitions. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'listFieldDefinitions',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_ADD_DEFINITION_TOOL,
    description:
      'Add a new definition. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddFieldDefinition',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_EDIT_DEFINITION_TOOL,
    description:
      'Update an existing definition. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareEditFieldDefinition',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_MAPPINGS_TOOL,
    description:
      'List all source-to-target mappings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'listMappings',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_CONFIGURE_MAPPING_TOOL,
    description:
      'Configure mapping between source and target fields. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        configuration: {
          type: 'object',
          description: 'Configuration object that defines source-to-target field mappings.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareConfigureMapping',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_CONTENT_SOURCES_TOOL,
    description:
      'List all content sources. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'listContentSources',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_ADD_CONTENT_SOURCE_TOOL,
    description:
      'Add a content source. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddContentSource',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_EDIT_CONTENT_SOURCE_TOOL,
    description:
      'Update an existing content source. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareEditContentSource',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_SAVE_CHANGES_TOOL,
    description:
      'Save pending Data Manager changes. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareSaveChanges',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_CONSENT_CATEGORIES_TOOL,
    description:
      'List consent categories configured in the project via the Bloomreach Data API. Returns { success, categories }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'listConsentCategories',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_LIST_TOOL,
    description:
      'List all configured exports. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'listExports',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_STATUS_TOOL,
    description:
      'View export status. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'viewExportStatus',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_HISTORY_TOOL,
    description:
      'View export history. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'viewExportHistory',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new export. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'prepareCreateExport',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_PREPARE_RUN_TOOL,
    description:
      'Run an export immediately. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'prepareRunExport',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_PREPARE_SCHEDULE_TOOL,
    description:
      'Configure a recurring schedule. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
        schedule: {
          type: 'object',
          description: 'Schedule settings (frequency, timezone, timing).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'prepareScheduleExport',
  },
  {
    name: toolNames.BLOOMREACH_EXPORTS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete an export. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachExportsService',
    methodName: 'prepareDeleteExport',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_LIST_TOOL,
    description:
      'List all configured integrations in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'listIntegrations',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_VIEW_TOOL,
    description:
      'View details of a specific integration. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'ID of the integration. Use bloomreach.integrations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'viewIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_PREPARE_CREATE_TOOL,
    description:
      'Create a new integration. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new integration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'prepareCreateIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_PREPARE_CONFIGURE_TOOL,
    description:
      'Update an integration configuration. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'ID of the integration. Use bloomreach.integrations.list to find available IDs.',
        },
        configuration: {
          type: 'object',
          description: 'Configuration object with the integration settings to apply.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'prepareConfigureIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_PREPARE_ENABLE_TOOL,
    description:
      'Enable an integration. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'ID of the integration. Use bloomreach.integrations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'prepareEnableIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_PREPARE_DISABLE_TOOL,
    description:
      'Disable an integration. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'ID of the integration. Use bloomreach.integrations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'prepareDisableIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete an integration. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'ID of the integration. Use bloomreach.integrations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'prepareDeleteIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INTEGRATIONS_PREPARE_TEST_TOOL,
    description:
      'Test integration connectivity. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        integrationId: {
          type: 'string',
          description: 'ID of the integration. Use bloomreach.integrations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachIntegrationsService',
    methodName: 'prepareTestIntegration',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_LIST_TOOL,
    description:
      'List all initiatives in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'listInitiatives',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_FILTER_TOOL,
    description:
      'Filter initiatives by date, tags, owner, or status. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
        filters: {
          type: 'object',
          description: 'Filtering options for narrowing results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'filterInitiatives',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_VIEW_TOOL,
    description:
      'View details of a specific initiative. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        initiativeId: {
          type: 'string',
          description: 'ID of the initiative. Use bloomreach.initiatives.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'viewInitiative',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_PREPARE_CREATE_TOOL,
    description:
      'Create a new initiative. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new initiative.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'prepareCreateInitiative',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_PREPARE_IMPORT_TOOL,
    description:
      'Import initiative configuration. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        importId: {
          type: 'string',
          description: 'ID of the import. Use bloomreach.imports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'prepareImportInitiative',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_PREPARE_ADD_ITEMS_TOOL,
    description:
      'Add items to an initiative. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        itemIds: {
          type: 'array',
          description: 'List of item IDs to attach.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'prepareAddItems',
  },
  {
    name: toolNames.BLOOMREACH_INITIATIVES_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive an initiative, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        initiativeId: {
          type: 'string',
          description: 'ID of the initiative. Use bloomreach.initiatives.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachInitiativesService',
    methodName: 'prepareArchiveInitiative',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_VIEW_TOOL,
    description:
      'View general project settings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'viewProjectSettings',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TOKEN_TOOL,
    description:
      'View the project token. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'viewProjectToken',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TERMS_TOOL,
    description:
      'View terms and conditions. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'viewTermsAndConditions',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_PREPARE_UPDATE_NAME_TOOL,
    description:
      'Update the project name. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateProjectName',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_PREPARE_UPDATE_URL_TOOL,
    description:
      'Update the custom URL. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateCustomUrl',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_PREPARE_UPDATE_TERMS_TOOL,
    description:
      'Update terms and conditions. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateTermsAndConditions',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TAGS_LIST_TOOL,
    description:
      'List custom tags. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'listCustomTags',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TAGS_PREPARE_CREATE_TOOL,
    description:
      'Create a new custom tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new custom tag.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareCreateCustomTag',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TAGS_PREPARE_UPDATE_TOOL,
    description:
      'Update a custom tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateCustomTag',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TAGS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a custom tag. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        tagId: {
          type: 'string',
          description: 'ID of the managed tag. Use bloomreach.tag_manager.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareDeleteCustomTag',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_VARIABLES_LIST_TOOL,
    description:
      'List project variables. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'listProjectVariables',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_VARIABLES_PREPARE_CREATE_TOOL,
    description:
      'Create a new project variable. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new project variable.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareCreateProjectVariable',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_VARIABLES_PREPARE_UPDATE_TOOL,
    description:
      'Update a project variable. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        variableName: {
          type: 'string',
          description: 'Name of the project variable. Use bloomreach.project_settings.variables.list to find available names.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateProjectVariable',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_VARIABLES_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a project variable. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        variableName: {
          type: 'string',
          description: 'Name of the project variable. Use bloomreach.project_settings.variables.list to find available names.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareDeleteProjectVariable',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_DEFAULTS_TOOL,
    description:
      'View campaign defaults. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'viewCampaignDefaults',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_PREPARE_UPDATE_DEFAULTS_TOOL,
    description:
      'Update campaign defaults. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateCampaignDefaults',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_TIMEZONES_LIST_TOOL,
    description:
      'List configured timezones. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listTimezones',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_TIMEZONES_PREPARE_CREATE_TOOL,
    description:
      'Create a new timezone. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new timezone.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateTimezone',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_TIMEZONES_PREPARE_UPDATE_TOOL,
    description:
      'Update a timezone. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        timezoneId: {
          type: 'string',
          description: 'ID of the timezone. Use bloomreach.campaign_settings.timezones.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateTimezone',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_TIMEZONES_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a timezone. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        timezoneId: {
          type: 'string',
          description: 'ID of the timezone. Use bloomreach.campaign_settings.timezones.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteTimezone',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_LANGUAGES_LIST_TOOL,
    description:
      'List configured languages. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listLanguages',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_LANGUAGES_PREPARE_CREATE_TOOL,
    description:
      'Create a new language. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new language.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateLanguage',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_LANGUAGES_PREPARE_UPDATE_TOOL,
    description:
      'Update a language. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        languageId: {
          type: 'string',
          description: 'ID of the language. Use bloomreach.campaign_settings.languages.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateLanguage',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_LANGUAGES_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a language. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        languageId: {
          type: 'string',
          description: 'ID of the language. Use bloomreach.campaign_settings.languages.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteLanguage',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FONTS_LIST_TOOL,
    description:
      'List configured fonts. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listFonts',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FONTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new font. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new font.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateFont',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FONTS_PREPARE_UPDATE_TOOL,
    description:
      'Update a font. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        fontId: {
          type: 'string',
          description: 'ID of the font. Use bloomreach.campaign_settings.fonts.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateFont',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FONTS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a font. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        fontId: {
          type: 'string',
          description: 'ID of the font. Use bloomreach.campaign_settings.fonts.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteFont',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_THROUGHPUT_LIST_TOOL,
    description:
      'List throughput policies. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listThroughputPolicies',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_THROUGHPUT_PREPARE_CREATE_TOOL,
    description:
      'Create a new throughput policy. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new throughput policy.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateThroughputPolicy',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_THROUGHPUT_PREPARE_UPDATE_TOOL,
    description:
      'Update a throughput policy. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        throughputPolicyId: {
          type: 'string',
          description: 'ID of the throughput policy. Use bloomreach.campaign_settings.throughput.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateThroughputPolicy',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_THROUGHPUT_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a throughput policy. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        throughputPolicyId: {
          type: 'string',
          description: 'ID of the throughput policy. Use bloomreach.campaign_settings.throughput.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteThroughputPolicy',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FREQUENCY_LIST_TOOL,
    description:
      'List frequency policies. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listFrequencyPolicies',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FREQUENCY_PREPARE_CREATE_TOOL,
    description:
      'Create a new frequency policy. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new frequency policy.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateFrequencyPolicy',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FREQUENCY_PREPARE_UPDATE_TOOL,
    description:
      'Update a frequency policy. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        frequencyPolicyId: {
          type: 'string',
          description: 'ID of the frequency policy. Use bloomreach.campaign_settings.frequency.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateFrequencyPolicy',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_FREQUENCY_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a frequency policy. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        frequencyPolicyId: {
          type: 'string',
          description: 'ID of the frequency policy. Use bloomreach.campaign_settings.frequency.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteFrequencyPolicy',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_CONSENTS_LIST_TOOL,
    description:
      'List consents. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listConsents',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_CONSENTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new consent. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new consent.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateConsent',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_CONSENTS_PREPARE_UPDATE_TOOL,
    description:
      'Update a consent. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        consentId: {
          type: 'string',
          description: 'ID of the consent. Use bloomreach.campaign_settings.consents.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateConsent',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_CONSENTS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a consent. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        consentId: {
          type: 'string',
          description: 'ID of the consent. Use bloomreach.campaign_settings.consents.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteConsent',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_URL_LISTS_LIST_TOOL,
    description:
      'List URL lists. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listUrlLists',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_URL_LISTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new URL list. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new URL list.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreateUrlList',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_URL_LISTS_PREPARE_UPDATE_TOOL,
    description:
      'Update a URL list. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        urlListId: {
          type: 'string',
          description: 'ID of the URL list. Use bloomreach.campaign_settings.url_lists.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateUrlList',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_URL_LISTS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a URL list. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        urlListId: {
          type: 'string',
          description: 'ID of the URL list. Use bloomreach.campaign_settings.url_lists.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeleteUrlList',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_PAGE_VARIABLES_LIST_TOOL,
    description:
      'List page variables. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'listPageVariables',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_PAGE_VARIABLES_PREPARE_CREATE_TOOL,
    description:
      'Create a new page variable. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new page variable.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareCreatePageVariable',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_PAGE_VARIABLES_PREPARE_UPDATE_TOOL,
    description:
      'Update a page variable. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        variableName: {
          type: 'string',
          description: 'Name of the project variable. Use bloomreach.project_settings.variables.list to find available names.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdatePageVariable',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_PAGE_VARIABLES_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a page variable. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        variableName: {
          type: 'string',
          description: 'Name of the project variable. Use bloomreach.project_settings.variables.list to find available names.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareDeletePageVariable',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_SSH_TUNNELS_LIST_TOOL,
    description:
      'List all configured SSH tunnels. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'listSshTunnels',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_SSH_TUNNELS_VIEW_TOOL,
    description:
      'View details of a configured SSH tunnel. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        sshTunnelId: {
          type: 'string',
          description: 'ID of the SSH tunnel. Use bloomreach.security_settings.ssh_tunnels.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'viewSshTunnel',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_SSH_TUNNELS_PREPARE_CREATE_TOOL,
    description:
      'Create a new SSH tunnel. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new SSH tunnel.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'prepareCreateSshTunnel',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_SSH_TUNNELS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete an SSH tunnel. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        sshTunnelId: {
          type: 'string',
          description: 'ID of the SSH tunnel. Use bloomreach.security_settings.ssh_tunnels.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'prepareDeleteSshTunnel',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_TWO_STEP_VIEW_TOOL,
    description:
      'View two-step verification settings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'viewTwoStepVerification',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_TWO_STEP_PREPARE_ENABLE_TOOL,
    description:
      'Enable two-step verification. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'prepareEnableTwoStep',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_TWO_STEP_PREPARE_DISABLE_TOOL,
    description:
      'Disable two-step verification. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'prepareDisableTwoStep',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_REVENUE_ATTRIBUTION_VIEW_TOOL,
    description:
      'View revenue attribution settings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'viewRevenueAttribution',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_REVENUE_ATTRIBUTION_PREPARE_CONFIGURE_TOOL,
    description:
      'Configure revenue attribution settings. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        configuration: {
          type: 'object',
          description: 'Configuration object with revenue attribution settings to apply.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'prepareConfigureRevenueAttribution',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_CURRENCY_VIEW_TOOL,
    description:
      'View currency settings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'viewCurrency',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_CURRENCY_PREPARE_SET_TOOL,
    description:
      'Update currency settings. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'prepareSetCurrency',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_DASHBOARDS_VIEW_TOOL,
    description:
      'View evaluation dashboard settings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        dashboardId: {
          type: 'string',
          description: 'ID of the dashboard. Use bloomreach.dashboards.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'viewEvaluationDashboards',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_DASHBOARDS_PREPARE_CONFIGURE_TOOL,
    description:
      'Configure evaluation dashboard settings. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        dashboardId: {
          type: 'string',
          description: 'ID of the dashboard. Use bloomreach.dashboards.list to find available IDs.',
        },
        configuration: {
          type: 'object',
          description: 'Configuration object with evaluation dashboard settings to apply.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'prepareConfigureEvaluationDashboards',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_VOUCHER_MAPPING_VIEW_TOOL,
    description:
      'View voucher mapping settings. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        voucherPoolId: {
          type: 'string',
          description: 'ID of the voucher pool. Use bloomreach.vouchers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'viewVoucherMapping',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_VOUCHER_MAPPING_PREPARE_CONFIGURE_TOOL,
    description:
      'Configure voucher mapping settings. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        voucherPoolId: {
          type: 'string',
          description: 'ID of the voucher pool. Use bloomreach.vouchers.list to find available IDs.',
        },
        configuration: {
          type: 'object',
          description: 'Configuration object with voucher mapping settings to apply.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'prepareConfigureVoucherMapping',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_LIST_TOOL,
    description:
      'List all weblayers in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'listWeblayers',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_VIEW_PERFORMANCE_TOOL,
    description:
      'View impressions, clicks and conversions for a weblayer. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        weblayerId: {
          type: 'string',
          description: 'ID of the weblayer. Use bloomreach.weblayers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'viewWeblayerPerformance',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_PREPARE_CREATE_TOOL,
    description:
      'Create a new weblayer. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new weblayer.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'prepareCreateWeblayer',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_PREPARE_START_TOOL,
    description:
      'Start a weblayer. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        weblayerId: {
          type: 'string',
          description: 'ID of the weblayer. Use bloomreach.weblayers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'prepareStartWeblayer',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_PREPARE_STOP_TOOL,
    description:
      'Stop a weblayer. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        weblayerId: {
          type: 'string',
          description: 'ID of the weblayer. Use bloomreach.weblayers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'prepareStopWeblayer',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing weblayer. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        weblayerId: {
          type: 'string',
          description: 'ID of the weblayer. Use bloomreach.weblayers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'prepareCloneWeblayer',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a weblayer, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        weblayerId: {
          type: 'string',
          description: 'ID of the weblayer. Use bloomreach.weblayers.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'prepareArchiveWeblayer',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_BEST_VARIANT_TOOL,
    description:
      'Get the best weblayer variant for a customer using Bloomreach contextual bandits (real-time personalization API). Returns the recommended variant based on multi-armed bandit optimization. Returns { success, bestVariant, response }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        banditId: {
          type: 'string',
          description: 'Bandit/experiment ID for the weblayer personalization.',
        },
        customerIds: {
          type: 'object',
          description: 'Customer identifier map (e.g. { cookie: "abc123" }).',
        },
        variants: {
          type: 'array',
          description:
            'Array of variant objects, each with an "id" field (e.g. [{ id: "variant_a" }, { id: "variant_b" }]).',
        },
      },
      required: ['project', 'banditId', 'customerIds', 'variants'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'getBestVariant',
  },
  {
    name: toolNames.BLOOMREACH_WEBLAYERS_REPORT_REWARD_TOOL,
    description:
      'Report a reward/conversion event for a weblayer variant to the Bloomreach contextual bandits API. Use after a customer converts on a specific variant to improve future personalization. Returns { success, response }; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        banditId: {
          type: 'string',
          description: 'Bandit/experiment ID for the weblayer personalization.',
        },
        customerIds: {
          type: 'object',
          description: 'Customer identifier map (e.g. { cookie: "abc123" }).',
        },
        variantId: {
          type: 'string',
          description: 'ID of the variant that led to the conversion.',
        },
        reward: {
          type: 'number',
          description: 'Optional reward value (defaults to 1 if omitted).',
        },
      },
      required: ['project', 'banditId', 'customerIds', 'variantId'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachWeblayersService',
    methodName: 'reportReward',
  },
  {
    name: toolNames.BLOOMREACH_REPORTS_LIST_TOOL,
    description:
      'List all reports in the project. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachReportsService',
    methodName: 'listReports',
  },
  {
    name: toolNames.BLOOMREACH_REPORTS_VIEW_RESULTS_TOOL,
    description:
      'View results of a specific report. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        reportId: {
          type: 'string',
          description: 'ID of the report. Use bloomreach.reports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachReportsService',
    methodName: 'viewReportResults',
  },
  {
    name: toolNames.BLOOMREACH_REPORTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new report. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new report.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachReportsService',
    methodName: 'prepareCreateReport',
  },
  {
    name: toolNames.BLOOMREACH_REPORTS_PREPARE_EXPORT_TOOL,
    description:
      'Export a report. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachReportsService',
    methodName: 'prepareExportReport',
  },
  {
    name: toolNames.BLOOMREACH_REPORTS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing report. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        reportId: {
          type: 'string',
          description: 'ID of the report. Use bloomreach.reports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachReportsService',
    methodName: 'prepareCloneReport',
  },
  {
    name: toolNames.BLOOMREACH_REPORTS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a report, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        reportId: {
          type: 'string',
          description: 'ID of the report. Use bloomreach.reports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachReportsService',
    methodName: 'prepareArchiveReport',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_LIST_TOOL,
    description:
      'List all segmentations in the project. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'listSegmentations',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_VIEW_SIZE_TOOL,
    description:
      'View the number of customers matching a segmentation. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'viewSegmentSize',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_VIEW_CUSTOMERS_TOOL,
    description:
      'Browse customers matching a segmentation. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerId: {
          type: 'string',
          description: 'Customer identifier (e.g., registered ID or email).',
        },
        idType: {
          type: 'string',
          description: 'Customer ID type (for example: registered, email, cookie).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'viewSegmentCustomers',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_PREPARE_CREATE_TOOL,
    description:
      'Create a new segmentation. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new segmentation.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'prepareCreateSegmentation',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing segmentation. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        segmentationId: {
          type: 'string',
          description: 'ID of the segmentation. Use bloomreach.segmentations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'prepareCloneSegmentation',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a segmentation, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        segmentationId: {
          type: 'string',
          description: 'ID of the segmentation. Use bloomreach.segmentations.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'prepareArchiveSegmentation',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_LIST_TOOL,
    description:
      'List all SQL reports in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'listSqlReports',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_VIEW_TOOL,
    description:
      'View details of a specific SQL report. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        sqlReportId: {
          type: 'string',
          description: 'ID of the SQL report. Use bloomreach.sql_reports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'viewSqlReport',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new SQL report. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new SQL report.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'prepareCreateSqlReport',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_PREPARE_EXECUTE_TOOL,
    description:
      'Run a SQL report. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        sqlReportId: {
          type: 'string',
          description: 'ID of the SQL report. Use bloomreach.sql_reports.list to find available IDs.',
        },
        parameters: {
          type: 'object',
          description: 'Runtime parameters for SQL execution/export.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'prepareExecuteSqlReport',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_PREPARE_EXPORT_RESULTS_TOOL,
    description:
      'Export SQL report results. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        exportId: {
          type: 'string',
          description: 'ID of the export configuration.',
        },
        parameters: {
          type: 'object',
          description: 'Runtime parameters for SQL execution/export.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'prepareExportSqlReportResults',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_PREPARE_CLONE_TOOL,
    description:
      'Create a copy of an existing SQL report. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        sqlReportId: {
          type: 'string',
          description: 'ID of the SQL report. Use bloomreach.sql_reports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'prepareCloneSqlReport',
  },
  {
    name: toolNames.BLOOMREACH_SQL_REPORTS_PREPARE_ARCHIVE_TOOL,
    description:
      'Archive a SQL report, removing it from active views. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        sqlReportId: {
          type: 'string',
          description: 'ID of the SQL report. Use bloomreach.sql_reports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachSqlReportsService',
    methodName: 'prepareArchiveSqlReport',
  },
  {
    name: toolNames.BLOOMREACH_CATALOGS_LIST_TOOL,
    description:
      'List all catalogs in the project. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCatalogsService',
    methodName: 'listCatalogs',
  },
  {
    name: toolNames.BLOOMREACH_CATALOGS_VIEW_ITEMS_TOOL,
    description:
      'View items in a specific catalog. Requires API credentials (BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        catalogId: {
          type: 'string',
          description: 'ID of the catalog. Use bloomreach.catalogs.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCatalogsService',
    methodName: 'viewCatalogItems',
  },
  {
    name: toolNames.BLOOMREACH_CATALOGS_PREPARE_CREATE_TOOL,
    description:
      'Create a new catalog. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new catalog.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCatalogsService',
    methodName: 'prepareCreateCatalog',
  },
  {
    name: toolNames.BLOOMREACH_CATALOGS_PREPARE_ADD_ITEMS_TOOL,
    description:
      'Add items to a catalog. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        catalogId: {
          type: 'string',
          description: 'ID of the catalog. Use bloomreach.catalogs.list to find available IDs.',
        },
        items: {
          type: 'array',
          description: 'Catalog items payload to add or update.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCatalogsService',
    methodName: 'prepareAddCatalogItems',
  },
  {
    name: toolNames.BLOOMREACH_CATALOGS_PREPARE_UPDATE_ITEMS_TOOL,
    description:
      'Update catalog items. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        catalogId: {
          type: 'string',
          description: 'ID of the catalog. Use bloomreach.catalogs.list to find available IDs.',
        },
        items: {
          type: 'array',
          description: 'Catalog items payload to add or update.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCatalogsService',
    methodName: 'prepareUpdateCatalogItems',
  },
  {
    name: toolNames.BLOOMREACH_CATALOGS_PREPARE_DELETE_TOOL,
    description:
      'Permanently delete a catalog. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        catalogId: {
          type: 'string',
          description: 'ID of the catalog. Use bloomreach.catalogs.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachCatalogsService',
    methodName: 'prepareDeleteCatalog',
  },
  {
    name: toolNames.BLOOMREACH_IMPORTS_LIST_TOOL,
    description:
      'List all data imports in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachImportsService',
    methodName: 'listImports',
  },
  {
    name: toolNames.BLOOMREACH_IMPORTS_VIEW_STATUS_TOOL,
    description:
      'View detailed status of a specific import. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        importId: {
          type: 'string',
          description: 'ID of the import. Use bloomreach.imports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachImportsService',
    methodName: 'viewImportStatus',
  },
  {
    name: toolNames.BLOOMREACH_IMPORTS_PREPARE_CREATE_TOOL,
    description:
      'Create a new data import. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new import.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachImportsService',
    methodName: 'prepareCreateImport',
  },
  {
    name: toolNames.BLOOMREACH_IMPORTS_PREPARE_SCHEDULE_TOOL,
    description:
      'Schedule a recurring data import. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        importId: {
          type: 'string',
          description: 'ID of the import. Use bloomreach.imports.list to find available IDs.',
        },
        schedule: {
          type: 'object',
          description: 'Schedule settings (frequency, timezone, timing).',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachImportsService',
    methodName: 'prepareScheduleImport',
  },
  {
    name: toolNames.BLOOMREACH_IMPORTS_PREPARE_CANCEL_TOOL,
    description:
      'Cancel an in-progress import. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        importId: {
          type: 'string',
          description: 'ID of the import. Use bloomreach.imports.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachImportsService',
    methodName: 'prepareCancelImport',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_LIST_TOOL,
    description:
      'List all available use case templates. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'listUseCases',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_SEARCH_TOOL,
    description:
      'Search use case templates by keyword. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
        query: {
          type: 'string',
          description: 'Search query string.',
        },
      },
      required: ['project', 'query'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'searchUseCases',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_VIEW_TOOL,
    description:
      'View details of a specific use case template. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        useCaseId: {
          type: 'string',
          description: 'ID of the use case template. Use bloomreach.use_cases.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'viewUseCase',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_PROJECT_LIST_TOOL,
    description:
      'List use cases deployed in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'listProjectUseCases',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_PREPARE_DEPLOY_TOOL,
    description:
      'Deploy a use case template. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        useCaseId: {
          type: 'string',
          description: 'ID of the use case template. Use bloomreach.use_cases.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'prepareDeployUseCase',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_PREPARE_FAVORITE_TOOL,
    description:
      'Favorite a use case. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        useCaseId: {
          type: 'string',
          description: 'ID of the use case template. Use bloomreach.use_cases.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'prepareFavoriteUseCase',
  },
  {
    name: toolNames.BLOOMREACH_USE_CASES_PREPARE_UNFAVORITE_TOOL,
    description:
      'Unfavorite a use case. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        useCaseId: {
          type: 'string',
          description: 'ID of the use case template. Use bloomreach.use_cases.list to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachUseCasesService',
    methodName: 'prepareUnfavoriteUseCase',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_LIST_MEMBERS_TOOL,
    description:
      'List all team members in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'listTeamMembers',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_PREPARE_INVITE_TOOL,
    description:
      'Invite a team member. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        memberId: {
          type: 'string',
          description: 'ID of the team member. Use bloomreach.access.list_members to find available IDs.',
        },
        email: {
          type: 'string',
          description: 'Email address of the teammate to invite.',
        },
        role: {
          type: 'string',
          description: 'Role to assign to the invited teammate.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'prepareInviteTeamMember',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_PREPARE_UPDATE_ROLE_TOOL,
    description:
      'Update a team member role. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        memberId: {
          type: 'string',
          description: 'ID of the team member. Use bloomreach.access.list_members to find available IDs.',
        },
        role: {
          type: 'string',
          description: 'New role for the target member.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'prepareUpdateMemberRole',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_PREPARE_REMOVE_MEMBER_TOOL,
    description:
      'Remove a team member. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        memberId: {
          type: 'string',
          description: 'ID of the team member. Use bloomreach.access.list_members to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'prepareRemoveTeamMember',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_LIST_API_KEYS_TOOL,
    description:
      'List all API keys in the project. ⚠️ Not yet available — coming in a future release.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of records to return.',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset for list/search results.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'listApiKeys',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_PREPARE_CREATE_API_KEY_TOOL,
    description:
      'Create an API key. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        name: {
          type: 'string',
          description: 'Display name for the new API key.',
        },
        scopes: {
          type: 'array',
          description: 'Permission scopes to include on the new API key.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'prepareCreateApiKey',
  },
  {
    name: toolNames.BLOOMREACH_ACCESS_PREPARE_DELETE_API_KEY_TOOL,
    description:
      'Permanently delete an API key. Returns a confirmToken — call bloomreach.actions.confirm to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        apiKeyId: {
          type: 'string',
          description: 'ID of the API key. Use bloomreach.access.list_api_keys to find available IDs.',
        },
      },
      required: ['project'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachAccessManagementService',
    methodName: 'prepareDeleteApiKey',
  },
  // --- Tracking tools (issue #177) ---
  {
    name: toolNames.BLOOMREACH_TRACKING_TRACK_EVENT_TOOL,
    description:
      'Track a customer event (purchase, page_view, session_start, etc.) via the Bloomreach Tracking API. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description:
            'Customer identifier map (e.g. { registered: "user@example.com" }). At least one ID required.',
        },
        eventType: {
          type: 'string',
          description:
            'Event type name (e.g. "purchase", "page_visit", "session_start", "cart_update").',
        },
        timestamp: {
          type: 'number',
          description: 'Unix epoch seconds for the event. Defaults to current server time.',
        },
        properties: {
          type: 'object',
          description: 'Arbitrary event properties (e.g. price, product_id, url).',
        },
      },
      required: ['project', 'customerIds', 'eventType'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrackingService',
    methodName: 'prepareTrackEvent',
  },
  {
    name: toolNames.BLOOMREACH_TRACKING_TRACK_BATCH_TOOL,
    description:
      'Track multiple events or customer updates in a single batch request via the Bloomreach Tracking API. Use for bulk operations. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        commands: {
          type: 'array',
          description:
            'Array of batch commands. Each command has: name ("customers" or "customers/events"), optional commandId, and data object.',
        },
      },
      required: ['project', 'commands'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrackingService',
    methodName: 'prepareTrackBatch',
  },
  {
    name: toolNames.BLOOMREACH_TRACKING_TRACK_CUSTOMER_TOOL,
    description:
      'Update customer properties via the Bloomreach Tracking API. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description:
            'Customer identifier map (e.g. { registered: "user@example.com" }). At least one ID required.',
        },
        properties: {
          type: 'object',
          description: 'Customer properties to set or update.',
        },
        updateTimestamp: {
          type: 'number',
          description: 'Unix epoch seconds for the update. Defaults to current server time.',
        },
      },
      required: ['project', 'customerIds', 'properties'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrackingService',
    methodName: 'prepareTrackCustomer',
  },
  {
    name: toolNames.BLOOMREACH_TRACKING_TRACK_CONSENT_TOOL,
    description:
      'Track a consent change event via the Bloomreach Tracking API. Use when recording customer consent acceptance or rejection. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description:
            'Customer identifier map (e.g. { registered: "user@example.com" }). At least one ID required.',
        },
        category: {
          type: 'string',
          description: 'Consent category (e.g. "email", "sms", "push", "tracking").',
        },
        action: {
          type: 'string',
          description: 'Consent action: "accept" or "reject".',
        },
        timestamp: {
          type: 'number',
          description: 'Unix epoch seconds for the consent event. Defaults to current server time.',
        },
        properties: {
          type: 'object',
          description: 'Additional consent properties.',
        },
      },
      required: ['project', 'customerIds', 'category', 'action'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrackingService',
    methodName: 'prepareTrackConsent',
  },
  {
    name: toolNames.BLOOMREACH_TRACKING_TRACK_CAMPAIGN_TOOL,
    description:
      'Track a campaign interaction event (banner click, email open, push tap, etc.) via the Bloomreach Tracking API. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Bloomreach project identifier. Defaults to BLOOMREACH_PROJECT when omitted.',
        },
        customerIds: {
          type: 'object',
          description:
            'Customer identifier map (e.g. { registered: "user@example.com" }). At least one ID required.',
        },
        campaignType: {
          type: 'string',
          description:
            'Campaign type (e.g. "email", "push", "sms", "in_app", "web_push", "banner").',
        },
        action: {
          type: 'string',
          description:
            'Campaign interaction action (e.g. "click", "open", "dismiss", "convert").',
        },
        timestamp: {
          type: 'number',
          description: 'Unix epoch seconds for the event. Defaults to current server time.',
        },
        properties: {
          type: 'object',
          description:
            'Additional campaign properties (e.g. campaign_id, variant, url).',
        },
      },
      required: ['project', 'customerIds', 'campaignType', 'action'],
      additionalProperties: true,
    },
    serviceClass: 'BloomreachTrackingService',
    methodName: 'prepareTrackCampaign',
  },
];

const toolByName = new Map<string, ToolRoute>(tools.map((tool) => [tool.name, tool]));

const server = new Server(
  { name: 'bloomreach-mcp', version: '0.0.1' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = isPlainObject(request.params.arguments) ? request.params.arguments : {};

  try {
    if (name === toolNames.BLOOMREACH_STATUS_TOOL) {
      const client = new core.BloomreachClient({
        environment: process.env.BLOOMREACH_ENVIRONMENT ?? 'not-configured',
        apiToken: process.env.BLOOMREACH_API_TOKEN ?? '',
        apiConfig,
      });
      const apiStatus = await client.status();

      // Also check browser session status
      let browserSession: core.BloomreachSessionStatus | undefined;
      try {
        const profilesDir = core.resolveProfilesDir();
        const profileManager = new core.BloomreachProfileManager({ profilesDir });
        const authService = new core.BloomreachAuthService(profileManager, { profilesDir });
        const profileName = typeof args.profile === 'string' ? args.profile : 'default';
        browserSession = await authService.status({ profileName });
      } catch {
        // Browser session check is best-effort — don't fail the status tool
      }

      return toToolResult({
        ...apiStatus,
        browserSession:
          browserSession ?? { authenticated: false, reason: 'Could not check browser session.' },
      });
    }

    if (name === toolNames.BLOOMREACH_SESSION_OPEN_LOGIN_TOOL) {
      const profilesDir = core.resolveProfilesDir();
      const profileManager = new core.BloomreachProfileManager({ profilesDir });
      const authService = new core.BloomreachAuthService(profileManager, { profilesDir });
      const result = await authService.openLogin({
        profileName: typeof args.profile === 'string' ? args.profile : undefined,
        timeoutMs: typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
        loginUrl: typeof args.loginUrl === 'string' ? args.loginUrl : undefined,
      });
      return toToolResult(result);
    }

    if (name === toolNames.BLOOMREACH_ACTIONS_CONFIRM_TOOL) {
      const confirmToken = typeof args.confirmToken === 'string' ? args.confirmToken : '';
      if (!confirmToken) {
        return toErrorResult(new Error('confirmToken is required.'));
      }
      const result = await twoPhaseCommit.confirmByToken({ confirmToken });
      return toToolResult(result);
    }

    if (name === toolNames.BLOOMREACH_ACTIONS_LIST_TOOL) {
      const status = typeof args.status === 'string' ? args.status : undefined;
      const limit = typeof args.limit === 'number' ? args.limit : undefined;
      const actions = twoPhaseCommit.listPreparedActions({ status, limit });
      return toToolResult(actions);
    }

    const route = toolByName.get(name);
    if (!route || !route.serviceClass || !route.methodName) {
      return toErrorResult(new Error(`Unknown tool: ${name}`));
    }

    // Validate input arguments against the tool's schema
    try {
      validateToolArgValueAgainstSchema(
        route.inputSchema as BloomreachMcpInputSchema,
        args,
        '',
      );
    } catch (validationError) {
      return toErrorResult(validationError);
    }

    const project = getProject(args);
    const ServiceCtor = getServiceConstructor(route.serviceClass);
    const service = new ServiceCtor(project, apiConfig);
    const methodCandidate = service[route.methodName];
    if (typeof methodCandidate !== 'function') {
      throw new BloomreachBuddyError('TARGET_NOT_FOUND', `Service method not found: ${route.serviceClass}.${route.methodName}`);
    }

    const result = await Promise.resolve(
      methodCandidate.call(service, normalizeInput(args, project)),
    );

    if (route.methodName && route.methodName.startsWith('prepare') && result && typeof result === 'object') {
      const prepareResult = result as Record<string, unknown>;
      const preview = prepareResult.preview as Record<string, unknown> | undefined;
      if (preview && typeof preview.action === 'string') {
        const tpcResult = twoPhaseCommit.prepare({
          actionType: preview.action,
          target: preview,
          payload: preview,
          preview,
          operatorNote:
            typeof preview.operatorNote === 'string' ? preview.operatorNote : undefined,
        });
        return toToolResult(tpcResult);
      }
    }

    return toToolResult(result);
  } catch (error) {
    return toErrorResult(error);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
