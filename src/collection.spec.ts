import * as firebase from "firebase/app";
import "firebase/firestore";

import { reaction } from "mobx";
import { FireMobApp } from "./app";
import { FireMobCollection } from "./collection";

describe("FireMobCollection", () => {
    const config = {
        apiKey: "AIzaSyAOJLY7_m7J42DGjrYt1xcXOjE_XMLOoh0",
        authDomain: "firemob-test.firebaseapp.com",
        databaseURL: "https://firemob-test.firebaseio.com",
        messagingSenderId: "1003051175802",
        projectId: "firemob-test",
        storageBucket: "",
    };

    let app: FireMobApp;
    let col: FireMobCollection;
    let stop: () => void = null;

    beforeEach(async () => {
        const path = "letters";

        app = new FireMobApp(config, "collection-test-" + Math.round(Math.random() * 10000));
        col = app.collection(path);
        stop = reaction(() => col.changeNumber, () => { /* no-op */ });

        expect(col.id).toBe(path);
        expect(col.ref.path).toBe(path);
    });

    afterEach(async () => {
        stop();
        await app.dispose();
    });

    it("Can fetch all letters in alphabetical order after signing in", async () => {
        await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");

        const q = col.orderById();
        await q.whenNotFetching;
        expect(q.length).toBe(5);
        expect(q.get(0).id).toBe("a");
        expect(q.get(1).id).toBe("b");
        expect(q.get(2).id).toBe("c");
        expect(q.get(3).id).toBe("d");
        expect(q.get(4).id).toBe("e");
    });

    it("Can fetch all non-wovels in descending alphabetical order after signing in __DEBUG__", async () => {
        await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");

        const q = col.orderByDescendingId().where("wovel", "==", false);
        await q.whenNotFetching;
        expect(q.length).toBe(3);
        expect(q.get(0).id).toBe("d");
        expect(q.get(1).id).toBe("c");
        expect(q.get(2).id).toBe("b");
    });

    it("Can fetch all wovels in alphabetical order without signing in", async () => {
        const q = col.orderById().where("wovel", "==", true);
        await q.whenNotFetching;
        expect(q.length).toBe(2);
        expect(q.get(0).id).toBe("a");
        expect(q.get(1).id).toBe("e");
    });

    it("Can fetch all wovels in descending alphabetical order without signing in", async () => {
        const q = col.orderByDescendingId().where("wovel", "==", true);
        await q.whenNotFetching;
        expect(q.length).toBe(2);
        expect(q.get(0).id).toBe("e");
        expect(q.get(1).id).toBe("a");
    });
});
