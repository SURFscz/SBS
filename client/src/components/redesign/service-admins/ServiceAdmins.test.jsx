import React from "react";
import {render} from "@testing-library/react";
import ServiceAdmins from "./ServiceAdmins";

describe("ServiceAdmins", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <ServiceAdmins
                service_admins={[]}
                service={{service_memberships: []}}
                onDeleteServiceAdmin={() => {
                }}
                onReassignServiceAdmin={() => {
                }}
                user={{admin: true}}
                config={{impersonation_allowed: false}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
