import React from "react";
import {render} from "@testing-library/react";
import UserInvitation from "./UserInvitation";

const mockMatch = {params: {id: "1"}};
const mockHistory = [];

describe("UserInvitation", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <UserInvitation
                match={mockMatch}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
