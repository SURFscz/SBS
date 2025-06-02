import React from "react";
import { render } from "@testing-library/react";
import PAM from "./PAM";

describe("PAM", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <PAM />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <PAM title="Custom Title" />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <PAM description="Custom Description" />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
