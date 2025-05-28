import React from "react";
import {render} from "@testing-library/react";
import Explain from "./Explain";

jest.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: () => <span data-testid="fa-icon"/>
}));

describe("Explain", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(<Explain/>);
        expect(asFragment()).toMatchSnapshot();
    });
});
