import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();
      if (value > balance.total) {
        throw new AppError('Transaction outcome greater then total balance');
      }
    }

    const transactionCategory = await this.getOrCreateCategory(category);

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: transactionCategory,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }

  private async getOrCreateCategory(category: string): Promise<Category> {
    const categoriesRepository = getRepository(Category);
    const transactionCategory = await categoriesRepository.findOne({
      where: {
        title: category,
      },
    });
    if (transactionCategory) {
      return transactionCategory;
    }

    const newTransactionCategory = categoriesRepository.create({
      title: category,
    });
    await categoriesRepository.save(newTransactionCategory);
    return newTransactionCategory;
  }
}

export default CreateTransactionService;
