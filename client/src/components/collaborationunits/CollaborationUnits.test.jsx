import React from "react";
import { render } from "@testing-library/react";
import { CollaborationUnits } from "./CollaborationUnits";

jest.mock("../../locale/I18n", () => ({
  t: key => key
}));
jest.mock("../_redesign/Logo", () => props => (
  <img data-testid="logo" {...props} />
));
jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => <span data-testid="icon" />
}));

const allUnits = [
  {
    id: 1,
    name: "Unit One",
    description: "A test unit",
    logo: "logo1.png",
    value: 1
  }
];

const user = {
  organisation_memberships: [
    {
      organisation_id: 1,
      units: [{ id: 1, name: "Unit One", value: 1 }]
    }
  ]
};

const organisation = { id: 1 };

describe("CollaborationUnits", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <CollaborationUnits
        selectedUnits={[]}
        allUnits={allUnits}
        setUnits={jest.fn()}
        user={user}
        organisation={organisation}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
