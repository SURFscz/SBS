import React from "react";
import { render } from "@testing-library/react";
import OnBoardingMessage from "./OnBoardingMessage";

describe("OnBoardingMessage", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <OnBoardingMessage
                organisation={{ name: "Test Organisation" }}
                currentUserDeleted={true}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with currentUserDeleted false", () => {
        const { asFragment } = render(
            <OnBoardingMessage
                organisation={{ name: "Test Organisation" }}
                currentUserDeleted={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with custom localePrefix", () => {
        const { asFragment } = render(
            <OnBoardingMessage
                organisation={{ name: "Test Organisation" }}
                currentUserDeleted={true}
                localePrefix="customLocale"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
