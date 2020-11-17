const Config = require("./config.json");
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const EventEmitter = require("events");

class chatData extends EventEmitter {
    constructor(sessionID) {
        super();
        this._data = [];
        this._ready = false;
        this._sessionID = sessionID;
        this._client = new MongoClient(`${Config.mongoDB.mongo}://${Config.mongoDB.user}:${Config.mongoDB.password}@${Config.mongoDB.host}`, {useNewUrlParser: true});
        this._client.connect((err) => {
            if (err) return chatData.sendError(err.message, err);
            assert.equal(null, err);
            this._collection = this._client.db('prefeitura').collection('logs');
            this.emit("ready");
            this._ready = true;
        });
    }

    newData(data) {
        data["date"] = new Date();
        this._data.push(data);
    }

    save() {
        this.on("ready", () => {
            this._updateData();
        });
        if (this._ready) this.emit("ready");
    }

    _updateData(i = this._data.length - 1) {
        if (i < 0) return this._endStream();
        this._collection.updateOne(
            {sessionID: this._sessionID},
            {$push: {log: this._data[i]}},
            {upsert: true}
        ).then(() => {
            this._updateData(i - 1);
        });
    }

    _endStream() {
        this._client.close();
    }

    static sendError(msg, e = {}) {
        console.log(e);
    }
}

module.exports = chatData;
