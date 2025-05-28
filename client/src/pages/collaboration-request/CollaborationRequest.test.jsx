import React from "react";
import {render} from "@testing-library/react";
import CollaborationRequest from "./CollaborationRequest";

const mockMatch = {params: {id: "1"}};

describe("CollaborationRequest", () => {
    it("matches snapshot with minimal props", () => {
        const {asFragment} = render(
            <CollaborationRequest
                match={mockMatch}
                service={{logo: "fake_logo_for_testing.png"}}
                name="Test Service"
                description="This is a test service."
                icon="test-icon"
                onClick={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with all props", () => {
        const {asFragment} = render(
            <CollaborationRequest
                match={mockMatch}
                service={{logo: "fake_logo_for_testing.png"}}
                name="Test Service"
                description="This is a test service."
                icon="test-icon"
                onClick={() => {
                }}
                disabled={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
