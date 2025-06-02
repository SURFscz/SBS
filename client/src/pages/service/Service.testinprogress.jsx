import React from "react";
import { render } from "@testing-library/react";
import Service from "./Service";

const mockUser = {admin: true};
const mockConfig = {ldap_bind_account: "some string"};

describe("Service", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <Service
            user={mockUser}
            config={mockConfig}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
