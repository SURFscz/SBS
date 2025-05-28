import React from "react";
import {render} from "@testing-library/react";
import OrganisationWelcomeDialog from "./OrganisationWelcomeDialog";

describe("OrganisationWelcomeDialog", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <OrganisationWelcomeDialog
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <OrganisationWelcomeDialog
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
            <OrganisationWelcomeDialog
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                description="Custom Description"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
