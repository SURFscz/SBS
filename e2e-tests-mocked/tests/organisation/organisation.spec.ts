import {expect, Page, test} from '@playwright/test';
import path from 'path';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';
const logoPath = path.resolve(__dirname, '../../../../SBS/client/src/images/surflogo.png');

// Todo this could be a generic helper to handle forced redirects, like AUP
const handleAup = async (page: Page, url: string, redirectCounter: number = 0) => {
    const MAX_ALLOWED_REDIRECTS = 10;

    if (redirectCounter >= MAX_ALLOWED_REDIRECTS) {
        console.error(`HandleAUP - Too many redirects, trying to navigate to "${url}"`);
        return
    }

    await page.goto(url);

    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl !== url) {
        if (currentUrl.includes('/aup')) {
            const terms = page.getByText('I hereby certify that I have read the acceptable use policy and that I accept it');
            const onwards = page.getByRole('button', {name: 'Onwards'});
            await terms.click();
            await onwards.click();

            return handleAup(page, url, redirectCounter + 1);
        }

        if (currentUrl.includes('/missing-service-aup')) {
            await page.locator('label[for="aup"]').click();
            await page.locator('div.actions > button').click();
            await page.waitForLoadState('networkidle');

            return handleAup(page, url, redirectCounter + 1);
        }
    }
};

test.describe('Local organisation happy flow', () => {
    test('platform admin can add an organisation and see it in the list', async ({page}) => {
        await handleAup(page, `${baseURL}/home/organisations`);

        const organisationsHeading = page.locator('.entities-search h2');
        await expect(organisationsHeading).toBeVisible();
        await expect(organisationsHeading).toHaveText(/Organisations \(4\)|Organisaties \(4\)/);

        await expect(page.getByRole('link', {name: 'Test Organisation'})).toBeVisible();

        await page.getByRole('button', {name: /Add organisation|Voeg organisatie toe/}).click();

        await expect(page).toHaveURL(`${baseURL}/new-organisation`);
        await expect(page.locator('.unit-header h1')).toHaveText(/Add organisation|Voeg organisatie toe/);

        await page.getByPlaceholder(/The unique name of an organisation|De unieke naam van de organisatie/).fill('Playwright University');
        await page.getByPlaceholder(/Short name of the organisation|Korte naam van de organisatie/).fill('playwright_uni');

        await page.locator('.cropped-image-field').getByRole('button', {name: /Add an image|Voeg afbeelding toe/}).click();
        await page.locator('#fileUpload_logo').setInputFiles(logoPath);
        await expect(page.getByRole('button', {name: /Apply|Toepassen/})).toBeEnabled();
        await page.getByRole('button', {name: /Apply|Toepassen/}).click();
        await expect(page.locator('.cropped-image-field').getByRole('button', {name: /Change image|Wijzig afbeelding/})).toBeVisible();

        await page.locator('#email-field').fill('organisation-admin@example.org');
        await page.locator('#email-field').press('Enter');
        await expect(page.getByText('organisation-admin@example.org')).toBeVisible();

        const [createResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().endsWith('/api/organisations') && response.request().method() === 'POST'
            ),
            page.getByRole('button', {name: /Save|Opslaan/}).click(),
        ]);

        expect(createResponse.status()).toBe(201);
        await expect(page).toHaveURL(`${baseURL}/home/organisations`);
        await expect(page.locator('.entities-search h2')).toHaveText(/Organisations \(5\)|Organisaties \(5\)/);
        await expect(page.getByRole('link', {name: 'Playwright University'})).toBeVisible();
    });
});
