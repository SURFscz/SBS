import React from "react";
import { render } from "@testing-library/react";
import ServiceRequests from "./ServiceRequests";

describe("ServiceRequests", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <ServiceRequests
                service_requests={[]}
                onAccept={() => {}}
                onReject={() => {}}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with service requests", () => {
        const service_requests = [
            { id: 1, name: "Service Request 1" },
            { id: 2, name: "Service Request 2" }
        ];
        const { asFragment } = render(
            <ServiceRequests
                service_requests={service_requests}
                onAccept={() => {}}
                onReject={() => {}}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
