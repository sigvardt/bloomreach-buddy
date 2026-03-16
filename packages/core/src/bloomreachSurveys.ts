import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireArray, requireString } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const CREATE_SURVEY_ACTION_TYPE = 'surveys.create_survey';
export const START_SURVEY_ACTION_TYPE = 'surveys.start_survey';
export const STOP_SURVEY_ACTION_TYPE = 'surveys.stop_survey';
export const ARCHIVE_SURVEY_ACTION_TYPE = 'surveys.archive_survey';

export const SURVEY_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const SURVEY_CREATE_RATE_LIMIT = 10;
export const SURVEY_MODIFY_RATE_LIMIT = 20;

export const SURVEY_STATUSES = ['active', 'inactive', 'draft', 'archived'] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export const SURVEY_QUESTION_TYPES = ['multiple_choice', 'text', 'rating', 'nps'] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  options?: string[];
  required?: boolean;
}

export interface SurveyDisplayConditions {
  audience?: string;
  pageUrl?: string;
  triggerEvent?: string;
  /** Delay in milliseconds before showing the survey. */
  delayMs?: number;
  /** How often to show (e.g. 'once', 'always', 'once_per_session'). */
  frequency?: string;
}

export interface BloomreachSurvey {
  id: string;
  name: string;
  status: SurveyStatus;
  questions: SurveyQuestion[];
  displayConditions?: SurveyDisplayConditions;
  templateId?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface SurveyResponseDistribution {
  questionId: string;
  questionText: string;
  answers: Record<string, number>;
}

export interface SurveyResults {
  surveyId: string;
  totalResponses: number;
  completionRate: number;
  responseDistribution: SurveyResponseDistribution[];
}

export interface ListSurveysInput {
  project: string;
  status?: string;
}

export interface ViewSurveyResultsInput {
  project: string;
  surveyId: string;
}

export interface CreateSurveyInput {
  project: string;
  name: string;
  questions: SurveyQuestion[];
  displayConditions?: SurveyDisplayConditions;
  templateId?: string;
  operatorNote?: string;
}

export interface StartSurveyInput {
  project: string;
  surveyId: string;
  operatorNote?: string;
}

export interface StopSurveyInput {
  project: string;
  surveyId: string;
  operatorNote?: string;
}

export interface ArchiveSurveyInput {
  project: string;
  surveyId: string;
  operatorNote?: string;
}

export interface PreparedSurveyAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_SURVEY_NAME_LENGTH = 200;
const MIN_SURVEY_NAME_LENGTH = 1;
const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 1;
const MAX_QUESTION_TEXT_LENGTH = 500;
const MIN_QUESTION_TEXT_LENGTH = 1;
const MAX_QUESTION_OPTIONS = 20;

export function validateSurveyName(name: string): string {
  requireString(name, 'survey name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_SURVEY_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Survey name must not be empty.');
  }
  if (trimmed.length > MAX_SURVEY_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Survey name must not exceed ${MAX_SURVEY_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateSurveyStatus(status: string): SurveyStatus {
  requireString(status, 'status');
  if (!SURVEY_STATUSES.includes(status as SurveyStatus)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `status must be one of: ${SURVEY_STATUSES.join(', ')} (got "${status}").`);
  }
  return status as SurveyStatus;
}

export function validateSurveyId(id: string): string {
  requireString(id, 'surveyId');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Survey ID must not be empty.');
  }
  return trimmed;
}

export function validateQuestionType(type: string): SurveyQuestionType {
  requireString(type, 'question type');
  if (!SURVEY_QUESTION_TYPES.includes(type as SurveyQuestionType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `question type must be one of: ${SURVEY_QUESTION_TYPES.join(', ')} (got "${type}").`);
  }
  return type as SurveyQuestionType;
}

export function validateQuestionText(text: string): string {
  requireString(text, 'question text');
  const trimmed = text.trim();
  if (trimmed.length < MIN_QUESTION_TEXT_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Question text must not be empty.');
  }
  if (trimmed.length > MAX_QUESTION_TEXT_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Question text must not exceed ${MAX_QUESTION_TEXT_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateQuestions(questions: SurveyQuestion[]): SurveyQuestion[] {
  requireArray(questions, 'questions');
  if (questions.length < MIN_QUESTIONS) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Survey must include at least ${MIN_QUESTIONS} question.`);
  }
  if (questions.length > MAX_QUESTIONS) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Survey must not exceed ${MAX_QUESTIONS} questions (got ${questions.length}).`);
  }

  return questions.map((question) => {
    const type = validateQuestionType(question.type);
    const text = validateQuestionText(question.text);

    if (question.options !== undefined && question.options.length > MAX_QUESTION_OPTIONS) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Question options must not exceed ${MAX_QUESTION_OPTIONS} entries (got ${question.options.length}).`);
    }

    return {
      ...question,
      type,
      text,
    };
  });
}

export function buildSurveysUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/surveys`;
}

function requireApiConfig(
  config: BloomreachApiConfig | undefined,
  operation: string,
): BloomreachApiConfig {
  if (!config) {
    throw new BloomreachBuddyError('CONFIG_MISSING', `${operation} requires API credentials. ` +
      'Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
      { missing: ['BLOOMREACH_PROJECT_TOKEN', 'BLOOMREACH_API_KEY_ID', 'BLOOMREACH_API_SECRET'] },
    );
  }
  return config;
}

void requireApiConfig;

export interface SurveyActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = CREATE_SURVEY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateSurveyExecutor: not yet implemented. ' +
      'Survey creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class StartSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = START_SURVEY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'StartSurveyExecutor: not yet implemented. ' +
      'Starting surveys is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class StopSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = STOP_SURVEY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'StopSurveyExecutor: not yet implemented. ' +
      'Stopping surveys is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class ArchiveSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = ARCHIVE_SURVEY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ArchiveSurveyExecutor: not yet implemented. ' +
      'Survey archiving is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createSurveyActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, SurveyActionExecutor> {
  return {
    [CREATE_SURVEY_ACTION_TYPE]: new CreateSurveyExecutor(apiConfig),
    [START_SURVEY_ACTION_TYPE]: new StartSurveyExecutor(apiConfig),
    [STOP_SURVEY_ACTION_TYPE]: new StopSurveyExecutor(apiConfig),
    [ARCHIVE_SURVEY_ACTION_TYPE]: new ArchiveSurveyExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement on-site surveys. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 *
 * **API support:** The Bloomreach Engagement API does not expose survey
 * management endpoints — survey creation, editing, starting/stopping, and
 * analytics are only available through the Bloomreach Engagement UI. This
 * service validates inputs and manages two-phase commit flows; browser
 * automation is required for actual execution.
 */
export class BloomreachSurveysService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildSurveysUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get surveysUrl(): string {
    return this.baseUrl;
  }

  async listSurveys(input?: ListSurveysInput): Promise<BloomreachSurvey[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateSurveyStatus(input.status);
      }
    }

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listSurveys: the Bloomreach API does not provide a list endpoint for surveys. ' +
      'Survey management is only available through the Bloomreach Engagement UI.');
  }

  async viewSurveyResults(input: ViewSurveyResultsInput): Promise<SurveyResults> {
    validateProject(input.project);
    validateSurveyId(input.surveyId);

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewSurveyResults: the Bloomreach API does not provide a survey results endpoint. ' +
      'Survey analytics are only available through the Bloomreach Engagement UI.');
  }

  prepareCreateSurvey(input: CreateSurveyInput): PreparedSurveyAction {
    const project = validateProject(input.project);
    const name = validateSurveyName(input.name);
    const questions = validateQuestions(input.questions);

    const preview = {
      action: CREATE_SURVEY_ACTION_TYPE,
      project,
      name,
      questions,
      displayConditions: input.displayConditions,
      templateId: input.templateId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareStartSurvey(input: StartSurveyInput): PreparedSurveyAction {
    const project = validateProject(input.project);
    const surveyId = validateSurveyId(input.surveyId);

    const preview = {
      action: START_SURVEY_ACTION_TYPE,
      project,
      surveyId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareStopSurvey(input: StopSurveyInput): PreparedSurveyAction {
    const project = validateProject(input.project);
    const surveyId = validateSurveyId(input.surveyId);

    const preview = {
      action: STOP_SURVEY_ACTION_TYPE,
      project,
      surveyId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareArchiveSurvey(input: ArchiveSurveyInput): PreparedSurveyAction {
    const project = validateProject(input.project);
    const surveyId = validateSurveyId(input.surveyId);

    const preview = {
      action: ARCHIVE_SURVEY_ACTION_TYPE,
      project,
      surveyId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }
}
