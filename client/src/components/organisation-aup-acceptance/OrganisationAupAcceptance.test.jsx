import React from "react";
import {render} from "@testing-library/react";
import OrganisationAupAcceptance from "./OrganisationAupAcceptance";

jest.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => <span>Icon</span>
}));

describe("OrganisationAupAcceptance", () => {
    it("matches snapshot with default render", () => {
        const {asFragment} = render(
            <OrganisationAupAcceptance
                adminEmails={["example@example.com"]}
                organisation={{name: "Test Organisation"}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom props", () => {
        const {asFragment} = render(
            <OrganisationAupAcceptance
                organisationName="Test Organisation"
                aupUrl="https://example.com/aup"
                adminEmails={["example@example.com"]}
                organisation={{name: "Test Organisation"}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
