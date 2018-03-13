import * as firebase from "firebase/app";
import * as mobx from "mobx";

import { FireMobApp } from "./app";

describe("FireMobAuth", () => {
    const config = {
        apiKey: "AIzaSyAOJLY7_m7J42DGjrYt1xcXOjE_XMLOoh0",
        authDomain: "firemob-test.firebaseapp.com",
        databaseURL: "https://firemob-test.firebaseio.com",
        projectId: "firemob-test",
        storageBucket: "",
        messagingSenderId: "1003051175802"
    };

    it("can sign in and out using email and password", async () => {
        const app = new FireMobApp(config);
        const auth = app.auth;
        let uid = "dummy";

        const stop = mobx.autorun(() => uid = auth.uid)

        expect(auth.uid).toBe("");
        expect(uid).toBe("");
        expect(auth.errorCode).toBe("");
        expect(auth.isFetching).toBe(false);
        expect(auth.hasError).toBe(false);
        expect(auth.isSignedIn).toBe(false);

        const signIn = auth.signInWithEmailAndPassword("noone@nowhere.com", "password");

        expect(auth.uid).toBe("");
        expect(uid).toBe("");
        expect(auth.errorCode).toBe("");
        expect(auth.isFetching).toBe(true);
        expect(auth.hasError).toBe(false);
        expect(auth.isSignedIn).toBe(false);

        await Promise.all([
            signIn, 
            auth.whenNotFetching
        ]);

        expect(auth.uid).toBe("swppqZrvrihRps6QT6SYkbosuUM2");
        expect(uid).toBe("swppqZrvrihRps6QT6SYkbosuUM2");
        expect(auth.errorCode).toBe("");
        expect(auth.isFetching).toBe(false);
        expect(auth.hasError).toBe(false);
        expect(auth.isSignedIn).toBe(true);

        const signOut = auth.signOut();

        expect(auth.uid).toBe("swppqZrvrihRps6QT6SYkbosuUM2");
        expect(uid).toBe("swppqZrvrihRps6QT6SYkbosuUM2");
        expect(auth.errorCode).toBe("");
        expect(auth.isFetching).toBe(true);
        expect(auth.hasError).toBe(false);
        expect(auth.isSignedIn).toBe(true);

        await Promise.all([
            signIn, 
            auth.whenNotFetching
        ]);
        
        expect(auth.uid).toBe("");
        expect(uid).toBe("");
        expect(auth.errorCode).toBe("");
        expect(auth.isFetching).toBe(false);
        expect(auth.hasError).toBe(false);
        expect(auth.isSignedIn).toBe(false);

        stop();
        
        await app.dispose();
    });
});