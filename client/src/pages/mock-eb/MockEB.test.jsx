import React from "react";
import { render } from "@testing-library/react";
import MockEB from "./MockEB";

describe("MockEB", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <MockEB />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <MockEB title="Custom Title" />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <MockEB description="Custom Description" />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
