import React from "react";
import { render } from "@testing-library/react";
import OrganisationInvitations from "./OrganisationInvitations";

describe("OrganisationInvitations", () => {
    it("renders with default props", () => {
        const {asFragment} = render(
            <OrganisationInvitations
                organisation_invitations={[]}
                onAccept={() => {
                }}
                onReject={() => {
                }}
                user={{admin: true}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
