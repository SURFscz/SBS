import React from "react";
import { render } from "@testing-library/react";
import ServiceConnectionRequests from "./ServiceConnectionRequests";
import {MemoryRouter} from "react-router-dom";

describe("ServiceConnectionRequests", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <MemoryRouter>
                <ServiceConnectionRequests
                    serviceConnectionRequests={[]}
                    onAccept={() => {}}
                    onReject={() => {}}
                    user={{ admin: true }}
                />
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
