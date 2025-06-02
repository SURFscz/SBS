import React from "react";
import {render} from "@testing-library/react";
import LandingInfo from "./LandingInfo";

jest.mock("../../locale/I18n", () => ({
    t: (key, opts) => key + (opts ? JSON.stringify(opts) : ""),
}));

describe("LandingInfo", () => {
    it("matches snapshot with default render", () => {
        const {asFragment} = render(
            <LandingInfo/>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
