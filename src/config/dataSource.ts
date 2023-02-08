import "reflect-metadata"
import { DataSource } from "typeorm"
import Wallet from './../entities/Wallet';
import IndexedBlock from './../entities/IndexedBlock';
import ReceivedTransaction from "../entities/ReceivedTransaction";
import Contract from './../entities/Contract';
import SentTransaction from "../entities/SentTransaction";
import MessageQueue from './../entities/MessageQueue';
import VaultTransfer from './../entities/VaultTransfer';

const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: "eth_wallet_service",
    entities: [Wallet,IndexedBlock,ReceivedTransaction,Contract,SentTransaction,MessageQueue,VaultTransfer],
    synchronize: true,
    logging: false,
})

// to initialize initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
export default AppDataSource;