import { io } from "socket.io-client";

export const socket = io("127.0.0.1:8080/", {
                            transports: ["websocket"],
                            cors: {
                                origin: `${window.location.protocol}//${window.location.host}${window.location.port}/`,
                            },
                        });
