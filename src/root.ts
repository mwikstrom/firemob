import * as firebase from "firebase/app";

import { IFireMobAuth, IFireMobRoot } from "./api";
import { FireMobAuth } from "./auth";
import { FireMobCollection } from "./collection";
import { FireMobCollectionSource } from "./source";

export const createFireMobRoot = (
    base: firebase.app.App = firebase.app(),
): IFireMobRoot => {
    return new FireMobRoot(base);
};

class FireMobRoot extends FireMobCollectionSource implements IFireMobRoot {
    public readonly auth: IFireMobAuth;

    constructor(base: firebase.app.App) {
        super();
        this.auth = new FireMobAuth(base.auth());
    }

    protected createCollection<TData extends {}>(name: string) {
        return new FireMobCollection<TData>(this, name);
    }
}
