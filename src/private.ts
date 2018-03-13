import * as firebase from "firebase/app";

import { Atom } from "mobx";

export abstract class PrivateBase<TSnapshot extends ISnapshot> {
    public readonly atom: Atom;
    public isFetching = false;
    public isFromCache = false;
    public hasPendingWrites = false;
    public hasError = false;
    public errorCode: firebase.firestore.FirestoreErrorCode | null = null;
    public changeNumber = 0;
    public syncNumber = 0;
    private unsubscribe: Unsubscribe | null = null;

    constructor(
        name: string,
    ) {
        this.atom = new Atom(
            name,
            this.onBecomeObserved.bind(this),
            this.onBecomeUnobserved.bind(this),
        );
    }

    public resume() {
        if (!this.unsubscribe || !this.hasError) {
            return;
        }

        this.hasError = false;
        this.isFetching = true;
        ++this.changeNumber;
        this.atom.reportChanged();

        this.unsubscribe();
        this.startSubscription();
    }

    protected startSubscription() {
        this.stopSubscription();
        this.unsubscribe = this.createSubscription(
            this.onSnapshot.bind(this),
            this.onError.bind(this),
        );
    }

    protected abstract createSubscription(
        onSnapshot: (snapshot: TSnapshot) => void,
        onError: (error: firebase.firestore.FirestoreError) => void,
    ): Unsubscribe;

    protected stopSubscription() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    protected onBecomeObserved() {
        this.startSubscription();
    }

    protected onBecomeUnobserved() {
        this.stopSubscription();
    }

    protected onSnapshot(snapshot: TSnapshot) {
        this.isFetching = false;
        this.isFromCache = snapshot.metadata.fromCache;
        this.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        this.hasError = false;
        this.errorCode = null;
        ++this.changeNumber;

        if (!this.hasPendingWrites && !this.isFromCache) {
            ++this.syncNumber;
        }

        this.atom.reportChanged();
    }

    protected onError(error: firebase.firestore.FirestoreError) {
        this.isFetching = false;
        this.errorCode = error.code;
        this.hasError = true;
        ++this.changeNumber;
        ++this.syncNumber;
        this.atom.reportChanged();
    }
}

export type Unsubscribe = () => void;

export interface ISnapshot {
    metadata: firebase.firestore.SnapshotMetadata;
}
