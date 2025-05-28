import React from "react";
import { render } from "@testing-library/react";
import DeadEnd from "./DeadEnd";

describe("DeadEnd", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <DeadEnd />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <DeadEnd title="Custom Title" />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <DeadEnd description="Custom Description" />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
