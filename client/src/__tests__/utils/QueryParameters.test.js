import {getParameterByName, replaceQueryParameter} from "../../utils/QueryParameters";

test("Replace query parameters", () => {
    const replaced = replaceQueryParameter("?test=bogus", "test", "value");
    expect(replaced).toBe("?test=value");
});

test("Replace query parameters preserve existing", () => {
    const replaced = replaceQueryParameter("?test=bogus&name=x", "test", "value");
    expect(replaced).toBe("?test=value&name=x");
});

test("Replace query parameters", () => {
    const replaced = replaceQueryParameter("", "test", "value");
    expect(replaced).toBe("?test=value");
});

test("Parameter by name", () => {
    expect("value").toBe(getParameterByName("name", "?name=value"));
});

test("Parameter by encoded name", () => {
    expect("value search").toBe(getParameterByName("name", "?name=value+search"));
});

test("Parameter by encoded ref name", () => {
    expect("ref:refs/heads/main").toBe(getParameterByName("query", "?query=ref%3Arefs%2Fheads%2Fmain"));
});

test("Parameter by name not exists", () => {
    expect(null).toBe(getParameterByName("", undefined));
});