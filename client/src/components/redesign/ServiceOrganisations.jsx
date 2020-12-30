import React from "react";
import "./ServiceOrganisations.scss";
import {isEmpty, removeDuplicates, stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import ToggleSwitch from "./ToggleSwitch";
import {allowedOrganisations} from "../../api";
import {setFlash} from "../../utils/Flash";
import Logo from "./Logo";
import ConfirmationDialog from "../ConfirmationDialog";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationsSelected: {},
            organisationsDeselected: [],
            toggleAll: false,
            confirmationDialogOpen: false,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            confirmationDialogAction: undefined
        }
    }

    componentDidMount = toggleAll => {
        const {service, organisations} = this.props;
        const allowedOrganisationIdentifiers = service.allowed_organisations.map(org => org.id);
        const organisationsSelected = organisations.reduce((acc, org) => {
            acc[org.id] = allowedOrganisationIdentifiers.indexOf(org.id) > -1;
            return acc;
        }, {})

        this.setState({
            organisationsSelected: organisationsSelected,
            organisationsDeselected: [],
            toggleAll: toggleAll === undefined ? allowedOrganisationIdentifiers.length === organisations.length : toggleAll
        });
    }

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    onToggleAll = () => {
        const {organisations} = this.props;
        const {toggleAll} = this.state;
        const organisationsSelected = {...this.state.organisationsSelected};
        const allValues = Object.values(organisationsSelected);
        const allSelected = allValues.every(val => val);
        const noneSelected = allValues.every(val => !val);
        const newToggleAll = allSelected ? false : noneSelected ? true : !toggleAll;
        const newOrganisationsSelected = organisations.reduce((acc, org) => {
            acc[org.id] = newToggleAll;
            return acc;
        }, {});
        const organisationsDeselected = Object.entries(newOrganisationsSelected)
            .filter(e => !e[1])
            .map(e => parseInt(e[0], 10));
        this.submit(newOrganisationsSelected, organisationsDeselected, newToggleAll);
    }

    toggleChanged = organisation => value => {
        const organisationsSelected = {...this.state.organisationsSelected};
        organisationsSelected[organisation.id] = value;
        this.submit(organisationsSelected, value ? [] : [organisation.id]);
    }

    toggle = (organisation, organisationsSelected) => {
        const value = organisationsSelected[organisation.id];
        return <ToggleSwitch value={value || false} animate={false} onChange={this.toggleChanged(organisation)}/>;
    }

    submit = (organisationsSelected, organisationsDeselected, toggleAll, showConfirmation = true) => {
        const {collAffected, orgAffected} = this.getAffectedEntities(organisationsDeselected, this.props.service);
        if (showConfirmation && (collAffected.length > 0 || orgAffected.length > 0)) {
            this.setState({
                confirmationDialogOpen: true,
                confirmationDialogAction: () => {
                    this.setState({confirmationDialogOpen: false});
                    this.submit(organisationsSelected, organisationsDeselected, toggleAll, false)
                },
                organisationsDeselected: organisationsDeselected
            });
        } else {
            const organisations = Object.entries(organisationsSelected)
                .filter(e => e[1])
                .map(e => ({"organisation_id": e[0]}));
            const {service} = this.props;
            allowedOrganisations(service.id, {"allowed_organisations": organisations})
                .then(() => this.props.refresh(() => {
                    this.componentDidMount(isEmpty(toggleAll) ? this.state.toggleAll : toggleAll);
                    setFlash(I18n.t("service.flash.updated", {name: service.name}));
                }));
        }
    }

    renderConfirmation = (service, organisationsDeselected) => {
        const {collAffected, orgAffected} = this.getAffectedEntities(organisationsDeselected, service);

        const collAffectedUnique = removeDuplicates(collAffected, "id");
        return (
            <div className="allowed-organisations-confirmation">
                <p>{I18n.t("models.serviceOrganisations.disableAccessConsequences")}</p>
                <ul>
                    {collAffectedUnique.map(coll => <li key={coll.id}>{coll.name}
                        <span>{` - ${I18n.t("models.serviceOrganisations.collaboration")}`}</span>
                    </li>)
                    }
                    {orgAffected.map(org => <li key={org.id}>{org.name}
                        <span>{`- ${I18n.t("models.serviceOrganisations.organisation")}`}</span>
                    </li>)
                    }
                </ul>
            </div>
        );
    }

    getAffectedEntities = (organisationsDeselected, service) => {
        const collAffected = service.collaborations.filter(coll => organisationsDeselected.includes(coll.organisation_id));
        const orgAffected = service.organisations.filter(org => organisationsDeselected.includes(org.id));
        return {collAffected, orgAffected};
    }

    render() {
        const {
            organisationsSelected, organisationsDeselected, confirmationDialogOpen, cancelDialogAction,
            confirmationDialogAction,
        } = this.state;
        const {organisations, service, user} = this.props;
        organisations.forEach(org => org.toggle = organisationsSelected[org.id]);
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: org => <Logo src={org.logo}/>
            },
            {
                key: "name",
                header: I18n.t("models.organisations.name"),
                mapper: org => <a href="/" onClick={this.openOrganisation(org)}>{org.name}</a>,
            },
                        {
                nonSortable: true,
                key: "role",
                header: "",
                mapper: org => {
                    const cm = user.organisation_memberships.find(m => m.organisation_id === org.id);
                    return cm ?
                        <span className={`person-role ${cm.role}`}>{I18n.t(`profile.${cm.role}`)}</span> : null;
                }
            },
            {
                key: "category",
                header: I18n.t("models.organisations.category")
            },
            {

                key: "toggle",
                header: I18n.t("service.accessAllowed"),
                mapper: org => this.toggle(org, organisationsSelected)
            }]
        return (<div>
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={I18n.t("models.serviceOrganisations.disableAccessConfirmation")}
                                    closeTimeoutMS={0}
                                    isWarning={true}>
                    {confirmationDialogOpen && this.renderConfirmation(service, organisationsDeselected)}
                </ConfirmationDialog>

                <Entities entities={organisations}
                          modelName="serviceOrganisations"
                          searchAttributes={["name"]}
                          defaultSort="name"
                          columns={columns}
                          showNew={true}
                          newEntityFunc={this.onToggleAll}
                          loading={false}
                          {...this.props}>
                </Entities>
            </div>
        )
    }

}

export default ServiceOrganisations;