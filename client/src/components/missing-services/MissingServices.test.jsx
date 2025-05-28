import React from "react";
import { render } from "@testing-library/react";
import MissingServices from "./MissingServices";

jest.mock("../../locale/I18n", () => ({
  t: (key, opts) => key + (opts ? JSON.stringify(opts) : ""),
}));

describe("MissingServices", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <MissingServices/>
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom message", () => {
        const { asFragment } = render(
            <MissingServices message="Custom message"/>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
