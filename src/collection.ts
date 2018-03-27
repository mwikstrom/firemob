import * as firebase from "firebase/app";

import { FireMobDocument } from "./document";
import { createDocument, FireMobDocumentFactory, FireMobQuery } from "./query";

export class FireMobCollection<
    TDocument extends FireMobDocument = FireMobDocument
> extends FireMobQuery<firebase.firestore.CollectionReference, TDocument> {
    constructor(
        ref: firebase.firestore.CollectionReference,
        factory: FireMobDocumentFactory<TDocument> = doc => new FireMobDocument(doc) as TDocument,
    ) {
        super(ref, factory);
    }

    public get id() { return this.ref.id; }

    public doc(path: string) { return createDocument(this, path); }
}
