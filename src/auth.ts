import * as firebase from "firebase/app";
import "firebase/auth";
import { Atom } from "mobx";
import { whenAsync } from "mobx-utils";

import { IFireMobAuth } from "./api";

export class FireMobAuth implements IFireMobAuth {
    private readonly _atom: Atom;
    private _unsubscribe: firebase.Unsubscribe | null = null;
    private _uid = "";
    private _errorCode = "";
    private _hasError = false;
    private _isFetching = false;

    constructor(private readonly _base: firebase.auth.Auth) {
        this._atom = new Atom("FireMobAuth", this._onBecomeObserved, this._onBecomeUnobserved);
    }

    public get uid() {
        this._atom.reportObserved();
        return this._uid;
    }

    public get errorCode() {
        this._atom.reportObserved();
        return this._errorCode;
    }

    public get hasError() {
        this._atom.reportObserved();
        return this._hasError;
    }

    public get isFetching() {
        this._atom.reportObserved();
        return this._isFetching;
    }

    public whenNotFetching() {
        const self = this;
        return whenAsync(() => !self.isFetching);
    }

    private _onBecomeObserved = () => {
        this._isFetching = true;
        this._unsubscribe = this._base.onIdTokenChanged(
            this._onApplyUser,
            this._onApplyError,
        );
    }

    private _onBecomeUnobserved = () => {
        this._unsubscribe!();
    }

    private _onApplyUser = (user: firebase.User) => {
        const { uid } = user;
        let changed = false;

        if (this._isFetching) {
            this._isFetching = false;
            changed = true;
        }

        if (uid !== this._uid) {
            this._uid = uid;
            changed = true;
        }

        if (this._hasError) {
            this._hasError = false;
            changed = true;
        }

        if (this._errorCode) {
            this._errorCode = "";
            changed = true;
        }

        if (changed) {
            this._atom.reportChanged();
        }
    }

    private _onApplyError = (error: firebase.auth.Error) => {
        const { code } = error;
        let changed = false;

        if (this._isFetching) {
            this._isFetching = false;
            changed = true;
        }

        if (!this._hasError) {
            this._hasError = true;
            changed = true;
        }

        if (code !== this._errorCode) {
            this._errorCode = code;
            changed = true;
        }

        if (changed) {
            this._atom.reportChanged();
        }
    }
}
