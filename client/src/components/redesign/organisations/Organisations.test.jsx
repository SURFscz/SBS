import React from "react";
import { render } from "@testing-library/react";
import Organisations from "./Organisations";

describe("Organisations", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <Organisations
                organisations={[]}
                user={{ admin: true }}
                onCreateOrganisation={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with organisations", () => {
        const organisations = [
            { id: 1, name: "Test Organisation 1" },
            { id: 2, name: "Test Organisation 2" }
        ];
        const { asFragment } = render(
            <Organisations
                organisations={organisations}
                user={{ admin: true }}
                onCreateOrganisation={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
