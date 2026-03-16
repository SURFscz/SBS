import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import Button from "./Button";

vi.mock("@surfnet/sds", () => ({
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

vi.mock("../../utils/Utils", () => ({
  stopEvent: vi.fn()
}));

describe("Button", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <Button onClick={vi.fn()} centralize={"true"} txt="Click me" />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
