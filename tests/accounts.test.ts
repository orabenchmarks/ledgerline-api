import request from "supertest";
import { describe, expect, it } from "vitest";
import { auth, testApp } from "./helpers.js";

describe("accounts", () => {
  it("requires an api key", async () => {
    const { app } = testApp();
    expect((await request(app).get("/accounts")).status).toBe(401);
    expect((await request(app).get("/health")).status).toBe(200);
  });

  it("lists accounts with balances and 404s unknown ids", async () => {
    const { app } = testApp(3);
    const res = await request(app).get("/accounts").set(auth);
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ id: "acc_1", balanceCents: 600 });
    expect((await request(app).get("/accounts/nope").set(auth)).status).toBe(404);
  });

  it("posts a transaction and rejects invalid bodies", async () => {
    const { app } = testApp();
    const ok = await request(app).post("/accounts/acc_1/transactions").set(auth).send({ amountCents: 250, memo: "deposit" });
    expect(ok.status).toBe(201);
    expect(ok.body.id).toBe("tx_000001");
    expect((await request(app).post("/accounts/acc_1/transactions").set(auth).send({ amountCents: 0, memo: "x" })).status).toBe(400);
    expect((await request(app).post("/accounts/acc_1/transactions").set(auth).send({ amountCents: 5 })).status).toBe(400);
    expect((await request(app).get("/accounts/acc_1").set(auth)).body.balanceCents).toBe(250);
  });
});
