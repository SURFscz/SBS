import React from "react";
import {render} from "@testing-library/react";
import {UserMenu} from "./UserMenu";
import {MemoryRouter} from "react-router-dom";

describe("UserMenu", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <UserMenu
                    currentUser={{id: "1", username: "testuser", service_memberships: []}}
                    onLogout={() => {
                    }}
                    onProfileClick={() => {
                    }}
                    onSettingsClick={() => {
                    }}
                    config={{impersonation_allowed: false}}
                />
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
