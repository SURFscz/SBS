import { describe, it, expect } from 'vitest';
import {getParameterByName, replaceQueryParameter} from "../../utils/QueryParameters";


describe('QueryParameters', () => {
it("Replace query parameters", () => {
    const replaced = replaceQueryParameter("?test=bogus", "test", "value");
    expect(replaced).toBe("?test=value");
});

it("Replace query parameters preserve existing", () => {
    const replaced = replaceQueryParameter("?test=bogus&name=x", "test", "value");
    expect(replaced).toBe("?test=value&name=x");
});

it("Replace query parameters", () => {
    const replaced = replaceQueryParameter("", "test", "value");
    expect(replaced).toBe("?test=value");
});

it("Parameter by name", () => {
    expect("value").toBe(getParameterByName("name", "?name=value"));
});

it("Parameter by encoded name", () => {
    expect("value search").toBe(getParameterByName("name", "?name=value+search"));
});

it("Parameter by encoded ref name", () => {
    expect("ref:refs/heads/main").toBe(getParameterByName("query", "?query=ref%3Arefs%2Fheads%2Fmain"));
});

it("Parameter by name not exists", () => {
    expect(null).toBe(getParameterByName("", undefined));
});
});
