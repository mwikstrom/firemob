import { IFireMobCollection, IFireMobCollectionSource, IFireStoreData } from "./api";

export abstract class FireMobCollectionSource implements IFireMobCollectionSource {
    private readonly _collections: {
        [name: string]: IFireMobCollection,
    } = {};

    public collection<TData extends {} = IFireStoreData>(name: string): IFireMobCollection<TData> {
        let collection = this._collections[name] as IFireMobCollection<TData>;

        if (!collection) {
            collection = this.createCollection<TData>(name);
            this._collections[name] = collection;
        }

        return collection;
    }

    protected abstract createCollection<TData extends {}>(name: string): IFireMobCollection<TData>;
}
