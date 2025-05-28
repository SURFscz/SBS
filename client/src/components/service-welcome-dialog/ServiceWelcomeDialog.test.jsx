import React from "react";
import {render} from "@testing-library/react";
import ServiceWelcomeDialog from "./ServiceWelcomeDialog";

describe("ServiceWelcomeDialog", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <ServiceWelcomeDialog
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <ServiceWelcomeDialog
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                title="Custom Title"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <ServiceWelcomeDialog
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                description="Custom Description"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
