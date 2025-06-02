import React from "react";
import {render} from "@testing-library/react";
import UploadButton from "./UploadButton";

describe("UploadButton", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <UploadButton
                onChange={() => {}}
                accept="image/*"
                disabled={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom label", () => {
        const {asFragment} = render(
            <UploadButton
                onChange={() => {}}
                accept="image/*"
                disabled={false}
                label="Custom Upload"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot when disabled", () => {
        const {asFragment} = render(
            <UploadButton
                onChange={() => {}}
                accept="image/*"
                disabled={true}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
