export type FireStoreValue = any;

export interface IFireStoreData {
    readonly [field: string]: FireStoreValue;
}

export interface IFireMobCollectionSource {
    collection<TData extends {} = IFireStoreData>(name: string): IFireMobCollection<TData>;
}

export interface IFireMobStore extends IFireMobCollectionSource {
    readonly auth: IFireMobAuth;
}

export type FireMobState = 
    "transient" |
    "pending" |
    "ready" |
    "fault";

export interface IFireMobStateSource<TState> {    
    readonly state: TState;
    readonly notPending: Promise<void>;
}

export type FireMobAuthState = FireMobState;

export interface IFireMobAuth extends IFireMobStateSource<FireMobAuthState> {
    readonly uid: string;
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

export type FireMobQueryState = FireMobState;

export interface IFireMobQuery<TData extends {}> extends IFireMobStateSource<FireMobQueryState> {    
    where(field: keyof TData): IFireMobFilterBuilder<TData>;
    orderBy(field: keyof TData): IFireMobQuery<TData>;
    orderBy(field: keyof TData, direction: SortDirection): IFireMobQuery<TData>;
    orderByDescending(field: keyof TData): IFireMobQuery<TData>;
}

export interface IFireMobCollection<TData extends {}> extends IFireMobQuery<TData> {
    readonly store: IFireMobStore;
    readonly parent: IFireMobDocument;    
    doc(id: string): IFireMobDocument<TData>;
}

export type FireMobDocumentState = 
    FireMobState |
    "notfound" |
    "local" |
    "dirty";

export interface IFireMobDocument<TData extends {} = IFireStoreData> extends IFireMobCollectionSource, IFireMobStateSource<FireMobDocumentState> {
    readonly id: string;
    readonly data: TData;
    readonly parent: IFireMobCollection<TData>
    readonly store: IFireMobStore;
}
