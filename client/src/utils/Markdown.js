import * as Showdown from "showdown";
import DOMPurify from "dompurify";
import {isEmpty} from "./Utils";

const converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true
});

export function convertToHtml(markdown, openLinkInNewTab = false) {
    if (isEmpty(markdown)) {
        return markdown;
    }
    const dirty = converter.makeHtml(markdown);
    let html = DOMPurify.sanitize(dirty);
    if (openLinkInNewTab) {
        html = html.replace(/<a /g, "<a target='_blank' ");
    }
    return html;
}
