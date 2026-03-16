import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import CollaborationWelcomeDialog from "./CollaborationWelcomeDialog";

vi.mock("../../locale/I18n", () => ({
      default: { t: key => key },
t: (key, opts) => (opts && opts.name ? `${key} ${opts.name}` : key)
}));
vi.mock("../collaboration-aup-acceptance/CollaborationAupAcceptance", () => ({
    default: (props) => (
        <div data-testid="collab-aup-acceptance">{props.children}</div>
    )
}));
vi.mock("../organisation-aup-acceptance/OrganisationAupAcceptance", () => ({
    default: () => (
        <div data-testid="org-aup-acceptance"/>
    )
}));
vi.mock("../../utils/Aups", () => ({
    aupData: () => ({
        organisation: {id: 1, name: "Org"},
        services: [{id: 1, name: "Service"}],
        hasServices: true,
        requiresOrganisationAup: true,
        allServiceAupsAgreedOn: false
    })
}));
vi.mock("@surfnet/sds", () => ({
    AlertType: {Info: "info"},
    Modal: props => (
        <div data-testid="modal">
            <div>{props.title}</div>
            <div>{props.subTitle}</div>
            <div>{props.children}</div>
            <button disabled={props.confirmDisabled}>{props.confirmationButtonLabel}</button>
        </div>
    )
}));
vi.mock("../../utils/UserRole", () => ({
    ROLES: {COLL_ADMIN: "admin", COLL_MEMBER: "member"}
}));

const user = {id: 1, name: "User"};
const collaboration = {id: 1, name: "Collab", description: "A test collaboration"};

describe("CollaborationWelcomeDialog", () => {
    it("matches snapshot", () => {
        const {asFragment} = render(
            <CollaborationWelcomeDialog
                name="Collab"
                role="admin"
                serviceEmails={["service@example.org"]}
                adminEmails={["admin@example.org"]}
                isOpen={true}
                close={vi.fn()}
                user={user}
                collaboration={collaboration}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
