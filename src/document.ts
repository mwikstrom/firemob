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

    public async reset() {
        observe(this).reset();
        await this.whenNotFetching;
    }
}

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

    constructor(
        public readonly ref: firebase.firestore.DocumentReference,
    ) {
        this.atom = new Atom(
            "FireMobDocument@" + ref.path,
            this.onBecomeObserved,
            this.onBecomeUnobserved
        );
    }

    public reset() {
        if (this.unsubscribe && this.hasError) {
            const options: firebase.firestore.DocumentListenOptions = {
                includeMetadataChanges: true,            
            };        

            this.hasError = false;
            this.isFetching = true;
            ++this.changeNumber;
            this.atom.reportChanged();

            this.unsubscribe();
            this.unsubscribe = this.ref.onSnapshot(
                options,
                this.onSnapshot,
                this.onError
            );
        }
    }

    private onBecomeObserved = () => {
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
            this.onError
        );
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
