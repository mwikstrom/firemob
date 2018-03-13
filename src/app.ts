import * as firebase from "firebase/app";

import { FireMobAuth } from "./auth";

export class FireMobApp {
    constructor(name?: string)
    constructor(options: {}, name: string)
    constructor(optionsOrName?: {}, name?: string) {
        Private.map.set(this, new Private(optionsOrName, name));
    }

    public get auth() {
        const priv = Private.map.get(this)!;

        if (!priv.auth) {
            priv.auth = new FireMobAuth(priv.base.auth());
        }

        return priv.auth;
    }

    public get name() {
        return Private.map.get(this)!.base.name;
    }
}

class Private {
    public static readonly map = new WeakMap<FireMobApp, Private>();
    public readonly base: firebase.app.App;
    public auth: FireMobAuth;

    constructor(
        optionsOrName?: {},
        name?: string,
    ) {
        if (typeof optionsOrName === "object") {
            this.base = firebase.initializeApp(optionsOrName, name);
        } else if (typeof optionsOrName === "string") {
            this.base = firebase.app(optionsOrName);
        } else {
            this.base = firebase.app();
        }
    }
}
