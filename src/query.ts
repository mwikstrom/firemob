import * as firebase from "firebase/app";

import { detachDocumentFromQuery, FireMobDocument, populateDocumentFromQuery } from "./document";
import { FireMobDataObject, PrivateBase } from "./state";

export type FireMobDocumentFactory = (ref: firebase.firestore.DocumentReference) => FireMobDocument;

export class FireMobQuery<TRef extends firebase.firestore.Query = firebase.firestore.Query> extends FireMobDataObject {
    constructor(
        ref: TRef,
        factory: FireMobDocumentFactory = doc => new FireMobDocument(doc),
    ) {
        super(new Private(ref, factory));
    }

    public get ref() { return privateOf(this).ref as TRef; }

    public get hasResult() { return observe(this).hasResult; }

    public get size() { return observe(this).size; }

    public get(index: number) { return observe(this).docs[index]; }

    public endAt(...values: any[]) { return extend(this, ref => ref.endAt(...values)); }

    public endBefore(...values: any[]) { return extend(this, ref => ref.endBefore(...values)); }

    public limit(count: number) { return extend(this, ref => ref.limit(count)); }

    public orderBy(
        path: string | firebase.firestore.FieldPath,
        direction: firebase.firestore.OrderByDirection = "asc",
    ) {
        return extend(this, ref => ref.orderBy(path, direction));
    }

    public orderByDescending(
        path: string | firebase.firestore.FieldPath,
    ) {
        return this.orderBy(path, "desc");
    }

    public startAfter(...values: any[]) { return extend(this, ref => ref.startAfter(...values)); }

    public startAt(...values: any[]) { return extend(this, ref => ref.startAt(...values)); }

    public where(
        path: string | firebase.firestore.FieldPath,
        op: firebase.firestore.WhereFilterOp,
        value: any,
    ) {
        return extend(this, ref => ref.where(path, op, value));
    }
}

const extend = (query: FireMobQuery, how: (ref: firebase.firestore.Query) => firebase.firestore.Query) => {
    const priv = privateOf(query);
    return new FireMobQuery(
        how(priv.ref),
        priv.factory,
    );
};

const privateOf = (query: FireMobQuery) =>
    PrivateBase.map.get(query) as Private;

const observe = (query: FireMobQuery) => {
    const priv = privateOf(query);
    priv.atom.reportObserved();
    return priv;
};

class Private extends PrivateBase<firebase.firestore.QuerySnapshot> {
    public hasResult = false;
    public size = 0;
    public docs: FireMobDocument[] = [];

    constructor(
        public readonly ref: firebase.firestore.Query,
        public readonly factory: FireMobDocumentFactory,
    ) {
        super(ref instanceof firebase.firestore.CollectionReference ? "FireMobCollection@" + ref.path : "FireMobQuery");
    }

    public resume() {
        if (this.hasError) {
            this.size = 0;
            this.docs = [];
            this.hasResult = false;
            ++this.changeNumber;
            this.atom.reportChanged();
        }

        super.resume();
    }

    protected startSubscription() {
        if (!this.hasResult) {
            this.isFetching = true;
        }

        super.startSubscription();
    }

    protected createSubscription(
        onSnapshot: (snapshot: firebase.firestore.QuerySnapshot) => void,
        onError: (error: firebase.firestore.FirestoreError) => void,
    ) {
        const options: firebase.firestore.QueryListenOptions = {
            includeDocumentMetadataChanges: true,
            includeQueryMetadataChanges: true,
        };

        return this.ref.onSnapshot(
            options,
            onSnapshot,
            onError,
        );
    }

    protected onSnapshot(snapshot: firebase.firestore.QuerySnapshot) {
        this.hasResult = true;
        this.size = snapshot.size;

        snapshot.docChanges.forEach(change => {
            let doc: FireMobDocument | null = null;
            const keepPosition = change.oldIndex === change.newIndex;

            if (change.oldIndex >= 0) {
                doc = this.docs[change.oldIndex];

                if (!keepPosition) {
                    this.docs.splice(change.oldIndex, 1);
                }
            }

            if (change.newIndex >= 0) {
                if (!doc) {
                    doc = this.factory(change.doc.ref);
                    populateDocumentFromQuery(doc, this.ref, change.doc);
                }

                if (!keepPosition) {
                    this.docs.splice(change.newIndex, 0, doc!);
                }
            } else {
                detachDocumentFromQuery(doc!, this.ref);
            }

            ++this.changeNumber;
        });

        super.onSnapshot(snapshot);
    }

    protected onError(error: firebase.firestore.FirestoreError) {
        this.docs.forEach(doc => {
            detachDocumentFromQuery(doc, this.ref);
        });

        super.onError(error);
    }
}
