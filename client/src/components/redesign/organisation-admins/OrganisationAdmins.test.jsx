import React from "react";
import { render } from "@testing-library/react";
import OrganisationAdmins from "./OrganisationAdmins";

describe("OrganisationAdmins", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <OrganisationAdmins
                admins={[]}
                organisation={{ name: "Test Organisation", organisation_memberships: [], organisation_invitations: [] }}
                currentUserDeleted={true}
                user={{ admin: true }}
                config={{ impersonation_allowed: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with currentUserDeleted false", () => {
        const { asFragment } = render(
            <OrganisationAdmins
                admins={[]}
                organisation={{ name: "Test Organisation", organisation_memberships: [], organisation_invitations: [] }}
                currentUserDeleted={false}
                user={{ admin: true }}
                config={{ impersonation_allowed: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with custom localePrefix", () => {
        const { asFragment } = render(
            <OrganisationAdmins
                admins={[]}
                organisation={{ name: "Test Organisation", organisation_memberships: [], organisation_invitations: [] }}
                currentUserDeleted={true}
                localePrefix="customLocale"
                user={{ admin: true }}
                config={{ impersonation_allowed: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
