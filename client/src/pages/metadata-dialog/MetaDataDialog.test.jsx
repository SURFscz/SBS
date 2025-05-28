import React from "react";
import { render } from "@testing-library/react";
import MetaDataDialog from "./MetaDataDialog";

describe("MetaDataDialog", () => {
    it("matches snapshot with minimal props", () => {
        const { asFragment } = render(
            <MetaDataDialog
                open={true}
                onClose={() => {}}
                onSave={() => {}}
                metadata={{}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom metadata", () => {
        const metadata = {
            title: "Test Metadata",
            description: "This is a test description",
            tags: ["test", "metadata"]
        };
        const { asFragment } = render(
            <MetaDataDialog
                open={true}
                onClose={() => {}}
                onSave={() => {}}
                metadata={metadata}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
