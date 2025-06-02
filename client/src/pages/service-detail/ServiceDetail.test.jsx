import React from "react";
import {render} from "@testing-library/react";
import ServiceDetail from "./ServiceDetail";

const mockMatch = {params: {id: "1"}};
const mockUser = {
    service_memberships: []
}
const mockHistory = [];

describe("ServiceDetail", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <ServiceDetail
                match={mockMatch}
                user={mockUser}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
