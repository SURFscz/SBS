import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import CheckBox from "./CheckBox";

vi.mock("../../locale/I18n", () => ({
    default: { t: key => key },
t: key => key
}));

describe("CheckBox", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <CheckBox name={"CheckBox"} value={false} checked={false} onChange={vi.fn()} label="Accept terms" />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
