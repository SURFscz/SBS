import React from "react";
import { render } from "@testing-library/react";
import Logo from "./Logo";

describe("Logo", () => {
    it("renders with valid src", () => {
        const {asFragment} = render(
            <Logo src="valid-image.jpg" alt="Test Logo" className="test-class"/>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
