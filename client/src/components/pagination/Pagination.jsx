import {pageCount, pagination} from "../../utils/Pagination";
import {ReactComponent as ChevronRight} from "../../icons/chevron-right.svg";
import {ReactComponent as ChevronLeft} from "../../icons/chevron-left.svg";
import "./Pagination.scss";

export default function Pagination({currentPage, onChange, total}) {

    const nbrPages = Math.ceil(total / pageCount);
    const rangeWithDots = pagination(currentPage, nbrPages);

    if (total <= pageCount) {
        return null;
    }

    const ranges = (nbr, index) => {
        const key = `${nbr}_${index}}}`;
        if (typeof nbr === "string" || nbr instanceof String) {
            return <span key={key} className="link dots">{nbr}</span>
        } else if (nbr === currentPage) {
            return <span key={key} className="link current">{nbr}</span>
        } else {
            return <span key={key} className="link" onClick={() => onChange(nbr)}>{nbr}</span>
        }
    }

    return (
        <section className="pagination">
            <section className="pagination-container">
                {(nbrPages > 1 && currentPage !== 1) &&
                <span className="link chevron" onClick={() => onChange(currentPage - 1)}
                      title="Previous page"
                      aria-label="Previous page">
                    <ChevronLeft/>
                </span>}
                {rangeWithDots.map((nbr, index) => ranges(nbr, index))}
                {(nbrPages > 1 && currentPage !== nbrPages) &&
                <span className="link chevron" onClick={() => onChange(currentPage + 1)} title="Next page"
                      aria-label="Next page">
                    <ChevronRight/>
                </span>}
            </section>
        </section>

    )
}
