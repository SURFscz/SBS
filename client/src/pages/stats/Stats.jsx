import React, {PureComponent, useEffect, useState} from "react";
import "./Stats.scss";
import "../../components/_redesign/SpinnerField.scss";
import {addMissingDateEntries, transformToRechartsData} from "../../utils/Stats";
import {Loader} from "@surfnet/sds";
import I18n from "../../locale/I18n";
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {allStats} from "../../api";

class CustomizedAxisTick extends PureComponent {
  render() {
    const { x, y, payload } = this.props;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)">
          {payload.value}
        </text>
      </g>
    );
  }
}

export default function Stats() {

    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        allStats().then(res => {
            setStatistics(transformToRechartsData(addMissingDateEntries(res)));
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <Loader>
                <span>{I18n.t("system.stats.loading")}</span>
            </Loader>
        );
    }

    return (
        <div className={"mod-stats-container"}>
            <ResponsiveContainer width='95%' aspect={4.0 / 3.0}>
                <LineChart data={statistics}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="name" height={60} tick={<CustomizedAxisTick />} />/>
                    <YAxis/>
                    <Tooltip/>
                    <Legend/>
                    <Line type="monotone" dataKey="collaborations" stroke="#006d77"/>
                    <Line type="monotone" dataKey="collaboration_memberships" stroke="#008939"/>
                    <Line type="monotone" dataKey="organisation_memberships" stroke="#ffc300"/>
                    <Line type="monotone" dataKey="services" stroke="#0077C8"/>
                    <Line type="monotone" dataKey="service_memberships" stroke="#0a9396"/>
                    <Line type="monotone" dataKey="groups" stroke="#ee9b00"/>
                    <Line type="monotone" dataKey="users" stroke="#669bbc"/>
                    <Line type="monotone" dataKey="organisations" stroke="#f72585"/>
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
