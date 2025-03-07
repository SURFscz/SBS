import React, {Fragment} from "react";
import "./TabularData.scss";
import I18n from "../locale/I18n";
import DOMPurify from "dompurify";
import {isEmpty} from "../utils/Utils";
import {dateColumns, requiredColumns} from "../utils/CSVParser";

export default function TabularData({headers = [], data = [], errors = [], showRequiredInfo = true}) {

    const errorTranslation = (row, error) => {
        const hasErrorTranslation = I18n.translations[I18n.locale].bulkUpload.errors[error.code];
        return I18n.t(`bulkUpload.errors.${hasErrorTranslation ? error.code : "Unknown"}`, {
            fields: requiredColumns.filter(field => isEmpty(row[field])).join(", "),
            invitee: error.invitee,
            shortName: error.shortName
        });
    }

    const displayHeader = header => {
        if (requiredColumns.includes(header)) {
            return header + "<sup class='required'>*</sup>";
        }
        return header;
    }

    const displayValue = (header, value) => {
        if (Array.isArray(value)) {
            return value.join(", ");
        }
        if (dateColumns.includes(header) && !isEmpty(value)) {
            const isoString = new Date(parseInt(value, 10) * 1000).toISOString();
            return isoString.substring(0, 10);
        }
        return value || "";
    }

    return (
        <div className="tabular-data">
            <table>
                <thead>
                <tr>
                    {headers.map((header, index) =>
                        <th key={index}
                            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(displayHeader(header))}}/>
                    )}
                </tr>
                </thead>
                <tbody>
                {data.map((row, index) => <Fragment key={index}>
                    <tr>
                        {headers.map((header, innerIndex) =>
                            <td key={innerIndex}
                                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(displayValue(header, row[header]))}}/>
                        )}
                    </tr>
                    {errors.some(error => error.row === index) &&
                        <tr>
                            <td className="error" colSpan={headers.length}>
                                {errorTranslation(row, errors.find(error => error.row === index))}
                            </td>
                        </tr>}
                </Fragment>)}
                </tbody>
            </table>
            {showRequiredInfo &&
                <p className="info"><sup className='required'>*</sup><em>{I18n.t("bulkUpload.requiredInfo")}</em></p>}
        </div>
    );

}

