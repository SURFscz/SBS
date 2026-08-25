import {APIRequestContext, expect} from '@playwright/test';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';

/** Matches api_users in server/config/test_config.yml (and local PROFILE backends using that config). */
const apiUser = process.env.SBS_API_USER ?? 'sysadmin';
const apiPassword = process.env.SBS_API_PASSWORD ?? 'secret';

/**
 * Wipe and reseed the backend DB via GET /api/system/seed.
 */
export const reseedDatabase = async (request: APIRequestContext): Promise<void> => {
    const credentials = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64');
    const response = await request.get(`${baseURL}/api/system/seed`, {
        headers: {
            Authorization: `Basic ${credentials}`,
            Accept: 'application/json',
        },
    });

    expect(
        response.status(),
        `Expected /api/system/seed to return 201 (got ${response.status()}). ` +
        'Is the backend running with seed_allowed and api_users matching SBS_API_USER/SBS_API_PASSWORD?',
    ).toBe(201);
};
