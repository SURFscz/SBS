import React from "react";
import {render} from "@testing-library/react";
import NotFound from "./NotFound";

const mockConfig = {baseUrl: "http://example.com"};

describe("NotFound", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <NotFound
                config={mockConfig}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <NotFound
                title="Custom Title"
                config={mockConfig}
            />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <NotFound
                description="Custom Description"
                config={mockConfig}
            />);
        expect(asFragment()).toMatchSnapshot();
    });
});
