import * as firebase from "firebase/app";
import "firebase/firestore";
import { autorun, observe } from "mobx";

import { FireMobApp } from "./app";
import { FireMobDocument } from "./document";
import { Unsubscribe } from "./snapshot";

describe("FireMobDocument", () => {
    const config = {
        apiKey: "AIzaSyAOJLY7_m7J42DGjrYt1xcXOjE_XMLOoh0",
        authDomain: "firemob-test.firebaseapp.com",
        databaseURL: "https://firemob-test.firebaseio.com",
        messagingSenderId: "1003051175802",
        projectId: "firemob-test",
        storageBucket: "",
    };

    describe("public document a", () => {
        let app: FireMobApp;
        let doc: FireMobDocument;

        beforeEach(async () => {
            const id = "a";
            const path = "test/" + id;

            app = new FireMobApp(config, "document-test-" + Math.round(Math.random() * 10000));
            doc = app.doc(path);

            expect(doc.id).toBe(id);
            expect(doc.ref.path).toBe(path);
            expect(doc.isFetching).toBe(true);

            await doc.whenNotFetching;
            expect(doc.isFetching).toBe(false);
        });

        afterEach(async () => {
            await app.dispose();
        });

        it("can be fetched", async () => {
            expect(doc.exists).toBe(true);
            expect(doc.hasError).toBe(false);
            expect(doc.hasData).toBe(true);
        });
    });

    describe("private document b", async () => {
        let app: FireMobApp;
        let doc: FireMobDocument;
        let cno = 0;
        let stop: Unsubscribe;

        beforeEach(async () => {
            const id = "b";
            const path = "test/" + id;

            app = new FireMobApp(config);
            doc = app.doc(path);
            stop = autorun(() => cno = doc.changeNumber);

            expect(doc.id).toBe(id);
            expect(doc.ref.path).toBe(path);
            expect(doc.isFetching).toBe(true);

            await doc.whenNotFetching;
            expect(doc.isFetching).toBe(false);
        });

        afterEach(async () => {
            await app.dispose();
            stop();
        });

        it("cannot be fetched when not signed in", async () => {
            expect(doc.hasData).toBe(false);
            expect(doc.hasError).toBe(true);
            expect(doc.errorCode).toBe("permission-denied");
        });

        it("can be fetched when signed in", async () => {
            await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");
            await doc.resume();
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(false);
        });

        it("subscription fail when signing out", async () => {
            await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");
            await doc.resume();
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(false);
            await app.auth.signOut();
            await doc.nextSync;
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(true);
            expect(doc.errorCode).toBe("permission-denied");
        });

        it("can be re-fetched after signing in", async () => {
            await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");
            await doc.resume();
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(false);

            app.auth.signOut();
            await doc.nextSync;
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(true);
            expect(doc.errorCode).toBe("permission-denied");

            const nextSync = doc.nextSync;
            await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");
            await doc.resume();

            await nextSync;
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(false);
        });

        it("can be observed while mutating", async () => {
            await app.auth.signInWithEmailAndPassword("noone@nowhere.com", "password");
            await doc.resume();

            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(true);
            expect(doc.hasError).toBe(false);
            expect(doc.hasPendingWrites).toBe(false);
            expect(doc.isFromCache).toBe(false);

            const after = Math.round(Math.random() * 10000000);
            doc.ref.update({ value: after });

            await doc.nextChange;
            expect(doc.hasPendingWrites).toBe(true);
            expect(doc.isFromCache).toBe(false);
            expect(doc.get("value")).toBe(after);

            await doc.nextSync;
            expect(doc.hasPendingWrites).toBe(false);
            expect(doc.isFromCache).toBe(false);
            expect(doc.get("value")).toBe(after);
        });
    });

    describe("non-existing document c", () => {
        let app: FireMobApp;
        let doc: FireMobDocument;
        let stop: Unsubscribe;
        let cno = 0;

        beforeEach(async () => {
            const id = "c";
            const path = "test/" + id;

            app = new FireMobApp(config);
            doc = app.doc(path);
            stop = autorun(() => cno = doc.changeNumber);

            expect(doc.id).toBe(id);
            expect(doc.ref.path).toBe(path);

            expect(doc.isFetching).toBe(true);
            await doc.whenNotFetching;
        });

        afterEach(async () => {
            stop();
            await app.dispose();
        });

        it("cannot be fetched", async () => {
            expect(doc.exists).toBe(null);
            expect(doc.isFetching).toBe(false);
            expect(doc.hasData).toBe(false);
            expect(doc.hasError).toBe(true);
            expect(doc.errorCode).toBe("permission-denied");
        });
    });
});
