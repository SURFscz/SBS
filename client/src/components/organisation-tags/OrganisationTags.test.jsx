import React from "react";
import {render} from "@testing-library/react";
import {OrganisationTags} from "./OrganisationTags";

const defaultUnits = [{id: 1, name: "Unit1"}, {id: 2, name: "Unit2"}];

describe("OrganisationTags", () => {
    it("matches snapshot with default render", () => {
        const {asFragment} = render(
            <OrganisationTags
                tags={[
                    {tag_value: "randomTag", units: []}
                ]}
                allUnits={defaultUnits}
                setTags={() => {
                }}
                setDuplicated={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom tags", () => {
        const {asFragment} = render(
            <OrganisationTags
                tags={[
                    {tag_value: "tag1", units: []},
                    {tag_value: "tag2", units: []}
                ]}
                allUnits={defaultUnits}
                setTags={() => {
                }}
                setDuplicated={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with empty tags", () => {
        const {asFragment} = render(
            <OrganisationTags
                tags={[]}
                allUnits={defaultUnits}
                setTags={() => {
                }}
                setDuplicated={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
