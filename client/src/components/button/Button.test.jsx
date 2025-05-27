import React from "react";
import { render } from "@testing-library/react";
import Button from "./Button";

jest.mock("@surfnet/sds", () => ({
  Button: props => <button {...props}>{props.txt}</button>,
  ButtonSize: { Small: "small", Full: "full", Default: "default" },
  ButtonType: {
    Secondary: "secondary",
    DestructiveSecondary: "destructiveSecondary",
    Delete: "delete",
    GhostDark: "ghostDark",
    Tertiary: "tertiary",
    Primary: "primary"
  }
}));

jest.mock("../../utils/Utils", () => ({
  stopEvent: jest.fn()
}));

describe("Button", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <Button onClick={jest.fn()} txt="Click me" />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
