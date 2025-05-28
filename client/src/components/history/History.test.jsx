import React from "react";
import {render} from "@testing-library/react";
import History from "./History";

jest.mock("../../locale/I18n", () => ({
    t: key => key,
}));

describe("History", () => {
    it("matches snapshot with default props", () => {
        const match = {params: {}};
        const {asFragment} = render(
            <History match={match}/>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
