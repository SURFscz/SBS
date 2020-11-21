import React from "react";
import "./ServiceOrganisations.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import ToggleSwitch from "./ToggleSwitch";
import {allowedOrganisations} from "../../api";
import {setFlash} from "../../utils/Flash";
import Logo from "./Logo";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationsSelected: {},
            toggleAll: false
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
            toggleAll: toggleAll === undefined ? allowedOrganisationIdentifiers.length === organisations.length : toggleAll
        });
    }

    openOrganisation = organisation => e => {
        stopEvent(e);
        this.props.history.push(`/organisations/${organisation.id}`);
    };

    onToggleAll = () => {
        const {organisations} = this.props;
        const {toggleAll, organisationsSelected} = this.state;
        const allValues = Object.values(organisationsSelected);
        const allSelected = allValues.every(val => val);
        const noneSelected = allValues.every(val => !val);
        const newToggleAll = allSelected ? false : noneSelected ? true : !toggleAll;
        const newOrganisationsSelected = organisations.reduce((acc, org) => {
            acc[org.id] = newToggleAll;
            return acc;
        }, {});
        this.submit(newOrganisationsSelected);
    }

    toggleChanged = organisation => value => {
        const {organisationsSelected} = this.state;
        organisationsSelected[organisation.id] = value;
        const newOrganisationsSelected = {...organisationsSelected};
        this.submit(newOrganisationsSelected);
    }

    toggle = organisation => {
        const {organisationsSelected} = this.state;
        const value = organisationsSelected[organisation.id];
        return <ToggleSwitch value={value} onChange={this.toggleChanged(organisation)}/>;
    }

    submit = organisationsSelected => {
        const {service} = this.props;

        const organisations = Object.entries(organisationsSelected)
            .filter(e => e[1])
            .map(e => ({"organisation_id": e[0]}));

        allowedOrganisations(service.id, {"allowed_organisations": organisations})
            .then(() => this.props.refresh(() => {
                this.componentDidMount(this.state.toggleAll);
                setFlash(I18n.t("service.flash.updated", {name: service.name}));
            }));
    }

    render() {
        const {organisationsSelected} = this.state;
        const {organisations} = this.props;
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
                key: "category",
                header: I18n.t("models.organisations.category")
            },
            {

                key: "toggle",
                header: I18n.t("service.accessAllowed"),
                mapper: org => this.toggle(org, organisationsSelected)
            }]
        return (
            <Entities entities={organisations} modelName="serviceOrganisations" searchAttributes={["name"]}
                      defaultSort="name" columns={columns} showNew={true} newEntityFunc={this.onToggleAll}
                      loading={false}
                      {...this.props}>
            </Entities>
        )
    }
}

export default ServiceOrganisations;