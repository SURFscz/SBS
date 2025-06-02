import React from "react";
import {render} from "@testing-library/react";
import ServiceAup from "./ServiceAup";
import {MemoryRouter} from "react-router-dom";

describe("ServiceAup", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <ServiceAup/>
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
