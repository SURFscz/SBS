import React from "react";
import { render } from "@testing-library/react";
import NewInvitation from "./NewInvitation";

const mockMatch = {params: {id: "1"}};
const mockHistory = [];

describe("NewInvitation", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <NewInvitation
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                match={mockMatch}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const { asFragment } = render(
            <NewInvitation
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                title="Custom Title"
                match={mockMatch}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const { asFragment } = render(
            <NewInvitation
                open={true}
                onClose={() => {}}
                onCreate={() => {}}
                description="Custom Description"
                match={mockMatch}
                history={mockHistory}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
