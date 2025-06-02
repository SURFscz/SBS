import React from "react";
import {render} from "@testing-library/react";
import InputField from "./InputField";

describe("InputField", () => {
    it("matches snapshot with minimal props", () => {
        const {asFragment} = render(
            <InputField
                name="Test"
                value="Value"
                onChange={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
