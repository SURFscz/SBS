import React from "react";
import {render} from "@testing-library/react";
import Home from "./Home";

const mockUser = {
    admin: false,
    organisation_memberships: [],
    collaboration_memberships: [],
    service_memberships: [],
    organisations_from_user_schac_home: [],
    total_service_requests: 0,
    total_open_service_requests: 0
};

const mockMatch = {params: {id: "1"}};

const mockProps = {
    match: mockMatch,
    user: mockUser,
    history: { push: jest.fn(), replace: jest.fn() },
    refreshUser: jest.fn()
};

describe("Home", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <Home
                {...mockProps}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <Home
                {...mockProps}
                title="Custom Home Title"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <Home
                {...mockProps}
                description="Custom Home Description"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
