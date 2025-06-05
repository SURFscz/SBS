import React from "react";
import { render } from "@testing-library/react";
import RadioButton from "./RadioButton";

describe("RadioButton", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <RadioButton
                name="test-radio"
                value="test-value"
                checked={false}
                onChange={() => {}}
                label="Test Radio Button"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with checked state", () => {
        const { asFragment } = render(
            <RadioButton
                name="test-radio"
                value="test-value"
                checked={true}
                onChange={() => {}}
                label="Test Radio Button Checked"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
