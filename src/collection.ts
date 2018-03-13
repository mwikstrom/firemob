import * as firebase from "firebase/app";

import { FireMobDocumentFactory, FireMobQuery } from "./query";

export class FireMobCollection extends FireMobQuery<firebase.firestore.CollectionReference> {
    constructor(
        ref: firebase.firestore.CollectionReference,
        factory?: FireMobDocumentFactory,
    ) {
        super(ref, factory);
    }

    public get id() { return this.ref.id; }
}
