import * as firebase from "firebase/app";
import "firebase/firestore";

import { Atom } from "mobx";

class Private {
    public static map = new WeakMap<ObservableDocument, Private>();

    constructor(
        public readonly ref: firebase.firestore.DocumentReference
    ) {
    }
}

export class ObservableDocument {
    constructor(
        ref: firebase.firestore.DocumentReference
    ) {
        Private.map.set(this, new Private(ref));
    }

    public get ref() { return Private.map.get(this).ref; }
}
