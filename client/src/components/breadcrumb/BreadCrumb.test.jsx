import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import { BreadCrumb } from "./BreadCrumb";

vi.mock("../../locale/I18n", () => ({
    default: { t: key => key },
t: key => key
}));

const crumbs = [
  { label: "Home", link: "/" },
  { label: "Section", link: "/section" },
  { label: "Current", link: null }
];

describe("BreadCrumb", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <BreadCrumb crumbs={crumbs} />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
