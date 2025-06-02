import React from "react";
import { render } from "@testing-library/react";
import SpinnerField from "./SpinnerField";

describe("SpinnerField", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <SpinnerField
                value={0}
                onChange={() => {}}
                min={0}
                max={100}
                step={1}
                disabled={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with custom props", () => {
        const { asFragment } = render(
            <SpinnerField
                value={50}
                onChange={() => {}}
                min={10}
                max={200}
                step={5}
                disabled={true}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
