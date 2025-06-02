import React from "react";
import { render } from "@testing-library/react";
import OrganisationForm from "./OrganisationForm";

const mockConfig = { organisation_categories: ["University"] };
const mockMatch = { params: { id: "1" } };

describe("OrganisationForm", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <OrganisationForm
                open={true}
                onClose={() => {}}
                onSubmit={() => {}}
                config={mockConfig}
                match={mockMatch}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <OrganisationForm
                open={true}
                onClose={() => {}}
                onSubmit={() => {}}
                title="Custom Title"
                config={mockConfig}
                match={mockMatch}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <OrganisationForm
                open={true}
                onClose={() => {}}
                onSubmit={() => {}}
                description="Custom Description"
                config={mockConfig}
                match={mockMatch}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
