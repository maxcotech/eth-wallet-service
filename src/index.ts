import express from "express";
import HomeController from "./controllers/HomeController";
import AddressController from './controllers/AddressController';
import AppService from './services/AppService';
import BlockController from './controllers/BlockController';
import AppDataSource from './config/dataSource';
import TransactionController from './controllers/TransactionController';
import bodyParser from "body-parser";
import Controller from "./controllers/Controller";
import { requireAuthKey } from "./helpers/auth_helpers";

const app = express();
const port = 2100;
const jsonParser = bodyParser.json();

(async () => {
    try{
        await AppDataSource.initialize();
        console.log('App Data source initialized');
        const appService = new AppService();
        appService.syncBlockchainData();
        app.post("/address",jsonParser,await requireAuthKey(AddressController.createAddress));
        app.post("/transaction",jsonParser,await requireAuthKey(TransactionController.createTransaction));
        app.get("/", HomeController.index);
        app.get("/test-run", Controller.testRun)
        app.listen(port,() => {
            console.log(`Ethereum wallet service running on port ${port}`);
        })

    } catch(e){
        console.log('Failed to initialize App', e)
    }
    
})()






