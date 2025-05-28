import React from "react";
import { render } from "@testing-library/react";
import CreatableField from "./CreatableField";

jest.mock("../../locale/I18n", () => ({
  t: key => key
}));

const options = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" }
];

describe("CreatableField", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <CreatableField
        value={options[0]}
        onChange={jest.fn()}
        options={options}
        placeholder="Select or create"
        isMulti={false}
        isClearable={true}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
