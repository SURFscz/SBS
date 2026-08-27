import {DEFAULT_MOCK_USER, expect, test} from '../../fixtures/mockUser';
import {reseedDatabase} from '../../utils/reseedDatabase';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';

test.describe.configure({mode: 'serial'});
test.use({mockUser: DEFAULT_MOCK_USER});

test.beforeAll(async ({request}) => {
    await reseedDatabase(request);
});

test.describe('AUP', () => {

    // This test is frontend only, it uses a mock
    test('user can accept the acceptable use policy', async ({page}) => {
        let forcedOnce = false;
        await page.route('**/api/users/me', async route => {
            const response = await route.fetch();
            const body = await response.json();
            await route.fulfill({
                response,
                json: forcedOnce ? body : {...body, user_accepted_aup: false},
            });
            forcedOnce = true;
        });

        await page.goto(`${baseURL}/aup`);

        await expect(page.getByRole('heading', {name: /^Hi Doe/})).toBeVisible();
        await expect(page.getByRole('link', {name: 'acceptable use policy'})).toBeVisible();

        const terms = page.getByText('I hereby certify that I have read the acceptable use policy and that I accept it');
        const onwards = page.getByRole('button', {name: 'Onwards'});

        await expect(onwards).toBeDisabled();

        await terms.click();

        await expect(onwards).toBeEnabled();

        const [agreeResponse, refreshResponse] = await Promise.all([
            page.waitForResponse('**/api/aup/agree'),
            page.waitForResponse('**/api/users/refresh'),
            onwards.click(),
        ]);

        expect(agreeResponse.status()).toBe(201);
        expect(refreshResponse.status()).toBe(200);

        await expect(page).toHaveURL(`${baseURL}/missing-service-aup?state=%2Fhome`);

        // Verify aup page is not shown anymore
        await expect(page.getByRole('heading', {name: /^Hi Doe/})).toBeHidden();
    });
});

test.describe('Missing Service AUP', () => {
    test('user can accept the missing service AUPs', async ({page}) => {
        await page.goto(`${baseURL}/`);
        await expect(page).toHaveURL(`${baseURL}/missing-service-aup?state=%2Fhome`);

        await expect(page.getByRole('heading', {name: 'Information about the applications'})).toBeVisible();

        const serviceSections = page.locator('div.service-section');
        await expect(serviceSections).toHaveCount(2);

        const mailSection = serviceSections.filter({hasText: 'Mail Services'});
        await expect(mailSection.locator('td.logo img')).toBeVisible();
        await expect(mailSection.getByText('Mail Services')).toBeVisible();
        await expect(mailSection.getByRole('link', {name: 'Acceptable use policy'})).toBeVisible();
        await expect(mailSection.getByRole('link', {name: 'Privacy policy'})).toBeVisible();
        await expect(mailSection.getByRole('link', {name: 'Contact'})).toBeVisible();

        await page.locator('label[for="aup"]').click();
        await page.locator('div.actions > button').click();
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(`${baseURL}/home`);
    });
});
