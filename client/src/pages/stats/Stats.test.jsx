import React from "react";
import { render } from "@testing-library/react";
import Stats from "./Stats";

describe("Stats", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <Stats />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
