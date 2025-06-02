import React from "react";
import { render } from "@testing-library/react";
import ServiceConnectionRequests from "./ServiceConnectionRequests";

describe("ServiceConnectionRequests", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServiceConnectionRequests
                serviceConnectionRequests={[]}
                onAccept={() => {}}
                onReject={() => {}}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
