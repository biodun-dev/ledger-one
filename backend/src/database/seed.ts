import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { IdempotencyKey } from '../common/idempotency.entity';
import { Account } from '../ledger/entities/account.entity';
import { Entry, Transaction } from '../ledger/entities/transaction.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'ledger_user',
    password: process.env.POSTGRES_PASSWORD || 'ledger_password',
    database: process.env.POSTGRES_DB || 'ledger_db',
    entities: [Account, Transaction, Entry, IdempotencyKey],
    synchronize: false, // We rely on migrations
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for seeding...');

    const accountRepo = AppDataSource.getRepository(Account);

    const accountsToCreate = [
        { name: 'Cash', balance: 10000 },
        { name: 'Bank', balance: 50000 },
        { name: 'Equity', balance: 60000 },
        { name: 'Revenue', balance: 0 },
        { name: 'Expense', balance: 0 },
        { name: 'Liabilities', balance: 0 },
    ];

    for (const accData of accountsToCreate) {
        let account = await accountRepo.findOneBy({ name: accData.name });
        if (!account) {
            account = new Account();
            account.name = accData.name;
            console.log(`Creating account: ${accData.name}`);
        } else {
            console.log(`Updating account balance: ${accData.name}`);
        }

        account.balance = accData.balance;
        await accountRepo.save(account);
    }

    console.log('Seeding complete.');
    await AppDataSource.destroy();
}

seed().catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
});
