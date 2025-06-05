import React from "react";
import { render } from "@testing-library/react";
import RadioButtonGroup from "./RadioButtonGroup";

describe("RadioButtonGroup", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <RadioButtonGroup
                name="test-group"
                options={["Option 1", "Option 2", "Option 3"]}
                selectedOption="Option 1"
                onChange={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with custom className", () => {
        const { asFragment } = render(
            <RadioButtonGroup
                name="test-group"
                options={["Option 1", "Option 2"]}
                selectedOption="Option 2"
                onChange={() => {}}
                className="some className"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
