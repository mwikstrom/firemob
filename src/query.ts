import * as firebase from "firebase/app";
import "firebase/firestore";

import { Atom, when } from "mobx";
import { detachDocumentFromQuery, FireMobDocument, populateDocumentFromQuery } from "./document";

export type FireMobDocumentFactory = (ref: firebase.firestore.DocumentReference) => FireMobDocument;

export class FireMobQuery<TRef extends firebase.firestore.Query = firebase.firestore.Query> {
    constructor(
        ref: TRef,
        factory: FireMobDocumentFactory = doc => new FireMobDocument(doc),
    ) {
        Private.map.set(this, new Private(ref, factory));
    }

    public get ref() { return Private.map.get(this)!.ref as TRef; }

    public get hasResult() { return observe(this).hasResult; }

    public get size() { return observe(this).size; }

    public get isFetching() { return observe(this).isFetching; }

    public get isFromCache() { return observe(this).isFromCache; }

    public get hasPendingWrites() { return observe(this).hasPendingWrites; }

    public get hasError() { return observe(this).hasError; }

    public get errorCode() { return observe(this).errorCode; }

    public get changeNumber() { return observe(this).changeNumber; }

    public get syncNumber() { return observe(this).syncNumber; }

    public get(index: number) { return observe(this).docs[index]; }

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
    const priv = Private.map.get(query)!;
    return new FireMobQuery(
        how(priv.ref),
        priv.factory,
    );
};

const observe = (doc: FireMobQuery) => {
    const priv = Private.map.get(doc)!;
    priv.atom.reportObserved();
    return priv;
};

type Unsubscribe = () => void;

class Private {
    public static map = new WeakMap<FireMobQuery, Private>();
    public readonly atom: Atom;
    public hasResult = false;
    public size = 0;
    public isFetching = false;
    public isFromCache = false;
    public hasPendingWrites = false;
    public hasError = false;
    public errorCode: firebase.firestore.FirestoreErrorCode | null = null;
    public changeNumber = 0;
    public syncNumber = 0;
    public docs: FireMobDocument[] = [];
    private unsubscribe: Unsubscribe | null = null;

    constructor(
        public readonly ref: firebase.firestore.Query,
        public readonly factory: FireMobDocumentFactory,
    ) {
        this.atom = new Atom(
            ref instanceof firebase.firestore.CollectionReference ? "FireMobCollection@" + ref.path : "FireMobQuery",
            this.onBecomeObserved,
            this.onBecomeUnobserved,
        );
    }

    public resume() {
        if (this.unsubscribe && this.hasError) {
            const options: firebase.firestore.QueryListenOptions = {
                includeDocumentMetadataChanges: true,
                includeQueryMetadataChanges: true,
            };

            this.hasError = false;
            this.size = 0;
            this.docs = [];
            this.isFetching = true;
            ++this.changeNumber;
            this.atom.reportChanged();

            this.unsubscribe();
            this.unsubscribe = this.ref.onSnapshot(
                options,
                this.onSnapshot,
                this.onError,
            );
        }
    }

    private onBecomeObserved = () => {
        const options: firebase.firestore.QueryListenOptions = {
            includeDocumentMetadataChanges: true,
            includeQueryMetadataChanges: true,
        };

        /* istanbul ignore else */
        if (!this.hasResult) {
            this.isFetching = true;
        }

        this.unsubscribe = this.ref.onSnapshot(
            options,
            this.onSnapshot,
            this.onError,
        );
    }

    private onBecomeUnobserved = () => {
        /* istanbul ignore else */
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    private onSnapshot = (snapshot: firebase.firestore.QuerySnapshot) => {
        this.isFetching = false;
        this.hasResult = true;
        this.size = snapshot.size;
        this.isFromCache = snapshot.metadata.fromCache;
        this.hasPendingWrites = snapshot.metadata.hasPendingWrites;
        this.hasError = false;
        this.errorCode = null;

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

        this.docs.forEach(doc => {
            detachDocumentFromQuery(doc, this.ref);
        });

        this.atom.reportChanged();
    }
}
