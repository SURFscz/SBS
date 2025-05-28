import React from "react";
import {render} from "@testing-library/react";
import Scim from "./Scim";

const mockConfig = {mock_scim_enabled: true};

describe("Scim", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <Scim
                config={mockConfig}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
