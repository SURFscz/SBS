import React from "react";
import {ReactComponent as TreeSwing} from "../../images/tree_swing.svg";

import "./Collaborations.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import Button from "../Button";
import {allCollaborations, mayRequestCollaboration, myCollaborations} from "../../api";
import SpinnerField from "./SpinnerField";
import {isUserAllowed, ROLES} from "../../utils/UserRole";
import Logo from "./Logo";
import moment from "moment";


export default class Collaborations extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            standalone: false,
            collaborations: [],
            showRequestCollaboration: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaborations, platformAdmin = false} = this.props;
        const promises = [mayRequestCollaboration()];
        if (collaborations === undefined) {
            Promise.all(promises.concat([platformAdmin ? allCollaborations() : myCollaborations()])).then(res => {
                this.setState({
                    standalone: true,
                    collaborations: res[1],
                    showRequestCollaboration: res[0],
                    loading: false
                });

            })
        } else {
            Promise.all(promises).then(res => this.setState({showRequestCollaboration: res, loading: false}))
        }

    }

    noCollaborations = organisation => {
        return (
            <div className="no-collaborations">
                <TreeSwing/>
                <h2>{I18n.t("models.collaborations.noCollaborations")}</h2>
                <Button txt={I18n.t("models.collaborations.new")}
                        onClick={() => {
                            const organisationQueryParam = organisation ? `?organisationId=${organisation.id}` : "";
                            this.props.history.push(`/new-collaboration${organisationQueryParam}`)
                        }}/>

            </div>
        )
    }

    openCollaboration = collaboration => e => {
        stopEvent(e);
        this.props.history.push(`/collaborations/${collaboration.id}`);
    };

    render() {
        const {loading, standalone, showRequestCollaboration} = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {collaborations} = standalone ? this.state : this.props;
        const {
            modelName = "collaborations", organisation, mayCreate = true, showOrigin = false,
            showExpiryDate = false, showLastActivityDate = false
        } = this.props;

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations(organisation);
        }
        const {user} = this.props;
        const mayCreateCollaborations = isUserAllowed(ROLES.ORG_MANAGER, user);
        const organisationQueryParam = organisation ? `?organisationId=${organisation.id}` : "";

        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: collaboration => <Logo src={collaboration.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.collaborations.name"),
                mapper: collaboration => <a href="/"
                                            onClick={this.openCollaboration(collaboration)}>{collaboration.name}</a>,
            },
            {
                key: "organisation__name",
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => organisation ? organisation.name : collaboration.organisation.name
            },
            {
                nonSortable: true,
                key: "role",
                header: "",// I18n.t("profile.yourRole"),
                mapper: collaboration => {
                    const cm = user.collaboration_memberships.find(m => m.collaboration_id === collaboration.id);
                    return cm ?
                        <span className={`person-role ${cm.role}`}>{I18n.t(`profile.${cm.role}`)}</span> : null;
                }
            }];
        if (showExpiryDate) {
            columns.push({
                key: "expiry_date",
                header: I18n.t("collaboration.expiryDate"),
                mapper: collaboration => {
                    if (collaboration.expiry_date) {
                        const today = new Date().getTime();
                        const expiryDate = collaboration.expiry_date * 1000;
                        const days = Math.max(1, Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)));
                        const warning = days < 60;
                        return <div>
                            <span className={warning ? "warning" : ""}>{moment(expiryDate).format("LL")}</span>
                            {(warning && collaboration.status === "active") &&
                            <span className="warning">
                            {I18n.p(days, "collaboration.expiryDateWarning", {nbr: days})}
                            </span>}
                            {(collaboration.status === "expired") &&
                            <span className="warning">{I18n.t("collaboration.expiryDateExpired", {nbr: days})}</span>}
                        </div>;
                    }
                    return I18n.t("service.none");
                }
            });
        }
        if (showLastActivityDate) {
            columns.push({
                key: "last_activity_date",
                header: I18n.t("collaboration.lastActivityDate"),
                mapper: collaboration => {
                    const today = new Date().getTime();
                    const lastActivityDate = collaboration.last_activity_date * 1000;
                    const days = Math.round((today - lastActivityDate) / (1000 * 60 * 60 * 24));
                    const warning = days > 60;
                    return <div>
                        <span className={warning ? "warning" : ""}>{moment(lastActivityDate).format("L")}</span>
                        {collaboration.status === "suspended" && <span className="warning">
                            {I18n.t("collaboration.lastActivitySuspended")}
                        </span>}
                    </div>;
                }
            });
        }
        if (showOrigin) {
            columns.push({
                key: "fromCollaboration",
                header: I18n.t("models.serviceCollaborations.origin"),
                mapper: collaboration => collaboration.fromCollaboration ?
                    I18n.t("models.serviceCollaborations.fromCollaboration") : I18n.t("models.serviceCollaborations.fromOrganisation")
            });
        }
        const allColumns = columns.concat([{
            key: "collaboration_memberships_count",
            header: I18n.t("models.collaborations.memberCount")
        },
            {
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            }]);
        return (
            <Entities entities={collaborations}
                      modelName={mayCreateCollaborations ? modelName : showRequestCollaboration ? "memberCollaborations" : modelName}
                      searchAttributes={["name"]}
                      defaultSort="name"
                      hideTitle={true}
                      rowLinkMapper={() => this.openCollaboration}
                      columns={allColumns}
                      showNew={(mayCreateCollaborations || showRequestCollaboration) && mayCreate}
                      newEntityPath={`/new-collaboration${organisationQueryParam}`}
                      loading={loading}
                      {...this.props}/>
        )
    }

}

