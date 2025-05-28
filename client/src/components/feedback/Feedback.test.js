import React from "react";
import { render } from "@testing-library/react";
import Feedback from "./Feedback";

describe("Feedback", () => {
  it("matches snapshot with default props", () => {
    const { asFragment } = render(<Feedback />);
    expect(asFragment()).toMatchSnapshot();
  });
});
