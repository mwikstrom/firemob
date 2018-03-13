import * as firebase from "firebase/app";
import "firebase/firestore";

export class FireMobDocument {
    constructor(
        ref: firebase.firestore.DocumentReference,
    ) {
        Private.map.set(this, new Private(ref));
    }

    public get ref() { return Private.map.get(this)!.ref; }
}

class Private {
    public static map = new WeakMap<FireMobDocument, Private>();

    constructor(
        public readonly ref: firebase.firestore.DocumentReference,
    ) {
    }
}
