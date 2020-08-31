import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    return transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') {
          acc.income += Number(curr.value);
          acc.total += Number(curr.value);
        }
        if (curr.type === 'outcome') {
          acc.outcome += Number(curr.value);
          acc.total -= Number(curr.value);
        }
        return acc;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
  }
}

export default TransactionsRepository;
