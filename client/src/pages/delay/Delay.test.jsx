import React from "react";
import { render } from "@testing-library/react";
import Delay from "./Delay";

describe("Delay", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <Delay />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <Delay title="Custom Title" />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <Delay description="Custom Description" />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
