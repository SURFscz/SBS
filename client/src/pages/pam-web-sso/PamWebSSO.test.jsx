import React from "react";
import {render} from "@testing-library/react";
import PamWebSSO from "./PamWebSSO";
import {MemoryRouter} from "react-router-dom";

describe("PamWebSSO", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <PamWebSSO/>
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <PamWebSSO title="Custom Title"/>
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <PamWebSSO description="Custom Description"/>
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
