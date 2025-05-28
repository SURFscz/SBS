import React from "react";
import {render} from "@testing-library/react";
import UserDetail from "./UserDetail";

const mockMatch = {params: {id: "1"}};

describe("UserDetail", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <UserDetail
                match={mockMatch}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
