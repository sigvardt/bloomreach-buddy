#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as core from '@bloomreach-buddy/core';
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
    throw new Error('Missing project. Provide `project` argument or BLOOMREACH_PROJECT env var.');
  }
  return project;
}

function getServiceConstructor(serviceClass: string): ServiceConstructor {
  const coreExports = core as unknown as Record<string, unknown>;
  const candidate = coreExports[serviceClass];
  if (typeof candidate !== 'function') {
    throw new Error(`Missing service constructor: ${serviceClass}`);
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
    name: toolNames.BLOOMREACH_DASHBOARDS_LIST_TOOL,
    description:
      'List all dashboards in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of a new dashboard for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage setting a dashboard as the project home for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (dashboardId).',
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
      'Stage deletion of a dashboard for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (dashboardId).',
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
      'View project-wide revenue and conversion KPIs. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewProjectPerformance',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_CHANNEL_TOOL,
    description:
      'View per-channel engagement, deliverability and revenue metrics. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewChannelPerformance',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_USAGE_TOOL,
    description:
      'View Bloomreach billing, event-tracking and usage statistics. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewBloomreachUsage',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_OVERVIEW_TOOL,
    description:
      'View high-level project statistics. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewProjectOverview',
  },
  {
    name: toolNames.BLOOMREACH_PERFORMANCE_HEALTH_TOOL,
    description:
      'View project health and data-quality indicators. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachPerformanceService',
    methodName: 'viewProjectHealth',
  },
  {
    name: toolNames.BLOOMREACH_SCENARIOS_LIST_TOOL,
    description:
      'List all scenarios in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a specific scenario. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (scenarioId).',
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
      'Stage creation of a new scenario for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage starting a scenario for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (scenarioId).',
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
      'Stage stopping a scenario for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (scenarioId).',
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
      'Stage cloning a scenario for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (scenarioId).',
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
      'Stage archiving a scenario for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (scenarioId).',
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
      'List all email campaigns in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View delivery and engagement metrics for an email campaign. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEmailCampaignsService',
    methodName: 'viewCampaignResults',
  },
  {
    name: toolNames.BLOOMREACH_EMAIL_CAMPAIGNS_PREPARE_CREATE_TOOL,
    description:
      'Stage creation of a new email campaign for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage sending an email campaign for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (campaignId).',
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
      'Stage cloning an email campaign for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (campaignId).',
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
      'Stage archiving an email campaign for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (campaignId).',
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
      'Stage a transactional email for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes integration ID, recipient, email content, and campaign name.',
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
      'List all surveys in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View responses and analytics for a survey. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (surveyId).',
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
      'Stage creation of a new on-site survey for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage starting a survey for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (surveyId).',
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
      'Stage stopping a survey for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (surveyId).',
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
      'Stage archiving a survey for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (surveyId).',
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
      'View campaign calendar for a date range. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachCampaignCalendarService',
    methodName: 'viewCampaignCalendar',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGNS_CALENDAR_FILTER_TOOL,
    description:
      'Filter campaign calendar by type, status, or channel. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage export of campaign calendar data for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (exportId).',
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
      'List all trend analyses in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View time-series data for a trend analysis. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage creation of a new trend analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage cloning a trend analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage archiving a trend analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'List all funnel analyses in the project. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'View conversion rates and drop-off data for a funnel analysis. Use when you need live data from Bloomreach Engagement APIs. Returns an object with detailed fields; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage creation of a new funnel analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage cloning a funnel analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage archiving a funnel analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'List all retention analyses in the project. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'View cohort retention data for a retention analysis. Use when you need live data from Bloomreach Engagement APIs. Returns an object with detailed fields; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage creation of a new retention analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage cloning a retention analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage archiving a retention analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'List all flow analyses in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View journey paths, volumes and drop-offs for a flow analysis. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage creation of a new flow analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage cloning a flow analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage archiving a flow analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'List all geo analyses in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View geographic distribution data for a geo analysis. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage creation of a new geo analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage cloning a geo analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'Stage archiving a geo analysis for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (analysisId).',
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
      'List customer profiles in the project. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'Search customer profiles by query. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'View details for a customer profile. Use when you need live data from Bloomreach Engagement APIs. Returns an object with detailed fields; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
          description: 'Identifier for the target resource (customerId).',
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
      'Stage creation of a customer profile for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage update of a customer profile for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (customerId).',
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
      'Stage deletion of a customer profile for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (customerId).',
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
      'List all voucher pools in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View redemption status of vouchers in a pool. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (voucherPoolId).',
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
      'Stage creation of a new voucher pool for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage adding voucher codes to an existing pool for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (voucherPoolId).',
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
      'Stage deletion of a voucher pool for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (voucherPoolId).',
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
      'List all email templates in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of an email template for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'List all weblayer templates in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of a weblayer template for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'List all blocks in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of a block for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'List all custom rows in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of a custom row for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'List all snippets in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of a snippet for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage editing a snippet for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareEditSnippet',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_FILES_LIST_TOOL,
    description:
      'List all files in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage uploading a file for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareUploadFile',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_FILES_PREPARE_DELETE_TOOL,
    description:
      'Stage deleting a file for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareDeleteFile',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_PREPARE_CLONE_TOOL,
    description:
      'Stage cloning a template for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareCloneTemplate',
  },
  {
    name: toolNames.BLOOMREACH_ASSETS_PREPARE_ARCHIVE_TOOL,
    description:
      'Stage archiving a template for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachAssetManagerService',
    methodName: 'prepareArchiveTemplate',
  },
  {
    name: toolNames.BLOOMREACH_TAG_MANAGER_LIST_TOOL,
    description:
      'List all managed JavaScript tags. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a specific managed tag. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (tagId).',
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
      'Stage creation of a new managed JavaScript tag for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage enabling a managed tag for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (tagId).',
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
      'Stage disabling a managed tag for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (tagId).',
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
      'Stage editing a managed tag for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (tagId).',
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
      'Stage deletion of a managed tag for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (tagId).',
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
      'List all custom computed metrics in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creation of a custom metric for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage editing a custom metric for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (metricId).',
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
      'Stage deletion of a custom metric for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (metricId).',
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
      'List all customer property definitions. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage addition of a new customer property for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (customerId).',
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
      'Stage editing an existing customer property for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (customerId).',
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
      'List all event definitions. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage addition of a new event definition for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddEventDefinition',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_DEFINITIONS_TOOL,
    description:
      'List all data definitions. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage addition of a new definition for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddFieldDefinition',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_EDIT_DEFINITION_TOOL,
    description:
      'Stage editing an existing definition for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareEditFieldDefinition',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_LIST_MAPPINGS_TOOL,
    description:
      'List all source-to-target mappings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage mapping configuration between source and target fields for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Configuration payload for the target resource.',
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
      'List all content sources. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage addition of a content source for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareAddContentSource',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_EDIT_CONTENT_SOURCE_TOOL,
    description:
      'Stage editing of an existing content source for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachDataManagerService',
    methodName: 'prepareEditContentSource',
  },
  {
    name: toolNames.BLOOMREACH_DATA_MANAGER_PREPARE_SAVE_CHANGES_TOOL,
    description:
      'Stage saving pending Data Manager changes for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
      'List all configured exports. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View export status. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (exportId).',
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
      'View export history. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (exportId).',
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
      'Stage creation of a new export for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage triggering an immediate export for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (exportId).',
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
      'Stage configuring a recurring schedule for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (exportId).',
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
      'Stage deletion of an export for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (exportId).',
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
      'List all configured integrations in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a specific integration. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (integrationId).',
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
      'Stage creation of a new integration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage configuration update of an integration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (integrationId).',
        },
        configuration: {
          type: 'object',
          description: 'Configuration payload for the target resource.',
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
      'Stage enabling an integration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (integrationId).',
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
      'Stage disabling an integration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (integrationId).',
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
      'Stage deletion of an integration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (integrationId).',
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
      'Stage testing integration connectivity for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (integrationId).',
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
      'List all initiatives in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Filter initiatives by date, tags, owner, or status. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a specific initiative. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (initiativeId).',
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
      'Stage creation of a new initiative for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage importing initiative configuration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (importId).',
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
      'Stage adding items to an initiative for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
      'Stage archiving an initiative for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (initiativeId).',
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
      'View general project settings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'viewProjectSettings',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TOKEN_TOOL,
    description:
      'View the project token. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'viewProjectToken',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TERMS_TOOL,
    description:
      'View terms and conditions. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'viewTermsAndConditions',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_PREPARE_UPDATE_NAME_TOOL,
    description:
      'Stage project name update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateProjectName',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_PREPARE_UPDATE_URL_TOOL,
    description:
      'Stage custom URL update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateCustomUrl',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_PREPARE_UPDATE_TERMS_TOOL,
    description:
      'Stage terms and conditions update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachProjectSettingsService',
    methodName: 'prepareUpdateTermsAndConditions',
  },
  {
    name: toolNames.BLOOMREACH_PROJECT_SETTINGS_TAGS_LIST_TOOL,
    description:
      'List custom tags. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage custom tag creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage custom tag update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (tagId).',
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
      'Stage custom tag deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (tagId).',
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
      'List project variables. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage variable creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage variable update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (variableName).',
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
      'Stage variable deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (variableName).',
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
      'View campaign defaults. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'viewCampaignDefaults',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_PREPARE_UPDATE_DEFAULTS_TOOL,
    description:
      'Stage campaign defaults update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachCampaignSettingsService',
    methodName: 'prepareUpdateCampaignDefaults',
  },
  {
    name: toolNames.BLOOMREACH_CAMPAIGN_SETTINGS_TIMEZONES_LIST_TOOL,
    description:
      'List configured timezones. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage timezone creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage timezone update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (timezoneId).',
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
      'Stage timezone deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (timezoneId).',
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
      'List configured languages. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage language creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage language update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (languageId).',
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
      'Stage language deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (languageId).',
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
      'List configured fonts. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage font creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage font update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (fontId).',
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
      'Stage font deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (fontId).',
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
      'List throughput policies. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage throughput policy creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage throughput policy update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (throughputPolicyId).',
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
      'Stage throughput policy deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (throughputPolicyId).',
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
      'List frequency policies. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage frequency policy creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage frequency policy update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (frequencyPolicyId).',
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
      'Stage frequency policy deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (frequencyPolicyId).',
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
      'List consents. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage consent creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage consent update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (consentId).',
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
      'Stage consent deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (consentId).',
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
      'List URL lists. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage URL list creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage URL list update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (urlListId).',
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
      'Stage URL list deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (urlListId).',
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
      'List page variables. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage page variable creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage page variable update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (variableName).',
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
      'Stage page variable deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (variableName).',
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
      'List all configured SSH tunnels. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a configured SSH tunnel. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (sshTunnelId).',
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
      'Stage SSH tunnel creation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage SSH tunnel deletion for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (sshTunnelId).',
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
      'View two-step verification settings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'viewTwoStepVerification',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_TWO_STEP_PREPARE_ENABLE_TOOL,
    description:
      'Stage enabling two-step verification for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'prepareEnableTwoStep',
  },
  {
    name: toolNames.BLOOMREACH_SECURITY_SETTINGS_TWO_STEP_PREPARE_DISABLE_TOOL,
    description:
      'Stage disabling two-step verification for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSecuritySettingsService',
    methodName: 'prepareDisableTwoStep',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_REVENUE_ATTRIBUTION_VIEW_TOOL,
    description:
      'View revenue attribution settings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'viewRevenueAttribution',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_REVENUE_ATTRIBUTION_PREPARE_CONFIGURE_TOOL,
    description:
      'Stage revenue attribution configuration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Configuration payload for the target resource.',
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
      'View currency settings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'viewCurrency',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_CURRENCY_PREPARE_SET_TOOL,
    description:
      'Stage currency update for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachEvaluationSettingsService',
    methodName: 'prepareSetCurrency',
  },
  {
    name: toolNames.BLOOMREACH_EVALUATION_SETTINGS_DASHBOARDS_VIEW_TOOL,
    description:
      'View evaluation dashboard settings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (dashboardId).',
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
      'Stage evaluation dashboards configuration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (dashboardId).',
        },
        configuration: {
          type: 'object',
          description: 'Configuration payload for the target resource.',
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
      'View voucher mapping settings. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (voucherPoolId).',
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
      'Stage voucher mapping configuration for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (voucherPoolId).',
        },
        configuration: {
          type: 'object',
          description: 'Configuration payload for the target resource.',
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
      'List all weblayers in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View impressions, clicks and conversions for a weblayer. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (weblayerId).',
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
      'Stage creation of a new weblayer for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage starting a weblayer for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (weblayerId).',
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
      'Stage stopping a weblayer for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (weblayerId).',
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
      'Stage cloning a weblayer for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (weblayerId).',
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
      'Stage archiving a weblayer for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (weblayerId).',
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
      'List all reports in the project. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'View results of a specific report. Use when you need live data from Bloomreach Engagement APIs. Returns an object with detailed fields; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
          description: 'Identifier for the target resource (reportId).',
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
      'Stage creation of a new report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage export of a report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (exportId).',
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
      'Stage cloning of a report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (reportId).',
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
      'Stage archiving of a report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (reportId).',
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
      'List all segmentations in the project. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'View the number of customers matching a segmentation. Use when you need live data from Bloomreach Engagement APIs. Returns an object with detailed fields; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
    inputSchema: createInputSchema(true),
    serviceClass: 'BloomreachSegmentationsService',
    methodName: 'viewSegmentSize',
  },
  {
    name: toolNames.BLOOMREACH_SEGMENTATIONS_VIEW_CUSTOMERS_TOOL,
    description:
      'Browse customers matching a segmentation. Use when you need live data from Bloomreach Engagement APIs. Returns an array of records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
          description: 'Identifier for the target resource (customerId).',
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
      'Stage creation of a new segmentation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage cloning a segmentation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (segmentationId).',
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
      'Stage archiving a segmentation for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (segmentationId).',
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
      'List all SQL reports in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a specific SQL report. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (sqlReportId).',
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
      'Stage creation of a new SQL report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage execution of a SQL report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (sqlReportId).',
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
      'Stage export of SQL report results for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (exportId).',
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
      'Stage cloning a SQL report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (sqlReportId).',
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
      'Stage archiving a SQL report for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (sqlReportId).',
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
      'List all catalogs in the project. Use when you need live data from Bloomreach Engagement APIs. Returns an array of matching records; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'View items in a specific catalog. Use when you need live data from Bloomreach Engagement APIs. Returns an object with detailed fields; requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
          description: 'Identifier for the target resource (catalogId).',
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
      'Stage creation of a new catalog for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage adding items to a catalog for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (catalogId).',
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
      'Stage updating catalog items for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (catalogId).',
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
      'Stage deletion of a catalog for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (catalogId).',
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
      'List all data imports in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View detailed status of a specific import. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (importId).',
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
      'Stage creation of a new data import for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage scheduling a recurring data import for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (importId).',
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
      'Stage cancellation of an in-progress import for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (importId).',
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
      'List all available use case templates. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Search use case templates by keyword. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'View details of a specific use case template. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
          description: 'Identifier for the target resource (useCaseId).',
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
      'List use cases deployed in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage deployment of a use case template for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (useCaseId).',
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
      'Stage favoriting a use case for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (useCaseId).',
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
      'Stage unfavoriting a use case for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (useCaseId).',
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
      'List all team members in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage inviting a team member for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (memberId).',
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
      'Stage updating a team member role for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (memberId).',
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
      'Stage removing a team member for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (memberId).',
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
      'List all API keys in the project. Use when you need this data from Bloomreach project workflows. Returns { error: string }; currently returns an error - requires browser automation (not yet implemented).',
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
      'Stage creating an API key for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Human-readable name for the resource being created.',
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
      'Stage deleting an API key for two-phase commit. Returns a confirmToken that must be confirmed to execute. Preview: includes action type, project, target identifiers, and submitted fields.',
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
          description: 'Identifier for the target resource (apiKeyId).',
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
      'Track a customer event (purchase, page_view, session_start, etc.) via the Bloomreach Tracking API. Use when you need to record customer activity. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      'Update customer properties via the Bloomreach Tracking API. Use when you need to set or update customer attributes. Requires BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.',
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
      throw new Error(`Service method not found: ${route.serviceClass}.${route.methodName}`);
    }

    const result = await Promise.resolve(
      methodCandidate.call(service, normalizeInput(args, project)),
    );
    return toToolResult(result);
  } catch (error) {
    return toErrorResult(error);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
