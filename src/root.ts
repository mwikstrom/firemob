import * as firebase from "firebase/app";

import { IFireMobRoot, IFireMobAuth } from "./api";
import { FireMobAuth } from "./auth";

export const createFireMobRoot = (
    base: firebase.app.App = firebase.app()
): IFireMobRoot => {
    return new FireMobRoot(base);    
};

class FireMobRoot implements IFireMobRoot {
    public readonly auth: IFireMobAuth;

    constructor(base: firebase.app.App) {
        this.auth = new FireMobAuth(base.auth());
    }
}