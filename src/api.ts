export interface IFireMobRoot extends IFireMobCollectionSource {
    readonly auth: IFireMobAuth;
}

export interface IFireMobAuth {
    readonly uid: string;
    readonly errorCode: string;
    readonly hasError: boolean;
    readonly isFetching: boolean;
    whenNotFetching(): Promise<void>;    
}

export type FireStoreValue = any;

export interface IFireStoreData {
    readonly [field: string]: FireStoreValue;
}

export interface IFireMobCollectionSource {
    //collection<TData extends {} = IFireStoreData>(name: string): IFireMobCollection<TData>;
}

export interface IFireMobFilterBuilder<TData extends {}> {
    readonly not: IFireMobFilterBuilder<TData>;
    eq(value: FireStoreValue): IFireMobQuery<TData>;
    gt(value: FireStoreValue): IFireMobQuery<TData>;
    lt(value: FireStoreValue): IFireMobQuery<TData>;
    gte(value: FireStoreValue): IFireMobQuery<TData>;
    lte(value: FireStoreValue): IFireMobQuery<TData>;
}

export type SortDirection = 
    "ASC" | 
    "DESC";

export interface IFireMobQuery<TData extends {}> {    
    where(field: keyof TData): IFireMobFilterBuilder<TData>;
    orderBy(field: keyof TData): IFireMobQuery<TData>;
    orderBy(field: keyof TData, direction: SortDirection): IFireMobQuery<TData>;
    orderByDescending(field: keyof TData): IFireMobQuery<TData>;
}

export interface IFireMobCollection<TData extends {}> extends IFireMobQuery<TData> {
    readonly root: IFireMobRoot;
    readonly parent: IFireMobDocument;    
    doc(id: string): IFireMobDocument<TData>;
}

export interface IFireMobDocument<TData extends {} = IFireStoreData> extends IFireMobCollectionSource {
    readonly id: string;
    readonly data: TData;
    readonly parent: IFireMobCollection<TData>
    readonly root: IFireMobRoot;
}
