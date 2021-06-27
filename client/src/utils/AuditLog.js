import {isEmpty} from "./Utils";
import I18n from "i18n-js";

export function filterAuditLogs(auditLogs, query) {
    if (isEmpty(query)) {
        return auditLogs;
    }

    const lowerQuery = query.toLowerCase();
    const sub = [...auditLogs.audit_logs].filter(a => {
        let matchesParent = false;
        let matchesUser = false;
        let matchesName = false

        const translation = I18n.t(`history.tables.${a.target_type}`).toLowerCase();
        const matchesTranslation = translation.indexOf(lowerQuery) > -1;
        if (a.parent_name && auditLogs[a.parent_name]) {
            const parent = auditLogs[a.parent_name].find(obj => obj.id === a.parent_id);
            if (parent && parent.name) {
                matchesParent = parent.name.toLowerCase().indexOf(lowerQuery) > -1;
            }
        }
        if (a.subject_id && auditLogs.users) {
            const subject = auditLogs.users.find(user => user.id === a.subject_id);
            if (subject && subject.name) {
                matchesUser = subject.name.toLowerCase().indexOf(lowerQuery) > -1;
            }
        }
        if (a.target_name) {
            matchesName = a.target_name.toLowerCase().indexOf(lowerQuery) > -1;
        }
        return matchesTranslation || matchesParent || matchesUser || matchesName;
    });
    return {...auditLogs, audit_logs: sub};
}
