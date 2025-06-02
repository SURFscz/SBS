import React from "react";
import { render } from "@testing-library/react";
import Login from "./Login";

describe("Login", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <Login />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <Login title="Custom Login Title" />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <Login description="Custom Login Description" />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
