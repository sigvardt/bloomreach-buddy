import { describe, it, expect } from 'vitest';
import {
  CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE,
  CONFIGURE_PUSH_PROVIDER_ACTION_TYPE,
  CONFIGURE_SMS_PROVIDER_ACTION_TYPE,
  CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE,
  CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE,
  CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE,
  CHANNEL_SETTINGS_RATE_LIMIT_WINDOW_MS,
  CHANNEL_SETTINGS_CONFIGURE_RATE_LIMIT,
  validateDomain,
  validateProviderName,
  validateSenderNumber,
  validatePageId,
  buildEmailSettingsUrl,
  buildPushNotificationSettingsUrl,
  buildSmsSettingsUrl,
  buildMobileMessagingSettingsUrl,
  buildPaymentTrackingSettingsUrl,
  buildFacebookMessagingSettingsUrl,
  createChannelSettingsActionExecutors,
  BloomreachChannelSettingsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE', () => {
    expect(CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE).toBe('channel_settings.configure_email_domain');
  });

  it('exports CONFIGURE_PUSH_PROVIDER_ACTION_TYPE', () => {
    expect(CONFIGURE_PUSH_PROVIDER_ACTION_TYPE).toBe('channel_settings.configure_push_provider');
  });

  it('exports CONFIGURE_SMS_PROVIDER_ACTION_TYPE', () => {
    expect(CONFIGURE_SMS_PROVIDER_ACTION_TYPE).toBe('channel_settings.configure_sms_provider');
  });

  it('exports CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE', () => {
    expect(CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE).toBe(
      'channel_settings.configure_mobile_messaging',
    );
  });

  it('exports CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE', () => {
    expect(CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE).toBe(
      'channel_settings.configure_payment_tracking',
    );
  });

  it('exports CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE', () => {
    expect(CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE).toBe(
      'channel_settings.configure_facebook_messaging',
    );
  });
});

describe('rate limit constants', () => {
  it('exports CHANNEL_SETTINGS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(CHANNEL_SETTINGS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports CHANNEL_SETTINGS_CONFIGURE_RATE_LIMIT', () => {
    expect(CHANNEL_SETTINGS_CONFIGURE_RATE_LIMIT).toBe(20);
  });
});

describe('validateDomain', () => {
  it('throws for empty string', () => {
    expect(() => validateDomain('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateDomain('   ')).toThrow('must not be empty');
  });

  it('returns trimmed domain for valid input', () => {
    expect(validateDomain('  mail.example.com  ')).toBe('mail.example.com');
  });

  it('accepts domain at maximum length', () => {
    const domain = 'x'.repeat(253);
    expect(validateDomain(domain)).toBe(domain);
  });

  it('throws for domain exceeding maximum length', () => {
    const domain = 'x'.repeat(254);
    expect(() => validateDomain(domain)).toThrow('must not exceed 253 characters');
  });
});

describe('validateProviderName', () => {
  it('throws for empty string', () => {
    expect(() => validateProviderName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateProviderName('   ')).toThrow('must not be empty');
  });

  it('returns trimmed provider name for valid input', () => {
    expect(validateProviderName('  Firebase  ')).toBe('Firebase');
  });

  it('accepts provider name at maximum length', () => {
    const provider = 'x'.repeat(100);
    expect(validateProviderName(provider)).toBe(provider);
  });

  it('throws for provider name exceeding maximum length', () => {
    const provider = 'x'.repeat(101);
    expect(() => validateProviderName(provider)).toThrow('must not exceed 100 characters');
  });
});

describe('validateSenderNumber', () => {
  it('throws for empty string', () => {
    expect(() => validateSenderNumber('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSenderNumber('   ')).toThrow('must not be empty');
  });

  it('returns trimmed sender number for valid input', () => {
    expect(validateSenderNumber('  +15551234567  ')).toBe('+15551234567');
  });

  it('accepts sender number at maximum length', () => {
    const senderNumber = 'x'.repeat(30);
    expect(validateSenderNumber(senderNumber)).toBe(senderNumber);
  });

  it('throws for sender number exceeding maximum length', () => {
    const senderNumber = 'x'.repeat(31);
    expect(() => validateSenderNumber(senderNumber)).toThrow('must not exceed 30 characters');
  });
});

describe('validatePageId', () => {
  it('throws for empty string', () => {
    expect(() => validatePageId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePageId('   ')).toThrow('must not be empty');
  });

  it('returns trimmed page ID for valid input', () => {
    expect(validatePageId('  page-123  ')).toBe('page-123');
  });
});

describe('URL builders', () => {
  it('builds all URLs for a simple project name', () => {
    expect(buildEmailSettingsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/project-settings/emails');
    expect(buildPushNotificationSettingsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/push-notifications',
    );
    expect(buildSmsSettingsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/project-settings/sms');
    expect(buildMobileMessagingSettingsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/mobile-messaging',
    );
    expect(buildPaymentTrackingSettingsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/payment-tracking',
    );
    expect(buildFacebookMessagingSettingsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/facebook-messaging',
    );
  });

  it('encodes spaces in all URLs', () => {
    expect(buildEmailSettingsUrl('my project')).toBe('/p/my%20project/project-settings/emails');
    expect(buildPushNotificationSettingsUrl('my project')).toBe(
      '/p/my%20project/project-settings/push-notifications',
    );
    expect(buildSmsSettingsUrl('my project')).toBe('/p/my%20project/project-settings/sms');
    expect(buildMobileMessagingSettingsUrl('my project')).toBe(
      '/p/my%20project/project-settings/mobile-messaging',
    );
    expect(buildPaymentTrackingSettingsUrl('my project')).toBe(
      '/p/my%20project/project-settings/payment-tracking',
    );
    expect(buildFacebookMessagingSettingsUrl('my project')).toBe(
      '/p/my%20project/project-settings/facebook-messaging',
    );
  });

  it('handles project names with slashes in all URLs', () => {
    expect(buildEmailSettingsUrl('org/project')).toBe('/p/org%2Fproject/project-settings/emails');
    expect(buildPushNotificationSettingsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/push-notifications',
    );
    expect(buildSmsSettingsUrl('org/project')).toBe('/p/org%2Fproject/project-settings/sms');
    expect(buildMobileMessagingSettingsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/mobile-messaging',
    );
    expect(buildPaymentTrackingSettingsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/payment-tracking',
    );
    expect(buildFacebookMessagingSettingsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/facebook-messaging',
    );
  });
});

describe('createChannelSettingsActionExecutors', () => {
  it('returns executors for all six action types', () => {
    const executors = createChannelSettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(6);
    expect(executors[CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_PUSH_PROVIDER_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_SMS_PROVIDER_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching key', () => {
    const executors = createChannelSettingsActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createChannelSettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachChannelSettingsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachChannelSettingsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachChannelSettingsService);
    });

    it('trims project name', () => {
      const service = new BloomreachChannelSettingsService('  my-project  ');
      expect(service.emailSettingsUrl).toBe('/p/my-project/project-settings/emails');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachChannelSettingsService('')).toThrow('must not be empty');
    });
  });

  describe('URL getters', () => {
    it('returns all channel settings URLs', () => {
      const service = new BloomreachChannelSettingsService('kingdom-of-joakim');
      expect(service.emailSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/emails');
      expect(service.pushNotificationSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/push-notifications',
      );
      expect(service.smsSettingsUrl).toBe('/p/kingdom-of-joakim/project-settings/sms');
      expect(service.mobileMessagingSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/mobile-messaging',
      );
      expect(service.paymentTrackingSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/payment-tracking',
      );
      expect(service.facebookMessagingSettingsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/facebook-messaging',
      );
    });
  });

  describe('read methods', () => {
    it('viewEmailSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachChannelSettingsService('test');
      await expect(service.viewEmailSettings()).rejects.toThrow('not yet implemented');
    });

    it('viewPushNotificationSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachChannelSettingsService('test');
      await expect(service.viewPushNotificationSettings()).rejects.toThrow('not yet implemented');
    });

    it('viewSmsSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachChannelSettingsService('test');
      await expect(service.viewSmsSettings()).rejects.toThrow('not yet implemented');
    });

    it('viewMobileMessagingSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachChannelSettingsService('test');
      await expect(service.viewMobileMessagingSettings()).rejects.toThrow('not yet implemented');
    });

    it('viewPaymentTrackingSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachChannelSettingsService('test');
      await expect(service.viewPaymentTrackingSettings()).rejects.toThrow('not yet implemented');
    });

    it('viewFacebookMessagingSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachChannelSettingsService('test');
      await expect(service.viewFacebookMessagingSettings()).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareConfigureEmailDomain', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureEmailDomain({
        project: 'test',
        domain: 'mail.example.com',
        operatorNote: 'set sending domain',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'channel_settings.configure_email_domain',
          project: 'test',
          domain: 'mail.example.com',
          operatorNote: 'set sending domain',
        }),
      );
    });

    it('trims the domain value', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureEmailDomain({
        project: 'test',
        domain: '  mail.example.com  ',
      });
      expect(result.preview).toEqual(expect.objectContaining({ domain: 'mail.example.com' }));
    });

    it('throws for empty project', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureEmailDomain({ project: '', domain: 'mail.example.com' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty domain', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureEmailDomain({ project: 'test', domain: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareConfigurePushProvider', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigurePushProvider({
        project: 'test',
        provider: 'firebase',
        firebaseCredentials: '  firebase-secret  ',
        apnsCertificate: '  apns-cert  ',
        operatorNote: 'configure push stack',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'channel_settings.configure_push_provider',
          project: 'test',
          provider: 'firebase',
          firebaseCredentials: 'firebase-secret',
          apnsCertificate: 'apns-cert',
          operatorNote: 'configure push stack',
        }),
      );
    });

    it('trims provider name', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigurePushProvider({
        project: 'test',
        provider: '  fcm  ',
      });
      expect(result.preview).toEqual(expect.objectContaining({ provider: 'fcm' }));
    });

    it('keeps optional credentials undefined when omitted', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigurePushProvider({ project: 'test', provider: 'fcm' });
      expect(result.preview).toEqual(
        expect.objectContaining({ firebaseCredentials: undefined, apnsCertificate: undefined }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigurePushProvider({ project: '', provider: 'fcm' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty provider', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigurePushProvider({ project: 'test', provider: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareConfigureSmsProvider', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureSmsProvider({
        project: 'test',
        provider: 'twilio',
        senderNumber: '  +15551234567  ',
        operatorNote: 'set sms provider',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'channel_settings.configure_sms_provider',
          project: 'test',
          provider: 'twilio',
          senderNumber: '+15551234567',
          operatorNote: 'set sms provider',
        }),
      );
    });

    it('allows sender number to be omitted', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureSmsProvider({ project: 'test', provider: 'twilio' });
      expect(result.preview).toEqual(expect.objectContaining({ senderNumber: undefined }));
    });

    it('trims provider name', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureSmsProvider({ project: 'test', provider: '  twilio  ' });
      expect(result.preview).toEqual(expect.objectContaining({ provider: 'twilio' }));
    });

    it('throws for empty project', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureSmsProvider({ project: '', provider: 'twilio' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty provider', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureSmsProvider({ project: 'test', provider: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareConfigureMobileMessaging', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureMobileMessaging({
        project: 'test',
        provider: 'meta',
        whatsappEnabled: true,
        rcsEnabled: false,
        operatorNote: 'configure mobile messaging channels',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'channel_settings.configure_mobile_messaging',
          project: 'test',
          provider: 'meta',
          whatsappEnabled: true,
          rcsEnabled: false,
          operatorNote: 'configure mobile messaging channels',
        }),
      );
    });

    it('allows boolean flags to be omitted', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureMobileMessaging({ project: 'test', provider: 'meta' });
      expect(result.preview).toEqual(
        expect.objectContaining({ whatsappEnabled: undefined, rcsEnabled: undefined }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureMobileMessaging({ project: '', provider: 'meta' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty provider', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureMobileMessaging({ project: 'test', provider: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareConfigurePaymentTracking', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigurePaymentTracking({
        project: 'test',
        provider: 'stripe',
        enabled: true,
        operatorNote: 'enable payment provider tracking',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'channel_settings.configure_payment_tracking',
          project: 'test',
          provider: 'stripe',
          enabled: true,
          operatorNote: 'enable payment provider tracking',
        }),
      );
    });

    it('allows enabled flag to be omitted', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigurePaymentTracking({
        project: 'test',
        provider: 'stripe',
      });
      expect(result.preview).toEqual(expect.objectContaining({ enabled: undefined }));
    });

    it('throws for empty project', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigurePaymentTracking({ project: '', provider: 'stripe' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty provider', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigurePaymentTracking({ project: 'test', provider: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareConfigureFacebookMessaging', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureFacebookMessaging({
        project: 'test',
        pageId: '  123456789  ',
        accessToken: '  fb-access-token  ',
        operatorNote: 'connect page',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'channel_settings.configure_facebook_messaging',
          project: 'test',
          pageId: '123456789',
          accessToken: 'fb-access-token',
          operatorNote: 'connect page',
        }),
      );
    });

    it('allows access token to be omitted', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureFacebookMessaging({
        project: 'test',
        pageId: '123456789',
      });
      expect(result.preview).toEqual(expect.objectContaining({ accessToken: undefined }));
    });

    it('trims page ID', () => {
      const service = new BloomreachChannelSettingsService('test');
      const result = service.prepareConfigureFacebookMessaging({
        project: 'test',
        pageId: '  page-123  ',
      });
      expect(result.preview).toEqual(expect.objectContaining({ pageId: 'page-123' }));
    });

    it('throws for empty project', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureFacebookMessaging({ project: '', pageId: 'x' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty page ID', () => {
      const service = new BloomreachChannelSettingsService('test');
      expect(() => service.prepareConfigureFacebookMessaging({ project: 'test', pageId: '' })).toThrow(
        'must not be empty',
      );
    });
  });
});
