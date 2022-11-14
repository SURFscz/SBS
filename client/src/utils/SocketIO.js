let initializedSocket = null;

export const socket = initializedSocket ? Promise.resolve(initializedSocket) : Promise.resolve({on: () => true})
export const subscriptionIdCookieName = "subscription_id";
