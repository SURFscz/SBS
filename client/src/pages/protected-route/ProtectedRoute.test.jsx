import React from "react";
import { render } from "@testing-library/react";
import {ProtectedRoute} from "./ProtectedRoute";

const mockCurrentUser = { guest: true };

describe("ProtectedRoute", () => {
    it("matches snapshot with minimal props", () => {
        const { asFragment } = render(
            <ProtectedRoute
                user={{ admin: true }}
                component={() => <div>Protected Component</div>}
                currentUser={mockCurrentUser}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title and description", () => {
        const { asFragment } = render(
            <ProtectedRoute
                user={{ admin: true }}
                component={() => <div>Protected Component</div>}
                title="Custom Title"
                description="Custom Description"
                currentUser={mockCurrentUser}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
