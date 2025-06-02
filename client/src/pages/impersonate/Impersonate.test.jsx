import React from "react";
import { render } from "@testing-library/react";
import Impersonate from "./Impersonate";

const mockUser = {
    admin: true
}

describe("Impersonate", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <Impersonate
                user={mockUser}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot when impersonating a user", () => {
        const { asFragment } = render(
            <Impersonate
                user={mockUser}
                impersonatingUser={{ id: "123", name: "Test User" }} />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot when not impersonating a user", () => {
        const { asFragment } = render(
            <Impersonate
                user={mockUser}
                impersonatingUser={null} />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
