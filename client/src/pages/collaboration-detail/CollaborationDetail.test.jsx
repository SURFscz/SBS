import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, waitFor} from "@testing-library/react";
import moment from "moment";

import * as api from "../../api";
import {socket} from "../../utils/SocketIO";
import {setFlash} from "../../utils/Flash";
import {AppStore} from "../../stores/AppStore";
import I18n from "../../locale/I18n";

import {CollaborationDetail} from "./CollaborationDetail";

vi.mock("../../api");

vi.mock("../../utils/Flash", () => ({
    setFlash: vi.fn(),
    clearFlash: vi.fn()
}));

vi.mock("../../utils/SocketIO", () => {
    const client = {on: vi.fn(), off: vi.fn()};
    return {
        socket: Promise.resolve(client),
        SUBSCRIPTION_ID_COOKIE_NAME: "subscription_id"
    };
});

vi.mock("./CollaborationPageHeader", () => ({
    CollaborationPageHeader: ({
        collaboration,
        allowedToEdit,
        adminOfCollaboration,
        showMemberView,
        collaborationJoinRequest,
        alreadyMember,
        onLeave,
        onAddMe,
        onToggleView,
        onBoarding,
        onOpenJoinRequest
    }) => (
        <div
            data-testid="page-header"
            data-allowed-to-edit={String(allowedToEdit)}
            data-admin={String(adminOfCollaboration)}
            data-member-view={String(showMemberView)}
            data-join-request={String(!!collaborationJoinRequest)}
            data-already-member={String(!!alreadyMember)}
        >
            <span>{collaboration.name}</span>
            <button type="button" onClick={onLeave}>leave</button>
            <button type="button" onClick={onAddMe}>add-me</button>
            <button type="button" onClick={onToggleView}>toggle-view</button>
            <button type="button" onClick={onBoarding}>onboarding</button>
            <button type="button" onClick={onOpenJoinRequest}>open-join-request</button>
        </div>
    )
}));

vi.mock("../../components/redesign/spinner-field/SpinnerField", () => ({
    default: () => <div data-testid="spinner">loading</div>
}));

vi.mock("../../components/tabs/Tabs", () => ({
    default: ({children, activeTab}) => (
        <div data-testid="tabs" data-active-tab={activeTab || ""}>
            {React.Children.toArray(children).filter(Boolean).map((child, index) => (
                <div
                    key={child.key || index}
                    data-testid={`tab-${child.props.name}`}
                    data-tab-label={child.props.label}
                    data-tab-notifier={child.props.notifier == null ? "" : String(child.props.notifier)}
                    data-tab-readonly={String(!!child.props.readOnly)}
                >
                    {child}
                </div>
            ))}
        </div>
    )
}));

vi.mock("../../components/redesign/about-collaboration/AboutCollaboration", () => ({
    default: ({tabChanged}) => (
        <div data-testid="about-collaboration">
            <button type="button" onClick={() => tabChanged("members")}>change-tab</button>
        </div>
    )
}));

vi.mock("../../components/redesign/collaboration-admins/CollaborationAdmins", () => ({
    default: ({isAdminView, refresh}) => (
        <div data-testid={isAdminView ? "collaboration-admins" : "collaboration-members"}>
            <button type="button" onClick={() => refresh && refresh()}>refresh-admins</button>
        </div>
    )
}));

vi.mock("../../components/redesign/groups/Groups", () => ({
    default: ({groupId}) => <div data-testid="groups" data-group-id={groupId == null ? "" : String(groupId)}/>
}));

vi.mock("../../components/redesign/used-services/UsedServices", () => ({
    default: () => <div data-testid="used-services"/>
}));

vi.mock("../../components/redesign/join-requests/JoinRequests", () => ({
    default: () => <div data-testid="join-requests"/>
}));

vi.mock("../../components/redesign/user-tokens/UserTokens", () => ({
    default: ({userTokens, services}) => (
        <div
            data-testid="user-tokens"
            data-token-count={String((userTokens || []).length)}
            data-service-count={String((services || []).length)}
        />
    )
}));

vi.mock("../../components/collaboration-welcome-dialog/CollaborationWelcomeDialog", () => ({
    default: ({isOpen, name, role, isInvitation, close}) => (
        isOpen ? (
            <div
                data-testid="welcome-dialog"
                data-role={role}
                data-invitation={String(!!isInvitation)}
            >
                <span>{name}</span>
                <button type="button" onClick={close}>close-welcome</button>
            </div>
        ) : null
    )
}));

vi.mock("../../components/confirmation-dialog/ConfirmationDialog", () => ({
    default: ({
        isOpen,
        question,
        confirmationHeader,
        children,
        confirm,
        cancel,
        isWarning
    }) => (
        isOpen ? (
            <div data-testid="confirmation-dialog" data-warning={String(!!isWarning)}>
                {confirmationHeader && <p>{confirmationHeader}</p>}
                <p>{question}</p>
                {children}
                {cancel && <button type="button" onClick={cancel}>cancel-dialog</button>}
                <button type="button" onClick={confirm}>confirm-dialog</button>
            </div>
        ) : null
    )
}));

vi.mock("../../components/join-request-dialog/JoinRequestDialog", () => ({
    default: ({isOpen, close}) => (
        isOpen ? (
            <div data-testid="join-request-dialog">
                <button type="button" onClick={close}>close-join</button>
            </div>
        ) : null
    )
}));

vi.mock("../../components/redesign/last-admin-warning/LastAdminWarning", () => ({
    default: ({organisation, currentUserDeleted}) => (
        <div
            data-testid="last-admin-warning"
            data-organisation={organisation.name}
            data-current-user-deleted={String(!!currentUserDeleted)}
        />
    )
}));

const FIXED_NOW = new Date("2025-06-15T12:00:00.000Z");
const daysFromNow = days => Math.floor((FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000) / 1000);

const serializeFlash = () => setFlash.mock.calls.map(([message, type, action, actionLabel]) => ({
    message,
    type: type ?? null,
    actionLabel: actionLabel ?? null,
    hasAction: typeof action === "function"
}));

const snapshot = (container, history) => {
    expect({
        view: container.innerHTML,
        history: history.push.mock.calls,
        flash: serializeFlash(),
        store: {
            breadcrumbs: AppStore.getRawState().breadcrumb.paths,
            objectRole: AppStore.getRawState().objectRole
        }
    }).toMatchSnapshot();
};

const baseOrganisation = () => ({
    id: 3,
    name: "Org Alpha"
});

const baseCollaboration = (overrides = {}) => ({
    id: 10,
    name: "Research CO",
    organisation_id: 3,
    organisation: baseOrganisation(),
    status: "active",
    disclose_member_information: true,
    disable_join_requests: false,
    expiry_date: null,
    last_activity_date: daysFromNow(-2),
    services: [
        {id: 21, name: "Token Service", token_enabled: true},
        {id: 22, name: "Plain Service", token_enabled: false}
    ],
    groups: [{id: 31, name: "Group A"}],
    invitations: [],
    join_requests: [],
    service_connection_requests: [],
    collaboration_memberships: [
        {
            user_id: 1,
            role: "admin",
            status: "active",
            expiry_date: null,
            created_at: daysFromNow(-100),
            user: {email: "admin@example.com"}
        }
    ],
    ...overrides
});

const adminUser = (overrides = {}) => ({
    id: 1,
    name: "Ada Admin",
    admin: true,
    organisation_memberships: [],
    collaboration_memberships: [{collaboration_id: 10, role: "admin", user_id: 1}],
    organisations_from_user_schac_home: [],
    ...overrides
});

const memberUser = (overrides = {}) => ({
    id: 2,
    name: "Mia Member",
    admin: false,
    organisation_memberships: [],
    collaboration_memberships: [{collaboration_id: 10, role: "member", user_id: 2}],
    organisations_from_user_schac_home: [{id: 3, name: "Org Alpha"}],
    ...overrides
});

const orgManagerUser = (overrides = {}) => ({
    id: 4,
    name: "Omar Manager",
    admin: false,
    organisation_memberships: [{organisation_id: 3, role: "manager"}],
    collaboration_memberships: [],
    organisations_from_user_schac_home: [],
    ...overrides
});

const outsiderUser = (overrides = {}) => ({
    id: 9,
    name: "Una Outsider",
    admin: false,
    organisation_memberships: [],
    collaboration_memberships: [],
    organisations_from_user_schac_home: [],
    ...overrides
});

const defaultConfig = () => ({
    threshold_for_collaboration_inactivity_warning: 30
});

const renderDetail = ({
    user = adminUser(),
    config = defaultConfig(),
    matchParams = {id: "10"},
    collaborationIdentifier,
    history = {push: vi.fn()},
    refreshUser = vi.fn(callback => callback && callback())
} = {}) => {
    const ref = React.createRef();
    const view = render(
        <CollaborationDetail
            ref={ref}
            user={user}
            config={config}
            match={{params: matchParams}}
            history={history}
            refreshUser={refreshUser}
            collaborationIdentifier={collaborationIdentifier}
        />
    );
    return { ...view, ref, history, refreshUser };
};

const waitForLoaded = async container => {
    await waitFor(() => {
        expect(container.querySelector("[data-testid='spinner']")).toBeNull();
    });
};

const mockIdLoad = ({
    access = "full",
    collaboration = baseCollaboration(),
    userTokens = []
} = {}) => {
    api.collaborationAccessAllowed.mockResolvedValue({access});
    api.collaborationById.mockResolvedValue(collaboration);
    api.collaborationLiteById.mockResolvedValue(collaboration);
    api.userTokensOfUser.mockResolvedValue(userTokens);
};

describe("CollaborationDetail", () => {
    beforeEach(async () => {
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(FIXED_NOW);
        I18n.locale = "en";
        moment.locale("en");
        window.history.replaceState({}, "", "/collaborations/10");
        sessionStorage.clear();
        AppStore.update(s => {
            s.breadcrumb.paths = [];
            s.objectRole = null;
            s.actions = [];
        });
        const client = await socket;
        client.on.mockReset();
        client.off.mockReset();
        vi.clearAllMocks();
        api.health.mockResolvedValue({});
        api.collaborationAccessAllowed.mockResolvedValue({access: "full"});
        api.collaborationById.mockResolvedValue(baseCollaboration());
        api.collaborationLiteById.mockResolvedValue(baseCollaboration());
        api.userTokensOfUser.mockResolvedValue([]);
        api.invitationByHash.mockResolvedValue({
            invitation: {
                hash: "inv-hash",
                collaboration_id: 10,
                intended_role: "admin",
                collaboration: baseCollaboration()
            },
            service_emails: {21: ["svc@example.com"]},
            admin_emails: ["admin@example.com"]
        });
        api.collaborationIdByIdentifier.mockResolvedValue({id: 10});
        api.collaborationByIdentifier.mockResolvedValue(baseCollaboration());
        api.deleteCollaborationMembership.mockResolvedValue({});
        api.createCollaborationMembershipRole.mockResolvedValue({});
        api.unsuspendCollaboration.mockResolvedValue({});
        api.activateCollaboration.mockResolvedValue({});
        api.deleteInvitationByHash.mockResolvedValue({});
        api.invitationAccept.mockResolvedValue({});
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("shows a spinner while the collaboration is loading", () => {
        api.collaborationAccessAllowed.mockReturnValue(new Promise(() => {}));
        const {container, history} = renderDetail();
        snapshot(container, history);
    });

    it("loads an invitation for a new intended admin", async () => {
        const {container, history} = renderDetail({
            user: outsiderUser({collaboration_memberships: undefined}),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("loads an invitation for an intended member", async () => {
        api.invitationByHash.mockResolvedValue({
            invitation: {
                hash: "inv-hash",
                collaboration_id: 10,
                intended_role: "member",
                collaboration: baseCollaboration()
            },
            service_emails: {},
            admin_emails: []
        });
        const {container, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("shows the already-member confirmation for an invitation", async () => {
        const {container, history} = renderDetail({
            user: adminUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("redirects to 404 when the invitation hash is unknown", async () => {
        api.invitationByHash.mockRejectedValue(new Error("missing"));
        const {container, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "missing"}
        });
        await waitFor(() => expect(history.push).toHaveBeenCalled());
        snapshot(container, history);
    });

    it("redirects a uuid collaboration id to refresh-route", async () => {
        const {container, history} = renderDetail({
            matchParams: {id: "550e8400-e29b-41d4-a716-446655440000"}
        });
        await waitFor(() => expect(history.push).toHaveBeenCalled());
        snapshot(container, history);
    });

    it("loads a full-access admin collaboration with every optional tab", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                invitations: [{id: 1, expiry_date: daysFromNow(-1)}],
                join_requests: [{id: 2, status: "open"}, {id: 3, status: "accepted"}],
                service_connection_requests: [{id: 4, status: "open"}, {id: 5, status: "pending"}]
            }),
            userTokens: [
                {id: 8, service_id: 21},
                {id: 9, service_id: 99}
            ]
        });
        const {container, history} = renderDetail({
            matchParams: {id: "10", tab: "services"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("hides the join-requests tab when join requests are disabled", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({disable_join_requests: true})
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("opens the welcome dialog when first=true", async () => {
        window.history.replaceState({}, "", "/collaborations/10?first=true");
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("loads the lite member view with disclosed member information", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: null,
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("uses the minimal tab set when member information is not disclosed", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                disclose_member_information: false,
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: null,
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            }),
            userTokens: [{id: 8, service_id: 21}]
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("renders no tabs when the user is not allowed to view the collaboration", async () => {
        mockIdLoad({access: "lite", collaboration: baseCollaboration()});
        const {container, history} = renderDetail({user: outsiderUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("uses org-manager breadcrumbs after a full-access load", async () => {
        mockIdLoad();
        const {container, history} = renderDetail({
            user: orgManagerUser({
                collaboration_memberships: [{collaboration_id: 10, role: "admin", user_id: 4}]
            })
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("does not add a token tab when there are no token-enabled services", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                services: [{id: 22, name: "Plain Service", token_enabled: false}]
            }),
            userTokens: [{id: 8, service_id: 22}]
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("redirects to 404 when access lookup fails", async () => {
        api.collaborationAccessAllowed.mockRejectedValue(new Error("denied"));
        const {container, history} = renderDetail();
        await waitFor(() => expect(history.push).toHaveBeenCalledWith("/404"));
        snapshot(container, history);
    });

    it("redirects to 404 when collaboration fetch fails", async () => {
        api.collaborationAccessAllowed.mockResolvedValue({access: "full"});
        api.collaborationById.mockRejectedValue(new Error("gone"));
        const {container, history} = renderDetail();
        await waitFor(() => expect(history.push).toHaveBeenCalledWith("/404"));
        snapshot(container, history);
    });

    it("subscribes to socket topics and refreshes on a foreign subscription", async () => {
        const client = await socket;
        const handlers = {};
        client.on.mockImplementation((topic, handler) => {
            handlers[topic] = handler;
        });
        sessionStorage.setItem("subscription_id", "current-sub");
        const refreshUser = vi.fn(callback => callback && callback());
        const {container, history, ref} = renderDetail({refreshUser});
        await waitForLoaded(container);
        await waitFor(() => expect(client.on).toHaveBeenCalled());

        handlers[`collaboration_${baseCollaboration().id}`]({subscription_id: "other-sub"});
        expect(refreshUser).toHaveBeenCalled();

        const callsAfterForeign = refreshUser.mock.calls.length;
        handlers.service({subscription_id: "current-sub"});
        expect(refreshUser.mock.calls.length).toBe(callsAfterForeign);

        await ref.current.componentDidMount();
        expect(client.on.mock.calls.length).toBe(3);
        snapshot(container, history);
    });

    it("redirects to 404 when no identifier is available", async () => {
        const {container, history} = renderDetail({
            matchParams: {},
            collaborationIdentifier: undefined
        });
        await waitFor(() => expect(history.push).toHaveBeenCalledWith("/404"));
        snapshot(container, history);
    });

    it("redirects to 404 when a join-request collaboration disables join requests", async () => {
        api.collaborationByIdentifier.mockResolvedValue(baseCollaboration({disable_join_requests: true}));
        const {container, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {},
            collaborationIdentifier: "co-ident"
        });
        await waitFor(() => expect(history.push).toHaveBeenCalledWith("/404"));
        snapshot(container, history);
    });

    it("loads a join-request collaboration for a non-member", async () => {
        const {container, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {},
            collaborationIdentifier: "co-ident"
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("loads a join-request collaboration when the user is already a member", async () => {
        const {container, history} = renderDetail({
            user: memberUser(),
            matchParams: {},
            collaborationIdentifier: "co-ident"
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("loads a join-request collaboration when member information is hidden", async () => {
        api.collaborationByIdentifier.mockResolvedValue(baseCollaboration({
            disclose_member_information: false
        }));
        const {container, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {},
            collaborationIdentifier: "co-ident"
        });
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("redirects to 404 when the join-request identifier is unknown", async () => {
        api.collaborationByIdentifier.mockRejectedValue(new Error("missing"));
        const {container, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {},
            collaborationIdentifier: "missing"
        });
        await waitFor(() => expect(history.push).toHaveBeenCalledWith("/404"));
        snapshot(container, history);
    });

    it("opens and closes the join-request dialog", async () => {
        const {container, history, getByText} = renderDetail({
            user: outsiderUser(),
            matchParams: {},
            collaborationIdentifier: "co-ident"
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("open-join-request"));
        expect(container.querySelector("[data-testid='join-request-dialog']")).not.toBeNull();
        snapshot(container, history);
        fireEvent.click(getByText("close-join"));
        expect(container.querySelector("[data-testid='join-request-dialog']")).toBeNull();
    });

    it("warns a member whose membership has expired when admins exist", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [
                    {
                        user_id: 2,
                        role: "member",
                        status: "expired",
                        expiry_date: daysFromNow(-10),
                        created_at: daysFromNow(-40),
                        user: {email: "mia@example.com"}
                    },
                    {
                        user_id: 1,
                        role: "admin",
                        status: "active",
                        expiry_date: null,
                        created_at: daysFromNow(-100),
                        user: {email: "admin@example.com"}
                    }
                ]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);

        const createElement = document.createElement.bind(document);
        const click = vi.fn();
        const createSpy = vi.spyOn(document, "createElement").mockImplementation(tag => {
            const element = createElement(tag);
            if (tag === "a") {
                element.click = click;
            }
            return element;
        });
        act(() => {
            setFlash.mock.calls[0][2]();
        });
        expect(click).toHaveBeenCalled();
        createSpy.mockRestore();
    });

    it("warns a member whose membership has expired when no admins exist", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "expired",
                    expiry_date: daysFromNow(-10),
                    created_at: daysFromNow(-40),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("does not offer a membership-expired action to a collaboration admin", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                collaboration_memberships: [{
                    user_id: 1,
                    role: "admin",
                    status: "expired",
                    expiry_date: daysFromNow(-10),
                    created_at: daysFromNow(-40),
                    user: {email: "admin@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("warns a member whose membership expires within 60 days when admins exist", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [
                    {
                        user_id: 2,
                        role: "member",
                        status: "active",
                        expiry_date: daysFromNow(30),
                        created_at: daysFromNow(-20),
                        user: {email: "mia@example.com"}
                    },
                    {
                        user_id: 1,
                        role: "admin",
                        status: "active",
                        expiry_date: null,
                        created_at: daysFromNow(-100),
                        user: {email: "admin@example.com"}
                    }
                ]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
        act(() => {
            setFlash.mock.calls[0][2]();
        });
    });

    it("warns a member whose membership expires within 60 days when no admins exist", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: daysFromNow(30),
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("does not warn when a membership expiry date is 60 or more days away", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: daysFromNow(60),
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("lets an admin activate an expired collaboration", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                status: "expired",
                expiry_date: daysFromNow(-5)
            })
        });
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);

        act(() => {
            setFlash.mock.calls[0][2]();
        });
        expect(container.querySelector("[data-testid='confirmation-dialog']")).not.toBeNull();
        fireEvent.click(getByText("confirm-dialog"));
        await waitFor(() => expect(api.activateCollaboration).toHaveBeenCalledWith(10));
    });

    it("does not offer activate to a member of an expired collaboration", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                status: "expired",
                expiry_date: daysFromNow(-5),
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: null,
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("lets an admin edit a collaboration that expires within 60 days", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                expiry_date: daysFromNow(15)
            })
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
        act(() => {
            setFlash.mock.calls[0][2]();
        });
        expect(history.push).toHaveBeenCalledWith("/edit-collaboration/10");
    });

    it("lets an admin unsuspend a suspended collaboration", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                status: "suspended",
                last_activity_date: daysFromNow(-80)
            })
        });
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);

        act(() => {
            setFlash.mock.calls[0][2]();
        });
        fireEvent.click(getByText("confirm-dialog"));
        await waitFor(() => expect(api.unsuspendCollaboration).toHaveBeenCalledWith(10));
    });

    it("lets an admin avoid an almost-suspended collaboration", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                status: "active",
                last_activity_date: daysFromNow(-40)
            })
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
        act(() => {
            setFlash.mock.calls[0][2]();
        });
    });

    it("does not treat an inactive collaboration as almost suspended", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                status: "expired",
                expiry_date: daysFromNow(-5),
                last_activity_date: daysFromNow(-40)
            })
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("toggles from admin tabs to the member tab set", async () => {
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        fireEvent.click(getByText("toggle-view"));
        await waitFor(() => {
            expect(container.querySelector("[data-testid='page-header']").getAttribute("data-member-view")).toBe("false");
        });
        snapshot(container, history);
    });

    it("opens the welcome dialog from onboarding", async () => {
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        fireEvent.click(getByText("onboarding"));
        expect(container.querySelector("[data-testid='welcome-dialog']")).not.toBeNull();
        snapshot(container, history);
    });

    it("closes a first-time welcome dialog when the user is not accepting an invitation", async () => {
        window.history.replaceState({}, "", "/collaborations/10?first=true");
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        fireEvent.click(getByText("close-welcome"));
        expect(container.querySelector("[data-testid='welcome-dialog']")).toBeNull();
        snapshot(container, history);
    });

    it("accepts an invitation from the welcome dialog", async () => {
        const {container, history, getByText, refreshUser} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("close-welcome"));
        await waitFor(() => expect(api.invitationAccept).toHaveBeenCalled());
        expect(refreshUser).toHaveBeenCalled();
        snapshot(container, history);
    });

    it("shows an error when accepting an invitation finds an existing membership", async () => {
        api.invitationAccept.mockRejectedValue({
            response: {
                json: () => Promise.resolve({message: "User is already a member of this collaboration"})
            }
        });
        const {container, history, getByText} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("close-welcome"));
        await waitFor(() => expect(setFlash).toHaveBeenCalled());
        snapshot(container, history);
    });

    it("ignores invitation accept errors that do not mention existing membership", async () => {
        api.invitationAccept.mockRejectedValue({
            response: {
                json: () => Promise.resolve({message: "something else"})
            }
        });
        const {container, history, getByText} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("close-welcome"));
        await waitFor(() => expect(api.invitationAccept).toHaveBeenCalled());
        snapshot(container, history);
    });

    it("rethrows invitation accept errors without a json body", async () => {
        const error = new Error("network");
        const unhandled = [];
        const onUnhandled = reason => {
            if (reason === error) {
                unhandled.push(reason);
            }
        };
        process.on("unhandledRejection", onUnhandled);
        api.invitationAccept.mockRejectedValue(error);
        const {container, history, ref} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
        act(() => {
            ref.current.doAcceptInvitation();
        });
        await waitFor(() => expect(api.invitationAccept).toHaveBeenCalled());
        await waitFor(() => expect(unhandled).toEqual([error]));
        process.off("unhandledRejection", onUnhandled);
    });

    it("confirms an already-member invitation and redirects", async () => {
        const {container, history, getByText} = renderDetail({
            user: adminUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("confirm-dialog"));
        await waitFor(() => expect(api.deleteInvitationByHash).toHaveBeenCalledWith("inv-hash"));
        snapshot(container, history);
    });

    it("asks a regular member to confirm before leaving", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [
                    {
                        user_id: 2,
                        role: "member",
                        status: "active",
                        expiry_date: null,
                        created_at: daysFromNow(-20),
                        user: {email: "mia@example.com"}
                    },
                    {
                        user_id: 1,
                        role: "admin",
                        status: "active",
                        expiry_date: null,
                        created_at: daysFromNow(-100),
                        user: {email: "admin@example.com"}
                    }
                ]
            })
        });
        const {container, history, getByText} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        fireEvent.click(getByText("leave"));
        snapshot(container, history);
        fireEvent.click(getByText("cancel-dialog"));
        expect(container.querySelector("[data-testid='confirmation-dialog']")).toBeNull();
    });

    it("shows a last-admin warning when the only admin leaves", async () => {
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        fireEvent.click(getByText("leave"));
        snapshot(container, history);
    });

    it("lets an org manager who is not the last admin leave immediately", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                collaboration_memberships: [
                    {
                        user_id: 4,
                        role: "member",
                        status: "active",
                        expiry_date: null,
                        created_at: daysFromNow(-20),
                        user: {email: "omar@example.com"}
                    },
                    {
                        user_id: 1,
                        role: "admin",
                        status: "active",
                        expiry_date: null,
                        created_at: daysFromNow(-100),
                        user: {email: "admin@example.com"}
                    }
                ]
            })
        });
        const {container, history, getByText} = renderDetail({
            user: orgManagerUser({
                collaboration_memberships: [{collaboration_id: 10, role: "member", user_id: 4}]
            })
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("leave"));
        await waitFor(() => expect(api.deleteCollaborationMembership).toHaveBeenCalledWith(10, 4));
        snapshot(container, history);
    });

    it("sends a last-admin member home after they confirm leaving", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                collaboration_memberships: [{
                    user_id: 2,
                    role: "admin",
                    status: "active",
                    expiry_date: null,
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const collAdminMember = memberUser({
            collaboration_memberships: [{collaboration_id: 10, role: "admin", user_id: 2}]
        });
        const {container, history, getByText} = renderDetail({user: collAdminMember});
        await waitForLoaded(container);
        fireEvent.click(getByText("leave"));
        fireEvent.click(getByText("confirm-dialog"));
        await waitFor(() => expect(history.push).toHaveBeenCalledWith("/home"));
        snapshot(container, history);
    });

    it("adds the current user as a member", async () => {
        const {container, history, getByText} = renderDetail({
            user: orgManagerUser()
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("add-me"));
        await waitFor(() => expect(api.createCollaborationMembershipRole).toHaveBeenCalledWith(10));
        snapshot(container, history);
    });

    it("changes tabs and keeps a groups path with a group id", async () => {
        const {container, history, getByText, ref} = renderDetail({
            matchParams: {id: "10", groupId: "31"}
        });
        await waitForLoaded(container);
        fireEvent.click(getByText("change-tab"));
        await waitFor(() => expect(history.push).toHaveBeenCalled());
        ref.current.tabChanged("groups", 10, "31");
        expect(history.push).toHaveBeenCalledWith("/collaborations/10/groups/31", {groupId: "31"});
        snapshot(container, history);
    });

    it("changes to the groups tab without a group id", async () => {
        const {container, history, ref} = renderDetail();
        await waitForLoaded(container);
        ref.current.tabChanged("groups");
        expect(history.push).toHaveBeenCalledWith("/collaborations/10/groups", {groupId: undefined});
        snapshot(container, history);
    });

    it("refreshes through a child callback", async () => {
        const {container, history, getAllByText} = renderDetail();
        await waitForLoaded(container);
        fireEvent.click(getAllByText("refresh-admins")[0]);
        await waitFor(() => expect(api.collaborationById).toHaveBeenCalled());
        snapshot(container, history);
    });

    it("clears store state and socket listeners on unmount", async () => {
        const client = await socket;
        const {container, history, unmount} = renderDetail();
        await waitForLoaded(container);
        await waitFor(() => expect(client.on).toHaveBeenCalled());
        snapshot(container, history);
        unmount();
        await waitFor(() => expect(client.off).toHaveBeenCalled());
        expect(AppStore.getRawState().objectRole).toBeNull();
        expect(AppStore.getRawState().actions).toEqual([]);
    });

    it("does not unsubscribe sockets on unmount when there is no collaboration id route", async () => {
        const client = await socket;
        const {container, unmount, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
        unmount();
        expect(client.off).not.toHaveBeenCalled();
    });

    it("does not unsubscribe sockets on unmount while still loading", async () => {
        const client = await socket;
        api.collaborationAccessAllowed.mockReturnValue(new Promise(() => {}));
        const {container, history, unmount} = renderDetail();
        snapshot(container, history);
        unmount();
        expect(client.off).not.toHaveBeenCalled();
    });

    it("invokes the componentDidMount completion callback", async () => {
        const {container, history, ref} = renderDetail();
        await waitForLoaded(container);
        const callback = vi.fn();
        ref.current.componentDidMount(callback);
        await waitFor(() => expect(callback).toHaveBeenCalled());
        snapshot(container, history);
    });

    it("skips inactivity warnings when last_activity_date is missing", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({last_activity_date: null})
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("does not offer collaboration expiry actions to a member", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                expiry_date: daysFromNow(15),
                status: "active",
                last_activity_date: daysFromNow(-40),
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: null,
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("does not offer unsuspend to a member of a suspended collaboration", async () => {
        mockIdLoad({
            access: "lite",
            collaboration: baseCollaboration({
                status: "suspended",
                last_activity_date: daysFromNow(-80),
                collaboration_memberships: [{
                    user_id: 2,
                    role: "member",
                    status: "active",
                    expiry_date: null,
                    created_at: daysFromNow(-20),
                    user: {email: "mia@example.com"}
                }]
            })
        });
        const {container, history} = renderDetail({user: memberUser()});
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("still shows admin tabs when member information is hidden", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({disclose_member_information: false})
        });
        const {container, history} = renderDetail();
        await waitForLoaded(container);
        snapshot(container, history);
    });

    it("omits the token tab for a join-request even when tokens exist", async () => {
        const {container, ref, history} = renderDetail({
            user: outsiderUser(),
            matchParams: {},
            collaborationIdentifier: "co-ident"
        });
        await waitForLoaded(container);
        const tabs = ref.current.getTabs(
            baseCollaboration(),
            [{id: 8, service_id: 21}],
            [],
            false,
            false,
            true
        );
        expect(tabs.map(tab => tab.key)).toEqual(["about"]);
        snapshot(container, history);
    });

    it("rethrows invitation accept errors that have a response without json", async () => {
        const error = {response: {}};
        const unhandled = [];
        const onUnhandled = reason => {
            if (reason === error) {
                unhandled.push(reason);
            }
        };
        process.on("unhandledRejection", onUnhandled);
        api.invitationAccept.mockRejectedValue(error);
        const {container, history, ref} = renderDetail({
            user: outsiderUser(),
            matchParams: {hash: "inv-hash"}
        });
        await waitForLoaded(container);
        snapshot(container, history);
        act(() => {
            ref.current.doAcceptInvitation();
        });
        await waitFor(() => expect(unhandled).toEqual([error]));
        process.off("unhandledRejection", onUnhandled);
    });

    it("hides flash actions after toggling away from the member view", async () => {
        mockIdLoad({
            collaboration: baseCollaboration({
                status: "expired",
                expiry_date: daysFromNow(-5)
            })
        });
        const {container, history, getByText} = renderDetail();
        await waitForLoaded(container);
        fireEvent.click(getByText("toggle-view"));
        await waitFor(() => {
            expect(container.querySelector("[data-testid='page-header']").getAttribute("data-member-view")).toBe("false");
        });
        const lastFlash = serializeFlash().at(-1);
        expect(lastFlash.hasAction).toBe(false);
        snapshot(container, history);
    });
});
