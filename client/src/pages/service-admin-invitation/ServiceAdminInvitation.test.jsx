import React from "react";
import { render } from "@testing-library/react";
import ServiceAdminInvitation from "./ServiceAdminInvitation";

const mockMatch = {params: {id: "1"}};
const mockHistory = [];

describe("ServiceAdminInvitation", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServiceAdminInvitation
            match={mockMatch}
            history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
