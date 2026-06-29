import {expect, Page, test} from '@playwright/test';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';

test.describe.configure({mode: 'serial'});

test.describe('AUP', () => {
    test('user can accept the acceptable use policy', async ({page}) => {
        // await mockAupApi(page);

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

        // Todo: implement handling the Service AUP
    });
});
