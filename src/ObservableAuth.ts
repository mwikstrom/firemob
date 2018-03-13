import * as firebase from "firebase/app";
import "firebase/auth";
import { Atom } from "mobx";
import { whenAsync } from "mobx-utils";

export class ObservableAuth {
    constructor(
        base: firebase.auth.Auth
    ) {
        Private.map.set(this, new Private(base));
    }

    public get uid() { return observe(this).uid; }

    public get errorCode() { return observe(this).errorCode; }

    public get hasError() { return observe(this).hasError; }

    public get isFetching() { return observe(this).isFetching; }

    public whenNotFetching() {
        const priv = observe(this);
        return whenAsync(() => !priv.isFetching);
    }
}

const observe = (instance: ObservableAuth) => {
    const priv = Private.map.get(instance);
    priv.atom.reportObserved();
    return priv;
};

class Private {
    public static map = new WeakMap<ObservableAuth, Private>();
    public readonly atom: Atom;
    public uid = "";
    public errorCode = "";
    public hasError = false;
    public isFetching = false;
    private unsubscribe: firebase.Unsubscribe | null = null;

    constructor(
        public readonly base: firebase.auth.Auth
    ) {
        this.atom = new Atom(
            base.app.name ? "Auth@" + base.app.name : "Auth",
            this.onBecomeObserved,
            this.onBecomeUnobserved
        );
    }    

    private onBecomeObserved = () => {
        this.isFetching = true;
        this.unsubscribe = this.base.onIdTokenChanged(
            this.onApplyUser,
            this.onApplyError,
        );
    }

    private onBecomeUnobserved = () => {
        this.unsubscribe!();
    }

    private onApplyUser = (user: firebase.User) => {
        const { uid } = user;
        let changed = false;

        if (this.isFetching) {
            this.isFetching = false;
            changed = true;
        }

        if (uid !== this.uid) {
            this.uid = uid;
            changed = true;
        }

        if (this.hasError) {
            this.hasError = false;
            changed = true;
        }

        if (this.errorCode) {
            this.errorCode = "";
            changed = true;
        }

        if (changed) {
            this.atom.reportChanged();
        }
    }

    private onApplyError = (error: firebase.auth.Error) => {
        const { code } = error;
        let changed = false;

        if (this.isFetching) {
            this.isFetching = false;
            changed = true;
        }

        if (!this.hasError) {
            this.hasError = true;
            changed = true;
        }

        if (code !== this.errorCode) {
            this.errorCode = code;
            changed = true;
        }

        if (changed) {
            this.atom.reportChanged();
        }
    }
}