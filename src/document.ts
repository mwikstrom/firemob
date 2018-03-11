import { IFireMobCollection, IFireMobDocument, IFireMobRoot } from "./api";
import { FireMobCollection } from "./collection";
import { FireMobCollectionSource } from "./source";

export class FireMobDocument<TData extends {}> extends FireMobCollectionSource implements IFireMobDocument<TData> {
    public readonly root: IFireMobRoot;
    public readonly data: TData; // TODO!

    constructor(
        public readonly parent: IFireMobCollection<TData>,
        public readonly id: string,
    ) {
        super();
        this.root = parent.root;
    }

    protected createCollection<TData>(name: string) {
        return new FireMobCollection<TData>(this.root, name, this);
    }
}
