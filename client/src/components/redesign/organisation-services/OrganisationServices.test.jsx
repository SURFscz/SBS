import React from "react";
import { render } from "@testing-library/react";
import OrganisationServices from "./OrganisationServices";

describe("OrganisationServices", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <OrganisationServices
                organisation={{ name: "Test Organisation" }}
                services={[]}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with services", () => {
        const { asFragment } = render(
            <OrganisationServices
                organisation={{ name: "Test Organisation" }}
                services={[{ id: 1, name: "Service 1" }, { id: 2, name: "Service 2" }]}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders without user admin privileges", () => {
        const { asFragment } = render(
            <OrganisationServices
                organisation={{ name: "Test Organisation" }}
                services={[]}
                user={{ admin: false }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
