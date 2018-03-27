import * as firebase from "firebase/app";

import { FireMobCollection } from "./collection";
import { FireMobSnapshotObject, PrivateBase } from "./snapshot";

export interface IFireMobDocumentClass<TDocument extends FireMobDocument> {
    new(ref: firebase.firestore.DocumentReference): TDocument;
}

export class FireMobDocument<TData extends {} = firebase.firestore.DocumentData> extends FireMobSnapshotObject {
    constructor(
        ref: firebase.firestore.DocumentReference,
    ) {
        super(new Private<TData>(ref));
    }

    public get ref() { return privateOf<TData>(this).ref; }

    public get id() { return this.ref.id; }

    public get hasData() { return observe<TData>(this).hasData; }

    public get exists() { return observe<TData>(this).exists; }

    public get data() { return observe<TData>(this).data; }

    public get<TField extends keyof TData>(field: TField) {
        const data = this.data;
        return !!data ? data[field] : undefined;
    }

    public get isSubscriptionActive() {
        return super.isSubscriptionActive || privateOf<TData>(this).attachedQueries.length > 0;
    }

    public get lastSubscriptionActiveTime() {
        return Math.max(super.lastSubscriptionActiveTime, privateOf<TData>(this).lastFullyDetachedTime);
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

        const ref = this.ref.collection(path);

        return new FireMobCollection(ref, documentClass);
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

const privateOf = <TData extends {}>(doc: FireMobDocument<TData>): Private<TData> =>
    PrivateBase.map.get(doc) as Private<TData>;

const observe = <TData extends {}>(doc: FireMobDocument<TData>) => {
    const priv = privateOf<TData>(doc);
    priv.atom.reportObserved();
    return priv;
};

class Private<TData extends {}> extends PrivateBase<firebase.firestore.DocumentSnapshot> {
    public hasData = false;
    public exists: boolean | null = null;
    public data: TData | null = null;
    public attachedQueries: firebase.firestore.Query[] = [];
    public lastFullyDetachedTime = 0;

    constructor(
        public readonly ref: firebase.firestore.DocumentReference,
    ) {
        super("FireMobDocument@" + ref.path);
    }

    public populateFromQuery(query: firebase.firestore.Query, snapshot: firebase.firestore.DocumentSnapshot) {
        if (this.attachedQueries.indexOf(query) < 0) {
            this.attachedQueries.push(query);

            if (this.attachedQueries.length === 1 && this.isSubscriptionActive) {
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

        if (this.attachedQueries.length === 0) {
            this.lastFullyDetachedTime = new Date().getTime();
        }

        if (this.attachedQueries.length === 0 && this.atom.isBeingTracked && !this.isSubscriptionActive) {
            this.startSubscription();
            ++this.changeNumber;
            this.atom.reportChanged();
        }
    }

    public resume() {
        if (this.attachedQueries.length > 0) {
            return;
        }

        super.resume();
    }

    protected startSubscription() {
        if (!this.hasData && !this.isSubscriptionActive) {
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

        const unsubscribe = this.ref.onSnapshot(
            options,
            onSnapshot,
            onError,
        );

        return unsubscribe;
    }

    protected onBecomeObserved() {
        if (this.attachedQueries.length > 0) {
            return;
        }

        super.onBecomeObserved();
    }

    protected onSnapshot(snapshot: firebase.firestore.DocumentSnapshot) {
        this.hasData = this.exists = snapshot.exists;
        this.data = snapshot.data() as TData;
        super.onSnapshot(snapshot);
    }

    protected onError(error: firebase.firestore.FirestoreError) {
        /* tslint:disable-next-line */
        console.error("[firemob] document subscription error " + error.code + ": " + error.message);
        super.onError(error);
    }
}
