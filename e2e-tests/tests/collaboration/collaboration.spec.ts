import {expect, EBBE_MOCK_USER, test} from '../../fixtures/mockUser';
import {Page} from '@playwright/test';
import {gotoWithRedirectHandler} from '../../utils/gotoWithRedirectHandler';
import {reseedDatabase} from '../../utils/reseedDatabase';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';

const openCollaborationDetail = async (page: Page) => {
    await gotoWithRedirectHandler(page, `${baseURL}/`);
    await expect(page).toHaveURL(/\/collaborations\/\d+/);
    await expect(page.locator('.unit-header-container').getByRole('heading', {
        level: 1,
        name: 'AI computing',
    })).toBeVisible();
};

const openTab = async (page: Page, tabClass: string) => {
    await page.locator(`.tabs .tab.${tabClass}`).click();
    await expect(page.locator(`.tabs .tab.${tabClass}`)).toHaveClass(/active/);
};

test.describe('Collaboration detail (collab member)', () => {
    test.use({mockUser: EBBE_MOCK_USER});

    test.beforeAll(async ({request}) => {
        await reseedDatabase(request);
    });

    test('home redirects to the single collaboration', async ({page}) => {
        await gotoWithRedirectHandler(page, `${baseURL}/`);

        await expect(page).toHaveURL(/\/collaborations\/\d+/);
        await expect(page.locator('.unit-header-container').getByRole('heading', {
            level: 1,
            name: 'AI computing',
        })).toBeVisible();
    });

    test('About tab shows Network Services with Open button', async ({page}) => {
        await openCollaborationDetail(page);
        await openTab(page, 'about');

        const about = page.locator('.collaboration-about-mod');
        const networkCard = about.locator('.sds--content-card').filter({hasText: 'Network Services'});

        await expect(networkCard.getByRole('heading', {level: 4, name: 'Network Services'})).toBeVisible();
        await expect(networkCard.getByRole('button', {name: 'Open'})).toBeVisible();
    });

    test('Members tab shows members with one admin (beheerder)', async ({page}) => {
        await openCollaborationDetail(page);
        await openTab(page, 'members');

        const search = page.locator('.entities-search');
        await expect(search.getByRole('heading', {level: 2})).toHaveText(/Members \(6\)|Leden \(6\)/);
        await expect(search.getByPlaceholder(/Search for members|Zoek leden/)).toBeVisible();
        await expect(page.getByRole('button', {
            name: /Invite members|Nodig leden uit/,
        })).toHaveCount(0);

        const membersTable = page.locator('table.members');
        await expect(membersTable).toBeVisible();
        await expect(membersTable.locator('tbody tr')).toHaveCount(6);

        const adminRow = membersTable.locator('tbody tr').filter({hasText: 'The Boss'});
        await expect(adminRow).toHaveCount(1);
        await expect(adminRow.locator('td.role')).toHaveText(/^(Admin|Beheerder)$/);
        await expect(membersTable.locator('td.role').getByText(/^(Admin|Beheerder)$/)).toHaveCount(1);
        await expect(membersTable.locator('td.role').getByText(/^(Member|Lid)$/)).toHaveCount(5);

        await expect(membersTable.locator('.select-member-role__control')).toHaveCount(0);

        const ebbeRow = membersTable.locator('tbody tr').filter({hasText: 'Ebbe Doe'});
        await expect(ebbeRow).toHaveCount(1);
        await expect(ebbeRow.getByText('ebbe@example.org')).toBeVisible();
        await expect(ebbeRow.getByText(/You|Jij/)).toBeVisible();
        await expect(ebbeRow.locator('td.role')).toHaveText(/^(Member|Lid)$/);
    });

    test('Groups tab lists collaboration groups', async ({page}) => {
        await openCollaborationDetail(page);
        await openTab(page, 'groups');

        await expect(page.locator('.entities-search h2')).toHaveText(/Groups \(\d+\)|Groepen \(\d+\)/);

        const groupsTable = page.locator('table.groups');
        await expect(groupsTable.locator('tbody tr')).not.toHaveCount(0);
        await expect(groupsTable.getByRole('link', {name: 'AI researchers'})).toBeVisible();
        await expect(groupsTable.getByRole('link', {name: 'AI developers'})).toBeVisible();
    });

    test('Application tokens tab opens create-token screen', async ({page}) => {
        // Given
        await openCollaborationDetail(page);
        await openTab(page, 'tokens');

        await expect(page.locator('.entities-search h2')).toHaveText(/Application tokens|Applicatietokens/);

        // When
        const [generateResponse] = await Promise.all([
            page.waitForResponse(response =>
                response.url().includes('/api/user_tokens/generate_token') && response.ok()
            ),
            page.getByRole('button', {
                name: /Create application token|Maak applicatietoken aan/,
            }).click(),
        ]);
        expect(generateResponse.status()).toBe(200);
        const {value: token} = await generateResponse.json();
        expect(token).toBeTruthy();

        // Then
        const form = page.locator('.user-token-form');
        await expect(form.getByRole('heading', {
            level: 2,
            name: /Create application token|Maak applicatietoken aan/,
        })).toBeVisible();
        await expect(form.locator('.disclaimer')).toContainText(/Copy the application token|Kopieer de applicatietoken/);
        await expect(form.locator('.input-field').filter({
            hasText: /Application token|Applicatietoken/,
        }).locator('input')).toHaveValue(token);
        await expect(page.getByRole('button', {name: /Save|Opslaan/})).toBeVisible();
        await expect(page.getByRole('link', {
            name: /Back to all application tokens|Terug naar alle applicatietokens/,
        })).toBeVisible();
    });
});
