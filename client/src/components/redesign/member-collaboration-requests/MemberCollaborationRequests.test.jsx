import React from "react";
import { render } from "@testing-library/react";
import MemberCollaborationRequests from "./MemberCollaborationRequests";

describe("MemberCollaborationRequests", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <MemberCollaborationRequests
                collaboration_requests={[]}
                onAccept={() => {}}
                onReject={() => {}}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
