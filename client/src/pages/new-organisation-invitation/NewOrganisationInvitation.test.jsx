import React from "react";
import { render } from "@testing-library/react";
import NewOrganisationInvitation from "./NewOrganisationInvitation";

const mockMatch = { params: { id: "1" } };
const mockHistory = [];

describe("NewOrganisationInvitation", () => {
    it("matches snapshot with minimal props", () => {
        const { asFragment } = render(
            <NewOrganisationInvitation
                user={{ admin: true }}
                onInvitationSubmit={() => {}}
                match={mockMatch}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title and description", () => {
        const { asFragment } = render(
            <NewOrganisationInvitation
                user={{ admin: true }}
                title="Custom Title"
                description="Custom Description"
                onInvitationSubmit={() => {}}
                match={mockMatch}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
