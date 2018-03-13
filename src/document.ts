import * as firebase from "firebase/app";
import "firebase/firestore";

import { Atom, when } from "mobx";

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

type Unsubscribe = () => void;

class Private {
    public static map = new WeakMap<FireMobDocument, Private>();
    public readonly atom: Atom;
    public hasData = false;
    public isFetching = false;
    public exists: boolean | null = null;
    public isFromCache = false;
    public hasPendingWrites = false;
    public hasError = false;
    public errorCode: firebase.firestore.FirestoreErrorCode | null = null;
    public data: firebase.firestore.DocumentData = {};
    public changeNumber = 0;
    public syncNumber = 0;
    private unsubscribe: Unsubscribe | null = null;
    private attachedQueries: firebase.firestore.Query[] = [];

    constructor(
        public readonly ref: firebase.firestore.DocumentReference,
    ) {
        this.atom = new Atom(
            "FireMobDocument@" + ref.path,
            this.onBecomeObserved,
            this.onBecomeUnobserved,
        );
    }

    public resume() {
        if (!this.unsubscribe || !this.hasError || this.attachedQueries.length > 0) {
            return;
        }

        this.hasError = false;
        this.isFetching = true;
        ++this.changeNumber;
        this.atom.reportChanged();

        this.unsubscribe();
        this.subscribe();
    }

    public populateFromQuery(query: firebase.firestore.Query, snapshot: firebase.firestore.DocumentSnapshot) {
        if (this.attachedQueries.indexOf(query) < 0) {
            this.attachedQueries.push(query);

            if (this.attachedQueries.length === 1 && this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
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
            this.subscribe();
        }
    }

    private subscribe() {
        const options: firebase.firestore.DocumentListenOptions = {
            includeMetadataChanges: true,
        };

        /* istanbul ignore else */
        if (!this.hasData) {
            this.isFetching = true;
        }

        this.unsubscribe = this.ref.onSnapshot(
            options,
            this.onSnapshot,
            this.onError,
        );
    }

    private onBecomeObserved = () => {
        if (this.attachedQueries.length > 0) {
            return;
        }

        this.subscribe();
    }

    private onBecomeUnobserved = () => {
        /* istanbul ignore else */
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    private onSnapshot = (snapshot: firebase.firestore.DocumentSnapshot) => {
        this.isFetching = false;
        this.hasData = this.exists = snapshot.exists;
        this.isFromCache = snapshot.metadata.fromCache;
        this.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        this.data = snapshot.data();
        this.hasError = false;
        this.errorCode = null;
        ++this.changeNumber;

        if (!this.hasPendingWrites && !this.isFromCache) {
            ++this.syncNumber;
        }

        this.atom.reportChanged();
    }

    private onError = (error: firebase.firestore.FirestoreError) => {
        this.isFetching = false;
        this.errorCode = error.code;
        this.hasError = true;
        ++this.changeNumber;
        ++this.syncNumber;
        this.atom.reportChanged();
    }
}
