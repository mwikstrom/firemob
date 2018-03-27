import * as firebase from "firebase/app";

import { Atom, when } from "mobx";

export abstract class FireMobSnapshotObject {
    constructor(priv: PrivateBase) {
        PrivateBase.map.set(this, priv);
    }

    public get isFetching() { return observe(this).isFetching; }

    public get isFromCache() { return observe(this).isFromCache; }

    public get hasPendingWrites() { return observe(this).hasPendingWrites; }

    public get hasError() { return observe(this).hasError; }

    public get errorCode() { return observe(this).errorCode; }

    public get changeNumber() { return observe(this).changeNumber; }

    public get syncNumber() { return observe(this).syncNumber; }

    public get isSubscriptionActive() { return privateOf(this).isSubscriptionActive; }

    public get lastSubscriptionActiveTime() { return privateOf(this).lastSubscriptionActiveTime; }

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

export abstract class PrivateBase<TSnapshot extends ISnapshot = ISnapshot> {
    public static map = new WeakMap<FireMobSnapshotObject, PrivateBase>();
    public readonly atom: Atom;
    public isFetching = false;
    public isFromCache = false;
    public hasPendingWrites = false;
    public hasError = false;
    public errorCode: firebase.firestore.FirestoreErrorCode | null = null;
    public changeNumber = 0;
    public syncNumber = 0;
    private isSubscriptionActiveFlag = false;
    private lastSubscriptionActiveTimeValue = 0;
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

    public get isSubscriptionActive() {
        return this.isSubscriptionActiveFlag;
    }

    public get lastSubscriptionActiveTime() {
        return this.lastSubscriptionActiveTimeValue;
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
        this.setSubscriptionActive(false);

        this.startSubscription();
    }

    protected startSubscription() {
        if (this.isSubscriptionActive) {
            return;
        }

        this.setSubscriptionActive(true);
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

        this.setSubscriptionActive(false);
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

    private setSubscriptionActive(flag: boolean) {
        if (flag !== this.isSubscriptionActiveFlag) {
            this.isSubscriptionActiveFlag = flag;
            if (!flag) {
                this.lastSubscriptionActiveTimeValue = new Date().getTime();
            }
        }
    }
}

export type Unsubscribe = () => void;

export interface ISnapshot {
    metadata: firebase.firestore.SnapshotMetadata;
}

const privateOf = (obj: FireMobSnapshotObject) =>
    PrivateBase.map.get(obj) as PrivateBase;

const observe = (obj: FireMobSnapshotObject) => {
    const priv = privateOf(obj);
    priv.atom.reportObserved();
    return priv;
};
