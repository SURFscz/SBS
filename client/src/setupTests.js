import { vi } from 'vitest';

// Stub fetch for relative API calls during tests.
if (!globalThis.fetch || !globalThis.fetch.__isMocked) {
  globalThis.fetch = vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/api/')) {
      const listMatchers = [
        /\/search\b/,
        /\/all_optimized\b/,
        /\/all\b/,
        /\/mine\b/,
        /\/used_services\b/,
        /\/export-overview\b/,
        /\/by_service_optimized\b/,
        /\/pam-services\b/,
        /\/service_requests\b/,
        /\/collaboration_requests\b/,
        /\/audit_logs\b/,
        /\/platform_admins\b/,
        /\/rate_limited\b/,
        /\/suspended\b/,
        /\/reset_totp_requested\b/,
        /\/user_tokens\b/,
        /\/tags\b/,
        /\/servicegroups\b/,
        /\/scim_mock\/statistics\b/,
        /\/scim\/v2\/scim-services\b/
      ];
      const exactListMatchers = [
        /\/api\/organisations(?:\?|$)/,
        /\/api\/collaborations(?:\?|$)/,
        /\/api\/services(?:\?|$)/,
        /\/api\/groups(?:\?|$)/
      ];
      if (url.includes('/api/system/statistics')) {
        const stats = {
          collaborations: [{month: 1, year: 2025, count: 1}],
          collaboration_memberships: [{month: 1, year: 2025, count: 1}],
          organisation_memberships: [{month: 1, year: 2025, count: 1}],
          services: [{month: 1, year: 2025, count: 1}],
          service_memberships: [{month: 1, year: 2025, count: 1}],
          groups: [{month: 1, year: 2025, count: 1}],
          users: [{month: 1, year: 2025, count: 1}],
          organisations: [{month: 1, year: 2025, count: 1}]
        };
        const body = JSON.stringify(stats);
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-session-alive': 'true'
          }
        });
      }
      if (url.includes('/api/system/validations')) {
        const validations = {
          organisation_invitations: [],
          collaboration_invitations: [],
          service_invitations: []
        };
        const body = JSON.stringify(validations);
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-session-alive': 'true'
          }
        });
      }
      if (url.includes('/api/services/find_by_uuid4')) {
        const serviceByUuid = {
          service: { accepted_user_policy: null, name: 'test service' },
          collaborations: [],
          service_emails: {}
        };
        const body = JSON.stringify(serviceByUuid);
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-session-alive': 'true'
          }
        });
      }
      if (listMatchers.some(matcher => matcher.test(url)) ||
          exactListMatchers.some(matcher => matcher.test(url))) {
        const body = JSON.stringify([]);
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-session-alive': 'true'
          }
        });
      }
      const data = {
        organisation_invitations: [],
        collaboration_invitations: [],
        service_invitations: [],
        organisations: [],
        collaborations: [],
        services: [],
        groups: [],
        users: [],
        audit_logs: [],
        service: { accepted_user_policy: null, name: 'test service' },
        service_emails: {},
        id: 1,
        name: 'test'
      };
      const body = JSON.stringify(data);
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-session-alive': 'true'
        }
      });
    }
    const body = JSON.stringify({});
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'x-session-alive': 'true'
      }
    });
  });
  globalThis.fetch.__isMocked = true;
}
