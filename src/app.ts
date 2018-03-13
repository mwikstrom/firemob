import * as firebase from "firebase/app";

export class FireMobApp {
    constructor()
    constructor(name: string)
    constructor(options: {}, name: string)
    constructor(optionsOrName?: {}, name?: string) {
        Private.map.set(this, new Private(optionsOrName, name));
    }
}

class Private {
    public static readonly map = new WeakMap<FireMobApp, Private>();
    public readonly base: firebase.app.App;

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
