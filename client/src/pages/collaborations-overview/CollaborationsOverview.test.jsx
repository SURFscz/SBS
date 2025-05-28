import React from "react";
import { render } from "@testing-library/react";
import CollaborationsOverview from "./CollaborationsOverview";

const mockUser = { dmin: true }

describe("CollaborationsOverview", () => {
    it("matches snapshot with minimal props", () => {
        const { asFragment } = render(
            <CollaborationsOverview
                user={mockUser}
                collaborations={[]}
                onCollaborationClick={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with collaborations data", () => {
        const collaborations = [
            { id: 1, name: "Collaboration 1", description: "Description 1" },
            { id: 2, name: "Collaboration 2", description: "Description 2" }
        ];
        const { asFragment } = render(
            <CollaborationsOverview
                user={mockUser}
                collaborations={collaborations}
                onCollaborationClick={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
