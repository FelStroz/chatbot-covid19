const Config = require("./config.json");
const MongoClient = require('mongodb').MongoClient;

let client = new MongoClient(`${Config.mongoDB.mongo}://${Config.mongoDB.user}:${Config.mongoDB.password}@${Config.mongoDB.host}`, { useNewUrlParser: true });
let coll;

//Conecta com o mongoDB
client.connect(err => {
   if (err) return console.log(err);
   else coll = client.db("prefeitura").collection("services");
});

//Método que pegar a partir do valor de entidade
exports.getByEntity = async function (valor) {
    let promise = new Promise((resolve,reject)=>{
        setTimeout(()=>{
            coll.find( { servico : valor } ).toArray((err, result) => {
                resolve(result);
            });
        },500);
    });
    // Espera a promise
    let result = await promise;
    // Chibatou
    return result;
};
