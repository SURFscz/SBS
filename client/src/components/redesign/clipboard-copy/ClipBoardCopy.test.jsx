import React from "react";
import { render } from "@testing-library/react";
import ClipBoardCopy from "./ClipBoardCopy";

describe("ClipBoardCopy", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ClipBoardCopy
                text="This is a test text to copy."
                buttonText="Copy"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom button text", () => {
        const { asFragment } = render(
            <ClipBoardCopy
                text="Another test text."
                buttonText="Custom Copy"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
