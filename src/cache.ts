import { firestore } from "firebase/app";

import { FireMobDocument, IFireMobDocumentClass } from "./document";

export class DocumentCache<TDocument extends FireMobDocument> {
    public static for<TLookup extends FireMobDocument>(documentClass: IFireMobDocumentClass<TLookup>) {
        if (!DocumentCache.map.has(documentClass)) {
            DocumentCache.map.set(documentClass, new DocumentCache(documentClass));
        }

        return DocumentCache.map.get(documentClass) as DocumentCache<TLookup>;
    }

    private static readonly map = new WeakMap<IFireMobDocumentClass<FireMobDocument>, DocumentCache<FireMobDocument>>();

    private count = 0;
    private evictionTimer: number | null = null;
    private readonly docs: {
        [path: string]: TDocument;
    } = {};

    constructor(private readonly documentClass: IFireMobDocumentClass<TDocument>) {
    }

    public get(ref: firestore.DocumentReference) {
        const path = ref.path;
        let doc = this.docs[path];

        if (!doc) {
            this.docs[path] = doc = new this.documentClass(ref);
            if (++this.count === 1) {
                this.evictionTimer = window.setInterval(
                    this.evict,
                    5000);
            }
        }

        return doc;
    }

    private evict = () => {
        const now = new Date().getTime();
        const threshold = now - 1000;

        Object.keys(this.docs).forEach(path => {
            const doc = this.docs[path];
            if (!doc.isSubscriptionActive && doc.lastSubscriptionActiveTime > threshold) {
                delete this.docs[path];
                if (--this.count === 0 && typeof this.evictionTimer === "number") {
                    window.clearInterval(this.evictionTimer);
                    this.evictionTimer = null;
                }
            }
        });
    }
}
