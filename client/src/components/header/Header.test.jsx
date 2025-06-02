import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import Header from "./Header";

jest.mock("../../locale/I18n", () => ({
    t: key => key,
}));

describe("Header", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            // component should be wrapped in MemoryRouter for routing context
            <MemoryRouter>
                <Header currentUser={{guest: true}} config={{}}/>
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
