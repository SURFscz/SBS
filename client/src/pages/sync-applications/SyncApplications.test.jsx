import React from "react";
import { render } from "@testing-library/react";
import SyncApplications from "./SyncApplications";

describe("Sync Applications", () => {
    it('should render with minimal props', () => {
        const { asFragment } = render(
            <SyncApplications />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
