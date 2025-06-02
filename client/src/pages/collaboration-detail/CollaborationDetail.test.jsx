import React from "react";
import {render} from "@testing-library/react";
import CollaborationDetail from "./CollaborationDetail";

const mockMatch = {params: {id: "1"}};

describe("CollaborationDetail", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <CollaborationDetail
                match={mockMatch}
                collaboration={{id: "1", name: "Test Collaboration"}}
                onClose={() => {
                }}
                onDelete={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <CollaborationDetail
                match={mockMatch}
                collaboration={{id: "1", name: "Custom Title"}}
                onClose={() => {
                }}
                onDelete={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <CollaborationDetail
                match={mockMatch}
                collaboration={{id: "1", name: "Custom Description"}}
                onClose={() => {
                }}
                onDelete={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
