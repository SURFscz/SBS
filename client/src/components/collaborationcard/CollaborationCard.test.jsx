import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import CollaborationCard from "./CollaborationCard";

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
    FontAwesomeIcon: () => <span data-testid="icon"/>
}));

const collaboration = {
    id: 1,
    name: "Test Collaboration",
    description: "A test collaboration",
    logo: "logo.png",
    organisation: {name: "Test Org"}
};

const user = {
    collaboration_memberships: [
        {collaboration_id: 1, role: "admin"}
    ]
};

const history = {push: vi.fn()};

describe("CollaborationCard", () => {
    it("matches snapshot", () => {
        const {asFragment} = render(
            <CollaborationCard
                collaboration={collaboration}
                user={user}
                history={history}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
