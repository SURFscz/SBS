import {io} from "socket.io-client";
import {config} from "../api";

let initializedSocket = null;

export const socket = initializedSocket ? Promise.resolve(initializedSocket) :
    config().then(res => {
        initializedSocket = io(res.socket_url, {
            transports: ["websocket"],
            cors: {
                origin: `${window.location.protocol}//${window.location.host}/`,
            },
        });
        return initializedSocket;
    });

export const subscriptionIdCookieName = "subscription_id";
