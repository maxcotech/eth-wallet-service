import express from "express";
import HomeController from "./controllers/HomeController";
import AddressController from './controllers/AddressController';
import AppService from './services/AppService';
import BlockController from './controllers/BlockController';
import AppDataSource from './config/dataSource';
import TransactionController from './controllers/TransactionController';
import bodyParser from "body-parser";

const app = express();
const port = 2100;
const jsonParser = bodyParser.json();
AppDataSource.initialize().then(() => {
    console.log('Data Store initialized.');
}).catch((err) => {
    console.log('Data store initialization failed',err);
});
const appService = new AppService();

app.post("/address",jsonParser,AddressController.createAddress);
app.post("/transaction",jsonParser,TransactionController.createTransaction);
app.get("/", HomeController.index);



app.listen(port,() => {
    console.log(`Ethereum wallet service running on port ${port}`);
})


appService.syncBlockchainData();
