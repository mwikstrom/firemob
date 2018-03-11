import { IFireMobCollection, IFireMobDocument, IFireMobRoot } from "./api";
import { FireMobDocument } from "./document";

export class FireMobCollection<TData extends {}> implements IFireMobCollection<TData> {
    private readonly _docs: {
        [id: string]: IFireMobDocument<TData>,
    };

    constructor(
        public readonly root: IFireMobRoot,
        public readonly name: string,
        public readonly parent: IFireMobDocument | null = null,
    ) { }

    public doc(id: string) {
        let doc = this._docs[id];

        if (!doc) {
            doc = this.createDocument(id);
            this._docs[id] = doc;
        }

        return doc;
    }

    protected createDocument(id: string) {
        return new FireMobDocument<TData>(this, id);
    }
}
