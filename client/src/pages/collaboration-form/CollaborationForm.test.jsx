import React from "react";
import { render } from "@testing-library/react";
import CollaborationForm from "./CollaborationForm";

const mockMatch = { params: { id: "1" } };

describe("CollaborationForm", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <CollaborationForm
                match={mockMatch}
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <CollaborationForm
                match={mockMatch}
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                title="Custom Title"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <CollaborationForm
                match={mockMatch}
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                description="Custom Description"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
