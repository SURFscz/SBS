import React from "react";
import {render} from "@testing-library/react";
import CollaborationAdmins from "./CollaborationAdmins";

const mockCollaboration = {
    id: "1",
    name: "Test Collaboration",
    description: "This is a test collaboration.",
    services: [],
    members: [],
    collaboration_memberships: [],
    groups: []
};

const mockUser = {
    id: "1",
    name: "Test User",
    admin: true
};

describe("CollaborationAdmins", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <CollaborationAdmins
                collaboration={mockCollaboration}
                user={mockUser}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
