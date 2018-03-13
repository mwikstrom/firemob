import * as firebase from "firebase/app";
import "firebase/auth";
import { Atom, when } from "mobx";

export class FireMobAuth {
    constructor(
        base: firebase.auth.Auth,
    ) {
        Private.map.set(this, new Private(base));
    }

    public get uid() { return observe(this).uid; }

    public get errorCode() { return observe(this).errorCode; }

    public get hasError() { return observe(this).hasError; }

    public get isFetching() { return observe(this).isFetching; }

    public get isSignedIn() { return observe(this).isSignedIn; }

    public get whenNotFetching(): Promise<void> {
        return new Promise<void>(resolve => {
            when(() => !this.isFetching, resolve);
        });
    }

    public signInWithEmailAndPassword(email: string, password: string): Promise<void> {
        const priv = observe(this);
        const promise = priv.base.signInWithEmailAndPassword(email, password);
        priv.isFetching = true;
        return promise;
    }

    public signOut(): Promise<void> {
        const priv = observe(this);
        const promise = priv.base.signOut();
        priv.isFetching = true;
        return promise;
    }
}

const observe = (instance: FireMobAuth) => {
    const priv = Private.map.get(instance)!;
    priv.atom.reportObserved();
    return priv;
};

class Private {
    public static map = new WeakMap<FireMobAuth, Private>();
    public readonly atom: Atom;
    public uid = "";
    public errorCode = "";
    public hasError = false;
    public isFetching = false;
    public isSignedIn = false;
    private unsubscribe: firebase.Unsubscribe | null = null;
    private autoFetchWhenObserved = "localStorage" in window;

    constructor(
        public readonly base: firebase.auth.Auth,
    ) {
        this.atom = new Atom(
            "FireMobAuth@" + base.app.name,
            this.onBecomeObserved,
            this.onBecomeUnobserved,
        );
    }

    private onBecomeObserved = () => {
        this.isFetching = this.isFetching || this.autoFetchWhenObserved;
        this.unsubscribe = this.base.onIdTokenChanged(
            this.onApplyUser,
            this.onApplyError,
        );
    }

    private onBecomeUnobserved = () => {
        this.unsubscribe!();
    }

    private onApplyUser = (user: firebase.User) => {
        const isSignedIn = !!user;
        const uid = isSignedIn ? user.uid : "";
        const hasError = false;
        const errorCode = "";
        this.onApplyData(isSignedIn, uid, hasError, errorCode);
    }

    /* istanbul ignore next */
    private onApplyError = (error: firebase.auth.Error) => {
        const { code } = error;
        const hasError = true;
        this.onApplyData(this.isSignedIn, this.uid, hasError, code);
    }

    private onApplyData(
        isSignedIn: boolean,
        uid: string,
        hasError: boolean,
        errorCode: string,
    ) {
        let changed = false;

        const assign = <T>(before: T, after: T): T => {
            if (before !== after) {
                changed = true;
            }

            return after;
        };

        this.autoFetchWhenObserved = false;
        this.isFetching = assign(this.isFetching, false);
        this.isSignedIn = assign(this.isSignedIn, isSignedIn);
        this.uid = assign(this.uid, uid);
        this.hasError = assign(this.hasError, hasError);
        this.errorCode = assign(this.errorCode, errorCode);

        /* istanbul ignore else */
        if (changed) {
            this.atom.reportChanged();
        }
    }
}
