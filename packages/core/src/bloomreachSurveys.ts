import { validateProject } from './bloomreachDashboards.js';

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
  const trimmed = name.trim();
  if (trimmed.length < MIN_SURVEY_NAME_LENGTH) {
    throw new Error('Survey name must not be empty.');
  }
  if (trimmed.length > MAX_SURVEY_NAME_LENGTH) {
    throw new Error(
      `Survey name must not exceed ${MAX_SURVEY_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateSurveyStatus(status: string): SurveyStatus {
  if (!SURVEY_STATUSES.includes(status as SurveyStatus)) {
    throw new Error(
      `status must be one of: ${SURVEY_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as SurveyStatus;
}

export function validateSurveyId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Survey ID must not be empty.');
  }
  return trimmed;
}

export function validateQuestionType(type: string): SurveyQuestionType {
  if (!SURVEY_QUESTION_TYPES.includes(type as SurveyQuestionType)) {
    throw new Error(
      `question type must be one of: ${SURVEY_QUESTION_TYPES.join(', ')} (got "${type}").`,
    );
  }
  return type as SurveyQuestionType;
}

export function validateQuestionText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < MIN_QUESTION_TEXT_LENGTH) {
    throw new Error('Question text must not be empty.');
  }
  if (trimmed.length > MAX_QUESTION_TEXT_LENGTH) {
    throw new Error(
      `Question text must not exceed ${MAX_QUESTION_TEXT_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateQuestions(questions: SurveyQuestion[]): SurveyQuestion[] {
  if (questions.length < MIN_QUESTIONS) {
    throw new Error(`Survey must include at least ${MIN_QUESTIONS} question.`);
  }
  if (questions.length > MAX_QUESTIONS) {
    throw new Error(`Survey must not exceed ${MAX_QUESTIONS} questions (got ${questions.length}).`);
  }

  return questions.map((question) => {
    const type = validateQuestionType(question.type);
    const text = validateQuestionText(question.text);

    if (question.options !== undefined && question.options.length > MAX_QUESTION_OPTIONS) {
      throw new Error(
        `Question options must not exceed ${MAX_QUESTION_OPTIONS} entries (got ${question.options.length}).`,
      );
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

export interface SurveyActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = CREATE_SURVEY_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateSurveyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class StartSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = START_SURVEY_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'StartSurveyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class StopSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = STOP_SURVEY_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'StopSurveyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveSurveyExecutor implements SurveyActionExecutor {
  readonly actionType = ARCHIVE_SURVEY_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveSurveyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createSurveyActionExecutors(): Record<string, SurveyActionExecutor> {
  return {
    [CREATE_SURVEY_ACTION_TYPE]: new CreateSurveyExecutor(),
    [START_SURVEY_ACTION_TYPE]: new StartSurveyExecutor(),
    [STOP_SURVEY_ACTION_TYPE]: new StopSurveyExecutor(),
    [ARCHIVE_SURVEY_ACTION_TYPE]: new ArchiveSurveyExecutor(),
  };
}

export class BloomreachSurveysService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildSurveysUrl(validateProject(project));
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

    throw new Error(
      'listSurveys: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewSurveyResults(input: ViewSurveyResultsInput): Promise<SurveyResults> {
    validateProject(input.project);
    validateSurveyId(input.surveyId);

    throw new Error(
      'viewSurveyResults: not yet implemented. Requires browser automation infrastructure.',
    );
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
