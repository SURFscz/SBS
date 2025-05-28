import React from "react";
import { render } from "@testing-library/react";
import ServerError from "./ServerError";

describe("ServerError", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <ServerError />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
