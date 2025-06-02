import React from "react";
import { render } from "@testing-library/react";
import Welcome from "./Welcome";

describe("Welcome", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <Welcome
                user={{ id: "1", username: "testuser" }}
                onStart={() => {}}
                onSkip={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with custom welcome message", () => {
        const { asFragment } = render(
            <Welcome
                user={{ id: "1", username: "testuser" }}
                welcomeMessage="Welcome to the application!"
                onStart={() => {}}
                onSkip={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
