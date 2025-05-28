import React from "react";
import { render } from "@testing-library/react";
import Groups from "./Groups";

const mockMatch = {params: {id: "1"}};
const mockCollaboration = {
    id: "1",
    name: "Test Collaboration",
    members: [],
    service_memberships: [],
    groups: []
};

describe("Groups", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <Groups
                groups={[]}
                onGroupClick={() => {}}
                onCreateGroup={() => {}}
                user={{ admin: true }}
                columns={[{ name: "name", label: "Name" }]}
                modelName="group"
                defaultSort="asc"
                loading={false}
                match={mockMatch}
                collaboration={mockCollaboration}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
