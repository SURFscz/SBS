import React from "react";
import {render} from "@testing-library/react";
import SelectField from "./SelectField";

describe("SelectField", () => {
    it("matches snapshot with minimal props", () => {
        const {asFragment} = render(
            <SelectField
                name="Test"
                value="Value"
                onChange={() => {}}
                options={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with options", () => {
        const {asFragment} = render(
            <SelectField
                name="Test"
                value="Value"
                onChange={() => {}}
                options={[{value: "Option1", label: "Option 1"}]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
