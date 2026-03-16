import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import System from "./System";

vi.mock("@fortawesome/react-fontawesome", () => ({
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
                match={{params: {}}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
