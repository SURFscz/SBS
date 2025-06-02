import React from "react";
import { render } from "@testing-library/react";
import ServiceGroups from "./ServiceGroups";

describe("ServiceGroups", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServiceGroups
                service={{service_groups: []}}
                onDeleteGroup={() => {}}
                onReassignGroup={() => {}}
                user={{ admin: true, service_memberships: [] }}
                entities={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
