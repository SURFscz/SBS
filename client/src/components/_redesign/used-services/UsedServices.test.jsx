import React from "react";
import { render } from "@testing-library/react";
import UsedServices from "./UsedServices";

describe("UsedServices", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <UsedServices
                used_services={[]}
                user={{ admin: true }}
                onDeleteUsedService={() => {}}
                onReassignUsedService={() => {}}
                collaboration={{id: "1"}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with used services", () => {
        const usedServices = [
            { id: 1, name: "Test Service 1" },
            { id: 2, name: "Test Service 2" }
        ];
        const { asFragment } = render(
            <UsedServices
                used_services={usedServices}
                user={{ admin: true }}
                onDeleteUsedService={() => {}}
                onReassignUsedService={() => {}}
                collaboration={{id: "1"}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
