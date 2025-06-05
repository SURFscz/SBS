import React from "react";
import { render } from "@testing-library/react";
import UnitHeader from "./UnitHeader";

describe("UnitHeader", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <UnitHeader
                unit={{ name: "Test Unit" }}
                user={{ admin: true }}
                onEditUnit={() => {}}
                onDeleteUnit={() => {}}
                obj={{style: "test-style"}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
