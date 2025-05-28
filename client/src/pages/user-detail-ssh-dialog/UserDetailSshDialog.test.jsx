import React from "react";
import { render } from "@testing-library/react";
import UserDetailSshDialog from "./UserDetailSshDialog";

const mockUser = {
    id: "1",
    name: "Test User",
    ssh_keys: [
        { ssh_value: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...", manual: false }
    ]
};

describe("UserDetailSshDialog", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <UserDetailSshDialog
                open={true}
                onClose={() => {}}
                user={mockUser}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
