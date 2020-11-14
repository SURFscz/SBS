import React from "react";
import "./ServiceOrganisations.scss";
import {stopEvent} from "../../utils/Utils";
import I18n from "i18n-js";
import Entities from "./Entities";
import ToggleSwitch from "./ToggleSwitch";
import Button from "../Button";
import {allowedOrganisations} from "../../api";
import {setFlash} from "../../utils/Flash";


class ServiceOrganisations extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisationsSelected: {},
            loading: true,
            toggleAll: false,
            error: false,
            isInitial: true
        }
    }

    componentDidMount = () => {
        const {service, organisations} = this.props;
        const allowedOrganisations = service.allowed_organisations.map(org => org.id);
        const allowAll = allowedOrganisations.length === 0;
        const organisationsSelected = organisations.reduce((acc, org) => {
            acc[org.id] = allowAll ? true : allowedOrganisations.indexOf(org.id) > -1;
            return acc;
        }, {})

        this.setState({organisationsSelected, loading: false});
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
        }, {})
        this.setState({toggleAll: !toggleAll, organisationsSelected: newOrganisationsSelected}, this.invariant);
    }

    invariant = () => {
        const {organisationsSelected, isInitial} = this.state;
        const noneSelected = Object.values(organisationsSelected).every(val => !val);
        this.setState({error: !isInitial && noneSelected});
    }

    toggleChanged = organisation => value => {
        const {organisationsSelected} = this.state;
        organisationsSelected[organisation.id] = value;
        const newOrganisationsSelected = {...organisationsSelected};
        this.setState({organisationsSelected: newOrganisationsSelected}, this.invariant);
    }

    toggle = organisation => {
        const {organisationsSelected} = this.state;
        const value = organisationsSelected[organisation.id];
        return <ToggleSwitch value={value} onChange={this.toggleChanged(organisation)}/>;
    }

    submit = () => {
        const {organisationsSelected} = this.state;
        const {service} = this.props;
        const allValues = Object.values(organisationsSelected);
        const allSelected = allValues.every(val => val);
        const noneSelected = allValues.every(val => !val);
        if (noneSelected) {
            this.setState({error: true, isInitial: false});
        } else {
            const selectedOrganisations = Object.entries(organisationsSelected)
                .filter(e => e[1])
                .map(e => ({"organisation_id": e[0]}));
            const organisations = allSelected ? [] : selectedOrganisations;
            allowedOrganisations(service.id, {"allowed_organisations": organisations})
                .then(() => {
                    window.scrollTo(0, 0);
                    setFlash(I18n.t("service.flash.updated", {name: service.name}));
                });

        }

    }

    render() {
        const {organisationsSelected, loading, error} = this.state;
        const {organisations} = this.props;
        organisations.forEach(org => org.toggle = organisationsSelected[org.id]);
        const columns = [
            {
                nonSortable: true,
                key: "logo",
                header: "",
                mapper: org => org.logo && <img src={`data:image/jpeg;base64,${org.logo}`} alt=""/>
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
                      loading={loading}
                      {...this.props}>
                <section className="actions">
                    <Button disabled={error} txt={I18n.t("forms.save")} onClick={this.submit}/>
                    {error && <span className="error">{I18n.t("models.serviceOrganisations.allowedNoneError")}</span>}
                </section>
            </Entities>
        )
    }
}

export default ServiceOrganisations;