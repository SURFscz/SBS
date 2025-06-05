import React from "react";
import { render } from "@testing-library/react";
import ServiceCollaborations from "./ServiceCollaborations";

describe("ServiceCollaborations", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServiceCollaborations
                service_collaborations={[]}
                onDeleteCollaboration={() => {}}
                onReassignCollaboration={() => {}}
                user={{ admin: true }}
                entities={[]}
                service={{id: "1"}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
