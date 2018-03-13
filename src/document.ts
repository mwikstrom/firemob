import * as firebase from "firebase/app";

import { when } from "mobx";

import { PrivateBase } from "./private";

export class FireMobDocument {
    constructor(
        ref: firebase.firestore.DocumentReference,
    ) {
        Private.map.set(this, new Private(ref));
    }

    public get ref() { return Private.map.get(this)!.ref; }

    public get id() { return this.ref.id; }

    public get hasData() { return observe(this).hasData; }

    public get isFetching() { return observe(this).isFetching; }

    public get exists() { return observe(this).exists; }

    public get isFromCache() { return observe(this).isFromCache; }

    public get hasPendingWrites() { return observe(this).hasPendingWrites; }

    public get hasError() { return observe(this).hasError; }

    public get errorCode() { return observe(this).errorCode; }

    public get data() { return observe(this).data; }

    public get changeNumber() { return observe(this).changeNumber; }

    public get syncNumber() { return observe(this).syncNumber; }

    public get(field: string) { return this.data[field]; }

    public get whenNotFetching() {
        return new Promise(resolve => {
            when(() => !this.isFetching, resolve);
        });
    }

    public get nextChange() {
        const before = this.changeNumber;
        return new Promise(resolve => {
            when(() => this.changeNumber !== before, resolve);
        });
    }

    public get nextSync() {
        const before = this.syncNumber;
        return new Promise(resolve => {
            when(() => this.syncNumber !== before, resolve);
        });
    }

    public async resume() {
        observe(this).resume();
        await this.whenNotFetching;
    }
}

export const populateDocumentFromQuery = (
    doc: FireMobDocument,
    query: firebase.firestore.Query,
    snapshot: firebase.firestore.DocumentSnapshot,
) => {
    const priv = Private.map.get(doc)!;
    priv.populateFromQuery(query, snapshot);
};

export const detachDocumentFromQuery = (
    doc: FireMobDocument,
    query: firebase.firestore.Query,
) => {
    const priv = Private.map.get(doc)!;
    priv.detachFromQuery(query);
};

const observe = (doc: FireMobDocument) => {
    const priv = Private.map.get(doc)!;
    priv.atom.reportObserved();
    return priv;
};

class Private extends PrivateBase<firebase.firestore.DocumentSnapshot> {
    public static map = new WeakMap<FireMobDocument, Private>();
    public hasData = false;
    public exists: boolean | null = null;
    public data: firebase.firestore.DocumentData = {};
    private attachedQueries: firebase.firestore.Query[] = [];

    constructor(
        public readonly ref: firebase.firestore.DocumentReference,
    ) {
        super("FireMobDocument@" + ref.path);
    }

    public resume() {
        if (this.attachedQueries.length > 0) {
            return;
        }

        super.resume();
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
