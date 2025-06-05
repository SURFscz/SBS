import React from "react";
import { render } from "@testing-library/react";
import CroppedImageField from "./CroppedImageField";

describe("CroppedImageField", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <CroppedImageField
                name="testImage"
                label="Test Image"
                value="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
                onChange={() => {}}
                isNew={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
