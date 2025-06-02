import React from "react";
import {render} from "@testing-library/react";
import OrganisationDetail from "./OrganisationDetail";

describe("OrganisationDetail", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <OrganisationDetail
                match={{params: {id: "1"}}}
                open={true}
                onClose={() => {
                }}
                onUpdate={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom title", () => {
        const {asFragment} = render(
            <OrganisationDetail
                match={{params: {id: "1"}}}
                open={true}
                onClose={() => {
                }}
                onUpdate={() => {
                }}
                title="Custom Title"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom description", () => {
        const {asFragment} = render(
            <OrganisationDetail
                match={{params: {id: "1"}}}
                open={true}
                onClose={() => {
                }}
                onUpdate={() => {
                }}
                description="Custom Description"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
