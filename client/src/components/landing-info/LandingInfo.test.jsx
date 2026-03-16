import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import LandingInfo from "./LandingInfo";

vi.mock("../../locale/I18n", () => ({
      default: { t: key => key },
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
