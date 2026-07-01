## Manual Organisation Test

1. Start the SBS frontend on `http://localhost:3000`.
2. Open `http://localhost:3000/home/organisations`.
3. Verify the organisations list is visible.
4. Click `Add organisation` / `Voeg organisatie toe`.
5. Fill the required fields:
   - Name
   - Short name
   - Organisation logo
   - Organisation admin email
6. Click `Save` / `Opslaan`.
7. Verify you return to the organisations list.
8. Verify the new organisation is visible in the list.

Background: local mode automatically logs in as the hardcoded local user from `SBS/client/src/api/index.js`. That user must have platform admin rights to see the `Add organisation` button.
