import React from "react";
import { render } from "@testing-library/react";
import OrganisationsWithoutAdmin from "./OrganisationsWithoutAdmin";

describe("OrganisationsWithoutAdmin", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <OrganisationsWithoutAdmin
                organisationsWithoutAdmin={[]}
                onDeleteOrganisation={() => {}}
                onReassignAdmin={() => {}}
                user={{ admin: true }}
                entities={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
