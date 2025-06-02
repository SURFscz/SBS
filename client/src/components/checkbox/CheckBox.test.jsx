import React from "react";
import { render } from "@testing-library/react";
import CheckBox from "./CheckBox";

jest.mock("../../locale/I18n", () => ({
  t: key => key
}));

describe("CheckBox", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <CheckBox name={"CheckBox"} value={false} checked={false} onChange={jest.fn()} label="Accept terms" />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
