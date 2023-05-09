import {isEmpty} from "./Utils";
import I18n from "../locale/I18n";

export function filterAuditLogs(auditLogs, query) {
    if (isEmpty(query)) {
        return auditLogs;
    }

    const lowerQuery = query.toLowerCase();
    const sub = [...auditLogs.audit_logs].filter(a => {
        let matchesParent, matchesUser, matchesName, matchesTranslation, matchesState;

        const translation = I18n.t(`history.tables.${a.target_type}`).toLowerCase();
        matchesTranslation = translation.indexOf(lowerQuery) > -1;
        if (!matchesTranslation && a.parent_name && auditLogs[a.parent_name]) {
            const parent = auditLogs[a.parent_name].find(obj => obj.id === a.parent_id);
            if (parent && parent.name) {
                matchesParent = parent.name.toLowerCase().indexOf(lowerQuery) > -1;
            }
        }
        if (!matchesTranslation && !matchesParent && a.subject_id && auditLogs.users) {
            const subject = auditLogs.users.find(user => user.id === a.subject_id);
            if (subject && subject.name) {
                matchesUser = subject.name.toLowerCase().indexOf(lowerQuery) > -1;
            }
        }
        if (!matchesTranslation && !matchesParent && !matchesUser && a.target_name) {
            matchesName = a.target_name.toLowerCase().indexOf(lowerQuery) > -1;
        }
        if (!matchesTranslation && !matchesParent && !matchesUser && !matchesName && a.state_after) {
            matchesState = a.state_after.toLowerCase().indexOf(query) > -1 ||
                (a.state_before && a.state_before.toLowerCase().indexOf(query) > -1);
        }
        return matchesTranslation || matchesParent || matchesUser || matchesName || matchesState;
    });
    return {...auditLogs, audit_logs: sub};
}
