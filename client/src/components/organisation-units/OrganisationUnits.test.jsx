import React from "react";
import {render} from "@testing-library/react";
import {OrganisationUnits} from "./OrganisationUnits";

const units = ["unit1", "unit2"]

describe("OrganisationUnits", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <OrganisationUnits
                units={units}
                setUnits={() => {
                }}
                setDuplicated={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <OrganisationUnits
                title="Custom Title"
                units={units}
                setUnits={() => {
                }}
                setDuplicated={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <OrganisationUnits
                description="Custom Description"
                units={units}
                setUnits={() => {
                }}
                setDuplicated={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
