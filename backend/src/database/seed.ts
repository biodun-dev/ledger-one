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
        { name: 'Cash' },
        { name: 'Revenue' },
        { name: 'Expense' },
        { name: 'Liabilities' },
        { name: 'Equity' },
        { name: 'Bank' },
    ];

    for (const accData of accountsToCreate) {
        const existing = await accountRepo.findOneBy({ name: accData.name });
        if (!existing) {
            const account = new Account();
            account.name = accData.name;
            await accountRepo.save(account);
            console.log(`Created account: ${accData.name}`);
        } else {
            console.log(`Account already exists: ${accData.name}`);
        }
    }

    console.log('Seeding complete.');
    await AppDataSource.destroy();
}

seed().catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
});
