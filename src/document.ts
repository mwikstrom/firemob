import * as firebase from "firebase/app";

import { FireMobCollection } from "./collection";
import { FireMobDataObject, PrivateBase } from "./state";

export interface IFireMobDocumentClass<TDocument extends FireMobDocument> {
    new(ref: firebase.firestore.DocumentReference): TDocument;
}

export class FireMobDocument extends FireMobDataObject {
    constructor(
        ref: firebase.firestore.DocumentReference,
    ) {
        super(new Private(ref));
    }

    public get ref() { return privateOf(this).ref; }

    public get id() { return this.ref.id; }

    public get hasData() { return observe(this).hasData; }

    public get exists() { return observe(this).exists; }

    public get data() { return observe(this).data; }

    public get(field: string) { return this.data[field]; }

    public get isSubscriptionActive() {
        return super.isSubscriptionActive || privateOf(this).attachedQueries.length > 0;
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
        const ref = this.ref.collection(path);

        return new FireMobCollection(ref, factory);
    }
}

export const populateDocumentFromQuery = (
    doc: FireMobDocument,
    query: firebase.firestore.Query,
    snapshot: firebase.firestore.DocumentSnapshot,
) => {
    privateOf(doc).populateFromQuery(query, snapshot);
};

export const detachDocumentFromQuery = (
    doc: FireMobDocument,
    query: firebase.firestore.Query,
) => {
    privateOf(doc).detachFromQuery(query);
};

const privateOf = (doc: FireMobDocument): Private => PrivateBase.map.get(doc) as Private;

const observe = (doc: FireMobDocument) => {
    const priv = privateOf(doc);
    priv.atom.reportObserved();
    return priv;
};

class Private extends PrivateBase<firebase.firestore.DocumentSnapshot> {
    public hasData = false;
    public exists: boolean | null = null;
    public data: firebase.firestore.DocumentData = {};
    public attachedQueries: firebase.firestore.Query[] = [];

    constructor(
        public readonly ref: firebase.firestore.DocumentReference,
    ) {
        super("FireMobDocument@" + ref.path);
    }

    public populateFromQuery(query: firebase.firestore.Query, snapshot: firebase.firestore.DocumentSnapshot) {
        if (this.attachedQueries.indexOf(query) < 0) {
            this.attachedQueries.push(query);

            if (this.attachedQueries.length === 1) {
                this.stopSubscription();
            }
        }

        this.onSnapshot(snapshot);
    }

    public detachFromQuery(query: firebase.firestore.Query) {
        if (this.attachedQueries.length === 0) {
            return;
        }

        this.attachedQueries = this.attachedQueries.filter(it => it !== query);

        if (this.attachedQueries.length === 0 && this.atom.isBeingTracked) {
            this.startSubscription();
        }
    }

    public resume() {
        if (this.attachedQueries.length > 0) {
            return;
        }

        super.resume();
    }

    protected startSubscription() {
        if (!this.hasData) {
            this.isFetching = true;
        }

        super.startSubscription();
    }

    protected createSubscription(
        onSnapshot: (snapshot: firebase.firestore.DocumentSnapshot) => void,
        onError: (error: firebase.firestore.FirestoreError) => void,
    ) {
        const options: firebase.firestore.DocumentListenOptions = {
            includeMetadataChanges: true,
        };

        return this.ref.onSnapshot(
            options,
            onSnapshot,
            onError,
        );
    }

    protected onBecomeObserved() {
        if (this.attachedQueries.length > 0) {
            return;
        }

        super.onBecomeObserved();
    }

    protected onSnapshot(snapshot: firebase.firestore.DocumentSnapshot) {
        this.hasData = this.exists = snapshot.exists;
        this.data = snapshot.data();
        super.onSnapshot(snapshot);
    }
}
