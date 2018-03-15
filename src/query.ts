import * as firebase from "firebase/app";

import { detachDocumentFromQuery, FireMobDocument, populateDocumentFromQuery } from "./document";
import { FireMobSnapshotObject, PrivateBase } from "./snapshot";

export type FireMobDocumentFactory<TDocument extends FireMobDocument = FireMobDocument> = (
    ref: firebase.firestore.DocumentReference,
) => TDocument;

export class FireMobQuery<
    TRef extends firebase.firestore.Query = firebase.firestore.Query,
    TDocument extends FireMobDocument = FireMobDocument
> extends FireMobSnapshotObject {
    constructor(
        ref: TRef,
        factory: FireMobDocumentFactory<TDocument> = doc => new FireMobDocument(doc) as TDocument,
    ) {
        super(new Private(ref, factory));
    }

    public get ref() { return privateOf<TRef, TDocument>(this).ref; }

    public get hasResult() { return observe<TRef, TDocument>(this).hasResult; }

    public get length() { return observe<TRef, TDocument>(this).length; }

    public get(index: number) { return observe<TRef, TDocument>(this).docs[index]; }

    public map<TResult>(mapper: (doc: TDocument, index: number) => TResult) {
        const length = this.length;
        const result = new Array<TResult>(length);

        for (let index = 0; index < length; ++index) {
            const doc = this.get(index);
            result[index] = mapper(doc, index);
        }

        return result;
    }

    public endAt(...values: any[]) { return extend<TRef, TDocument>(this, ref => ref.endAt(...values)); }

    public endBefore(...values: any[]) { return extend<TRef, TDocument>(this, ref => ref.endBefore(...values)); }

    public limit(count: number) { return extend<TRef, TDocument>(this, ref => ref.limit(count)); }

    public orderBy(
        path: string | firebase.firestore.FieldPath,
        direction: firebase.firestore.OrderByDirection = "asc",
    ) {
        return extend<TRef, TDocument>(this, ref => ref.orderBy(path, direction));
    }

    public orderByDescending(
        path: string | firebase.firestore.FieldPath,
    ) {
        return this.orderBy(path, "desc");
    }

    public orderById(
        direction: firebase.firestore.OrderByDirection = "asc",
    ) {
        return this.orderBy(
            firebase.firestore.FieldPath.documentId(),
            direction,
        );
    }

    public orderByDescendingId() {
        return this.orderById("desc");
    }

    public startAfter(...values: any[]) { return extend<TRef, TDocument>(this, ref => ref.startAfter(...values)); }

    public startAt(...values: any[]) { return extend<TRef, TDocument>(this, ref => ref.startAt(...values)); }

    public where(
        path: string | firebase.firestore.FieldPath,
        op: firebase.firestore.WhereFilterOp,
        value: any,
    ) {
        return extend<TRef, TDocument>(this, ref => ref.where(path, op, value));
    }
}

const extend = <
    TRef extends firebase.firestore.Query,
    TDocument extends FireMobDocument
>(
    query: FireMobQuery<TRef, TDocument>,
    how: (ref: TRef) => firebase.firestore.Query,
) => {
    const priv = privateOf(query);
    return new FireMobQuery<firebase.firestore.Query, TDocument>(
        how(priv.ref),
        priv.factory,
    );
};

export const createDocument = <
    TDocument extends FireMobDocument
>(
    query: FireMobQuery<firebase.firestore.CollectionReference, TDocument>,
    path: string,
) => {
    const priv = privateOf(query);
    const ref = priv.ref.doc(path);
    return priv.factory(ref);
};

const privateOf = <
    TRef extends firebase.firestore.Query,
    TDocument extends FireMobDocument
>(
    query: FireMobQuery<TRef, TDocument>,
) => PrivateBase.map.get(query) as Private<TRef, TDocument>;

const observe = <
    TRef extends firebase.firestore.Query,
    TDocument extends FireMobDocument
>(
    query: FireMobQuery<TRef, TDocument>,
) => {
    const priv = privateOf(query);
    priv.atom.reportObserved();
    return priv;
};

class Private<
    TRef extends firebase.firestore.Query,
    TDocument extends FireMobDocument
> extends PrivateBase<firebase.firestore.QuerySnapshot> {
    public hasResult = false;
    public length = 0;
    public docs: TDocument[] = [];
    private resetOnSnapshot = false;

    constructor(
        public readonly ref: TRef,
        public readonly factory: FireMobDocumentFactory<TDocument>,
    ) {
        super(ref instanceof firebase.firestore.CollectionReference ? "FireMobCollection@" + ref.path : "FireMobQuery");
    }

    public resume() {
        if (this.hasError) {
            this.length = 0;
            this.docs = [];
            this.hasResult = false;
            ++this.changeNumber;
            this.atom.reportChanged();
        }

        super.resume();
    }

    protected startSubscription() {
        if (!this.isSubscriptionActive) {
            if (!this.hasResult) {
                this.isFetching = true;
            }

            this.resetOnSnapshot = true;
        }

        super.startSubscription();
    }

    protected stopSubscription() {
        this.detachAll();
        super.stopSubscription();
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
        if (this.resetOnSnapshot) {
            this.length = 0;
            this.docs = [];
            this.resetOnSnapshot = false;
        }

        this.hasResult = true;
        this.length = snapshot.size;

        snapshot.docChanges.forEach(change => {
            let doc: TDocument | null = null;
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
                }

                populateDocumentFromQuery(doc, this.ref, change.doc);

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
        this.detachAll();
        super.onError(error);
    }

    private detachAll() {
        this.docs.forEach(doc => {
            detachDocumentFromQuery(doc, this.ref);
        });
    }
}
