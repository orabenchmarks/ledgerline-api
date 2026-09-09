import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export type Account = { id: string; owner: string; currency: string; openedAt: string };
export type Transaction = { id: string; accountId: string; amountCents: number; memo: string; postedAt: string };
export type Data = { accounts: Account[]; transactions: Transaction[]; nextTx: number };

/**
 * A JSON file store: the whole ledger is read once and written back after
 * every mutation. Small on purpose; `path` can point at a temp file in tests.
 */
export class Store {
  private data: Data;

  constructor(private readonly path: string) {
    if (!existsSync(path)) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify({ accounts: [], transactions: [], nextTx: 1 }, null, 2));
    }
    this.data = JSON.parse(readFileSync(path, "utf8")) as Data;
  }

  accounts(): Account[] {
    return [...this.data.accounts];
  }

  account(id: string): Account | undefined {
    return this.data.accounts.find((a) => a.id === id);
  }

  /** Transactions of one account, newest first. */
  transactionsOf(accountId: string): Transaction[] {
    return this.data.transactions.filter((t) => t.accountId === accountId).sort((a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : b.id.localeCompare(a.id)));
  }

  balanceCents(accountId: string): number {
    return this.transactionsOf(accountId).reduce((sum, t) => sum + t.amountCents, 0);
  }

  addTransaction(input: Omit<Transaction, "id" | "postedAt"> & { postedAt?: string }): Transaction {
    const tx: Transaction = { id: `tx_${String(this.data.nextTx).padStart(6, "0")}`, postedAt: input.postedAt ?? new Date().toISOString(), accountId: input.accountId, amountCents: input.amountCents, memo: input.memo };
    this.data.nextTx += 1;
    this.data.transactions.push(tx);
    this.flush();
    return tx;
  }

  private flush(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }
}
