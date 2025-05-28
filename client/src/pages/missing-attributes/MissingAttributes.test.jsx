import React from "react";
import { render } from "@testing-library/react";
import MissingAttributes from "./MissingAttributes";

describe("MissingAttributes", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <MissingAttributes
                open={true}
                onClose={() => {}}
                onSave={() => {}}
                attributes={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom attributes", () => {
        const attributes = [
            { name: "Attribute 1", value: "Value 1" },
            { name: "Attribute 2", value: "Value 2" }
        ];
        const { asFragment } = render(
            <MissingAttributes
                open={true}
                onClose={() => {}}
                onSave={() => {}}
                attributes={attributes}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
