import React from "react";
import { render } from "@testing-library/react";
import EmptyCollaborations from "./EmptyCollaborations";

const mockUser = { admin: true };

describe("EmptyCollaborations", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <EmptyCollaborations
                title="No Collaborations"
                description="You have no collaborations yet."
                buttonText="Create Collaboration"
                onButtonClick={() => {}}
                user={mockUser}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
