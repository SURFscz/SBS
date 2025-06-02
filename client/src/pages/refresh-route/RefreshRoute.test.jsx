import React from "react";
import { render } from "@testing-library/react";
import RefreshRoute from "./RefreshRoute";

const mockMatch = { params: { id: "1" } };
const mockHistory = [];

describe("RefreshRoute", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <RefreshRoute
            match={mockMatch}
            history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <RefreshRoute
                match={mockMatch}
                history={mockHistory}
                title="Custom Refresh Title"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <RefreshRoute
                match={mockMatch}
                history={mockHistory}
                description="Custom Refresh Description"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
