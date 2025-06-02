import React from "react";
import {render} from "@testing-library/react";
import MemberJoinRequests from "./MemberJoinRequests";

describe("MemberJoinRequests", () => {

    it("renders with non-empty join requests", () => {
        const {asFragment} = render(
            <MemberJoinRequests
                join_requests={[{id: 1, name: "Test User", collaboration: { organisation_id: "123"}}]}
                onAccept={() => {
                }}
                onReject={() => {
                }}
                user={{admin: true}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
