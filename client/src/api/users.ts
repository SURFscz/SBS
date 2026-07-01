import {fetchJson} from "@/api/index";
import {isEmpty} from "@/utils/Utils";

// Authorization URL
export type AuthorizationUrlResponse = {
    authorization_endpoint: string;
};

export function authorizationUrl(state: string, idpHint: string | null = null): Promise<AuthorizationUrlResponse> {
    const idpHintPart = isEmpty(idpHint) ? "" : `&aarc_idp_hint=${encodeURIComponent(idpHint ?? "")}`;
    return fetchJson(`/api/users/authorization?state=${encodeURIComponent(state)}${idpHintPart}`);
}
