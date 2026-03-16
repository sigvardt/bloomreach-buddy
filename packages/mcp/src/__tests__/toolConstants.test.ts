import { describe, it, expect } from 'vitest';
import { BLOOMREACH_MCP_TOOL_NAMES } from '../index.js';

describe('tool constants', () => {
  it('exports 267 tool name constants via BLOOMREACH_MCP_TOOL_NAMES', () => {
    expect(BLOOMREACH_MCP_TOOL_NAMES).toHaveLength(283);
  });

  it('all tool names follow bloomreach.<domain>.<action> dot-notation', () => {
    for (const name of BLOOMREACH_MCP_TOOL_NAMES) {
      const parts = name.split('.');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      expect(parts[0]).toBe('bloomreach');
      for (const part of parts) {
        expect(part).toMatch(/^[a-z_]+$/);
      }
    }
  });

  it('has no duplicate tool names', () => {
    const unique = new Set(BLOOMREACH_MCP_TOOL_NAMES);
    expect(unique.size).toBe(BLOOMREACH_MCP_TOOL_NAMES.length);
  });

  it('includes bloomreach.session.status tool', () => {
    expect(BLOOMREACH_MCP_TOOL_NAMES).toContain('bloomreach.session.status');
  });

  it('includes bloomreach.dashboards.list tool', () => {
    expect(BLOOMREACH_MCP_TOOL_NAMES).toContain('bloomreach.dashboards.list');
  });

  it('includes bloomreach.actions.confirm tool', () => {
    expect(BLOOMREACH_MCP_TOOL_NAMES).toContain('bloomreach.actions.confirm');
  });

  it('includes bloomreach.actions.list tool', () => {
    expect(BLOOMREACH_MCP_TOOL_NAMES).toContain('bloomreach.actions.list');
  });

  it('includes prepare tools with prepare_ in name', () => {
    const prepareTools = BLOOMREACH_MCP_TOOL_NAMES.filter((name) => name.includes('prepare_'));
    expect(prepareTools.length).toBeGreaterThan(0);
    for (const name of prepareTools) {
      expect(name).toMatch(/prepare_/);
    }
  });

  it('covers all 37 expected service domains', () => {
    const domains = new Set(BLOOMREACH_MCP_TOOL_NAMES.map((name) => name.split('.')[1]));
    const expectedDomains = [
      'actions',
      'access',
      'assets',
      'auth',
      'campaign_settings',
      'channel_settings',
      'campaigns_calendar',
      'catalogs',
      'customers',
      'dashboards',
      'data_manager',
      'email_campaigns',
      'evaluation_settings',
      'exports',
      'flows',
      'funnels',
      'geo_analyses',
      'imports',
      'initiatives',
      'integrations',
      'metrics',
      'performance',
      'project_settings',
      'recommendations',
      'reports',
      'retentions',
      'scenarios',
      'security_settings',
      'segmentations',
      'session',
      'sql_reports',
      'surveys',
      'tag_manager',
      'trends',
      'use_cases',
      'vouchers',
      'tracking',
      'weblayers',
    ];

    expect(domains.size).toBe(expectedDomains.length);
    for (const domain of expectedDomains) {
      expect(domains).toContain(domain);
    }
  });
});
