import React from "react";
import {render} from "@testing-library/react";
import System from "./System";

jest.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => <span data-testid="icon"/>
}));

const mockUser = {admin: true};
const mockConfig = {seed_allowed: true};

describe("System", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <System
                user={mockUser}
                config={mockConfig}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
