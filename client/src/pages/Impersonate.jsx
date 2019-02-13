import React from "react";
import "./Impersonate.scss";
import {searchCollaborations, searchOrganisations, searchUsers} from "../api";
import I18n from "i18n-js";
import {isEmpty, stopEvent} from "../utils/Utils";
import debounce from "lodash.debounce";
import SelectField from "../components/SelectField";
import Autocomplete from "../components/Autocomplete";
import Button from "../components/Button";
import {emitter} from "../utils/Events";
import InputField from "../components/InputField";
import CheckBox from "../components/CheckBox";
import Explain from "../components/Explain";
import ImpersonateExplanation from "../components/explanations/Impersonate";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class Impersonate extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            organisations: [],
            collaborations: [],
            organisation: null,
            limitToOrganisationAdmins: false,
            collaboration: null,
            limitToCollaborationAdmins: false,
            selected: -1,
            suggestions: [],
            query: "",
            loadingAutoComplete: false,
            moreToShow: false,
            selectedUser: null,
            initial: true,
            showExplanation: false
        };
    }

    componentDidMount = () => {
        Promise.all([searchOrganisations("*"), searchCollaborations("*")]).then(res => {
            this.setState({
                organisations: res[0].map(org => ({
                    value: org.id,
                    label: org.name
                })), collaborations: res[1].map(coll => ({
                    value: coll.id,
                    label: coll.name,
                    organisation_id: coll.organisation_id
                }))
            });
        })
    };

    startImpersonation = () => {
        const {selectedUser, initial} = this.state;
        if (initial && isEmpty(selectedUser)) {
            this.setState({initial: false});
        } else {
            emitter.emit("impersonation", selectedUser);
            this.setState({
                selectedUser: null, query: "", initial: true, collaboration: null,
                organisation: null, limitToCollaborationAdmins: false, limitToOrganisationAdmins: false
            });
        }
    };

    clearImpersonation = () => {
        emitter.emit("impersonation", null);
        this.setState({
            selectedUser: null, query: "", initial: true, collaboration: null,
            organisation: null, limitToCollaborationAdmins: false, limitToOrganisationAdmins: false
        });
    };

    onSearchKeyDown = e => {
        const {suggestions, selected} = this.state;
        if (e.keyCode === 40 && selected < (suggestions.length - 1)) {//keyDown
            stopEvent(e);
            this.setState({selected: (selected + 1)});
        }
        if (e.keyCode === 38 && selected >= 0) {//keyUp
            stopEvent(e);
            this.setState({selected: (selected - 1)});
        }
        if (e.keyCode === 13 && selected >= 0) {//enter
            stopEvent(e);
            this.setState({selected: -1}, () => this.itemSelected(suggestions[selected]));
        }
        if (e.keyCode === 27) {//escape
            stopEvent(e);
            this.setState({selected: -1, query: "", suggestions: []});
        }

    };

    search = e => {
        const query = e.target.value;
        this.setState({query: query, selected: -1});
        if ((!isEmpty(query) && query.trim().length > 2) || "*" === query.trim()) {
            this.setState({loadingAutoComplete: true});
            this.delayedAutocomplete();
        }
        if (isEmpty(query)) {
            this.setState({selectedUser: null});
        }
    };

    delayedAutocomplete = debounce(() => {
        const {query, collaboration, organisation, limitToCollaborationAdmins, limitToOrganisationAdmins} = this.state;
        searchUsers(query,
            organisation ? organisation.value : null,
            collaboration ? collaboration.value : null,
            limitToOrganisationAdmins,
            limitToCollaborationAdmins).then(results => {
            const {user, impersonator} = this.props;
            const idsToExclude = [user, impersonator].filter(u => !isEmpty(u)).map(u => u.id);
            results = results.filter(u => !idsToExclude.includes(u.id));
            this.setState({
                suggestions: results.length > 15 ? results.slice(0, results.length - 1) : results,
                loadingAutoComplete: false,
                moreToShow: results.length > 15 && this.state.query !== "*"
            })
        })
    }, 200);

    itemSelected = selectedUser => this.setState({
        selectedUser,
        suggestions: [],
        loadingAutoComplete: true,
        query: `${selectedUser.name} - ${selectedUser.uid}`
    });

    closeExplanation = () => this.setState({showExplanation: false});

    onBlurSearch = suggestions => () => {
        if (!isEmpty(suggestions)) {
            setTimeout(() => this.setState({suggestions: [], loadingAutoComplete: true}), 250);
        } else {
            this.setState({suggestions: [], loadingAutoComplete: true});
        }
    };

    organisationSelected = option => {
        this.setState({organisation: option, query: "", selectedUser: null})
    };

    collaborationSelected = option => {
        this.setState({collaboration: option, query: "", selectedUser: null})
    };

    render() {
        const {user, impersonator} = this.props;
        const {
            organisations, collaborations, suggestions, organisation, collaboration, query,
            loadingAutoComplete, selected, moreToShow, selectedUser, initial,
            limitToCollaborationAdmins, limitToOrganisationAdmins, showExplanation
        } = this.state;
        const filteredCollaborations = organisation ? collaborations.filter(coll => coll.organisation_id === organisation.value) : collaborations;
        const filteredOrganisations = collaboration ? organisations.filter(org => org.value === collaboration.organisation_id) : organisations;
        const showAutoCompletes = (query.length > 1 || "*" === query.trim()) && !loadingAutoComplete;
        return (
            <div className="mod-impersonate">
                <Explain
                    close={this.closeExplanation}
                    subject={I18n.t("explain.impersonate")}
                    isVisible={showExplanation}>
                    <ImpersonateExplanation/>
                </Explain>
                <div className="title">
                    <p>{I18n.t("impersonate.title", {name: user.name})}</p>
                    <FontAwesomeIcon className="help" icon="question-circle"
                                     id="impersonate_close_explanation"
                                     onClick={() => this.setState({showExplanation: true})}/>
                </div>
                <div className="impersonate">
                    <SelectField value={organisation}
                                 options={filteredOrganisations}
                                 name={I18n.t("impersonate.organisation")}
                                 placeholder={I18n.t("impersonate.organisationPlaceholder")}
                                 onChange={this.organisationSelected}
                                 clearable={true}
                                 searchable={true}/>
                    <CheckBox name="organisationAdminsOnly"
                              value={limitToOrganisationAdmins}
                              info={I18n.t("impersonate.organisationAdminsOnly")}
                              onChange={() => this.setState({limitToOrganisationAdmins: !limitToOrganisationAdmins})}/>
                    <SelectField value={collaboration}
                                 options={filteredCollaborations}
                                 name={I18n.t("impersonate.collaboration")}
                                 placeholder={I18n.t("impersonate.collaborationPlaceholder")}
                                 onChange={this.collaborationSelected}
                                 clearable={true}
                                 searchable={true}/>
                    <CheckBox name="collaborationAdminsOnly"
                              value={limitToCollaborationAdmins}
                              info={I18n.t("impersonate.collaborationAdminsOnly")}
                              onChange={() => this.setState({limitToCollaborationAdmins: !limitToCollaborationAdmins})}/>
                    <section className="user-search">
                        <div className="search"
                             tabIndex="-1" onBlur={this.onBlurSearch(suggestions)}>
                            <label className="autocomplete-label" htmlFor="user">{I18n.t("impersonate.user")}</label>
                            <span className="outer-search">
                            <input type="text"
                                   onChange={this.search}
                                   onFocus={this.search}
                                   value={query}
                                   onKeyDown={this.onSearchKeyDown}
                                   placeholder={I18n.t("impersonate.userSearchPlaceHolder")}/>
                                {showAutoCompletes && <Autocomplete suggestions={suggestions}
                                                                    query={query}
                                                                    includeHeaders={true}
                                                                    selected={selected}
                                                                    itemSelected={this.itemSelected}
                                                                    moreToShow={moreToShow}
                                                                    ignoreAttributes={["description"]}
                                                                    additionalAttributes={["email", "admin", "organisations", "collaborations"]}/>}
                             </span>
                        </div>
                    </section>
                    {(!initial && isEmpty(selectedUser)) &&
                    <span className="error">{I18n.t("impersonate.userRequired")}</span>}
                    <InputField disabled={true} name={I18n.t("impersonate.currentImpersonation")}
                                value={isEmpty(impersonator) ? I18n.t("impersonate.noImpersonation") :
                                    I18n.t("impersonate.currentImpersonationValue", {
                                        impersonator: impersonator.name,
                                        currentUser: user.name
                                    })}/>

                    <section className="actions">
                        <Button disabled={isEmpty(selectedUser) && !initial}
                                txt={I18n.t("impersonate.startImpersonation")}
                                onClick={this.startImpersonation}/>
                        <Button disabled={isEmpty(impersonator)} cancelButton={true}
                                txt={I18n.t("impersonate.clearImpersonation")}
                                onClick={this.clearImpersonation}/>
                    </section>

                </div>
            </div>);
    };
}

export default Impersonate;