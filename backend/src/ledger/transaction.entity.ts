import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

export enum EntryType {
    DEBIT = 'DEBIT',
    CREDIT = 'CREDIT',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    description: string;

    @Column({ nullable: true })
    reference: string;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Entry, (entry) => entry.transaction, { cascade: true })
    entries: Entry[];
}

@Entity('entries')
export class Entry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 20, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: EntryType })
    type: EntryType;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column()
    account_id: string;

    @ManyToOne(() => Transaction, (transaction) => transaction.entries)
    @JoinColumn({ name: 'transaction_id' })
    transaction: Transaction;

    @Column()
    transaction_id: string;
}
