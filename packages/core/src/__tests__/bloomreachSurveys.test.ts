import { describe, it, expect } from 'vitest';
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

  it('accepts single-character name', () => {
    expect(validateSurveyName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateSurveyName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateSurveyName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSurveyName('   ')).toThrow('must not be empty');
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
});

describe('validateSurveyId', () => {
  it('returns trimmed survey ID for valid input', () => {
    expect(validateSurveyId('  survey-123  ')).toBe('survey-123');
  });

  it('throws for empty string', () => {
    expect(() => validateSurveyId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSurveyId('   ')).toThrow('must not be empty');
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
});

describe('validateQuestionText', () => {
  it('returns trimmed question text for valid input', () => {
    expect(validateQuestionText('  How likely are you to recommend us?  ')).toBe(
      'How likely are you to recommend us?',
    );
  });

  it('throws for empty text', () => {
    expect(() => validateQuestionText('')).toThrow('must not be empty');
  });

  it('throws for too-long question text', () => {
    expect(() => validateQuestionText('x'.repeat(501))).toThrow('must not exceed 500 characters');
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

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createSurveyActionExecutors();
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
  });

  describe('listSurveys', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(service.listSurveys()).rejects.toThrow('not yet implemented');
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
  });

  describe('viewSurveyResults', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachSurveysService('test');
      await expect(
        service.viewSurveyResults({ project: 'test', surveyId: 'survey-1' }),
      ).rejects.toThrow('not yet implemented');
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

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStartSurvey({ project: '', surveyId: 'survey-123' })).toThrow(
        'must not be empty',
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

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareStopSurvey({ project: '', surveyId: 'survey-456' })).toThrow(
        'must not be empty',
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

    it('throws for empty project', () => {
      const service = new BloomreachSurveysService('test');
      expect(() => service.prepareArchiveSurvey({ project: '', surveyId: 'survey-900' })).toThrow(
        'must not be empty',
      );
    });
  });
});
