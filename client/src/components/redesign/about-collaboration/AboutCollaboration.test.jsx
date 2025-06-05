import React from "react";
import { render } from "@testing-library/react";
import AboutCollaboration from "./AboutCollaboration";

const mockCollaboration = {
    id: "1",
    name: "Test Collaboration",
    description: "This is a test collaboration.",
    services: [],
    members: [],
    collaboration_memberships: []
};

describe("AboutCollaboration", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <AboutCollaboration
            collaboration={mockCollaboration}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
