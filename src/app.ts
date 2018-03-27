import * as firebase from "firebase/app";

import { FireMobAuth } from "./auth";
import { DocumentCache } from "./cache";
import { FireMobCollection } from "./collection";
import { FireMobDocument, IFireMobDocumentClass } from "./document";
import { FireMobQuery } from "./query";

export class FireMobApp {
    public static for(
        thing:
            FireMobAuth |
            FireMobQuery |
            FireMobDocument |
            firebase.firestore.Query |
            firebase.firestore.DocumentReference,
    ): FireMobApp | null {
        const base =
            thing instanceof FireMobDocument ? thing.ref.firestore.app :
            thing instanceof FireMobCollection ? thing.ref.firestore.app :
            thing instanceof FireMobAuth ? thing.base.app :
            thing instanceof FireMobQuery ? (thing.ref as firebase.firestore.Query).firestore.app :
            thing instanceof firebase.firestore.Query ? thing.firestore.app :
            thing instanceof firebase.firestore.DocumentReference ? thing.firestore.app :
            null;

        return base && appMap.has(base) ? appMap.get(base)! : null;
    }

    constructor(name?: string)
    constructor(options: {}, name?: string)
    constructor(optionsOrName?: {}, name?: string) {
        const priv = new Private(optionsOrName, name);
        Private.map.set(this, priv);
        appMap.set(priv.base, this);
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

    public doc(pathOrRef: string | firebase.firestore.DocumentReference): FireMobDocument;
    public doc<TDocument extends FireMobDocument>(
        pathOrRef: string | firebase.firestore.DocumentReference,
        documentClass: IFireMobDocumentClass<TDocument>,
    ): TDocument;
    public doc<TDocument extends FireMobDocument>(
        pathOrRef: string | firebase.firestore.DocumentReference,
        documentClass?: IFireMobDocumentClass<TDocument>,
    ) {
        if (!documentClass) {
            documentClass = FireMobDocument as IFireMobDocumentClass<TDocument>;
        }

        const priv = Private.map.get(this)!;
        const ref = typeof pathOrRef === "string" ? priv.base.firestore().doc(pathOrRef) : pathOrRef;
        const cache = DocumentCache.for(documentClass);

        return cache.get(ref);
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

        const priv = Private.map.get(this)!;
        const ref = priv.base.firestore().collection(path);

        return new FireMobCollection(ref, documentClass);
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
