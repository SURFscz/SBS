import {isEmpty} from "./Utils";

export function srcUrl(src, type) {
    if (isEmpty(src)) {
        return src;
    }
    return (src.startsWith("http") || src.startsWith("data:image")) ? src : `data:image/${type};base64,${src}`

}