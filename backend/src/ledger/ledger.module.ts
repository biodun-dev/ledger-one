import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from '../common/idempotency.entity';
import { Account } from './account.entity';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { Entry, Transaction } from './transaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Transaction, Entry, Account, IdempotencyKey])],
    controllers: [LedgerController],
    providers: [LedgerService],
})
export class LedgerModule { }
