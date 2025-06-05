import React from "react";
import {render} from "@testing-library/react";
import ApiKeys from "./ApiKeys";

jest.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => <span data-testid="icon"/>
}));

const mockService = {
    id: "1",
    name: "Test Service",
    description: "This is a test service.",
    collaboration: {
        id: "1",
        name: "Test Collaboration"
    },
    members: [],
    service_memberships: []
};

const mockUser = {
    id: "1",
    username: "testuser",
    service_memberships: []
};

const mockOrganisation = {
    api_keys: [{created_at: 1700000000000}]
};

describe("ApiKeys", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <ApiKeys
                service={mockService}
                user={mockUser}
                organisation={mockOrganisation}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
