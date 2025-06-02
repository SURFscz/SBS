import React from "react";
import {render} from "@testing-library/react";
import CollaborationCard from "./CollaborationCard";

jest.mock("../../locale/I18n", () => ({
    t: key => key
}));
jest.mock("../_redesign/logo/Logo", () => props => (
    <img data-testid="logo" {...props} />
));
jest.mock("@fortawesome/react-fontawesome", () => ({
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

const history = {push: jest.fn()};

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
