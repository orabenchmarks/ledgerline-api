import request from "supertest";
import { describe, expect, it } from "vitest";
import { auth, testApp } from "./helpers.js";

describe("transactions listing", () => {
  it("returns newest first with paging metadata", async () => {
    const { app } = testApp(5);
    const res = await request(app).get("/accounts/acc_1/transactions?pageSize=2").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.items[0].id).toBe("tx_000005");
  });

  it("validates paging parameters", async () => {
    const { app } = testApp(1);
    expect((await request(app).get("/accounts/acc_1/transactions?page=0").set(auth)).status).toBe(400);
    expect((await request(app).get("/accounts/acc_1/transactions?pageSize=500").set(auth)).status).toBe(400);
  });
});
