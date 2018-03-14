import * as firebase from "firebase/app";

import { FireMobAuth } from "./auth";
import { FireMobCollection } from "./collection";
import { FireMobDocument, IFireMobDocumentClass } from "./document";
import { FireMobQuery } from ".";

export class FireMobApp {
    constructor(name?: string)
    constructor(options: {}, name?: string)
    constructor(optionsOrName?: {}, name?: string) {
        const priv = new Private(optionsOrName, name);
        Private.map.set(this, priv);
        appMap.set(priv.base, this);
    }

    public static for(doc: FireMobDocument): FireMobApp | null;
    public static for(collection: FireMobCollection): FireMobApp | null;
    public static for(auth: FireMobAuth): FireMobApp | null;
    public static for(query: FireMobQuery): FireMobApp | null;
    public static for(thing: any): FireMobApp | null {
        const base = 
            thing instanceof FireMobDocument ? thing.ref.firestore.app :
            thing instanceof FireMobCollection ? thing.ref.firestore.app :
            thing instanceof FireMobAuth ? thing.base.app :
            thing instanceof FireMobQuery ? (thing.ref as firebase.firestore.Query).firestore.app :
            null;

        return base && appMap.has(base) ? appMap.get(base)! : null;
    }

    public get auth() {
        const priv = Private.map.get(this)!;

        if (!priv.auth) {
            priv.auth = new FireMobAuth(priv.base.auth());
        }

        return priv.auth;
    }

    public get base() {
        return Private.map.get(this)!.base;
    }

    public get name() {
        return Private.map.get(this)!.base.name;
    }

    public async dispose() {
        return Private.map.get(this)!.base.delete();
    }

    public doc(path: string): FireMobDocument;
    public doc<TDocument extends FireMobDocument>(
        path: string,
        documentClass: IFireMobDocumentClass<TDocument>,
    ): TDocument;
    public doc<TDocument extends FireMobDocument>(
        path: string,
        documentClass?: IFireMobDocumentClass<TDocument>,
    ) {
        if (!documentClass) {
            documentClass = FireMobDocument as IFireMobDocumentClass<TDocument>;
        }

        const priv = Private.map.get(this)!;
        const ref = priv.base.firestore().doc(path);

        return new documentClass(ref);
    }

    public collection(path: string): FireMobCollection;
    public collection<TDocument extends FireMobDocument>(
        path: string,
        documentClass: IFireMobDocumentClass<TDocument>,
    ): FireMobCollection<TDocument>;
    public collection<TDocument extends FireMobDocument>(
        path: string,
        documentClass?: IFireMobDocumentClass<TDocument>,
    ) {
        if (!documentClass) {
            documentClass = FireMobDocument as IFireMobDocumentClass<TDocument>;
        }

        const factory = (arg: firebase.firestore.DocumentReference) => new documentClass!(arg);
        const priv = Private.map.get(this)!;
        const ref = priv.base.firestore().collection(path);

        return new FireMobCollection(ref, factory);
    }
}

const appMap = new WeakMap<firebase.app.App, FireMobApp>();

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
