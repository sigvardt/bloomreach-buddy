import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE,
  CREATE_TIMEZONE_ACTION_TYPE,
  UPDATE_TIMEZONE_ACTION_TYPE,
  DELETE_TIMEZONE_ACTION_TYPE,
  CREATE_LANGUAGE_ACTION_TYPE,
  UPDATE_LANGUAGE_ACTION_TYPE,
  DELETE_LANGUAGE_ACTION_TYPE,
  CREATE_FONT_ACTION_TYPE,
  UPDATE_FONT_ACTION_TYPE,
  DELETE_FONT_ACTION_TYPE,
  CREATE_THROUGHPUT_POLICY_ACTION_TYPE,
  UPDATE_THROUGHPUT_POLICY_ACTION_TYPE,
  DELETE_THROUGHPUT_POLICY_ACTION_TYPE,
  CREATE_FREQUENCY_POLICY_ACTION_TYPE,
  UPDATE_FREQUENCY_POLICY_ACTION_TYPE,
  DELETE_FREQUENCY_POLICY_ACTION_TYPE,
  CREATE_CONSENT_ACTION_TYPE,
  UPDATE_CONSENT_ACTION_TYPE,
  DELETE_CONSENT_ACTION_TYPE,
  CREATE_URL_LIST_ACTION_TYPE,
  UPDATE_URL_LIST_ACTION_TYPE,
  DELETE_URL_LIST_ACTION_TYPE,
  CREATE_PAGE_VARIABLE_ACTION_TYPE,
  UPDATE_PAGE_VARIABLE_ACTION_TYPE,
  DELETE_PAGE_VARIABLE_ACTION_TYPE,
  CAMPAIGN_SETTINGS_RATE_LIMIT_WINDOW_MS,
  CAMPAIGN_SETTINGS_MODIFY_RATE_LIMIT,
  CAMPAIGN_SETTINGS_TIMEZONE_RATE_LIMIT,
  CAMPAIGN_SETTINGS_LANGUAGE_RATE_LIMIT,
  CAMPAIGN_SETTINGS_FONT_RATE_LIMIT,
  CAMPAIGN_SETTINGS_POLICY_RATE_LIMIT,
  CAMPAIGN_SETTINGS_CONSENT_RATE_LIMIT,
  CAMPAIGN_SETTINGS_URL_LIST_RATE_LIMIT,
  CAMPAIGN_SETTINGS_PAGE_VARIABLE_RATE_LIMIT,
  validateTimezoneName,
  validateTimezoneId,
  validateLanguageCode,
  validateLanguageName,
  validateFontName,
  validateFontId,
  validatePolicyName,
  validatePolicyId,
  validateConsentCategory,
  validateConsentId,
  validateUrlListName,
  validateUrlListId,
  validatePageVariableName,
  validatePageVariableId,
  validatePageVariableValue,
  buildCampaignSettingsUrl,
  buildTimezonesUrl,
  buildLanguagesUrl,
  buildFontsUrl,
  buildThroughputPolicyUrl,
  buildFrequencyPoliciesUrl,
  buildConsentsUrl,
  buildGlobalUrlListsUrl,
  buildPageVariablesUrl,
  createCampaignSettingsActionExecutors,
  BloomreachCampaignSettingsService,
} from '../index.js';

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
  it('exports UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE', () => {
    expect(UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE).toBe('campaign_settings.update_campaign_defaults');
  });

  it('exports CREATE_TIMEZONE_ACTION_TYPE', () => {
    expect(CREATE_TIMEZONE_ACTION_TYPE).toBe('campaign_settings.create_timezone');
  });

  it('exports UPDATE_TIMEZONE_ACTION_TYPE', () => {
    expect(UPDATE_TIMEZONE_ACTION_TYPE).toBe('campaign_settings.update_timezone');
  });

  it('exports DELETE_TIMEZONE_ACTION_TYPE', () => {
    expect(DELETE_TIMEZONE_ACTION_TYPE).toBe('campaign_settings.delete_timezone');
  });

  it('exports CREATE_LANGUAGE_ACTION_TYPE', () => {
    expect(CREATE_LANGUAGE_ACTION_TYPE).toBe('campaign_settings.create_language');
  });

  it('exports UPDATE_LANGUAGE_ACTION_TYPE', () => {
    expect(UPDATE_LANGUAGE_ACTION_TYPE).toBe('campaign_settings.update_language');
  });

  it('exports DELETE_LANGUAGE_ACTION_TYPE', () => {
    expect(DELETE_LANGUAGE_ACTION_TYPE).toBe('campaign_settings.delete_language');
  });

  it('exports CREATE_FONT_ACTION_TYPE', () => {
    expect(CREATE_FONT_ACTION_TYPE).toBe('campaign_settings.create_font');
  });

  it('exports UPDATE_FONT_ACTION_TYPE', () => {
    expect(UPDATE_FONT_ACTION_TYPE).toBe('campaign_settings.update_font');
  });

  it('exports DELETE_FONT_ACTION_TYPE', () => {
    expect(DELETE_FONT_ACTION_TYPE).toBe('campaign_settings.delete_font');
  });

  it('exports CREATE_THROUGHPUT_POLICY_ACTION_TYPE', () => {
    expect(CREATE_THROUGHPUT_POLICY_ACTION_TYPE).toBe('campaign_settings.create_throughput_policy');
  });

  it('exports UPDATE_THROUGHPUT_POLICY_ACTION_TYPE', () => {
    expect(UPDATE_THROUGHPUT_POLICY_ACTION_TYPE).toBe('campaign_settings.update_throughput_policy');
  });

  it('exports DELETE_THROUGHPUT_POLICY_ACTION_TYPE', () => {
    expect(DELETE_THROUGHPUT_POLICY_ACTION_TYPE).toBe('campaign_settings.delete_throughput_policy');
  });

  it('exports CREATE_FREQUENCY_POLICY_ACTION_TYPE', () => {
    expect(CREATE_FREQUENCY_POLICY_ACTION_TYPE).toBe('campaign_settings.create_frequency_policy');
  });

  it('exports UPDATE_FREQUENCY_POLICY_ACTION_TYPE', () => {
    expect(UPDATE_FREQUENCY_POLICY_ACTION_TYPE).toBe('campaign_settings.update_frequency_policy');
  });

  it('exports DELETE_FREQUENCY_POLICY_ACTION_TYPE', () => {
    expect(DELETE_FREQUENCY_POLICY_ACTION_TYPE).toBe('campaign_settings.delete_frequency_policy');
  });

  it('exports CREATE_CONSENT_ACTION_TYPE', () => {
    expect(CREATE_CONSENT_ACTION_TYPE).toBe('campaign_settings.create_consent');
  });

  it('exports UPDATE_CONSENT_ACTION_TYPE', () => {
    expect(UPDATE_CONSENT_ACTION_TYPE).toBe('campaign_settings.update_consent');
  });

  it('exports DELETE_CONSENT_ACTION_TYPE', () => {
    expect(DELETE_CONSENT_ACTION_TYPE).toBe('campaign_settings.delete_consent');
  });

  it('exports CREATE_URL_LIST_ACTION_TYPE', () => {
    expect(CREATE_URL_LIST_ACTION_TYPE).toBe('campaign_settings.create_url_list');
  });

  it('exports UPDATE_URL_LIST_ACTION_TYPE', () => {
    expect(UPDATE_URL_LIST_ACTION_TYPE).toBe('campaign_settings.update_url_list');
  });

  it('exports DELETE_URL_LIST_ACTION_TYPE', () => {
    expect(DELETE_URL_LIST_ACTION_TYPE).toBe('campaign_settings.delete_url_list');
  });

  it('exports CREATE_PAGE_VARIABLE_ACTION_TYPE', () => {
    expect(CREATE_PAGE_VARIABLE_ACTION_TYPE).toBe('campaign_settings.create_page_variable');
  });

  it('exports UPDATE_PAGE_VARIABLE_ACTION_TYPE', () => {
    expect(UPDATE_PAGE_VARIABLE_ACTION_TYPE).toBe('campaign_settings.update_page_variable');
  });

  it('exports DELETE_PAGE_VARIABLE_ACTION_TYPE', () => {
    expect(DELETE_PAGE_VARIABLE_ACTION_TYPE).toBe('campaign_settings.delete_page_variable');
  });
});

describe('rate limit constants', () => {
  it('exports CAMPAIGN_SETTINGS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(CAMPAIGN_SETTINGS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports CAMPAIGN_SETTINGS_MODIFY_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('exports CAMPAIGN_SETTINGS_TIMEZONE_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_TIMEZONE_RATE_LIMIT).toBe(30);
  });

  it('exports CAMPAIGN_SETTINGS_LANGUAGE_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_LANGUAGE_RATE_LIMIT).toBe(30);
  });

  it('exports CAMPAIGN_SETTINGS_FONT_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_FONT_RATE_LIMIT).toBe(20);
  });

  it('exports CAMPAIGN_SETTINGS_POLICY_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_POLICY_RATE_LIMIT).toBe(20);
  });

  it('exports CAMPAIGN_SETTINGS_CONSENT_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_CONSENT_RATE_LIMIT).toBe(20);
  });

  it('exports CAMPAIGN_SETTINGS_URL_LIST_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_URL_LIST_RATE_LIMIT).toBe(20);
  });

  it('exports CAMPAIGN_SETTINGS_PAGE_VARIABLE_RATE_LIMIT', () => {
    expect(CAMPAIGN_SETTINGS_PAGE_VARIABLE_RATE_LIMIT).toBe(30);
  });
});

describe('validateTimezoneName', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateTimezoneName('\n\tEurope/Prague\t\n')).toBe('Europe/Prague');
  });

  it('accepts single-character name', () => {
    expect(validateTimezoneName('Z')).toBe('Z');
  });

  it('accepts unicode timezone name', () => {
    expect(validateTimezoneName('Časové pásmo')).toBe('Časové pásmo');
  });

  it('throws for empty string', () => {
    expect(() => validateTimezoneName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTimezoneName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTimezoneName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateTimezoneName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed name for valid input', () => {
    expect(validateTimezoneName('  Europe/Prague  ')).toBe('Europe/Prague');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(100);
    expect(validateTimezoneName(name)).toBe(name);
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(101);
    expect(() => validateTimezoneName(name)).toThrow('must not exceed 100 characters');
  });
});

describe('validateTimezoneId', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateTimezoneId('\n\ttz-123\t\n')).toBe('tz-123');
  });

  it('accepts unicode timezone ID', () => {
    expect(validateTimezoneId('tz-ö')).toBe('tz-ö');
  });

  it('throws for empty string', () => {
    expect(() => validateTimezoneId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTimezoneId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTimezoneId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateTimezoneId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validateTimezoneId('  tz-123  ')).toBe('tz-123');
  });
});

describe('validateLanguageCode', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateLanguageCode('\n\ten\t\n')).toBe('en');
  });

  it('accepts unicode language code', () => {
    expect(validateLanguageCode('če')).toBe('če');
  });

  it('throws for empty string', () => {
    expect(() => validateLanguageCode('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateLanguageCode('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateLanguageCode('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateLanguageCode('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed language code for valid input', () => {
    expect(validateLanguageCode('  en  ')).toBe('en');
  });

  it('accepts language code at maximum length', () => {
    const code = 'x'.repeat(10);
    expect(validateLanguageCode(code)).toBe(code);
  });

  it('throws for language code exceeding maximum length', () => {
    const code = 'x'.repeat(11);
    expect(() => validateLanguageCode(code)).toThrow('must not exceed 10 characters');
  });
});

describe('validateLanguageName', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateLanguageName('\n\tEnglish\t\n')).toBe('English');
  });

  it('accepts single-character name', () => {
    expect(validateLanguageName('E')).toBe('E');
  });

  it('accepts unicode language name', () => {
    expect(validateLanguageName('Čeština')).toBe('Čeština');
  });

  it('throws for empty string', () => {
    expect(() => validateLanguageName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateLanguageName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateLanguageName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateLanguageName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed language name for valid input', () => {
    expect(validateLanguageName('  English  ')).toBe('English');
  });

  it('accepts language name at maximum length', () => {
    const name = 'x'.repeat(100);
    expect(validateLanguageName(name)).toBe(name);
  });

  it('throws for language name exceeding maximum length', () => {
    const name = 'x'.repeat(101);
    expect(() => validateLanguageName(name)).toThrow('must not exceed 100 characters');
  });
});

describe('validateFontName', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateFontName('\n\tInter\t\n')).toBe('Inter');
  });

  it('accepts single-character name', () => {
    expect(validateFontName('I')).toBe('I');
  });

  it('accepts unicode font name', () => {
    expect(validateFontName('Žižka Sans')).toBe('Žižka Sans');
  });

  it('throws for empty string', () => {
    expect(() => validateFontName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateFontName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateFontName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateFontName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed font name for valid input', () => {
    expect(validateFontName('  Inter  ')).toBe('Inter');
  });

  it('accepts font name at maximum length', () => {
    const name = 'x'.repeat(100);
    expect(validateFontName(name)).toBe(name);
  });

  it('throws for font name exceeding maximum length', () => {
    const name = 'x'.repeat(101);
    expect(() => validateFontName(name)).toThrow('must not exceed 100 characters');
  });
});

describe('validateFontId', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateFontId('\n\tfont-123\t\n')).toBe('font-123');
  });

  it('accepts unicode font ID', () => {
    expect(validateFontId('font-ž')).toBe('font-ž');
  });

  it('throws for empty string', () => {
    expect(() => validateFontId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateFontId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateFontId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateFontId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validateFontId('  font-123  ')).toBe('font-123');
  });
});

describe('validatePolicyName', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validatePolicyName('\n\tSlow And Steady\t\n')).toBe('Slow And Steady');
  });

  it('accepts single-character name', () => {
    expect(validatePolicyName('P')).toBe('P');
  });

  it('accepts unicode policy name', () => {
    expect(validatePolicyName('Politika Ž')).toBe('Politika Ž');
  });

  it('throws for empty string', () => {
    expect(() => validatePolicyName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePolicyName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validatePolicyName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validatePolicyName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed policy name for valid input', () => {
    expect(validatePolicyName('  Slow And Steady  ')).toBe('Slow And Steady');
  });

  it('accepts policy name at maximum length', () => {
    const name = 'x'.repeat(120);
    expect(validatePolicyName(name)).toBe(name);
  });

  it('throws for policy name exceeding maximum length', () => {
    const name = 'x'.repeat(121);
    expect(() => validatePolicyName(name)).toThrow('must not exceed 120 characters');
  });
});

describe('validatePolicyId', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validatePolicyId('\n\tpolicy-123\t\n')).toBe('policy-123');
  });

  it('accepts unicode policy ID', () => {
    expect(validatePolicyId('policy-ř')).toBe('policy-ř');
  });

  it('throws for empty string', () => {
    expect(() => validatePolicyId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePolicyId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validatePolicyId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validatePolicyId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validatePolicyId('  policy-123  ')).toBe('policy-123');
  });
});

describe('validateConsentCategory', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateConsentCategory('\n\tMarketing\t\n')).toBe('Marketing');
  });

  it('accepts single-character name', () => {
    expect(validateConsentCategory('M')).toBe('M');
  });

  it('accepts unicode consent category', () => {
    expect(validateConsentCategory('Účely')).toBe('Účely');
  });

  it('throws for empty string', () => {
    expect(() => validateConsentCategory('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateConsentCategory('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateConsentCategory('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateConsentCategory('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed category for valid input', () => {
    expect(validateConsentCategory('  Marketing  ')).toBe('Marketing');
  });

  it('accepts category at maximum length', () => {
    const category = 'x'.repeat(120);
    expect(validateConsentCategory(category)).toBe(category);
  });

  it('throws for category exceeding maximum length', () => {
    const category = 'x'.repeat(121);
    expect(() => validateConsentCategory(category)).toThrow('must not exceed 120 characters');
  });
});

describe('validateConsentId', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateConsentId('\n\tconsent-123\t\n')).toBe('consent-123');
  });

  it('accepts unicode consent ID', () => {
    expect(validateConsentId('consent-ž')).toBe('consent-ž');
  });

  it('throws for empty string', () => {
    expect(() => validateConsentId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateConsentId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateConsentId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateConsentId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validateConsentId('  consent-123  ')).toBe('consent-123');
  });
});

describe('validateUrlListName', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateUrlListName('\n\tInternal Domains\t\n')).toBe('Internal Domains');
  });

  it('accepts single-character name', () => {
    expect(validateUrlListName('U')).toBe('U');
  });

  it('accepts unicode URL list name', () => {
    expect(validateUrlListName('Domény')).toBe('Domény');
  });

  it('throws for empty string', () => {
    expect(() => validateUrlListName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateUrlListName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateUrlListName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateUrlListName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed URL list name for valid input', () => {
    expect(validateUrlListName('  Internal Domains  ')).toBe('Internal Domains');
  });

  it('accepts URL list name at maximum length', () => {
    const name = 'x'.repeat(120);
    expect(validateUrlListName(name)).toBe(name);
  });

  it('throws for URL list name exceeding maximum length', () => {
    const name = 'x'.repeat(121);
    expect(() => validateUrlListName(name)).toThrow('must not exceed 120 characters');
  });
});

describe('validateUrlListId', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validateUrlListId('\n\tlist-123\t\n')).toBe('list-123');
  });

  it('accepts unicode URL list ID', () => {
    expect(validateUrlListId('list-ú')).toBe('list-ú');
  });

  it('throws for empty string', () => {
    expect(() => validateUrlListId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateUrlListId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateUrlListId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateUrlListId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validateUrlListId('  list-123  ')).toBe('list-123');
  });
});

describe('validatePageVariableName', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validatePageVariableName('\n\tbanner_text\t\n')).toBe('banner_text');
  });

  it('accepts single-character name', () => {
    expect(validatePageVariableName('v')).toBe('v');
  });

  it('accepts unicode page variable name', () => {
    expect(validatePageVariableName('název_proměnné')).toBe('název_proměnné');
  });

  it('throws for empty string', () => {
    expect(() => validatePageVariableName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePageVariableName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validatePageVariableName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validatePageVariableName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed page variable name for valid input', () => {
    expect(validatePageVariableName('  banner_text  ')).toBe('banner_text');
  });

  it('accepts page variable name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validatePageVariableName(name)).toBe(name);
  });

  it('throws for page variable name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validatePageVariableName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validatePageVariableId', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validatePageVariableId('\n\tpv-123\t\n')).toBe('pv-123');
  });

  it('accepts unicode page variable ID', () => {
    expect(validatePageVariableId('pv-č')).toBe('pv-č');
  });

  it('throws for empty string', () => {
    expect(() => validatePageVariableId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePageVariableId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validatePageVariableId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validatePageVariableId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validatePageVariableId('  pv-123  ')).toBe('pv-123');
  });
});

describe('validatePageVariableValue', () => {
  it('returns trimmed value with tabs and newlines', () => {
    expect(validatePageVariableValue('\n\thello world\t\n')).toBe('hello world');
  });

  it('accepts unicode value', () => {
    expect(validatePageVariableValue('Vítejte zpět')).toBe('Vítejte zpět');
  });

  it('returns trimmed value for empty string', () => {
    expect(validatePageVariableValue('')).toBe('');
  });

  it('returns trimmed value for whitespace-only string', () => {
    expect(validatePageVariableValue('   ')).toBe('');
  });

  it('returns trimmed value for valid input', () => {
    expect(validatePageVariableValue('  hello world  ')).toBe('hello world');
  });

  it('accepts value at maximum length', () => {
    const value = 'x'.repeat(5000);
    expect(validatePageVariableValue(value)).toBe(value);
  });

  it('throws for value exceeding maximum length', () => {
    const value = 'x'.repeat(5001);
    expect(() => validatePageVariableValue(value)).toThrow('must not exceed 5000 characters');
  });
});

describe('URL builders', () => {
  it('builds all URLs for a simple project name', () => {
    expect(buildCampaignSettingsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/campaigns',
    );
    expect(buildTimezonesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/timezones',
    );
    expect(buildLanguagesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/languages',
    );
    expect(buildFontsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/project-settings/fonts');
    expect(buildThroughputPolicyUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/throughput-policy',
    );
    expect(buildFrequencyPoliciesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/campaign-frequency-policies',
    );
    expect(buildConsentsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/consents',
    );
    expect(buildGlobalUrlListsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/global-url-lists',
    );
    expect(buildPageVariablesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/page-variables',
    );
  });

  it('encodes special characters in all URLs', () => {
    expect(buildCampaignSettingsUrl('my project')).toBe(
      '/p/my%20project/project-settings/campaigns',
    );
    expect(buildTimezonesUrl('my project')).toBe('/p/my%20project/project-settings/timezones');
    expect(buildLanguagesUrl('my project')).toBe('/p/my%20project/project-settings/languages');
    expect(buildFontsUrl('my project')).toBe('/p/my%20project/project-settings/fonts');
    expect(buildThroughputPolicyUrl('my project')).toBe(
      '/p/my%20project/project-settings/throughput-policy',
    );
    expect(buildFrequencyPoliciesUrl('my project')).toBe(
      '/p/my%20project/project-settings/campaign-frequency-policies',
    );
    expect(buildConsentsUrl('my project')).toBe('/p/my%20project/project-settings/consents');
    expect(buildGlobalUrlListsUrl('my project')).toBe(
      '/p/my%20project/project-settings/global-url-lists',
    );
    expect(buildPageVariablesUrl('my project')).toBe(
      '/p/my%20project/project-settings/page-variables',
    );
  });

  it('handles project names with slashes in all URLs', () => {
    expect(buildCampaignSettingsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/campaigns',
    );
    expect(buildTimezonesUrl('org/project')).toBe('/p/org%2Fproject/project-settings/timezones');
    expect(buildLanguagesUrl('org/project')).toBe('/p/org%2Fproject/project-settings/languages');
    expect(buildFontsUrl('org/project')).toBe('/p/org%2Fproject/project-settings/fonts');
    expect(buildThroughputPolicyUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/throughput-policy',
    );
    expect(buildFrequencyPoliciesUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/campaign-frequency-policies',
    );
    expect(buildConsentsUrl('org/project')).toBe('/p/org%2Fproject/project-settings/consents');
    expect(buildGlobalUrlListsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/global-url-lists',
    );
    expect(buildPageVariablesUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/page-variables',
    );
  });

  it('encodes unicode project names in all URLs', () => {
    expect(buildCampaignSettingsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/campaigns');
    expect(buildTimezonesUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/timezones');
    expect(buildLanguagesUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/languages');
    expect(buildFontsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/fonts');
    expect(buildThroughputPolicyUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/throughput-policy',
    );
    expect(buildFrequencyPoliciesUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/campaign-frequency-policies',
    );
    expect(buildConsentsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/consents');
    expect(buildGlobalUrlListsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/global-url-lists',
    );
    expect(buildPageVariablesUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/page-variables',
    );
  });

  it('encodes hash in project names for all URLs', () => {
    expect(buildCampaignSettingsUrl('my#project')).toBe('/p/my%23project/project-settings/campaigns');
    expect(buildTimezonesUrl('my#project')).toBe('/p/my%23project/project-settings/timezones');
    expect(buildLanguagesUrl('my#project')).toBe('/p/my%23project/project-settings/languages');
    expect(buildFontsUrl('my#project')).toBe('/p/my%23project/project-settings/fonts');
    expect(buildThroughputPolicyUrl('my#project')).toBe(
      '/p/my%23project/project-settings/throughput-policy',
    );
    expect(buildFrequencyPoliciesUrl('my#project')).toBe(
      '/p/my%23project/project-settings/campaign-frequency-policies',
    );
    expect(buildConsentsUrl('my#project')).toBe('/p/my%23project/project-settings/consents');
    expect(buildGlobalUrlListsUrl('my#project')).toBe('/p/my%23project/project-settings/global-url-lists');
    expect(buildPageVariablesUrl('my#project')).toBe('/p/my%23project/project-settings/page-variables');
  });

  it('keeps dashes unencoded in project names for all URLs', () => {
    expect(buildCampaignSettingsUrl('team-alpha')).toBe('/p/team-alpha/project-settings/campaigns');
    expect(buildTimezonesUrl('team-alpha')).toBe('/p/team-alpha/project-settings/timezones');
    expect(buildLanguagesUrl('team-alpha')).toBe('/p/team-alpha/project-settings/languages');
    expect(buildFontsUrl('team-alpha')).toBe('/p/team-alpha/project-settings/fonts');
    expect(buildThroughputPolicyUrl('team-alpha')).toBe('/p/team-alpha/project-settings/throughput-policy');
    expect(buildFrequencyPoliciesUrl('team-alpha')).toBe(
      '/p/team-alpha/project-settings/campaign-frequency-policies',
    );
    expect(buildConsentsUrl('team-alpha')).toBe('/p/team-alpha/project-settings/consents');
    expect(buildGlobalUrlListsUrl('team-alpha')).toBe('/p/team-alpha/project-settings/global-url-lists');
    expect(buildPageVariablesUrl('team-alpha')).toBe('/p/team-alpha/project-settings/page-variables');
  });
});

describe('createCampaignSettingsActionExecutors', () => {
  it('returns executors for all 25 action types', () => {
    const executors = createCampaignSettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(25);
    expect(executors[UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_TIMEZONE_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_TIMEZONE_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_TIMEZONE_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_LANGUAGE_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_LANGUAGE_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_LANGUAGE_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_FONT_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_FONT_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_FONT_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_THROUGHPUT_POLICY_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_THROUGHPUT_POLICY_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_THROUGHPUT_POLICY_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_FREQUENCY_POLICY_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_FREQUENCY_POLICY_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_FREQUENCY_POLICY_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_CONSENT_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_CONSENT_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_CONSENT_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_URL_LIST_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_URL_LIST_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_URL_LIST_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_PAGE_VARIABLE_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_PAGE_VARIABLE_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_PAGE_VARIABLE_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching key', () => {
    const executors = createCampaignSettingsActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw UI-only availability message on execute', async () => {
    const executors = createCampaignSettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('UpdateCampaignDefaultsExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateTimezoneExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_TIMEZONE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateTimezoneExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_TIMEZONE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteTimezoneExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_TIMEZONE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateLanguageExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_LANGUAGE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateLanguageExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_LANGUAGE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteLanguageExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_LANGUAGE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateFontExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_FONT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateFontExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_FONT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteFontExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_FONT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateThroughputPolicyExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_THROUGHPUT_POLICY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateThroughputPolicyExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_THROUGHPUT_POLICY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteThroughputPolicyExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_THROUGHPUT_POLICY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateFrequencyPolicyExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_FREQUENCY_POLICY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateFrequencyPolicyExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_FREQUENCY_POLICY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteFrequencyPolicyExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_FREQUENCY_POLICY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateConsentExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_CONSENT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateConsentExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_CONSENT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteConsentExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_CONSENT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateUrlListExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_URL_LIST_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateUrlListExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_URL_LIST_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteUrlListExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_URL_LIST_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreatePageVariableExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[CREATE_PAGE_VARIABLE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdatePageVariableExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[UPDATE_PAGE_VARIABLE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeletePageVariableExecutor mentions UI-only availability', async () => {
    const executors = createCampaignSettingsActionExecutors();
    await expect(executors[DELETE_PAGE_VARIABLE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });
});

describe('apiConfig acceptance', () => {
  it('createCampaignSettingsActionExecutors accepts apiConfig', () => {
    const executors = createCampaignSettingsActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(25);
  });

  it('createCampaignSettingsActionExecutors works without apiConfig', () => {
    const executors = createCampaignSettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(25);
  });

  it('BloomreachCampaignSettingsService accepts apiConfig', () => {
    const service = new BloomreachCampaignSettingsService('test', TEST_API_CONFIG);
    expect(service.campaignSettingsUrl).toBe('/p/test/project-settings/campaigns');
  });

  it('BloomreachCampaignSettingsService works without apiConfig', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(service.campaignSettingsUrl).toBe('/p/test/project-settings/campaigns');
  });
});

describe('BloomreachCampaignSettingsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachCampaignSettingsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachCampaignSettingsService);
    });

    it('trims project name', () => {
      const service = new BloomreachCampaignSettingsService('  my-project  ');
      expect(service.campaignSettingsUrl).toBe('/p/my-project/project-settings/campaigns');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachCampaignSettingsService('')).toThrow('must not be empty');
    });

    it('encodes spaces in URL', () => {
      const service = new BloomreachCampaignSettingsService('my project');
      expect(service.campaignSettingsUrl).toBe('/p/my%20project/project-settings/campaigns');
    });

    it('encodes unicode in URL', () => {
      const service = new BloomreachCampaignSettingsService('projekt åäö');
      expect(service.campaignSettingsUrl).toContain('%C3%A5');
    });

    it('encodes hash in URL', () => {
      const service = new BloomreachCampaignSettingsService('my#project');
      expect(service.campaignSettingsUrl).toBe('/p/my%23project/project-settings/campaigns');
    });
  });

  describe('URL getters', () => {
    it('returns all campaign settings URLs', () => {
      const service = new BloomreachCampaignSettingsService('kingdom-of-joakim');
      expect(service.campaignSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/campaigns');
      expect(service.timezonesSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/timezones');
      expect(service.languagesSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/languages');
      expect(service.fontsSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/fonts');
      expect(service.throughputPolicySettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/throughput-policy',
      );
      expect(service.frequencyPoliciesSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/campaign-frequency-policies',
      );
      expect(service.consentsSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/consents');
      expect(service.globalUrlListsSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/global-url-lists',
      );
      expect(service.pageVariablesSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/page-variables',
      );
    });
  });

  describe('read methods', () => {
    it('viewCampaignDefaults throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.viewCampaignDefaults()).rejects.toThrow('not yet implemented');
    });

    it('listTimezones throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listTimezones()).rejects.toThrow('not yet implemented');
    });

    it('listLanguages throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listLanguages()).rejects.toThrow('not yet implemented');
    });

    it('listFonts throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listFonts()).rejects.toThrow('not yet implemented');
    });

    it('listThroughputPolicies throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listThroughputPolicies()).rejects.toThrow('not yet implemented');
    });

    it('listFrequencyPolicies throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listFrequencyPolicies()).rejects.toThrow('not yet implemented');
    });

    it('listConsents throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listConsents()).rejects.toThrow('not yet implemented');
    });

    it('listUrlLists throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listUrlLists()).rejects.toThrow('not yet implemented');
    });

    it('listPageVariables throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listPageVariables()).rejects.toThrow('not yet implemented');
    });

    it('viewCampaignDefaults throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.viewCampaignDefaults()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listTimezones throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listTimezones()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listLanguages throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listLanguages()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listFonts throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listFonts()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listThroughputPolicies throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listThroughputPolicies()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listFrequencyPolicies throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listFrequencyPolicies()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listConsents throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listConsents()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listUrlLists throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listUrlLists()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listPageVariables throws descriptive UI-only error', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listPageVariables()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewCampaignDefaults validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.viewCampaignDefaults({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listTimezones validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listTimezones({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listLanguages validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listLanguages({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listFonts validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listFonts({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listThroughputPolicies validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listThroughputPolicies({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listFrequencyPolicies validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listFrequencyPolicies({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listConsents validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listConsents({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listUrlLists validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listUrlLists({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listPageVariables validates project when input provided', async () => {
      const service = new BloomreachCampaignSettingsService('test');
      await expect(service.listPageVariables({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('token expiry consistency', () => {
    it('all prepare methods set expiry ~30 minutes in the future', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const now = Date.now();
      const thirtyMinMs = 30 * 60 * 1000;

      const results = [
        service.prepareUpdateCampaignDefaults({ project: 'test', defaultSenderName: 'X' }),
        service.prepareCreateTimezone({ project: 'test', name: 'UTC' }),
        service.prepareUpdateTimezone({ project: 'test', timezoneId: 'tz-1', name: 'UTC' }),
        service.prepareDeleteTimezone({ project: 'test', timezoneId: 'tz-1' }),
        service.prepareCreateLanguage({ project: 'test', code: 'en', name: 'English' }),
        service.prepareUpdateLanguage({ project: 'test', languageCode: 'en', name: 'English' }),
        service.prepareDeleteLanguage({ project: 'test', languageCode: 'en' }),
        service.prepareCreateFont({ project: 'test', name: 'Inter', type: 'system' }),
        service.prepareUpdateFont({ project: 'test', fontId: 'f-1', name: 'Inter' }),
        service.prepareDeleteFont({ project: 'test', fontId: 'f-1' }),
        service.prepareCreateThroughputPolicy({ project: 'test', name: 'Policy' }),
        service.prepareUpdateThroughputPolicy({ project: 'test', policyId: 'tp-1', name: 'Policy' }),
        service.prepareDeleteThroughputPolicy({ project: 'test', policyId: 'tp-1' }),
        service.prepareCreateFrequencyPolicy({ project: 'test', name: 'Policy' }),
        service.prepareUpdateFrequencyPolicy({ project: 'test', policyId: 'fp-1', name: 'Policy' }),
        service.prepareDeleteFrequencyPolicy({ project: 'test', policyId: 'fp-1' }),
        service.prepareCreateConsent({ project: 'test', category: 'Marketing' }),
        service.prepareUpdateConsent({ project: 'test', consentId: 'c-1', category: 'Marketing' }),
        service.prepareDeleteConsent({ project: 'test', consentId: 'c-1' }),
        service.prepareCreateUrlList({ project: 'test', name: 'URLs', listType: 'allowlist' }),
        service.prepareUpdateUrlList({ project: 'test', urlListId: 'u-1', name: 'URLs' }),
        service.prepareDeleteUrlList({ project: 'test', urlListId: 'u-1' }),
        service.prepareCreatePageVariable({ project: 'test', name: 'var', value: 'val' }),
        service.prepareUpdatePageVariable({ project: 'test', pageVariableId: 'pv-1', name: 'var' }),
        service.prepareDeletePageVariable({ project: 'test', pageVariableId: 'pv-1' }),
      ];

      for (const result of results) {
        expect(result.expiresAtMs).toBeGreaterThanOrEqual(now + thirtyMinMs - 1000);
        expect(result.expiresAtMs).toBeLessThanOrEqual(now + thirtyMinMs + 5000);
      }
    });
  });

  describe('prepareUpdateCampaignDefaults', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateCampaignDefaults({
        project: 'test',
        defaultSenderName: 'Team Bloomreach',
        defaultSenderEmail: ' team@example.com ',
        defaultReplyToEmail: ' reply@example.com ',
        defaultUtmSource: ' newsletter ',
        defaultUtmMedium: ' email ',
        defaultUtmCampaign: ' spring-launch ',
        operatorNote: 'update all defaults',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_campaign_defaults',
          project: 'test',
          defaultSenderName: 'Team Bloomreach',
          defaultSenderEmail: 'team@example.com',
          defaultReplyToEmail: 'reply@example.com',
          defaultUtmSource: 'newsletter',
          defaultUtmMedium: 'email',
          defaultUtmCampaign: 'spring-launch',
          operatorNote: 'update all defaults',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateCampaignDefaults({
          project: '',
          defaultSenderName: 'Name',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no default fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareUpdateCampaignDefaults({ project: 'test' })).toThrow(
        'At least one campaign default field must be provided for defaults update.',
      );
    });
  });

  describe('prepareCreateTimezone', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateTimezone({
        project: 'test',
        name: 'Europe/Prague',
        utcOffset: '+01:00',
        isDefault: true,
        operatorNote: 'add Prague timezone',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_timezone',
          project: 'test',
          name: 'Europe/Prague',
          utcOffset: '+01:00',
          isDefault: true,
          operatorNote: 'add Prague timezone',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareCreateTimezone({ project: '', name: 'Europe/Prague' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareCreateTimezone({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareUpdateTimezone', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateTimezone({
        project: 'test',
        timezoneId: 'tz-1',
        name: 'Europe/Brno',
        utcOffset: '+02:00',
        isDefault: false,
        operatorNote: 'update timezone',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_timezone',
          project: 'test',
          timezoneId: 'tz-1',
          name: 'Europe/Brno',
          utcOffset: '+02:00',
          isDefault: false,
          operatorNote: 'update timezone',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateTimezone({
          project: '',
          timezoneId: 'tz-1',
          name: 'Europe/Brno',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty timezone ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateTimezone({
          project: 'test',
          timezoneId: '',
          name: 'Europe/Brno',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateTimezone({
          project: 'test',
          timezoneId: 'tz-1',
        }),
      ).toThrow(
        'At least one of name, utcOffset, or isDefault must be provided for timezone update.',
      );
    });
  });

  describe('prepareDeleteTimezone', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteTimezone({
        project: 'test',
        timezoneId: 'tz-2',
        operatorNote: 'remove old timezone',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_timezone',
          project: 'test',
          timezoneId: 'tz-2',
          operatorNote: 'remove old timezone',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteTimezone({ project: '', timezoneId: 'tz-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty timezone ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteTimezone({ project: 'test', timezoneId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateLanguage', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateLanguage({
        project: 'test',
        code: 'en',
        name: 'English',
        isDefault: true,
        operatorNote: 'add english',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_language',
          project: 'test',
          code: 'en',
          name: 'English',
          isDefault: true,
          operatorNote: 'add english',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateLanguage({
          project: '',
          code: 'en',
          name: 'English',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty code', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateLanguage({
          project: 'test',
          code: '',
          name: 'English',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateLanguage', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateLanguage({
        project: 'test',
        languageCode: 'en',
        code: 'en-GB',
        name: 'English UK',
        isDefault: false,
        operatorNote: 'update language',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_language',
          project: 'test',
          languageCode: 'en',
          code: 'en-GB',
          name: 'English UK',
          isDefault: false,
          operatorNote: 'update language',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateLanguage({
          project: '',
          languageCode: 'en',
          name: 'English',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty language code', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateLanguage({
          project: 'test',
          languageCode: '',
          name: 'English',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateLanguage({
          project: 'test',
          languageCode: 'en',
        }),
      ).toThrow('At least one of code, name, or isDefault must be provided for language update.');
    });
  });

  describe('prepareDeleteLanguage', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteLanguage({
        project: 'test',
        languageCode: 'de',
        operatorNote: 'remove german',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_language',
          project: 'test',
          languageCode: 'de',
          operatorNote: 'remove german',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteLanguage({ project: '', languageCode: 'de' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty language code', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteLanguage({ project: 'test', languageCode: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateFont', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateFont({
        project: 'test',
        name: 'Inter',
        type: 'system',
        fileUrl: 'https://example.com/inter.woff2',
        operatorNote: 'add inter',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_font',
          project: 'test',
          name: 'Inter',
          type: 'system',
          fileUrl: 'https://example.com/inter.woff2',
          operatorNote: 'add inter',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateFont({
          project: '',
          name: 'Inter',
          type: 'system',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty name', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateFont({
          project: 'test',
          name: '',
          type: 'system',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateFont', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateFont({
        project: 'test',
        fontId: 'font-1',
        name: 'Inter Tight',
        type: 'custom',
        fileUrl: 'https://example.com/inter-tight.woff2',
        operatorNote: 'update font',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_font',
          project: 'test',
          fontId: 'font-1',
          name: 'Inter Tight',
          type: 'custom',
          fileUrl: 'https://example.com/inter-tight.woff2',
          operatorNote: 'update font',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateFont({
          project: '',
          fontId: 'font-1',
          name: 'Inter',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty font ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateFont({
          project: 'test',
          fontId: '',
          name: 'Inter',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateFont({
          project: 'test',
          fontId: 'font-1',
        }),
      ).toThrow('At least one of name, type, or fileUrl must be provided for font update.');
    });
  });

  describe('prepareDeleteFont', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteFont({
        project: 'test',
        fontId: 'font-2',
        operatorNote: 'remove old font',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_font',
          project: 'test',
          fontId: 'font-2',
          operatorNote: 'remove old font',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteFont({ project: '', fontId: 'font-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty font ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteFont({ project: 'test', fontId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateThroughputPolicy', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateThroughputPolicy({
        project: 'test',
        name: 'Email Burst Guard',
        channel: 'email',
        maxRate: 1000,
        periodSeconds: 60,
        description: 'Cap burst sends',
        operatorNote: 'create throughput policy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_throughput_policy',
          project: 'test',
          name: 'Email Burst Guard',
          channel: 'email',
          maxRate: 1000,
          periodSeconds: 60,
          description: 'Cap burst sends',
          operatorNote: 'create throughput policy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateThroughputPolicy({
          project: '',
          name: 'Email Burst Guard',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty name', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateThroughputPolicy({
          project: 'test',
          name: '',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateThroughputPolicy', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateThroughputPolicy({
        project: 'test',
        policyId: 'tp-1',
        name: 'Email Burst Guard v2',
        channel: 'email',
        maxRate: 750,
        periodSeconds: 60,
        description: 'Tighter cap',
        operatorNote: 'update throughput policy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_throughput_policy',
          project: 'test',
          policyId: 'tp-1',
          name: 'Email Burst Guard v2',
          channel: 'email',
          maxRate: 750,
          periodSeconds: 60,
          description: 'Tighter cap',
          operatorNote: 'update throughput policy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateThroughputPolicy({
          project: '',
          policyId: 'tp-1',
          name: 'x',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty policy ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateThroughputPolicy({
          project: 'test',
          policyId: '',
          name: 'x',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateThroughputPolicy({
          project: 'test',
          policyId: 'tp-1',
        }),
      ).toThrow('At least one modifiable field must be provided for throughput policy update.');
    });
  });

  describe('prepareDeleteThroughputPolicy', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteThroughputPolicy({
        project: 'test',
        policyId: 'tp-2',
        operatorNote: 'remove policy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_throughput_policy',
          project: 'test',
          policyId: 'tp-2',
          operatorNote: 'remove policy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareDeleteThroughputPolicy({ project: '', policyId: 'tp-2' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty policy ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareDeleteThroughputPolicy({ project: 'test', policyId: '' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCreateFrequencyPolicy', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateFrequencyPolicy({
        project: 'test',
        name: 'Weekly Cap',
        policyType: 'global',
        maxSends: 3,
        windowHours: 168,
        channels: ['email', 'push'],
        description: 'Max 3 sends per week',
        operatorNote: 'create frequency policy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_frequency_policy',
          project: 'test',
          name: 'Weekly Cap',
          policyType: 'global',
          maxSends: 3,
          windowHours: 168,
          channels: ['email', 'push'],
          description: 'Max 3 sends per week',
          operatorNote: 'create frequency policy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateFrequencyPolicy({
          project: '',
          name: 'Weekly Cap',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty name', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateFrequencyPolicy({
          project: 'test',
          name: '',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateFrequencyPolicy', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateFrequencyPolicy({
        project: 'test',
        policyId: 'fp-1',
        name: 'Weekly Cap Tightened',
        policyType: 'global',
        maxSends: 2,
        windowHours: 168,
        channels: ['email'],
        description: 'Lower weekly cap',
        operatorNote: 'update frequency policy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_frequency_policy',
          project: 'test',
          policyId: 'fp-1',
          name: 'Weekly Cap Tightened',
          policyType: 'global',
          maxSends: 2,
          windowHours: 168,
          channels: ['email'],
          description: 'Lower weekly cap',
          operatorNote: 'update frequency policy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateFrequencyPolicy({
          project: '',
          policyId: 'fp-1',
          name: 'x',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty policy ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateFrequencyPolicy({
          project: 'test',
          policyId: '',
          name: 'x',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateFrequencyPolicy({
          project: 'test',
          policyId: 'fp-1',
        }),
      ).toThrow('At least one modifiable field must be provided for frequency policy update.');
    });
  });

  describe('prepareDeleteFrequencyPolicy', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteFrequencyPolicy({
        project: 'test',
        policyId: 'fp-2',
        operatorNote: 'remove frequency policy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_frequency_policy',
          project: 'test',
          policyId: 'fp-2',
          operatorNote: 'remove frequency policy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteFrequencyPolicy({ project: '', policyId: 'fp-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty policy ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteFrequencyPolicy({ project: 'test', policyId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateConsent', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateConsent({
        project: 'test',
        category: 'Marketing',
        description: 'Marketing communication consent',
        consentType: 'opt-in',
        legitimateInterest: false,
        operatorNote: 'create consent',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_consent',
          project: 'test',
          category: 'Marketing',
          description: 'Marketing communication consent',
          consentType: 'opt-in',
          legitimateInterest: false,
          operatorNote: 'create consent',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateConsent({
          project: '',
          category: 'Marketing',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty category', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateConsent({
          project: 'test',
          category: '',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateConsent', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateConsent({
        project: 'test',
        consentId: 'consent-1',
        category: 'Transactional',
        description: 'Transactional consent',
        consentType: 'opt-out',
        legitimateInterest: true,
        operatorNote: 'update consent',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_consent',
          project: 'test',
          consentId: 'consent-1',
          category: 'Transactional',
          description: 'Transactional consent',
          consentType: 'opt-out',
          legitimateInterest: true,
          operatorNote: 'update consent',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateConsent({
          project: '',
          consentId: 'consent-1',
          category: 'Marketing',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty consent ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateConsent({
          project: 'test',
          consentId: '',
          category: 'Marketing',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateConsent({
          project: 'test',
          consentId: 'consent-1',
        }),
      ).toThrow(
        'At least one of category, description, consentType, or legitimateInterest must be provided for consent update.',
      );
    });
  });

  describe('prepareDeleteConsent', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteConsent({
        project: 'test',
        consentId: 'consent-2',
        operatorNote: 'remove consent',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_consent',
          project: 'test',
          consentId: 'consent-2',
          operatorNote: 'remove consent',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteConsent({ project: '', consentId: 'consent-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty consent ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteConsent({ project: 'test', consentId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateUrlList', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreateUrlList({
        project: 'test',
        name: 'Internal URLs',
        listType: 'allowlist',
        urls: ['https://example.com', 'https://app.example.com'],
        description: 'Trusted domains',
        operatorNote: 'create allowlist',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_url_list',
          project: 'test',
          name: 'Internal URLs',
          listType: 'allowlist',
          urls: ['https://example.com', 'https://app.example.com'],
          description: 'Trusted domains',
          operatorNote: 'create allowlist',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateUrlList({
          project: '',
          name: 'Internal URLs',
          listType: 'allowlist',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty name', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreateUrlList({
          project: 'test',
          name: '',
          listType: 'allowlist',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateUrlList', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdateUrlList({
        project: 'test',
        urlListId: 'list-1',
        name: 'Known Good URLs',
        listType: 'allowlist',
        urls: ['https://good.example.com'],
        description: 'Updated list',
        operatorNote: 'update list',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_url_list',
          project: 'test',
          urlListId: 'list-1',
          name: 'Known Good URLs',
          listType: 'allowlist',
          urls: ['https://good.example.com'],
          description: 'Updated list',
          operatorNote: 'update list',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateUrlList({
          project: '',
          urlListId: 'list-1',
          name: 'Known Good URLs',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty URL list ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateUrlList({
          project: 'test',
          urlListId: '',
          name: 'Known Good URLs',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdateUrlList({
          project: 'test',
          urlListId: 'list-1',
        }),
      ).toThrow(
        'At least one of name, listType, urls, or description must be provided for URL list update.',
      );
    });
  });

  describe('prepareDeleteUrlList', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeleteUrlList({
        project: 'test',
        urlListId: 'list-2',
        operatorNote: 'remove stale list',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_url_list',
          project: 'test',
          urlListId: 'list-2',
          operatorNote: 'remove stale list',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteUrlList({ project: '', urlListId: 'list-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty URL list ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() => service.prepareDeleteUrlList({ project: 'test', urlListId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreatePageVariable', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareCreatePageVariable({
        project: 'test',
        name: 'hero_title',
        value: 'Welcome to our spring sale',
        description: 'Hero section title',
        operatorNote: 'create page variable',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.create_page_variable',
          project: 'test',
          name: 'hero_title',
          value: 'Welcome to our spring sale',
          description: 'Hero section title',
          operatorNote: 'create page variable',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreatePageVariable({
          project: '',
          name: 'hero_title',
          value: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty name', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareCreatePageVariable({
          project: 'test',
          name: '',
          value: 'Hello',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdatePageVariable', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareUpdatePageVariable({
        project: 'test',
        pageVariableId: 'pv-1',
        name: 'hero_title_v2',
        value: 'Welcome back',
        description: 'Updated hero title',
        operatorNote: 'update page variable',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.update_page_variable',
          project: 'test',
          pageVariableId: 'pv-1',
          name: 'hero_title_v2',
          value: 'Welcome back',
          description: 'Updated hero title',
          operatorNote: 'update page variable',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdatePageVariable({
          project: '',
          pageVariableId: 'pv-1',
          name: 'hero_title_v2',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty page variable ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdatePageVariable({
          project: 'test',
          pageVariableId: '',
          name: 'hero_title_v2',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when no modifiable fields are provided', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareUpdatePageVariable({
          project: 'test',
          pageVariableId: 'pv-1',
        }),
      ).toThrow(
        'At least one of name, value, or description must be provided for page variable update.',
      );
    });
  });

  describe('prepareDeletePageVariable', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCampaignSettingsService('test');
      const result = service.prepareDeletePageVariable({
        project: 'test',
        pageVariableId: 'pv-2',
        operatorNote: 'remove stale variable',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_settings.delete_page_variable',
          project: 'test',
          pageVariableId: 'pv-2',
          operatorNote: 'remove stale variable',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareDeletePageVariable({ project: '', pageVariableId: 'pv-2' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty page variable ID', () => {
      const service = new BloomreachCampaignSettingsService('test');
      expect(() =>
        service.prepareDeletePageVariable({ project: 'test', pageVariableId: '' }),
      ).toThrow('must not be empty');
    });
  });
});

describe('null/undefined input guards', () => {
  it('throws when prepareCreateTimezone is called without name', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateTimezone({
        project: 'test',
        name: undefined as unknown as string,
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateTimezone is called without project', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateTimezone({
        project: undefined as unknown as string,
        name: 'UTC',
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateLanguage is called without name', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateLanguage({
        project: 'test',
        code: 'en',
        name: undefined as unknown as string,
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateLanguage is called without code', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateLanguage({
        project: 'test',
        code: undefined as unknown as string,
        name: 'English',
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateLanguage is called without project', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateLanguage({
        project: undefined as unknown as string,
        code: 'en',
        name: 'English',
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateFont is called without name', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateFont({
        project: 'test',
        name: undefined as unknown as string,
        type: 'system',
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateFont is called without project', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateFont({
        project: undefined as unknown as string,
        name: 'Inter',
        type: 'system',
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateThroughputPolicy is called without name', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateThroughputPolicy({
        project: 'test',
        name: undefined as unknown as string,
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateThroughputPolicy is called without project', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateThroughputPolicy({
        project: undefined as unknown as string,
        name: 'Default Throughput',
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreateUrlList is called without listType', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreateUrlList({
        project: 'test',
        name: 'Main URLs',
        listType: undefined as unknown as string,
      }),
    ).toThrow('is required and must be a string');
  });

  it('throws when prepareCreatePageVariable is called without value', () => {
    const service = new BloomreachCampaignSettingsService('test');
    expect(() =>
      service.prepareCreatePageVariable({
        project: 'test',
        name: 'hero_title',
        value: undefined as unknown as string,
      }),
    ).toThrow('is required and must be a string');
  });
});
