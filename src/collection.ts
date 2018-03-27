import * as firebase from "firebase/app";

import { FireMobDocument, IFireMobDocumentClass } from "./document";
import { createDocument, FireMobQuery } from "./query";

export class FireMobCollection<
    TDocument extends FireMobDocument = FireMobDocument
> extends FireMobQuery<firebase.firestore.CollectionReference, TDocument> {
    constructor(
        ref: firebase.firestore.CollectionReference,
        documentClass: IFireMobDocumentClass<TDocument>,
    ) {
        super(ref, documentClass);
    }

    public get id() { return this.ref.id; }

    public doc(path: string) { return createDocument(this, path); }
}
