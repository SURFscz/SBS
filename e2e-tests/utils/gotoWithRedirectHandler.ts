import {Page} from "@playwright/test";

export const gotoWithRedirectHandler: (page: Page, url: string, redirectCounter?: number) => Promise<void> = async (page: Page, url: string, redirectCounter: number = 0) => {
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

            return gotoWithRedirectHandler(page, url, redirectCounter + 1);
        }

        if (currentUrl.includes('/missing-service-aup')) {
            await page.locator('label[for="aup"]').click();
            await page.locator('div.actions > button').click();
            await page.waitForLoadState('networkidle');

            return gotoWithRedirectHandler(page, url, redirectCounter + 1);
        }
    }
};
