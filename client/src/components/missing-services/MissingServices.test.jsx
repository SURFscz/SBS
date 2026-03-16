import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import MissingServices from "./MissingServices";

vi.mock("../../locale/I18n", () => ({
    default: { t: key => key },
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
