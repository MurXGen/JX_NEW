/* Journal (account) API. createAccount returns the full refreshed userData. */
import api from "./client";

export const createAccount = (accountName, currency = "USD", balance = 0) =>
  api
    .post("/account/create", { accountName, currency, balance })
    .then((r) => r.data);
