import express from "express";
import mongoose from "mongoose";
import fetch from "node-fetch";
import cors from "cors";
import 'dotenv/config';


const app = express();
const port = process.env.PORT || 5000;
const egovToken = process.env.EGOV_TOKEN;
const apiPrefix = '/api/v1'

const connectDB = async () => {
    if(mongoose.connections[0].readyState){
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URL, {});

        console.log('Connected successfully.');
    } catch (e) {
        console.log('Error in connecting to Mongo:', e)
    }
}

const LangSchemaObject = {
    uzbText: String,
    uzbKrText: String,
    rusText: String,
    engText: String
}

const getTradeListDBConf = () => {
    let Model;
    const Schema = new mongoose.Schema({
        structId: String,
        dataName: {
            uzbText: String,
            uzbKrText: String,
            rusText: String,
            engText: String
        },
        orgName: {
            uzbText: String,
            uzbKrText: String,
            rusText: String,
            engText: String
        },
        sphereName: {
            uzbText: String,
            uzbKrText: String,
            rusText: String,
            engText: String
        },
        name: String,
        fullCount: Number,
        userOrgId: Number,
        sphereId: String,
        lateDay: Number,
        isAi: Boolean,
        isGraph: Boolean,
        isAral: Boolean,
        hasAi: Boolean,
        geoType: [String],
        rating: Number,
        updateDate: Date,
        lastUpdate: Date,
    });
    const modelList = mongoose.models;

    if('trade_list' in modelList) Model = modelList.trade_list
    else Model = mongoose.model('trade_list', Schema);

    return {
        Schema,
        Model
    }
}


const getTradePassportDBConf = () => {
    let Model;
    const Schema = new mongoose.Schema({
        tradeId: String,
        fullName: String,
        telephone: String,
        ogrEmail: String,
        linkWeb: String,
        createDate: String,
        updateDate: String,
        name: String,
        orgName: {
            uzbText: String,
            uzbKrText: String,
            rusText: String,
            engText: String
        },
    });
    const modelPassport = mongoose.models;

    if('trade_passport' in modelPassport) Model = modelPassport.trade_passport
    else Model = mongoose.model('trade_passport', Schema);

    return {
        Schema,
        Model
    }
}



const setTradeListDataToDB = async () => {
    await connectDB();
    const {Model, Schema} = getTradeListDBConf()

    const egovResponse = await fetch(`https://data.egov.uz/apiClient/main/gettable?limit=10&offset=0&sphereId=607ff39e7b6428eee08802be`)
    const json = await egovResponse.json();

    if(json && json.result) {
        const tradeListSubModel = new Model();
        const a = await Model.insertMany(json.result.data);
    }
};

const setTradePassportDataToDB = async (data) => {
    await connectDB();
    const {Model, Schema} = getTradePassportDBConf()

    const tradeListSubModel = new Model();
    const a = await Model.insertMany(data);
};

app.use(cors())

app.get(apiPrefix + '/trade-table', async (req, res) => {
    if(Object.keys(req.query).length) {
        const {id} = req.query;
        if(!id) res.status(404).send({error: 'Query id is required'});

        try {
            const egovResponse = await fetch(`https://data.egov.uz/apiClient/Main/GetMainData?GuidId=${id}`, {
                method: 'POST',
                body: JSON.stringify({
                    fields: {},
                    guidId: id,
                    limit: 40,
                    offset: 0,
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const b = await egovResponse.json();
            res.json(b)
        } catch (e) {
            console.log(e)
            res.status(500).send('Error in fetching trade-table ' + e)
        }

    } else {
        res.status(404).send({error: 'Query Not Found'})
    }
})

app.get(apiPrefix + '/trade-passport', async (req, res) => {
    if(Object.keys(req.query).length) {
        const {id} = req.query;
        if(!id) res.status(404).send({error: 'Query id is required'});
        try {
            await connectDB();
            const {Model} = getTradePassportDBConf();
            const data = await Model.findOne({ tradeId: id }).exec();
            res.json({result: {data}})
        } catch (e) {
            console.log(e)
            res.status(500).send('Error in fetching trade-passport ' + e)
        }

    } else {
        res.status(404).send({error: 'Query Not Found'})
    }
})

app.get(apiPrefix + '/trade-list', async (req, res) => {
    if(Object.keys(req.query).length) {
        const {offset = 0, limit = 10} = req.query;

        try {
            await connectDB();
            const {Model} = getTradeListDBConf();
            const data = await Model.find();
            res.json({result: {data}});
        } catch (e) {
            console.log(e)
            res.status(500).send('Error in fetching trade-list ' + e)
        }

    } else {
        res.status(404).send({error: 'Query Not Found'})
    }
})

app.get(apiPrefix + '/trade', async (req, res) => {
    if(Object.keys(req.query).length) {
        const {name, offset = 0, limit = 10, lang = 'ru'} = req.query;
        if(!name) res.status(404).send({error: 'Query Name is required'});

        try {
            const egovResponse = await fetch(`https://data.egov.uz/apiPartner/Partner/WebService?token=${egovToken}&name=${name}&offset=${offset}&limit=${limit}&lang=${lang}`)
            const b = await egovResponse.json();
            res.json(b)
        } catch (e) {
            console.log(e)
            res.status(500).send('Error in fetching trade ' + e)
        }

    } else {
        res.status(404).send({error: 'Query Not Found'})
    }
})

app.get(apiPrefix + '/trade-file', async (req, res) => {
    if(Object.keys(req.query).length) {
        // fileType 1 = json; fileType 2 = xml; fileType 3 = xlsx
        // lang 1 = Uz; lang 2 = Уз, lang 3 = Ru
        const {id, fileType = 1, tableType = 2, lang = 3} = req.query;
        if(!id) res.status(404).send({error: 'Query id is required'});

        try {
            const egovResponse = await fetch(`https://data.egov.uz/apiData/MainData/GetByFile?id=${id}&fileType=${fileType}&tableType=${tableType}&lang=${lang}`)
            const blob = await egovResponse.blob();
            const arrayBuffer = await blob.arrayBuffer();

            res
                .append('Content-Type', egovResponse.headers.get('Content-Type'))
                .append('Content-Disposition', egovResponse.headers.get('Content-Disposition'))
                .append('Content-Length', egovResponse.headers.get('Content-Length'))
                .send(Buffer.from(arrayBuffer));

        } catch (e) {
            console.log(e)
            res.status(500).send('Error in fetching trade ' + e)
        }

    } else {
        res.status(404).send({error: 'Query Not Found'})
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
