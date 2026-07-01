import {fetchJson, postPutJson} from "@/api/index";

// Aup Links
export type AupLinksResponse = {
    url_aup_en: string;
    url_aup_nl: string;
    version: string;
};

export function aupLinks(): Promise<AupLinksResponse> {
    return fetchJson("/api/aup/info");
}

// Agree Aup
export type AgreeAupResponse = {
    location: string;
};

export function agreeAup(): Promise<AgreeAupResponse> {
    return postPutJson("/api/aup/agree", {}, "post");
}
