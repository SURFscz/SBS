import React from "react";
import { render } from "@testing-library/react";
import Users from "./Users";

describe("Users", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <Users
                users={[]}
                user={{admin: true}}
                onDeleteUser={() => {}}
                onReassignUser={() => {}}
                collaboration={{id: "1"}}
                config={{impersonation_allowed: true}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with users", () => {
        const users = [
            { id: 1, username: "testuser1" },
            { id: 2, username: "testuser2" }
        ];
        const { asFragment } = render(
            <Users
                users={users}
                user={{admin: true}}
                onDeleteUser={() => {}}
                onReassignUser={() => {}}
                collaboration={{id: "1"}}
                config={{impersonation_allowed: false}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
