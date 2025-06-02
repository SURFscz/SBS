import React from "react";
import { render } from "@testing-library/react";
import InstituteColumn from "./InstituteColumn";

describe("InstituteColumn", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <InstituteColumn
                institute={{
                    id: "1",
                    name: "Test Institute",
                    description: "This is a test institute.",
                    members: [],
                    service_memberships: []
                }}
                onInstituteClick={() => {}}
                user={{ admin: true }}
                entity={{invite: true}}

            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
