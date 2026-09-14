import {expect, DEFAULT_MOCK_USER, test} from '../../fixtures/mockUser';
import {Page} from '@playwright/test';
import {gotoWithRedirectHandler} from '../../utils/gotoWithRedirectHandler';
import {reseedDatabase} from '../../utils/reseedDatabase';

const baseURL = process.env.SBS_LOCAL_BASE_URL ?? 'http://localhost:3000';

const openCollaborationDetail = async (page: Page) => {
    await gotoWithRedirectHandler(page, `${baseURL}/home/collaborations`);

    await expect(page.locator('.entities-search h2')).toHaveText(/Collaborations \(\d+\)|Samenwerkingen \(\d+\)/);
    await page.getByRole('link', {name: 'AI computing', exact: true}).click();

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

test.describe('Collaboration detail (platform admin)', () => {
    test.use({mockUser: DEFAULT_MOCK_USER});

    test.beforeAll(async ({request}) => {
        await reseedDatabase(request);
    });

    test('collaborations overview lists AI computing and opens its detail page', async ({page}) => {
        await gotoWithRedirectHandler(page, `${baseURL}/home/collaborations`);

        await expect(page.locator('.entities-search h2')).toHaveText(/Collaborations \(6\)|Samenwerkingen \(6\)/);

        const collaborationsTable = page.locator('table.collaborations');
        await expect(collaborationsTable.locator('tbody tr')).toHaveCount(6);
        await expect(collaborationsTable.getByRole('link', {name: 'AI computing', exact: true})).toBeVisible();
        await expect(collaborationsTable.getByRole('link', {name: 'Teachers', exact: true})).toBeVisible();
        await expect(collaborationsTable.getByRole('link', {name: 'Research', exact: true})).toBeVisible();
        await expect(collaborationsTable.getByRole('link', {name: 'Robotics', exact: true})).toBeVisible();
        await expect(collaborationsTable.getByRole('link', {name: 'Monitoring CO numero 1', exact: true})).toBeVisible();
        await expect(collaborationsTable.getByRole('link', {name: 'Monitoring CO numero 2', exact: true})).toBeVisible();

        // John is a member of AI computing only, so that is the only row with a role chip
        const aiComputingRow = collaborationsTable.locator('tbody tr').filter({hasText: 'AI computing'});
        await expect(aiComputingRow.getByText(/^(Member|Lid)$/)).toBeVisible();

        await collaborationsTable.getByRole('link', {name: 'AI computing', exact: true}).click();

        await expect(page).toHaveURL(/\/collaborations\/\d+/);
        await expect(page.locator('.unit-header-container').getByRole('heading', {
            level: 1,
            name: 'AI computing',
        })).toBeVisible();
    });

    test('admin view shows the full tab set with notifiers for open requests', async ({page}) => {
        await openCollaborationDetail(page);

        const tabs = page.locator('.tabs .tab');
        await expect(tabs).toHaveCount(7);
        await expect(page.locator('.tabs .tab.about')).toHaveClass(/active/);
        await expect(page.locator('.tabs .tab.about .tab-label')).toHaveText(/About|Over/);
        await expect(page.locator('.tabs .tab.about .notifier')).toHaveCount(0);

        await expect(page.locator('.tabs .tab.admins .tab-label')).toHaveText(/Admins|Beheerders/);
        await expect(page.locator('.tabs .tab.admins .notifier')).toHaveCount(0);

        await expect(page.locator('.tabs .tab.members .tab-label')).toHaveText(/Members|Leden/);
        await expect(page.locator('.tabs .tab.members .notifier')).toHaveCount(0);

        await expect(page.locator('.tabs .tab.groups .tab-label')).toHaveText(/Groups|Groepen/);
        await expect(page.locator('.tabs .tab.groups .notifier')).toHaveCount(0);

        await expect(page.locator('.tabs .tab.services .tab-label')).toHaveText(/Applications|Applicaties/);
        await expect(page.locator('.tabs .tab.services .notifier')).toBeVisible();

        await expect(page.locator('.tabs .tab.joinrequests .tab-label')).toHaveText(/Join requests|Lidmaatschapsaanvragen/);
        await expect(page.locator('.tabs .tab.joinrequests .notifier')).toBeVisible();

        await expect(page.locator('.tabs .tab.tokens .tab-label')).toHaveText(/Application tokens|Applicatietokens/);
        await expect(page.locator('.tabs .tab.tokens .notifier')).toHaveCount(0);
    });

    test.describe('About tab', () => {
        test('About tab shows collaboration metadata, unit, tags and connected services', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'about');

            await expect(page.locator('.unit-header-container .meta-info .name'))
                .toHaveText('Universiteit van Harderwijk – Support');

            const about = page.locator('.collaboration-about-mod');
            await expect(about.locator('p.description'))
                .toHaveText('Artificial Intelligence computing for the Unincorporated Urban Community');

            const services = about.locator('.services');
            await expect(services.locator('h4.margin'))
                .toHaveText(/We collaborate in 2 applications|We werken samen in 2 applicaties/);

            const serviceCards = services.locator('.sds--content-card');
            await expect(serviceCards).toHaveCount(2);
            await expect(serviceCards.nth(0).getByRole('heading', {level: 4})).toHaveText('Mail Services');
            await expect(serviceCards.nth(1).getByRole('heading', {level: 4})).toHaveText('Network Services');

            // Only Network Services has a uri seeded, so it is the only card with a launch button
            await expect(serviceCards.filter({hasText: 'Network Services'})
                .getByRole('button', {name: 'Open'})).toBeVisible();
            await expect(serviceCards.filter({hasText: 'Mail Services'})
                .getByRole('button', {name: 'Open'})).toHaveCount(0);

            // Meta sections in render order: tags, short name, website_url and, because AI computing has no
            // support_email, the collaboration admins to contact instead
            const metaSections = about.locator('.members .meta-section');
            await expect(metaSections).toHaveCount(4);

            await expect(metaSections.nth(0).locator('.header p')).toHaveText('Labels');
            const tags = metaSections.nth(0).locator('.labels .chip-container');
            await expect(tags).toHaveCount(2);
            await expect(tags.nth(0)).toHaveText('tag_uuc');
            await expect(tags.nth(1)).toHaveText('tag_uuc_2');

            await expect(metaSections.nth(1).locator('.header p')).toHaveText(/Short name|Korte naam/);
            await expect(metaSections.nth(1).locator('.values strong')).toHaveText('ai_computing');

            await expect(metaSections.nth(2).locator('.header p')).toHaveText(/More information|Meer informatie/);
            const websiteLink = metaSections.nth(2).getByRole('link', {name: /Visit website|Bezoek website/});
            await expect(websiteLink).toHaveAttribute('href', 'https://www.google.nl');

            await expect(metaSections.nth(3).locator('.header p'))
                .toHaveText(/Contact an administrator|Neem contact op met een beheerder/);
            const adminLink = metaSections.nth(3).getByRole('link', {name: 'The Boss'});
            await expect(adminLink).toHaveAttribute('href', 'mailto:boss@example.org');
        });

        test('About tab service cards expand policies, support and application groups', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'about');

            const about = page.locator('.collaboration-about-mod');
            const mailCard = about.locator('.sds--content-card').filter({hasText: 'Mail Services'});
            const networkCard = about.locator('.sds--content-card').filter({hasText: 'Network Services'});

            const policiesLink = /Policies & Support|Beleid & Support/;
            const groupsLink = /Application groups|Applicatiegroepen/;

            await expect(mailCard.locator('.sds--content-card--bottom nav > ul > li'))
                .toHaveText([policiesLink, groupsLink]);
            await expect(networkCard.locator('.sds--content-card--bottom nav > ul > li'))
                .toHaveText([policiesLink, groupsLink, 'My Tokens']);

            // Mail Services is seeded with contact_email john@example.org but without support_email or uri_info,
            // so support falls back to the "no support" message plus the administrative contact
            await mailCard.getByRole('link', {name: policiesLink}).click();

            const mailPolicies = mailCard.locator('.service-metadata .policies');
            await expect(mailPolicies.getByRole('link', {name: /Privacy policy|Privacyverklaring/}))
                .toHaveAttribute('href', 'https://privacy.org');
            await expect(mailPolicies.getByRole('link', {name: /Acceptable use policy/}))
                .toHaveAttribute('href', 'https://google.nl');

            const mailSupport = mailCard.locator('.service-metadata .support');
            await expect(mailSupport).toContainText(
                /Mail Services does not provide support for end users|Applicatie Mail Services biedt geen hulp/);
            await expect(mailSupport).toContainText(/Administrative contact|Contactpersoon beheer/);
            await expect(mailSupport.getByRole('link', {name: 'john@example.org'}))
                .toHaveAttribute('href', 'mailto:john@example.org');

            // Application groups are fetched lazily from /api/servicegroups/find_by_service_uuid/:uuid4
            const [mailGroupsResponse] = await Promise.all([
                page.waitForResponse(response =>
                    response.url().includes('/api/servicegroups/find_by_service_uuid/') && response.ok()
                ),
                mailCard.getByRole('link', {name: groupsLink}).click(),
            ]);
            const mailServiceGroups = await mailGroupsResponse.json();
            expect(mailServiceGroups.map((group: { name: string }) => group.name)).toEqual(['service_group_mail_name']);

            // Opening the groups section collapses the policies section
            await expect(mailCard.locator('.service-metadata .policies')).toHaveCount(0);

            const mailGroups = mailCard.locator('.service-metadata .service-groups li');
            await expect(mailGroups).toHaveCount(1);
            await expect(mailGroups.locator('.service-group')).toHaveText('service_group_mail_name');
            await expect(mailGroups).toContainText(': Mail group');

            // Network Services has no contact_email, so the admin of its service membership is shown instead
            await networkCard.getByRole('link', {name: policiesLink}).click();

            const networkPolicies = networkCard.locator('.service-metadata .policies');
            await expect(networkPolicies.getByRole('link', {name: /Privacy policy|Privacyverklaring/}))
                .toHaveAttribute('href', 'https://privacy.org');
            await expect(networkPolicies.getByRole('link', {name: /Acceptable use policy/}))
                .toHaveAttribute('href', 'https://aup.org');

            const networkSupport = networkCard.locator('.service-metadata .support');
            await expect(networkSupport).toContainText(
                /Network Services does not provide support for end users|Applicatie Network Services biedt geen hulp/);
            await expect(networkSupport.getByRole('link', {name: 'Service Admin'}))
                .toHaveAttribute('href', 'mailto:service_admin@ucc.org');

            // No ServiceGroup is seeded for Network Services
            await networkCard.getByRole('link', {name: groupsLink}).click();
            await expect(networkCard.locator('.service-metadata .service-groups'))
                .toHaveText(/This application has no groups|Deze applicatie heeft geen groepen/);
        });
    });

    test.describe('Admins tab', () => {
        // Only members with role admin are listed: The Boss is the single seeded CO admin. The tab also holds
        // invitations with intended_role admin, of which only the open ones reach the client.
        test('Admins tab lists The Boss as the only collaboration admin', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'admins');

            // The Boss plus the one open invitation with intended_role admin (curious@ex.org)
            const search = page.locator('.entities-search');
            await expect(search.getByRole('heading', {level: 2})).toHaveText(/Admins \(2\)|Beheerders \(2\)/);
            await expect(search.getByPlaceholder(/Search for admins|Zoek beheerders/)).toBeVisible();

            // The group filter and 'hide invitees' checkbox are only rendered on the members tab
            await expect(page.locator('.member-filter')).toHaveCount(0);

            const adminsTable = page.locator('table.coAdmins');
            await expect(adminsTable.locator('tbody tr')).toHaveCount(2);

            const bossRow = adminsTable.locator('tbody tr').filter({hasText: 'The Boss'});
            await expect(bossRow).toHaveCount(1);
            await expect(bossRow.locator('td.name .name')).toHaveText('The Boss');
            await expect(bossRow.locator('td.name .email')).toHaveText('boss@example.org');

            // The Boss has no schac_home_organisation seeded
            await expect(bossRow.locator('td.user__schac_home_organisation')).toHaveText(/unknown|onbekend/);

            // John is a platform admin, so roles are editable dropdowns here instead of the read-only chips
            // that collaboration.spec.ts asserts for the member view
            await expect(bossRow.locator('td.role .select-member-role__single-value')).toHaveText(/Admin|Beheerder/);

            // The other 5 memberships of AI computing have role member and are filtered out of this tab
            for (const name of ['John Doe', 'Jane Doe', 'Sarah Cross', 'Ebbe Doe', 'betty']) {
                await expect(adminsTable.locator('tbody tr').filter({hasText: name})).toHaveCount(0);
            }

            // The invite action is the main difference with the member view
            const inviteButton = search.getByRole('button', {name: /Invite admins|Nodig beheerders uit/});
            await expect(inviteButton).toBeVisible();

            await inviteButton.click();
            await expect(page).toHaveURL(/\/new-invite\/\d+\?isAdminView=true/);
        });

        test('Admins tab shows the open admin invitation and hides accepted and expired ones', async ({page}) => {
            const [collaborationResponse] = await Promise.all([
                page.waitForResponse(response =>
                    /\/api\/collaborations\/\d+$/.test(response.url()) && response.ok()
                ),
                openCollaborationDetail(page),
            ]);

            // The backend already filtered out some@ex.org (accepted) and noway@ex.org (expired)
            const {invitations} = await collaborationResponse.json();
            expect(invitations.map((invitation: { invitee_email: string }) => invitation.invitee_email))
                .toEqual(['curious@ex.org']);

            await openTab(page, 'admins');

            const adminsTable = page.locator('table.coAdmins');
            const inviteRow = adminsTable.locator('tbody tr').filter({hasText: 'curious@ex.org'});
            await expect(inviteRow).toHaveCount(1);

            // UserColumn has no user to show for an invitation, so the name is a dash and the email is the invitee
            await expect(inviteRow.locator('td.name .name')).toHaveText('-');
            await expect(inviteRow.locator('td.name .email')).toHaveText('curious@ex.org');
            await expect(inviteRow.locator('td.user__schac_home_organisation')).toHaveText('');

            // intended_role admin renders as a read-only chip; only real memberships get the role dropdown
            await expect(inviteRow.locator('td.role')).toHaveText(/^(Admin|Beheerder)$/);
            await expect(inviteRow.locator('td.role .select-member-role__control')).toHaveCount(0);

            // The invitation is still open with a future expiry_date, so it is 'invited on', not 'invite expired'
            const statusChip = inviteRow.locator('td.expiry_date .chip-container .sds--chips');
            await expect(statusChip).toHaveText(/Invited on|Uitgenodigd op/);
            await expect(statusChip).toHaveClass(/status-info/);
            await expect(statusChip).not.toHaveClass(/status-error/);

            // An invitation has no groups and cannot be impersonated, but it can be resent, which a membership cannot
            await expect(inviteRow.locator('td.groups')).toHaveText('');
            await expect(inviteRow.locator('.impersonation')).toHaveCount(0);
            await expect(inviteRow.locator('.admin-icons > div')).toHaveCount(3);
            await expect(inviteRow.locator('.admin-icons a'))
                .toHaveAttribute('href', 'mailto:curious@ex.org');

            // The Boss is a membership: delete and mail but no resend, and he can be impersonated
            const bossRow = adminsTable.locator('tbody tr').filter({hasText: 'The Boss'});
            await expect(bossRow.locator('.admin-icons > div')).toHaveCount(2);
            await expect(bossRow.locator('.impersonation')).toHaveCount(1);

            await expect(adminsTable.locator('tbody tr').filter({hasText: 'some@ex.org'})).toHaveCount(0);
            await expect(adminsTable.locator('tbody tr').filter({hasText: 'noway@ex.org'})).toHaveCount(0);
        });
    });

    test.describe('Members tab', () => {
        test('Members tab shows all 6 members with editable roles and an invite button', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'members');

            const search = page.locator('.entities-search');
            await expect(search.getByRole('heading', {level: 2})).toHaveText(/Members \(7\)|Leden \(7\)/);

            // Entities focuses its search field 150ms after mount. That focus steal closes an open react-select
            // menu, so wait for it to have happened before touching the group filter further down.
            await expect(search.getByPlaceholder(/Search for members|Zoek leden/)).toBeFocused();

            const membersTable = page.locator('table.members');
            const rows = membersTable.locator('tbody tr');
            await expect(rows).toHaveCount(7);

            // Every membership gets an editable role dropdown; the invitation keeps a read-only chip
            await expect(membersTable.locator('.select-member-role__control')).toHaveCount(6);
            await expect(rows.filter({hasText: 'curious@ex.org'}).locator('td.role'))
                .toHaveText(/^(Admin|Beheerder)$/);

            const roleOf = (name: string) =>
                rows.filter({hasText: name}).locator('td.role .select-member-role__single-value');
            await expect(roleOf('The Boss')).toHaveText(/Admin|Beheerder/);
            for (const name of ['John Doe', 'Jane Doe', 'Sarah Cross', 'Ebbe Doe', 'betty']) {
                await expect(roleOf(name)).toHaveText(/Member|Lid/);
            }

            // John is the logged in user, so only his row is marked with the "You" label
            const johnRow = rows.filter({hasText: 'John Doe'});
            await expect(johnRow.getByText(/^(You|Jij)$/)).toBeVisible();
            await expect(membersTable.getByText(/^(You|Jij)$/)).toHaveCount(1);

            // No membership of AI computing has an expiry_date seeded
            await expect(johnRow.locator('td.expiry_date .msg')).toHaveText(/Never expires|Verloopt nooit/);

            // Hiding invitations is admin-only and drops curious@ex.org from the table
            const filter = page.locator('.member-filter');
            await expect(filter.locator('.filter-select__single-value')).toHaveText(/All groups|Alle groepen/);

            await page.locator('label[for="hide_invitees"]').click();
            await expect(search.getByRole('heading', {level: 2})).toHaveText(/Members \(6\)|Leden \(6\)/);
            await expect(rows).toHaveCount(6);
            await expect(rows.filter({hasText: 'curious@ex.org'})).toHaveCount(0);

            // Filtering on a group narrows the memberships down to the 2 members of AI researchers
            await filter.locator('.filter-select__control').click();
            await expect(page.locator('.filter-select__menu')).toBeVisible();
            await page.getByRole('option', {name: 'AI researchers (2)'}).click();

            await expect(rows).toHaveCount(2);
            await expect(rows.filter({hasText: 'John Doe'})).toHaveCount(1);
            await expect(rows.filter({hasText: 'Jane Doe'})).toHaveCount(1);

            // The invite action is absent for a plain member, see collaboration.spec.ts
            const inviteButton = search.getByRole('button', {name: /Invite members|Nodig leden uit/});
            await expect(inviteButton).toBeVisible();

            await inviteButton.click();
            await expect(page).toHaveURL(/\/new-invite\/\d+\?isAdminView=false/);
        });
    });

    test.describe('Groups tab', () => {
        test('Groups tab lists both groups with their member counts and an add-group action', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'groups');

            const search = page.locator('.entities-search');
            await expect(search.getByRole('heading', {level: 2})).toHaveText(/Groups \(2\)|Groepen \(2\)/);

            const groupsTable = page.locator('table.groups');
            const rows = groupsTable.locator('tbody tr');
            await expect(rows).toHaveCount(2);

            // mayCreateGroups adds the select, auto provisioning and delete columns on top of the 5 shared ones
            await expect(groupsTable.locator('thead th')).toHaveCount(8);

            const researchersRow = rows.filter({hasText: 'AI researchers'});
            await expect(researchersRow.getByRole('link', {name: 'AI researchers'})).toBeVisible();
            await expect(researchersRow.locator('td.description')).toHaveText('Artificial computing researchers');
            await expect(researchersRow.locator('td.memberCount')).toHaveText('2');

            const developersRow = rows.filter({hasText: 'AI developers'});
            await expect(developersRow.getByRole('link', {name: 'AI developers'})).toBeVisible();
            await expect(developersRow.locator('td.description')).toHaveText('Artificial computing developers');
            await expect(developersRow.locator('td.memberCount')).toHaveText('1');

            // John is a member of both groups, so both rows carry the member chip
            await expect(groupsTable.locator('td.member').getByText(/^(Member|Leden)$/)).toHaveCount(2);

            // Neither group is auto provisioned, and neither is owned by a service group
            await expect(groupsTable.locator('td.auto_provision_members')).toHaveText([/Off|Uit/, /Off|Uit/]);
            await expect(groupsTable.locator('td.service_group__service__name')).toHaveText(['', '']);

            // Adding a group is admin-only and opens an inline form rather than navigating away
            const addGroupButton = search.getByRole('button', {name: /Add group|Voeg groep toe/});
            await expect(addGroupButton).toBeVisible();

            await addGroupButton.click();
            await expect(page.locator('.group-form').getByRole('heading', {
                level: 1,
                name: /Add group|Voeg groep toe/,
            })).toBeVisible();
            await expect(page).toHaveURL(/\/collaborations\/\d+/);
        });

        test('New group form shows the derived platform identifier and cancels back to the list',
            async ({page}) => {
                await openCollaborationDetail(page);
                await openTab(page, 'groups');
                await page.locator('.entities-search').getByRole('button', {name: /Add group|Voeg groep toe/}).click();

                const form = page.locator('.group-form');
                await expect(form.getByRole('heading', {level: 1, name: /Add group|Voeg groep toe/})).toBeVisible();

                // Identifier is absent for a new group, so there are exactly 4 fields in this order
                await expect(form.locator('.input-field label')).toHaveText([
                    /^Name/,
                    /^Short name|^Korte naam/,
                    /^Platform identifier/,
                    /^Description|^Omschrijving/,
                ]);

                const fieldAt = (index: number) => form.locator('.input-field').nth(index);

                // The platform identifier is read-only and derived from the organisation and collaboration
                const globalUrnInput = fieldAt(2).locator('input');
                await expect(globalUrnInput).toHaveValue('uniharderwijk:ai_computing:');
                await expect(globalUrnInput).toBeDisabled();

                // Deleting is only possible for an existing group
                const actions = form.locator('section.actions');
                await expect(actions.getByRole('button', {name: /Cancel|Annuleer/})).toBeVisible();
                await expect(actions.getByRole('button', {name: /Save|Opslaan/})).toBeVisible();
                await expect(actions.getByRole('button', {name: /Delete|Verwijder/})).toHaveCount(0);

                // Cancelling returns to the unchanged list of groups
                await actions.getByRole('button', {name: /Cancel|Annuleer/}).click();
                await expect(form).toHaveCount(0);
                await expect(page.locator('table.groups tbody tr')).toHaveCount(2);
            });
    });

    test.describe('Services tab', () => {
        test('Services tab lists the connected services and the open service connection request', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'services');

            const usedServices = page.locator('.used-services-mod');

            // The sidebar switches between connected and available applications; 'Connected' is the default
            const sideBar = usedServices.locator('.side-bar');
            await expect(sideBar.getByRole('heading', {level: 3})).toHaveText(/Applications|Applicaties/);
            await expect(sideBar.getByRole('link', {name: /Connected|Gekoppeld/})).toHaveClass(/active/);
            await expect(usedServices.getByRole('heading', {level: 2})).toHaveText(/Connected|Gekoppeld/);

            // UsedServices focuses its search field 150ms after loading, like Entities does elsewhere
            const search = usedServices.getByPlaceholder(/Search applications|Zoek applicaties/);
            await expect(search).toBeFocused();

            // The 2 connected services plus the open connection request for Storage, sorted by name
            const cards = usedServices.locator('.sds--content-card');
            const cardTitles = usedServices.locator('.sds--content-card--textual h4');
            await expect(cards).toHaveCount(3);
            await expect(cardTitles).toHaveText(['Mail Services', 'Network Services', 'Storage']);

            const mailCard = cards.filter({hasText: 'Mail Services'});
            const networkCard = cards.filter({hasText: 'Network Services'});
            const storageCard = cards.filter({hasText: 'Storage'});

            const disconnectButton = /^(Disconnect|Ontkoppel)$/;

            // A connected service has no status chip and no message, only the disconnect action
            await expect(mailCard.locator('.sds--chips')).toHaveCount(0);
            await expect(mailCard.locator('.sds--content-card--textual p')).toHaveCount(0);
            await expect(mailCard.getByRole('button', {name: disconnectButton})).toBeVisible();
            await expect(networkCard.getByRole('button', {name: disconnectButton})).toBeVisible();

            // The open ServiceConnectionRequest is pending and can only be retracted, not disconnected
            await expect(storageCard.locator('.sds--chips')).toHaveText(/Pending|Aangevraagd/);
            await expect(storageCard.locator('.sds--content-card--textual p')).toHaveText(
                /made by The Boss on .+ for collaboration AI computing|gemaakt door The Boss op .+ voor samenwerking AI computing/);
            await expect(storageCard.getByRole('button', {name: /Retract|Intrekken/})).toBeVisible();
            await expect(storageCard.getByRole('button', {name: disconnectButton})).toHaveCount(0);

            // Disconnecting asks for confirmation; cancelling leaves the connections untouched
            await mailCard.getByRole('button', {name: disconnectButton}).click();

            const dialog = page.locator('.sds--modal--container');
            await expect(dialog.locator('.sds--modal--content p').first()).toHaveText(
                /Are you sure you want to remove Mail Services from AI computing\?|Weet je zeker dat je Mail Services wil ontkoppelen van AI computing\?/);

            await dialog.getByRole('button', {name: /^(Cancel|Annuleer)$/}).click();
            await expect(dialog).toHaveCount(0);
            await expect(cards).toHaveCount(3);

            await search.fill('net');
            await expect(cardTitles).toHaveText(['Network Services']);
            await search.fill('');
            await expect(cards).toHaveCount(3);
        });

        test('Services tab Available list offers the applications AI computing can still connect to', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'services');

            const usedServices = page.locator('.used-services-mod');
            const cards = usedServices.locator('.sds--content-card');
            const cardTitles = usedServices.locator('.sds--content-card--textual h4');

            const availableLink = usedServices.locator('.side-bar').getByRole('link', {name: /Available|Beschikbaar/});
            await availableLink.click();
            await expect(availableLink).toHaveClass(/active/);
            await expect(usedServices.getByRole('heading', {level: 2})).toHaveText(/Available|Beschikbaar/);

            // Compared as a sorted set, because the UI sorts with localeCompare and the test with the default sort
            expect((await cardTitles.allInnerTexts()).sort()).toEqual([
                'Cloud',
                'LDAP/SCIM Monitor Service',
                'SRAM Demo RP',
                'SSH Service',
                'Scheduler Service',
                'Wiki',
                'Wireless',
            ]);

            for (const name of ['Mail Services', 'Network Services', 'Storage', 'SRAM Demo SP']) {
                await expect(cards.filter({hasText: name})).toHaveCount(0);
            }

            // Universiteit van Harderwijk does not require approval, so automatic_connection_allowed alone decides
            // between connecting straight away and asking the application admin for approval
            const connectButton = /^(Connect|Koppel)$/;
            const requestButton = /^(Request|Aanvragen)$/;
            await expect(usedServices.getByRole('button', {name: connectButton})).toHaveCount(4);
            await expect(usedServices.getByRole('button', {name: requestButton})).toHaveCount(3);

            for (const name of ['Cloud', 'Wireless', 'LDAP/SCIM Monitor Service', 'SRAM Demo RP']) {
                await expect(cards.filter({hasText: name}).getByRole('button', {name: connectButton})).toBeVisible();
            }
            for (const name of ['Wiki', 'Scheduler Service', 'SSH Service']) {
                await expect(cards.filter({hasText: name}).getByRole('button', {name: requestButton})).toBeVisible();
            }
        });
    });

    test.describe('Join requests tab', () => {
        test('Join requests tab lists the three open join requests with approve and deny actions', async ({page}) => {
            await openCollaborationDetail(page);
            await openTab(page, 'joinrequests');

            const search = page.locator('.entities-search');
            await expect(search.getByRole('heading', {level: 2}))
                .toHaveText(/Join Request \(3\)|Aanvragen lid te worden \(3\)/);

            // All 3 seeded join requests are open, so the status filter starts on the 'all' option
            await expect(page.locator('.join-request-filter .filter-select__single-value'))
                .toHaveText(/All \(3\)|Allemaal \(3\)/);

            const table = page.locator('table.joinRequests');
            const rows = table.locator('tbody tr');
            await expect(rows).toHaveCount(3);

            // Compared as a sorted set: Entities gets defaultSort="name", which no column of this table carries,
            // so the rows keep the order in which the backend returned them
            expect((await table.locator('td.user__name .name').allInnerTexts()).sort())
                .toEqual(['John Doe', 'Mary Doe', 'Peter Doe']);
            await expect(table.locator('td.status')).toHaveText([/^Open$/, /^Open$/, /^Open$/]);

            // John is the logged in user, so his row is the only one marked
            const johnRow = rows.filter({hasText: 'John Doe'});
            await expect(johnRow.locator('td.user__name .email')).toHaveText('john@example.org');
            await expect(johnRow.getByText(/^(You|Jij)$/)).toBeVisible();
            await expect(table.getByText(/^(You|Jij)$/)).toHaveCount(1);

            // Mary is the only requester with a schac_home_organisation seeded
            const maryRow = rows.filter({hasText: 'Mary Doe'});
            await expect(maryRow.locator('td.user__name .email')).toHaveText('mary@example.org');
            await expect(maryRow.locator('td.user__schac_home_organisation')).toHaveText('student.example.org');

            const peterRow = rows.filter({hasText: 'Peter Doe'});
            await expect(peterRow.locator('td.user__name .email')).toHaveText('peter@example.org');

            // Clicking a row replaces the table with the approve/deny form for that request
            await peterRow.locator('td.user__name').click();

            const form = page.locator('.join-request-details-container');
            await expect(form.getByRole('heading', {level: 2}))
                .toHaveText(/Join request made by Peter Doe on .+|Aangevraagd door Peter Doe op .+/);
            await expect(form.locator('.join-request-header .sds--chips')).toHaveText(/^Open$/);

            // The seeded motivation is shown read-only
            const motivation = form.locator('.input-field textarea');
            await expect(motivation).toHaveValue('Please...');
            await expect(motivation).toBeDisabled();

            const actions = form.locator('section.actions');
            await expect(actions.getByRole('button', {name: /^(Accept|Goedkeuren)$/})).toBeVisible();

            // Denying asks for a reason first; nothing is denied here
            await actions.getByRole('button', {name: /^(Deny|Afwijzen)$/}).click();

            const dialog = page.locator('.sds--modal--container');
            await expect(dialog.locator('.rejection-reason-container')).toBeVisible();

            await dialog.getByRole('button', {name: /^(Cancel|Annuleer)$/}).click();
            await expect(dialog).toHaveCount(0);

            // Going back leaves all 3 requests untouched
            await form.locator('.back-to-join-requests').click();
            await expect(rows).toHaveCount(3);
            await expect(table.locator('td.status')).toHaveText([/^Open$/, /^Open$/, /^Open$/]);
        });
    });

    test.describe('Application tokens tab', () => {
        test('Application tokens tab starts empty and can create a token for Network Services', async ({page}) => {
            const [collaborationResponse] = await Promise.all([
                page.waitForResponse(response =>
                    /\/api\/collaborations\/\d+$/.test(response.url()) && response.ok()
                ),
                openCollaborationDetail(page),
            ]);

            // getTabs only offers this tab for connected applications with token_enabled, which is Network Services
            const {services} = await collaborationResponse.json();
            const tokenServices = services.filter((service: { token_enabled: boolean }) => service.token_enabled);
            expect(tokenServices.map((service: { name: string }) => service.name)).toEqual(['Network Services']);

            await openTab(page, 'tokens');

            // John has no UserToken seeded for Network Services, so the list starts at 0
            const search = page.locator('.entities-search');
            await expect(search.getByRole('heading', {level: 2}))
                .toHaveText(/Application tokens \(0\)|Applicatietokens \(0\)/);

            // Creating a token first asks the backend for a value, which is shown only once, in the form
            const [generateResponse] = await Promise.all([
                page.waitForResponse(response =>
                    response.url().includes('/api/user_tokens/generate_token') && response.ok()
                ),
                search.getByRole('button', {name: /Create application token|Maak applicatietoken aan/}).click(),
            ]);
            const {value: token} = await generateResponse.json();

            const form = page.locator('.user-token-form');
            const fieldWithLabel = (label: RegExp) => form.locator('.input-field').filter({hasText: label});
            await expect(fieldWithLabel(/Application token|Applicatietoken/).locator('input')).toHaveValue(token);

            // The expiry date is derived from token_validity_days of the selected application, 365 for Network Services
            const validityDays = tokenServices[0].token_validity_days;
            const expiryYear = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).getFullYear();
            await expect(fieldWithLabel(/Expiry date|Vervaldatum/).locator('input'))
                .toHaveValue(new RegExp(`${expiryYear}`));

            // The application defaults to the only option there is
            const select = form.locator('.select-field');
            await expect(select.locator('.select-inner__single-value')).toHaveText('Network Services');

            await select.locator('.select-inner__control').click();
            await expect(page.getByRole('option')).toHaveText(['Network Services']);
            await page.keyboard.press('Escape');

            // Leaving without saving creates nothing
            await page.locator('.back-to-user-tokens').click();
            await expect(search.getByRole('heading', {level: 2}))
                .toHaveText(/Application tokens \(0\)|Applicatietokens \(0\)/);
        });
    });
});
