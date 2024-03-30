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

export const SUBSCRIPTION_ID_COOKIE_NAME = "subscription_id";

export const JOIN_REQUEST_TYPE = "joinRequest";
export const COLLABORATION_REQUEST_TYPE = "collaborationRequest";
export const SERVICE_REQUEST_TYPE = "serviceRequest";
export const SERVICE_CONNECTION_REQUEST_TYPE = "serviceConnectionRequest";