import React from "react";
import { render } from "@testing-library/react";
import ServicesWithoutAdmin from "./ServicesWithoutAdmin";

describe("ServicesWithoutAdmin", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServicesWithoutAdmin
                services={[]}
                onDeleteService={() => {}}
                onReassignService={() => {}}
                user={{ admin: false, service_memberships: [] }}
                entities={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with services", () => {
        const services = [
            { id: 1, name: "Service 1" },
            { id: 2, name: "Service 2" }
        ];
        const { asFragment } = render(
            <ServicesWithoutAdmin
                services={services}
                onDeleteService={() => {}}
                onReassignService={() => {}}
                user={{ admin: false, service_memberships: [] }}
                entities={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
