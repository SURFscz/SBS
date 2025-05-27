import React from "react";
import { render } from "@testing-library/react";
import AutoComplete from "./Autocomplete";

jest.mock("../../locale/I18n", () => ({
  t: key => key
}));

const options = [
  { label: "Option 1", value: "option1" },
  { label: "Option 2", value: "option2" }
];

describe("AutoComplete", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <AutoComplete
        options={options}
        value={options[0]}
        onChange={jest.fn()}
        placeholder="Select an option"
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
