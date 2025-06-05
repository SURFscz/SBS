import React from "react";
import { render } from "@testing-library/react";
import ErrorIndicator from "./ErrorIndicator";

describe("ErrorIndicator", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ErrorIndicator
                title="Error Occurred"
                description="An unexpected error has occurred. Please try again later."
                buttonText="Retry"
                onButtonClick={() => {}}
                msg="message"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom props", () => {
        const { asFragment } = render(
            <ErrorIndicator
                title="Network Error"
                description="Unable to connect to the server. Please check your internet connection."
                buttonText="Reconnect"
                onButtonClick={() => {}}
                msg="message"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
