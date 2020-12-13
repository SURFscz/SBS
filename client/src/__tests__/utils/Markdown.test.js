import { convertToHtml} from "../../utils/Markdown";

test("Convert to html", () => {
    const html = convertToHtml("*bold*");
    expect(html).toBe("<p><em>bold</em></p>")
});

test("Convert to html with link", () => {
    const html = convertToHtml("[link](http://localhost)", true);
    expect(html).toBe("<p><a target='_blank' href=\"http://localhost\">link</a></p>")
});
