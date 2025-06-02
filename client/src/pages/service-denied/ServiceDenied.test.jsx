import React from "react";
import { render } from "@testing-library/react";
import ServiceDenied from "./ServiceDenied";

describe("ServiceDenied", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServiceDenied />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
