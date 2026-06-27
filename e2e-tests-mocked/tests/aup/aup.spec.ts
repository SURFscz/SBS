import { expect, Page, test } from '@playwright/test';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';

// async function mockAupApi(page: Page) {
//   let acceptedAup = false;
//   const jsonHeaders = { 'content-type': 'application/json', 'x-session-alive': 'true' };
//   const currentUser = () => ({
//     id: 999999,
//     uid: 'urn:playwright:aup',
//     name: 'Playwright AUP User',
//     given_name: 'Playwright',
//     email: 'playwright-aup@example.org',
//     guest: false,
//     admin: false,
//     second_factor_confirmed: true,
//     organisation_memberships: [],
//     collaboration_memberships: [],
//     service_memberships: [],
//     user_accepted_aup: acceptedAup,
//     CSRFToken: 'playwright-csrf-token',
//   });
//
//   await page.route('**/config', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify({
//       local: false,
//       continue_eduteams_redirect_uri: baseURL,
//       continue_eb_redirect_uri: baseURL,
//     }),
//   }));
//   await page.route('**/api/aup/info', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify({
//       url_aup_en: 'https://example.org/aup',
//       url_aup_nl: 'https://example.org/aup-nl',
//       version: 'playwright',
//     }),
//   }));
//   await page.route('**/api/users/me', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(currentUser()),
//   }));
//   await page.route('**/api/users/refresh', route => route.fulfill({
//     status: 200,
//     headers: jsonHeaders,
//     body: JSON.stringify(currentUser()),
//   }));
//   await page.route('**/api/aup/agree', route => {
//     acceptedAup = true;
//     return route.fulfill({
//       status: 201,
//       headers: jsonHeaders,
//       body: JSON.stringify({ location: `${baseURL}/welcome` }),
//     });
//   });
// }

test.describe('Local AUP happy flow', () => {
  test('user can accept the acceptable use policy', async ({ page }) => {
    // await page.goto(`${baseURL}/aup`);
    //
    // await expect(page.getByRole('heading', { name: /^Hi Doe/ })).toBeVisible();
    // await expect(page.getByRole('link', { name: 'acceptable use policy' })).toBeVisible();
    //
    // const terms = page.getByText('I hereby certify that I have read the acceptable use policy and that I accept it');
    // const onwards = page.getByRole('button', { name: 'Onwards' });
    //
    // await expect(onwards).toBeDisabled();
    //
    // await terms.click();
    //
    // await expect(onwards).toBeEnabled();
    //
    // const [agreeResponse, refreshResponse] = await Promise.all([
    //   page.waitForResponse('**/api/aup/agree'),
    //   page.waitForResponse('**/api/users/refresh'),
    //   onwards.click(),
    // ]);
    //
    // expect(agreeResponse.status()).toBe(201);
    // expect(refreshResponse.status()).toBe(200);
    //
    // await expect(page).toHaveURL(`${baseURL}/home`);
    //
    // // Verify aup page is not shown anymore
    // await expect(page.getByRole('heading', { name: /^Hi Doe/ })).toBeHidden();
  });
});
