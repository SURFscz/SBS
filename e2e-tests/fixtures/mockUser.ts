import {test as base} from '@playwright/test';

export type MockUser = {
    sub: string;
    name?: string;
    email?: string;
    given_name?: string;
    second_factor_confirmed?: boolean;
    rate_limited?: boolean;
};

export const DEFAULT_MOCK_USER: MockUser = {sub: 'urn:john'};
export const EBBE_MOCK_USER: MockUser = {
    sub: 'urn:collab:person:mujina.com:ebbe',
    name: 'Ebbe Doe',
    email: 'ebbe@example.org',
    given_name: 'Ebbe',
};

const capitalize = (value: string) =>
    value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

const buildPayload = (user: MockUser) => {
    const part = user.sub.substring(user.sub.indexOf(':') + 1);
    return {
        sub: user.sub,
        name: user.name ?? `${capitalize(part)} Doe`,
        email: user.email ?? `${part}@example.org`,
        given_name: user.given_name ?? 'Doe',
        second_factor_confirmed: user.second_factor_confirmed ?? true,
        rate_limited: user.rate_limited ?? false,
    };
};

export const test = base.extend<{mockUser: MockUser}>({
    mockUser: [DEFAULT_MOCK_USER, {option: true}],

    page: async ({page, mockUser}, use) => {
        let mockLoginSeen = false;

        await page.route('**/api/mock', async route => {
            if (route.request().method() !== 'PUT') {
                return route.fallback();
            }
            mockLoginSeen = true;
            await route.continue({postData: JSON.stringify(buildPayload(mockUser))});
        });

        await use(page);

        if (!mockLoginSeen) {
            throw new Error(
                'Expected a PUT /api/mock during the test (local mock login). ' +
                'Is the frontend running with config.local and the mock-login branch enabled?'
            );
        }
    },
});

export {expect} from '@playwright/test';
