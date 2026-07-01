## Manual AUP Test

Background: in local mode SBS automatically logs in as the hardcoded local user from `SBS/client/src/api/index.js`. If that user already accepted the current AUP version, `/aup` redirects away immediately. Logging out does not help, because the local frontend logs the same user in again.

For refactor safety, prefer the Playwright test because it mocks a fresh user that has not accepted the AUP yet.

Manual check:

1. Start the SBS frontend on `http://localhost:3000`.
2. Make sure the local auto-login user has not accepted the current AUP version, or temporarily change the hardcoded local user in `SBS/client/src/api/index.js`.
3. Go to `http://localhost:3000/aup`.
4. Verify the page says hi to the user and shows the acceptable use policy link.
5. Verify the `Onwards` button is disabled.
6. Check `I hereby certify that I have read the acceptable use policy and that I accept it`.
7. Verify the `Onwards` button becomes enabled.
8. Click `Onwards`.
9. Verify the user leaves the AUP page and lands on the configured home page.
