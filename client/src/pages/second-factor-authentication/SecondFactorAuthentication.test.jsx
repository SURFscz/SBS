import React from "react";
import {render} from "@testing-library/react";
import SecondFactorAuthentication from "./SecondFactorAuthentication";
import {MemoryRouter} from "react-router-dom";

const mockUser = {rate_limited: true}

describe("SecondFactorAuthentication", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <SecondFactorAuthentication
                    user={mockUser}
                />
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
