import * as firebase from "firebase/app";
import { FireMobApp } from "./app";
import { FireMobAuth } from "./auth";

describe("FireMobApp", () => {
    const config = {
        apiKey: "AIzaSyAOJLY7_m7J42DGjrYt1xcXOjE_XMLOoh0",
        authDomain: "firemob-test.firebaseapp.com",
        databaseURL: "https://firemob-test.firebaseio.com",
        messagingSenderId: "1003051175802",
        projectId: "firemob-test",
        storageBucket: "",
    };

    it("can be constructed without arguments", async () => {
        firebase.initializeApp(config);
        const app = new FireMobApp();
        expect(app.name).toBe("[DEFAULT]");
        expect(app.base).toBe(firebase.app());
        await app.dispose();
    });

    it("can be constructed with name only", async () => {
        firebase.initializeApp(config, "test");
        const app = new FireMobApp("test");
        expect(app.name).toBe("test");
        await app.dispose();
    });

    it("can be constructed with firebase config", async () => {
        const app = new FireMobApp(config);
        expect(app.name).toBe("[DEFAULT]");
        await app.dispose();
    });

    it("can be constructed with firebase config and name", async () => {
        const app = new FireMobApp(config, "test");
        expect(app.name).toBe("test");
        await app.dispose();
    });

    it("exposes a single auth instance", async () => {
        const app = new FireMobApp(config);
        const auth = app.auth;
        expect(auth).toBeInstanceOf(FireMobAuth);
        expect(app.auth).toBe(auth);
        await app.dispose();
    });
});
