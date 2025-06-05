import React from "react";
import {render} from "@testing-library/react";
import AboutService from "./AboutService";

describe("AboutService", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <AboutService
                service={{
                    id: "1",
                    name: "Test Service",
                    description: "This is a test service.",
                    collaboration: {
                        id: "1",
                        name: "Test Collaboration"
                    },
                    members: [],
                    service_memberships: []
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
