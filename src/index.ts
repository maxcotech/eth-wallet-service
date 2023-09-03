import express from "express";
import HomeController from "./controllers/HomeController";
import AddressController from './controllers/AddressController';
import AppService from './services/AppService';
import AppDataSource from './config/dataSource';
import TransactionController from './controllers/TransactionController';
import bodyParser from "body-parser";
import Controller from "./controllers/Controller";
import { requireAuthKey } from "./helpers/auth_helpers";
import { PORT } from "./config/settings";
import ContractController from './controllers/ContractController';
import MessageQueueService from "./services/MessageQueueService";
import ConfirmationService from "./services/ConfirmationService";

const app = express();
const jsonParser = bodyParser.json();

(async () => {
    try {
        await AppDataSource.initialize();
        console.log('App Data source initialized');
        const messageService = new MessageQueueService();
        const confirmationService = new ConfirmationService();
        app.post("/address", jsonParser, await requireAuthKey(AddressController.createAddress));
        app.post("/transaction", jsonParser, await requireAuthKey(TransactionController.createTransaction));
        app.post("/contract", jsonParser, await requireAuthKey(ContractController.saveContract));
        app.delete('/contract/:address', await requireAuthKey(ContractController.deleteContract));
        app.get("/fee-estimate", await requireAuthKey(TransactionController.getFeeEstimate));
        app.get("/", HomeController.index);
        app.get("/test-run", Controller.testRun);
        app.get('/retry-failed', async (req, res) => res.json({ message: await messageService.reQueueFailedMessages() }))
        app.listen(PORT, () => {
            console.log(`Ethereum wallet service running on port ${PORT}`);
        })

        const appService = new AppService();
        appService.syncBlockchainData();
        messageService.processMessageQueue();
        confirmationService.processUnconfirmedTransactions();

    } catch (e) {
        console.log('Failed to initialize App', e)
    }

})()






