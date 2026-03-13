import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CREATE_SURVEY_ACTION_TYPE,
  START_SURVEY_ACTION_TYPE,
  STOP_SURVEY_ACTION_TYPE,
  ARCHIVE_SURVEY_ACTION_TYPE,
  SURVEY_RATE_LIMIT_WINDOW_MS,
  SURVEY_CREATE_RATE_LIMIT,
  SURVEY_MODIFY_RATE_LIMIT,
  SURVEY_STATUSES,
  SURVEY_QUESTION_TYPES,
  validateSurveyName,
  validateSurveyStatus,
  validateSurveyId,
  validateQuestionType,
  validateQuestionText,
  validateQuestions,
  buildSurveysUrl,
  createSurveyActionExecutors,
  BloomreachSurveysService,
} from '../index.js';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';

const TEST_API_CONFIG: BloomreachApiConfig = {
  projectToken: 'test-token-123',
  apiKeyId: 'key-id',
  apiSecret: 'key-secret',
  baseUrl: 'https://api.test.com',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action type constants', () => {
  it('exports CREATE_SURVEY_ACTION_TYPE', () => {
    expect(CREATE_SURVEY_ACTION_TYPE).toBe('surveys.create_survey');
  });

  it('exports START_SURVEY_ACTION_TYPE', () => {
    expect(START_SURVEY_ACTION_TYPE).toBe('surveys.start_survey');
  });

  it('exports STOP_SURVEY_ACTION_TYPE', () => {
    expect(STOP_SURVEY_ACTION_TYPE).toBe('surveys.stop_survey');
  });

  it('exports ARCHIVE_SURVEY_ACTION_TYPE', () => {
    expect(ARCHIVE_SURVEY_ACTION_TYPE).toBe('surveys.archive_survey');
  });
});

describe('rate limit constants', () => {
  it('exports SURVEY_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(SURVEY_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports SURVEY_CREATE_RATE_LIMIT', () => {
    expect(SURVEY_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports SURVEY_MODIFY_RATE_LIMIT', () => {
    expect(SURVEY_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('SURVEY_STATUSES', () => {
  it('contains 4 statuses', () => {
    expect(SURVEY_STATUSES).toHaveLength(4);
  });

  it('contains expected statuses in order', () => {
    expect(SURVEY_STATUSES).toEqual(['active', 'inactive', 'draft', 'archived']);
  });
});

describe('SURVEY_QUESTION_TYPES', () => {
  it('contains 4 question types', () => {
    expect(SURVEY_QUESTION_TYPES).toHaveLength(4);
  });

  it('contains expected question types in order', () => {
    expect(SURVEY_QUESTION_TYPES).toEqual(['multiple_choice', 'text', 'rating', 'nps']);
  });
});

describe('validateSurveyName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateSurveyName('  Product Feedback  ')).toBe('Product Feedback');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateSurveyName('\n\tProduct Feedback\t\n')).toBe('Product Feedback');
  });

  it('accepts single-character name', () => {
    expect(validateSurveyName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateSurveyName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateSurveyName('Survey: NPS v2')).toBe('Survey: NPS v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateSurveyName(name)).toBe(name);
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateSurveyName(' \t  Welcome Survey \n ')).toBe('Welcome Survey');
  });

  it('throws for empty string', () => {
    expect(() => validateSurveyName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSurveyName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateSurveyName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateSurveyName('\n\n')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateSurveyName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateSurveyStatus', () => {
  it('accepts active', () => {
    expect(validateSurveyStatus('active')).toBe('active');
  });

  it('accepts inactive', () => {
    expect(validateSurveyStatus('inactive')).toBe('inactive');
  });

  it('accepts draft', () => {
    expect(validateSurveyStatus('draft')).toBe('draft');
  });

  it('accepts archived', () => {
    expect(validateSurveyStatus('archived')).toBe('archived');
  });

  it('throws for unknown status', () => {
    expect(() => validateSurveyStatus('paused')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateSurveyStatus('')).toThrow('status must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateSurveyStatus('Active')).toThrow('status must be one of');
  });

  it('throws for value with trailing space', () => {
    expect(() => validateSurveyStatus('active ')).toThrow('status must be one of');
  });
});

describe('validateSurveyId', () => {
  it('returns trimmed survey ID for valid input', () => {
    expect(validateSurveyId('  survey-123  ')).toBe('survey-123');
  });

  it('returns same value when already trimmed', () => {
    expect(validateSurveyId('survey-456')).toBe('survey-456');
  });

  it('returns ID containing slashes', () => {
    expect(validateSurveyId('survey/group/a')).toBe('survey/group/a');
  });

  it('returns ID containing dots and dashes', () => {
    expect(validateSurveyId('survey.v2-alpha')).toBe('survey.v2-alpha');
  });

  it('throws for empty string', () => {
    expect(() => validateSurveyId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSurveyId('   ')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateSurveyId('\n')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateSurveyId('\t')).toThrow('must not be empty');
  });
});

describe('validateQuestionType', () => {
  it('accepts multiple_choice', () => {
    expect(validateQuestionType('multiple_choice')).toBe('multiple_choice');
  });

  it('accepts text', () => {
    expect(validateQuestionType('text')).toBe('text');
  });

  it('accepts rating', () => {
    expect(validateQuestionType('rating')).toBe('rating');
  });

  it('accepts nps', () => {
    expect(validateQuestionType('nps')).toBe('nps');
  });

  it('throws for unknown type', () => {
    expect(() => validateQuestionType('emoji')).toThrow('question type must be one of');
  });

  it('throws for empty type', () => {
    expect(() => validateQuestionType('')).toThrow('question type must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateQuestionType('Multiple_Choice')).toThrow('question type must be one of');
  });

  it('throws for value with trailing space', () => {
    expect(() => validateQuestionType('text ')).toThrow('question type must be one of');
  });
});

describe('validateQuestionText', () => {
  it('returns trimmed question text for valid input', () => {
    expect(validateQuestionText('  How likely are you to recommend us?  ')).toBe(
      'How likely are you to recommend us?',
    );
  });

  it('returns trimmed question text with tabs', () => {
    expect(validateQuestionText('\t How likely? \t')).toBe('How likely?');
  });

  it('accepts single-character text', () => {
    expect(validateQuestionText('?')).toBe('?');
  });

  it('accepts text at maximum length', () => {
    const questionText = 'x'.repeat(500);
    expect(validateQuestionText(questionText)).toBe(questionText);
  });

  it('throws for empty text', () => {
    expect(() => validateQuestionText('')).toThrow('must not be empty');
  });

  it('throws for too-long question text', () => {
    expect(() => validateQuestionText('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });

  it('throws for tab-only text', () => {
    expect(() => validateQuestionText('\t\t')).toThrow('must not be empty');
  });
});

describe('validateQuestions', () => {
  it('returns validated questions for valid input array', () => {
    const questions = [
      {
        id: 'q1',
        type: 'multiple_choice' as const,
        text: '  Which plan are you on?  ',
        options: ['Free', 'Pro'],
        required: true,
      },
      {
        id: 'q2',
        type: 'text' as const,
        text: 'Any additional feedback?',
      },
    ];

    expect(validateQuestions(questions)).toEqual([
      {
        id: 'q1',
        type: 'multiple_choice',
        text: 'Which plan are you on?',
        options: ['Free', 'Pro'],
        required: true,
      },
      {
        id: 'q2',
        type: 'text',
        text: 'Any additional feedback?',
      },
    ]);
  });

  it('throws for empty questions array', () => {
    expect(() => validateQuestions([])).toThrow('at least 1 question');
  });

  it('throws for too many questions', () => {
    const questions = Array.from({ length: 51 }, (_, index) => ({
      id: `q${index + 1}`,
      type: 'text' as const,
      text: `Question ${index + 1}`,
    }));

    expect(() => validateQuestions(questions)).toThrow('must not exceed 50 questions');
  });

  it('throws for invalid question type', () => {
    expect(() =>
      validateQuestions([
        {
          id: 'q1',
          type: 'emoji' as never,
          text: 'How was your experience?',
        },
      ]),
    ).toThrow('question type must be one of');
  });

  it('throws for invalid question text', () => {
    expect(() =>
      validateQuestions([
        {
          id: 'q1',
          type: 'text',
          text: '   ',
        },
      ]),
    ).toThrow('Question text must not be empty');
  });

  it('throws for too many options', () => {
    expect(() =>
      validateQuestions([
        {
          id: 'q1',
          type: 'multiple_choice',
          text: 'Pick one',
          options: Array.from({ length: 21 }, (_, index) => `Option ${index + 1}`),
        },
      ]),
    ).toThrow('must not exceed 20 entries');
  });

  it('validates required field preservation', () => {
    const result = validateQuestions([
      {
        id: 'q1',
        type: 'text',
        text: 'How was your experience?',
        required: false,
      },
    ]);

    expect(result[0]).toEqual(
      expect.objectContaining({
        required: false,
      }),
    );
  });

  it('validates question without options', () => {
    expect(
      validateQuestions([
        {
          id: 'q1',
          type: 'text',
          text: 'Any follow-up comments?',
        },
      ]),
    ).toEqual([
      {
        id: 'q1',
        type: 'text',
        text: 'Any follow-up comments?',
      },
    ]);
  });

  it('accepts maximum number of options (20)', () => {
    const options = Array.from({ length: 20 }, (_, index) => `Option ${index + 1}`);
    const result = validateQuestions([
      {
        id: 'q1',
        type: 'multiple_choice',
        text: 'Pick one',
        options,
      },
    ]);

    expect(result[0]).toEqual(
      expect.objectContaining({
        options,
      }),
    );
  });

  it('accepts maximum number of questions (50)', () => {
    const questions = Array.from({ length: 50 }, (_, index) => ({
      id: `q${index + 1}`,
      type: 'text' as const,
      text: `Question ${index + 1}`,
    }));

    const result = validateQuestions(questions);
    expect(result).toHaveLength(50);
  });
});

describe('buildSurveysUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildSurveysUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/campaigns/surveys');
  });

  it('encodes spaces in project name', () => {
    expect(buildSurveysUrl('my project')).toBe('/p/my%20project/campaigns/surveys');
  });

  it('encodes slashes in project name', () => {
    expect(buildSurveysUrl('org/project')).toBe('/p/org%2Fproject/campaigns/surveys');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildSurveysUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/campaigns/surveys');
  });

  it('encodes hash character in project name', () => {
    expect(buildSurveysUrl('my#project')).toBe('/p/my%23project/campaigns/surveys');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildSurveysUrl('team-alpha')).toBe('/p/team-alpha/campaigns/surveys');
  });
});

describe('createSurveyActionExecutors', () => {
  it('returns executors for all four action types', () => {
    const executors = createSurveyActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
    expect(executors[CREATE_SURVEY_ACTION_TYPE]).toBeDefined();
    expect(executors[START_SURVEY_ACTION_TYPE]).toBeDefined();
    expect(executors[STOP_SURVEY_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_SURVEY_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createSurveyActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createSurveyActionExecutors();
    await expect(executors[CREATE_SURVEY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('start executor throws "not yet implemented" on execute', async () => {
    const executors = createSurveyActionExecutors();
    await expect(executors[START_SURVEY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('stop executor throws "not yet implemented" on execute', async () => {
    const executors = createSurveyActionExecutors();
    await expect(executors[STOP_SURVEY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('archive executor throws "not yet implemented" on execute', async () => {
    const executors = createSurveyActionExecutors();
    await expect(executors[ARCHIVE_SURVEY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createSurveyActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(4);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createSurveyActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachSurveysService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachSurveysService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachSurveysService);
    });

    it('exposes the surveys URL', () => {
      const service = new BloomreachSurveysService('kingdom-of-joakim');
      expect(service.surveysUrl).toBe('/p/kingdom-of-joakim/campaigns/surveys');
    });

    it('trims project name', () => {
      const service = new BloomreachSurveysService('  my-project  ');
      expect(service.surveysUrl).toBe('/p/my-project/campaigns/surveys');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachSurveysService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachSurveysService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachSurveysService('org/project');
      expect(service.surveysUrl).toBe('/p/org%2Fproject/campaigns/surveys');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachSurveysService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachSurveysService);
    });

    it('exposes surveys URL when constructed with apiConfig', () => {
      const service = new BloomreachSurveysService('test', TEST_API_CONFIG);
      expect(service.surveysUrl).toBe('/p/test/campaigns/surveys');
    });
  });

  describe('listSurveys', () => {
    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.listSurveys()).rejects.toThrow('does not provide');
    });

    it('validates status when provided', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.listSurveys({ project: 'test', status: 'paused' })).rejects.toThrow(
        'status must be one of',
      );
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.listSurveys({ project: '', status: 'active' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.listSurveys({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.listSurveys({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'does not provide',
      );
    });
  });

  describe('viewSurveyResults', () => {
    it('throws no-survey-results-endpoint error with valid input', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(
        service.viewSurveyResults({ project: 'test', surveyId: 'survey-1' }),
      ).rejects.toThrow('does not provide');
    });

    it('validates project input', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(
        service.viewSurveyResults({ project: '', surveyId: 'survey-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates surveyId input', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.viewSurveyResults({ project: 'test', surveyId: '   ' })).rejects.toThrow(
        'Survey ID must not be empty',
      );
    });

    it('throws no-API-endpoint error with trimmed inputs', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(
        service.viewSurveyResults({ project: '  test  ', surveyId: '  survey-1  ' }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('prepareCreateSurvey', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareCreateSurvey({
        project: 'test',
        name: 'Product Satisfaction Survey',
        questions: [{ id: 'q1', type: 'text', text: 'How can we improve?' }],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'surveys.create_survey',
          project: 'test',
          name: 'Product Satisfaction Survey',
        }),
      );
    });

    it('includes questions in preview', () => {
      const service = new BloomreachSurveysService('test');
      const questions = [
        {
          id: 'q1',
          type: 'multiple_choice' as const,
          text: 'What is your role?',
          options: ['Engineer', 'Designer'],
        },
      ];

      const result = service.prepareCreateSurvey({
        project: 'test',
        name: 'Role Survey',
        questions,
      });

      expect(result.preview).toEqual(expect.objectContaining({ questions }));
    });

    it('includes displayConditions in preview', () => {
      const service = new BloomreachSurveysService('test');
      const displayConditions = {
        audience: 'returning-users',
        pageUrl: '/checkout',
        triggerEvent: 'cart_abandon',
        delayMs: 5000,
        frequency: 'once_per_session',
      };

      const result = service.prepareCreateSurvey({
        project: 'test',
        name: 'Checkout Survey',
        questions: [{ id: 'q1', type: 'rating', text: 'Rate your checkout experience' }],
        displayConditions,
      });

      expect(result.preview).toEqual(expect.objectContaining({ displayConditions }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareCreateSurvey({
        project: 'test',
        name: 'Survey',
        questions: [{ id: 'q1', type: 'nps', text: 'How likely are you to recommend us?' }],
        operatorNote: 'Roll out for cohort A',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Roll out for cohort A' }),
      );
    });

    it('includes templateId in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareCreateSurvey({
        project: 'test',
        name: 'Templated Survey',
        questions: [{ id: 'q1', type: 'text', text: 'Share your thoughts' }],
        templateId: 'template-123',
      });

      expect(result.preview).toEqual(expect.objectContaining({ templateId: 'template-123' }));
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareCreateSurvey({
        project: '  my-project  ',
        name: '  Product Satisfaction Survey  ',
        questions: [{ id: 'q1', type: 'text', text: 'How can we improve?' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'Product Satisfaction Survey',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachSurveysService('test');
      expect(() =>
        service.prepareCreateSurvey({
          project: 'test',
          name: '',
          questions: [{ id: 'q1', type: 'text', text: 'Question' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachSurveysService('test');
      expect(() =>
        service.prepareCreateSurvey({
          project: 'test',
          name: '   ',
          questions: [{ id: 'q1', type: 'text', text: 'Question' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() =>
        service.prepareCreateSurvey({
          project: '',
          name: 'Survey',
          questions: [{ id: 'q1', type: 'text', text: 'Question' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() =>
        service.prepareCreateSurvey({
          project: '   ',
          name: 'Survey',
          questions: [{ id: 'q1', type: 'text', text: 'Question' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty questions array', () => {
      const service = new BloomreachSurveysService('test');
      expect(() =>
        service.prepareCreateSurvey({
          project: 'test',
          name: 'Survey',
          questions: [],
        }),
      ).toThrow('at least 1 question');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachSurveysService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateSurvey({
        project: 'test',
        name: maxName,
        questions: [{ id: 'q1', type: 'text', text: 'Question' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });
  });

  describe('prepareStartSurvey', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareStartSurvey({
        project: 'test',
        surveyId: 'survey-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'surveys.start_survey',
          project: 'test',
          surveyId: 'survey-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareStartSurvey({
        project: 'test',
        surveyId: 'survey-123',
        operatorNote: 'Start after release train',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Start after release train' }),
      );
    });

    it('throws for empty surveyId', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStartSurvey({ project: 'test', surveyId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only surveyId', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStartSurvey({ project: 'test', surveyId: '   ' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStartSurvey({ project: '', surveyId: 'survey-123' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStartSurvey({ project: '   ', surveyId: 'survey-123' })).toThrow(
        'must not be empty',
      );
    });

    it('trims surveyId in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareStartSurvey({
        project: 'test',
        surveyId: '  survey-123  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          surveyId: 'survey-123',
        }),
      );
    });
  });

  describe('prepareStopSurvey', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareStopSurvey({
        project: 'test',
        surveyId: 'survey-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'surveys.stop_survey',
          project: 'test',
          surveyId: 'survey-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareStopSurvey({
        project: 'test',
        surveyId: 'survey-456',
        operatorNote: 'Pause to adjust targeting',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Pause to adjust targeting' }),
      );
    });

    it('throws for empty surveyId', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStopSurvey({ project: 'test', surveyId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only surveyId', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStopSurvey({ project: 'test', surveyId: '   ' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStopSurvey({ project: '', surveyId: 'survey-456' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStopSurvey({ project: '   ', surveyId: 'survey-456' })).toThrow(
        'must not be empty',
      );
    });

    it('trims surveyId in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareStopSurvey({
        project: 'test',
        surveyId: '  survey-456  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          surveyId: 'survey-456',
        }),
      );
    });
  });

  describe('prepareArchiveSurvey', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareArchiveSurvey({
        project: 'test',
        surveyId: 'survey-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'surveys.archive_survey',
          project: 'test',
          surveyId: 'survey-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareArchiveSurvey({
        project: 'test',
        surveyId: 'survey-900',
        operatorNote: 'Archive after collection ends',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive after collection ends' }),
      );
    });

    it('throws for empty surveyId', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareArchiveSurvey({ project: 'test', surveyId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only surveyId', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareArchiveSurvey({ project: 'test', surveyId: '   ' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareArchiveSurvey({ project: '', surveyId: 'survey-900' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareArchiveSurvey({ project: '   ', surveyId: 'survey-900' })).toThrow(
        'must not be empty',
      );
    });

    it('accepts trimmed surveyId and reaches prepared state', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareArchiveSurvey({
        project: 'test',
        surveyId: '  survey-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          surveyId: 'survey-900',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareArchiveSurvey({
        project: '  my-project  ',
        surveyId: 'survey-900',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('keeps slash-containing surveyId after trim', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareArchiveSurvey({
        project: 'test',
        surveyId: '  survey/group/a  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          surveyId: 'survey/group/a',
        }),
      );
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachSurveysService('test');
      const result = service.prepareArchiveSurvey({
        project: 'test',
        surveyId: 'survey-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});
