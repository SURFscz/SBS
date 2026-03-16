import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import { CollaborationUnits } from "./CollaborationUnits";

vi.mock("../../locale/I18n", () => ({
    default: { t: key => key },
t: key => key
}));
vi.mock("../redesign/logo/Logo", () => ({
  default: (props) => (
    <img data-testid="logo" {...props} />
  )
}));
vi.mock("@fortawesome/react-fontawesome", () => ({
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
        setUnits={vi.fn()}
        user={user}
        organisation={organisation}
      />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
