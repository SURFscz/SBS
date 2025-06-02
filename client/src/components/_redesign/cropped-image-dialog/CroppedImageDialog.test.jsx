import React from "react";
import { render } from "@testing-library/react";
import CroppedImageDialog from "./CroppedImageDialog";

describe("CroppedImageDialog", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <CroppedImageDialog
                open={true}
                onClose={() => {}}
                onSave={() => {}}
                imageSrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
