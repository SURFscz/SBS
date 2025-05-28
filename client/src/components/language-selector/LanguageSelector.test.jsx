import React from "react";
import { render } from "@testing-library/react";
import LanguageSelector from "./LanguageSelector";

describe("LanguageSelector", () => {
    it ("matches snapshot with default props", () => {
        const { asFragment } = render(
            <LanguageSelector/>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
