import React from "react";
import {render} from "@testing-library/react";
import {SAMLMetaData} from "./SAMLMetaData";

jest.mock("../../locale/I18n", () => ({
    t: key => key
}));

const mockParsedSAMLMetaData = {
    acs_binding: "POST",
    acs_location: "https://example.com/acs",
    entity_id: "entity123",
    organization_name: "Example Org"
};

describe("SAMLMetaData", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <SAMLMetaData
                parsedSAMLMetaData={mockParsedSAMLMetaData}
                metadataUrl="https://example.com/saml/metadata"
                onMetadataChange={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom metadataUrl", () => {
        const {asFragment} = render(
            <SAMLMetaData
                parsedSAMLMetaData={mockParsedSAMLMetaData}
                metadataUrl="https://custom.com/saml/metadata"
                onMetadataChange={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with no metadataUrl", () => {
        const {asFragment} = render(
            <SAMLMetaData
                parsedSAMLMetaData={mockParsedSAMLMetaData}
                onMetadataChange={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
