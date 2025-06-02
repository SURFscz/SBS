import React from "react";
import { render } from "@testing-library/react";
import PlatformAdmins from "./PlatformAdmins";

describe("PlatformAdmins", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <PlatformAdmins
                platform_admins={[]}
                onDeleteAdmin={() => {}}
                onReassignAdmin={() => {}}
                user={{ admin: true }}
                entities={[]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
