import { expect, Page, test } from '@playwright/test';
import path from 'path';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';
const logoPath = path.resolve(__dirname, '../../../../SBS/client/src/images/surflogo.png');

// function adminUser() {
//   return {
//     id: 999998,
//     uid: 'urn:playwright:organisation-admin',
//     name: 'Playwright Admin',
//     given_name: 'Playwright',
//     email: 'playwright-admin@example.org',
//     guest: false,
//     admin: true,
//     second_factor_confirmed: true,
//     user_accepted_aup: true,
//     organisation_memberships: [],
//     collaboration_memberships: [],
//     service_memberships: [],
//     organisations_from_user_schac_home: [],
//     join_requests: [],
//     collaboration_requests: [],
//     service_requests: [],
//     service_connection_requests: [],
//     total_service_requests: 0,
//     total_open_service_requests: 0,
//     services_without_aup: [],
//     CSRFToken: 'playwright-csrf-token',
//   };
// }
//
// function organisation(id: number, name: string, shortName: string, logo = '') {
//   return {
//     id,
//     name,
//     short_name: shortName,
//     identifier: shortName,
//     category: 'Research',
//     logo,
//     schac_home_organisations: [],
//     organisation_memberships_count: 1,
//     collaborations_count: 0,
//   };
// }
//
// async function mockOrganisationApi(page: Page) {
//   const jsonHeaders = { 'content-type': 'application/json', 'x-session-alive': 'true' };
//   const organisations = [
//     organisation(1001, 'Existing Organisation', 'existing_org'),
//   ];
//
//   await page.route('**/config', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify({
//       local: false,
//       organisation_categories: ['Research', 'University', 'Medical'],
//       continue_eduteams_redirect_uri: 'http://localhost',
//       continue_eb_redirect_uri: 'http://localhost',
//       feedback_enabled: false,
//       impersonation_allowed: false,
//     }),
//   }));
//
//   await page.route('**/api/aup/info', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify({
//       url_aup_en: 'https://example.org/aup',
//       url_aup_nl: 'https://example.org/aup-nl',
//       version: 'playwright',
//     }),
//   }));
//
//   await page.route('**/api/users/me', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(adminUser()),
//   }));
//
//   await page.route('**/api/users/refresh', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(adminUser()),
//   }));
//
//   await page.route('**/health', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify({ status: 'ok' }),
//   }));
//
//   await page.route('**/api/users/error', route => route.fulfill({
//     status: 201,
//     headers: jsonHeaders,
//     body: JSON.stringify({}),
//   }));
//
//   await page.route('**/api/organisations/all', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(organisations),
//   }));
//
//   await page.route('**/api/organisations/name_exists**', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(false),
//   }));
//
//   await page.route('**/api/organisations/short_name_exists**', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(false),
//   }));
//
//   await page.route('**/api/organisations/schac_home_exists**', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(false),
//   }));
//
//   await page.route('**/api/organisations', async route => {
//     if (route.request().method() !== 'POST') {
//       return route.fallback();
//     }
//     const payload = route.request().postDataJSON();
//     const created = organisation(1002, payload.name, payload.short_name, payload.logo);
//     organisations.push(created);
//
//     return route.fulfill({
//       status: 201,
//       headers: jsonHeaders,
//       body: JSON.stringify(created),
//     });
//   });
// }


const handleAup = async (page: Page, url: string) => {
  console.log('Navigating to:', url);
  await page.goto(url);

  await page.waitForLoadState('networkidle');

  const currentUrl = page.url();
  console.log('Current URL after navigation:', currentUrl);

  if (currentUrl !== url) {
    console.log('DEBUG: unexpected redirect -- TODO implement');

    // Determine the page: /aup or /missing-service-aup
    // Handle the page accordingly
    return await page.goto(url);
  }

  console.log('DEBUG: no redirect needed');
};

test.describe('Local organisation happy flow', () => {
  test('platform admin can add an organisation and see it in the list', async ({ page }) => {
    // await mockOrganisationApi(page);

    // await page.goto(`${baseURL}/home/organisations`);
    await handleAup(page, `${baseURL}/home/organisations`);

    /*
    //////
    const url = `${baseURL}/home/organisations`;
    await page.goto(url);

    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);

    if (currentUrl !== url) {
      console.log('DEBUG: unexpected redirect -- TODO implement');

      // Determine the page: /aup or /missing-service-aup
      // Handle the page accordingly
      // Trigger await page.goto(url); again
    }

    /////
    */


    const organisationsHeading = page.locator('.entities-search h2');
    await expect(organisationsHeading).toBeVisible();
    await expect(organisationsHeading).toHaveText(/Organisations \(4\)|Organisaties \(4\)/);
    //
    // await expect(page.getByRole('link', { name: 'Existing Organisation' })).toBeVisible();
    //
    // await page.getByRole('button', { name: /Add organisation|Voeg organisatie toe/ }).click();
    //
    // await expect(page).toHaveURL(`${baseURL}/new-organisation`);
    // await expect(page.locator('.unit-header h1')).toHaveText(/Add organisation|Voeg organisatie toe/);
    //
    // await page.getByPlaceholder(/The unique name of an organisation|De unieke naam van de organisatie/).fill('Playwright University');
    // await page.getByPlaceholder(/Short name of the organisation|Korte naam van de organisatie/).fill('playwright_uni');
    //
    // await page.locator('.cropped-image-field').getByRole('button', { name: /Add an image|Voeg afbeelding toe/ }).click();
    // await page.locator('#fileUpload_logo').setInputFiles(logoPath);
    // await expect(page.getByRole('button', { name: /Apply|Toepassen/ })).toBeEnabled();
    // await page.getByRole('button', { name: /Apply|Toepassen/ }).click();
    // await expect(page.locator('.cropped-image-field').getByRole('button', { name: /Change image|Wijzig afbeelding/ })).toBeVisible();
    //
    // await page.locator('#email-field').fill('organisation-admin@example.org');
    // await page.locator('#email-field').press('Enter');
    // await expect(page.getByText('organisation-admin@example.org')).toBeVisible();
    //
    // const [createResponse] = await Promise.all([
    //   page.waitForResponse(response =>
    //     response.url().endsWith('/api/organisations') && response.request().method() === 'POST'
    //   ),
    //   page.getByRole('button', { name: /Save|Opslaan/ }).click(),
    // ]);
    //
    // expect(createResponse.status()).toBe(201);
    // await expect(page).toHaveURL(`${baseURL}/home/organisations`);
    // await expect(page.locator('.entities-search h2')).toHaveText(/Organisations \(2\)|Organisaties \(2\)/);
    // await expect(page.getByRole('link', { name: 'Playwright University' })).toBeVisible();
  });
});
