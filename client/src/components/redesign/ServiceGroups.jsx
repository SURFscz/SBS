import React from "react";
import {
    createServiceGroup,
    deleteServiceGroup,
    serviceGroupNameExists,
    serviceGroupShortNameExists,
    updateServiceGroup
} from "../../api";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";

import "./ServiceGroups.scss";
import {isEmpty, stopEvent} from "../../utils/Utils";
import I18n from "../../locale/I18n";
import Button from "../Button";
import {setFlash} from "../../utils/Flash";
import ConfirmationDialog from "../ConfirmationDialog";
import Entities from "./Entities";
import SpinnerField from "./SpinnerField";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import InputField from "../InputField";
import CheckBox from "../CheckBox";
import moment from "moment";
import {sanitizeShortName} from "../../validations/regExps";
import {AppStore} from "../../stores/AppStore";
import ErrorIndicator from "./ErrorIndicator";
import ServiceGroupsExplanation from "../explanations/ServicesGroups";
import {isUserServiceAdmin} from "../../utils/UserRole";

class ServiceGroups extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            required: ["name", "short_name"],
            alreadyExists: {},
            initial: true,
            createNewGroup: false,
            selectedGroupId: null,
            editGroup: false,
            name: "",
            short_name: "",
            description: "",
            auto_provision_members: false,
            confirmationDialogOpen: false,
            confirmationDialogQuestion: undefined,
            confirmationDialogAction: () => true,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false}),
            loading: true,
        }
    }

    componentDidMount = callback => {
        this.setState({loading: false}, callback);
    }

    refreshAndFlash = (promise, flashMsg, callback) => {
        this.setState({loading: true, confirmationDialogOpen: false});
        promise.then(res => {
            this.props.refresh(() => {
                this.componentDidMount(() => callback && callback(res));
                setFlash(flashMsg);
            });
        });
    }

    closeConfirmationDialog = () => this.setState({confirmationDialogOpen: false});

    getSelectedGroup = () => {
        const {selectedGroupId} = this.state;
        const {service} = this.props;
        return service.service_groups.find(g => g.id === selectedGroupId);
    }

    confirm = (action, question) => {
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: action
        });
    };

    cancelSideScreen = e => {
        stopEvent(e);
        this.setState({selectedGroupId: null, createNewGroup: false, editGroup: false});
        AppStore.update(s => {
            const paths = s.breadcrumb.paths.slice(0, s.breadcrumb.paths.length - 1);
            const lastPath = paths[paths.length - 1];
            lastPath.path = null;
            s.breadcrumb.paths = paths;
        });
    }

    validateServiceGroupName = e => {
        const {createNewGroup} = this.state;
        const {service} = this.props;
        const selectedGroup = this.getSelectedGroup();
        serviceGroupNameExists(e.target.value, service.id, createNewGroup ? null : selectedGroup.name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, name: json}});
        });
    };

    validateServiceGroupShortName = e => {
        const {createNewGroup} = this.state;
        const selectedGroup = this.getSelectedGroup();
        const {service} = this.props;
        serviceGroupShortNameExists(sanitizeShortName(e.target.value), service.id, createNewGroup ? null : selectedGroup.short_name).then(json => {
            this.setState({alreadyExists: {...this.state.alreadyExists, short_name: json}});
        });
    };

    renderGroupContainer = children => {
        const {
            confirmationDialogOpen,
            cancelDialogAction,
            confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        return (
            <div className="service-group-details-container">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    isWarning={true}
                                    question={confirmationDialogQuestion}/>
                <div>
                    <a className={"back-to-groups"} onClick={this.cancelSideScreen} href={"/cancel"}>
                        <ChevronLeft/>{I18n.t("models.serviceGroups.backToGroups")}
                    </a>
                </div>
                {children}
            </div>
        );
    }

    renderGroupDetails = (selectedGroup) => {
        const queryParam = `name=${encodeURIComponent(I18n.t("breadcrumb.group", {name: selectedGroup.name}))}&back=${encodeURIComponent(window.location.pathname)}`;
        const children = (
            <div className={"service-group-details"}>
                <section className="header">
                    <h2>{selectedGroup.name}</h2>
                    {
                        <div className="header-actions">
                            <Button onClick={() => this.setState(this.newGroupState(selectedGroup))}
                                    small={true}
                                    txt={I18n.t("models.groups.edit")}/>
                            <span className="history"
                                  onClick={() => this.props.history.push(`/audit-logs/service_groups/${selectedGroup.id}?${queryParam}`)}>
                        <FontAwesomeIcon icon="history"/>{I18n.t("home.history")}
                    </span>
                        </div>}

                </section>
                <p className={`description`}>{selectedGroup.description}</p>
                <div className="org-attributes-container">
                    <div className="org-attributes">
                        <span>{I18n.t("models.groups.autoProvisioning")}</span>
                        <span>{I18n.t(`models.groups.${selectedGroup.auto_provision_members ? "on" : "off"}`)}</span>
                    </div>
                    <div className="org-attributes">
                        <span>{I18n.t("groups.short_name")}</span>
                        <span>{selectedGroup.short_name}</span>
                    </div>
                </div>
            </div>
        );
        return this.renderGroupContainer(children);

    }

    newGroupState = group => ({
        createNewGroup: group ? false : true,
        selectedGroupId: group ? group.id : null,
        editGroup: group ? true : false,
        name: group ? group.name : "",
        short_name: group ? group.short_name : "",
        auto_provision_members: group ? group.auto_provision_members : false,
        alreadyExists: {},
        initial: true,
        description: group ? group.description : "",
    });

    renderGroupForm = (createNewGroup, selectedGroup) => {
        const {user} = this.props;
        const {
            name, short_name, auto_provision_members, alreadyExists, initial, description
        } = this.state;
        const disabledSubmit = !initial && !this.isValid();
        const children = (
            <div className="service-group-form">
                <h2>{createNewGroup ? I18n.t("models.serviceGroups.new") : selectedGroup.name}</h2>

                <InputField value={name || ""}
                            onChange={e => this.setState({
                                name: e.target.value,
                                alreadyExists: {...this.state.alreadyExists, name: false}
                            })}
                            error={alreadyExists.name || (!initial && isEmpty(name))}
                            placeholder={I18n.t("groups.namePlaceholder")}
                            onBlur={this.validateServiceGroupName}
                            name={I18n.t("groups.name")}/>
                {alreadyExists.name && <ErrorIndicator msg={I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.name").toLowerCase(),
                    value: name
                })}/>}
                {(!initial && isEmpty(name)) && <ErrorIndicator
                    msg={I18n.t("groups.required", {
                        attribute: I18n.t("groups.name").toLowerCase()
                    })}/>}

                <InputField value={short_name}
                            name={I18n.t("groups.short_name")}
                            placeholder={I18n.t("groups.shortNamePlaceHolder")}
                            onBlur={this.validateServiceGroupShortName}
                            onChange={e => this.setState({
                                short_name: sanitizeShortName(e.target.value),
                                alreadyExists: {...this.state.alreadyExists, short_name: false}
                            })}
                            error={alreadyExists.short_name || (!initial && isEmpty(short_name))}
                            toolTip={I18n.t("groups.shortNameTooltip")}
                            disabled={!createNewGroup && !user.admin}/>
                {alreadyExists.short_name && <ErrorIndicator msg={I18n.t("groups.alreadyExists", {
                    attribute: I18n.t("groups.short_name").toLowerCase(),
                    value: short_name
                })}/>}
                {(!initial && isEmpty(short_name)) && <ErrorIndicator msg={I18n.t("groups.required", {
                    attribute: I18n.t("groups.short_name").toLowerCase()
                })}/>}

                <InputField value={description}
                            name={I18n.t("groups.description")}
                            placeholder={I18n.t("groups.descriptionPlaceholder")}
                            onChange={e => this.setState({description: e.target.value})}
                            multiline={true}/>

                <CheckBox name="auto_provision_members" value={auto_provision_members}
                          info={I18n.t("groups.autoProvisionMembers")}
                          tooltip={I18n.t("models.serviceGroups.autoProvisionMembersTooltip")}
                          onChange={e => this.setState({auto_provision_members: e.target.checked})}/>

                {!createNewGroup &&
                <InputField value={moment(selectedGroup.created_at * 1000).format("LLLL")}
                            disabled={true}
                            name={I18n.t("organisation.created")}/>}

                <section className="actions">
                    {!createNewGroup &&
                    <Button warningButton={true}
                            onClick={this.delete}/>}
                    <Button cancelButton={true} txt={I18n.t("forms.cancel")}
                            onClick={() => this.setState({editGroup: false, createNewGroup: false})}/>
                    <Button disabled={disabledSubmit} txt={I18n.t(`forms.save`)}
                            onClick={this.submit}/>
                </section>

            </div>
        );
        return this.renderGroupContainer(children);
    }

    cancel = () => {
        this.setState({
            confirmationDialogOpen: true,
            leavePage: true,
            cancelDialogAction: this.cancelSideScreen,
            confirmationDialogAction: this.closeConfirmationDialog
        });
    };

    delete = () => {
        const selectedGroup = this.getSelectedGroup();
        const action = () => this.refreshAndFlash(deleteServiceGroup(selectedGroup.id),
            I18n.t("groups.flash.deleted", {name: selectedGroup.name}),
            () => this.setState({
                confirmationDialogOpen: false, selectedGroup: null, editGroup: false,
                createNewGroup: false
            }));
        this.confirm(action, I18n.t("groups.deleteConfirmation", {name: selectedGroup.name}));
    };

    isValid = () => {
        const {required, alreadyExists} = this.state;
        const inValid = Object.values(alreadyExists).some(val => val) || required.some(attr => isEmpty(this.state[attr]));
        return !inValid;
    };

    submit = () => {
        const {initial} = this.state;
        if (initial) {
            this.setState({initial: false}, this.doSubmit)
        } else {
            this.doSubmit();
        }
    };

    doSubmit = () => {
        if (this.isValid()) {
            const {name, createNewGroup} = this.state;
            const {service} = this.props;
            if (createNewGroup) {
                this.refreshAndFlash(createServiceGroup({...this.state, service_id: service.id}),
                    I18n.t("groups.flash.created", {name: name}),
                    res => {
                        this.setState({
                            selectedGroupId: res.id,
                            editGroup: false,
                            createNewGroup: false
                        })
                    });
            } else {
                const {selectedGroupId} = this.state;
                this.refreshAndFlash(updateServiceGroup({
                        ...this.state,
                        id: selectedGroupId,
                        service_id: service.id
                    }),
                    I18n.t("groups.flash.updated", {name: name}),
                    () => this.setState({
                        editGroup: false,
                        createNewGroup: false
                    }));
                    this.cancelSideScreen();
            }
        } else {
            window.scrollTo(0, 0);
        }
    }

    gotoGroup = group => e => {
        stopEvent(e);
        this.setState({selectedGroupId: group.id, createNewGroup: false, editGroup: false});
        AppStore.update(s => {
            const {service} = this.props;
            const paths = s.breadcrumb.paths;
            const lastPath = paths[paths.length - 1];
            lastPath.path = `/services/${service.id}`
            paths.push({
                value: I18n.t("breadcrumb.group", {name: group.name})
            })
            s.breadcrumb.paths = paths;
        });
    }

    render() {
        const {
            loading, createNewGroup, editGroup
        } = this.state;
        if (loading) {
            return <SpinnerField/>;
        }
        const {service, user: currentUser} = this.props;
        const selectedGroup = this.getSelectedGroup();
        const mayCreateGroups = isUserServiceAdmin(currentUser, service) || currentUser.admin;
        if (createNewGroup || (editGroup && selectedGroup)) {
            return this.renderGroupForm(createNewGroup, selectedGroup, mayCreateGroups);
        }
        if (selectedGroup) {
            return this.renderGroupDetails(selectedGroup);
        }
        const groups = service.service_groups;
        const columns = [
            {
                key: "name",
                header: I18n.t("models.serviceGroups.name"),
                mapper: group => <a href={`${group.name}`}
                                    className={"neutral-appearance"}
                                    onClick={this.gotoGroup(group)}>{group.name}</a>,
            },
            {
                key: "short_name",
                header: I18n.t("groups.short_name"),
                mapper: group => <a href={`${group.short_name}`}
                                    className={"neutral-appearance"}
                                    onClick={this.gotoGroup(group)}>{group.short_name}</a>,
            },
            {
                key: "description",
                header: I18n.t("models.serviceGroups.description"),
                mapper: group => <span className={"cut-of-lines"}>{group.description}</span>
            },
        ]
        if (mayCreateGroups) {
            columns.push({
                key: "auto_provision_members",
                header: I18n.t("models.serviceGroups.autoProvisioning"),
                mapper: group => I18n.t(`models.serviceGroups.${group.auto_provision_members ? "on" : "off"}`)
            });
        }
        return (
            <div>
                <Entities entities={groups}
                          modelName="serviceGroups"
                          searchAttributes={["name", "description"]}
                          defaultSort="name"
                          rowLinkMapper={() => this.gotoGroup}
                          columns={columns}
                          loading={loading}
                          hideTitle={true}
                          showNew={mayCreateGroups}
                          newEntityFunc={() => this.setState(this.newGroupState())}
                          explain={<ServiceGroupsExplanation/>}
                          explainTitle={I18n.t("explain.serviceGroups")}

                          {...this.props}/>
            </div>
        )
    }
}

export default ServiceGroups;