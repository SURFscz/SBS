import React from "react";
import { render } from "@testing-library/react";
import SpinnerMarathonField from "./SpinnerMarathonField";

describe("SpinnerMarathonField", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <SpinnerMarathonField
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

    it("renders with custom value", () => {
        const { asFragment } = render(
            <SpinnerMarathonField
                value={50}
                onChange={() => {}}
                min={0}
                max={100}
                step={1}
                disabled={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with disabled state", () => {
        const { asFragment } = render(
            <SpinnerMarathonField
                value={50}
                onChange={() => {}}
                min={0}
                max={100}
                step={1}
                disabled={true}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
