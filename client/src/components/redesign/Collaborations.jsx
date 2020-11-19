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

export default class Collaborations extends React.PureComponent {

    constructor(props, context) {
        super(props, context);
        this.state = {
            standalone: false,
            showRequestCollaboration: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const {collaborations, user} = this.props;
        const promises = [mayRequestCollaboration()];
        if (collaborations === undefined) {
            Promise.all(promises.concat([user.admin ? allCollaborations() : myCollaborations()])).then(res => {
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
                            const organisationQueryParam = organisation ? `organisation=${organisation.id}` : "";
                            this.props.history.push(`/new-collaboration?${organisationQueryParam}`)
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
        const {modelName = "collaborations", organisation, mayCreate = true, showOrigin = false} = this.props;

        if (isEmpty(collaborations) && !loading && modelName === "collaborations") {
            return this.noCollaborations(this.props.organisation);
        }
        const {user} = this.props;
        const mayCreateCollaborations = isUserAllowed(ROLES.ORG_MANAGER, user);

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
                key: "organisation_name",
                header: I18n.t("models.serviceCollaborations.organisationName"),
                mapper: collaboration => organisation ? organisation.name : collaboration.organisation.name
            },
            {
                key: "role",
                header: "",// I18n.t("profile.yourRole"),
                mapper: collaboration => {
                    const cm = user.collaboration_memberships.find(m => m.collaboration_id === collaboration.id);
                    return cm ?
                        <span className={`person-role ${cm.role}`}>{I18n.t(`profile.${cm.role}`)}</span> : null;
                }
            },
            {
                key: "collaboration_memberships_count",
                header: I18n.t("models.collaborations.memberCount")
            },
            {
                key: "invitations_count",
                header: I18n.t("models.collaborations.invitationsCount")
            }]
        return (
            <Entities entities={collaborations}
                      modelName={mayCreateCollaborations ? modelName : showRequestCollaboration ? "memberCollaborations" : modelName}
                      searchAttributes={["name"]}
                      defaultSort="name"
                      rowLinkMapper={() => this.openCollaboration}
                      columns={columns}
                      showNew={(mayCreateCollaborations || showRequestCollaboration) && mayCreate}
                      newEntityPath={`/new-collaboration`}
                      loading={loading}
                      {...this.props}/>
        )
    }

}

