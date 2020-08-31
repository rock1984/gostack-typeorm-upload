import csvParse from 'csv-parse';

import fs from 'fs';
import { In, getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface CategoriesMap {
  [key: string]: Category;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const { categories, transactions } = await this.readTransactionsCSV(
      filePath,
    );

    const categoriesMap = await this.getOrCreateCategories(categories);

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const newTransactions = transactions.map(transaction => ({
      title: transaction.title,
      type: transaction.type,
      value: transaction.value,
      category: categoriesMap[transaction.category],
    }));
    const createdTransactions = transactionsRepository.create(newTransactions);
    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }

  private async getOrCreateCategories(
    categories: string[],
  ): Promise<CategoriesMap> {
    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesMap = existentCategories.reduce<CategoriesMap>(
      (acc, curr) => {
        acc[curr.title] = curr;
        return acc;
      },
      {},
    );

    const categoriesTitlesToAdd = categories.filter(
      category => !categoriesMap[category],
    );
    const uniqueCategoriesTitlesToAdd = Array.from(
      new Set(categoriesTitlesToAdd),
    );
    const categoriesToAdd = uniqueCategoriesTitlesToAdd.map(title => ({
      title,
    }));

    const newCategories = categoriesRepository.create(categoriesToAdd);

    await categoriesRepository.save(newCategories);

    newCategories.forEach(newCategory => {
      categoriesMap[newCategory.title] = newCategory;
    });
    return categoriesMap;
  }

  private async readTransactionsCSV(
    filePath: string,
  ): Promise<{ categories: string[]; transactions: TransactionCSV[] }> {
    const readCSVStream = fs.createReadStream(filePath);
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStream.pipe(parseStream);
    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];
    parseCSV.on('data', line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) {
        return;
      }

      if (category) {
        categories.push(category);
      }
      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });
    return { categories, transactions };
  }
}

export default ImportTransactionsService;
