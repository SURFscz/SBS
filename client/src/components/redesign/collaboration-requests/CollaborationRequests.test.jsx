import React from "react";
import {render} from "@testing-library/react";
import CollaborationRequests from "./CollaborationRequests";

const mockOrganisation = {
    api_keys: [{created_at: 1700000000000}],
    collaboration_requests: []
};

const mockUser = {id: "1", name: "Test User"};

describe("CollaborationRequests", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <CollaborationRequests
                user={mockUser}
                collaborationRequests={[]}
                onAccept={() => {
                }}
                onReject={() => {
                }}
                organisation={mockOrganisation}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with collaboration requests", () => {
        const mockRequests = [
            {id: "1", user: {id: "2", name: "User One"}, status: "pending"},
            {id: "2", user: {id: "3", name: "User Two"}, status: "pending"}
        ];
        const {asFragment} = render(
            <CollaborationRequests
                user={mockUser}
                collaborationRequests={mockRequests}
                onAccept={() => {
                }}
                onReject={() => {
                }}
                organisation={mockOrganisation}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
