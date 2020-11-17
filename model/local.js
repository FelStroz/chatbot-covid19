const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/drsaude', {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false }, () =>
    console.log('Connected to database')
);

const localSchema = new mongoose.Schema({
    nome: String,
    tipo: String,
    endereco: String,
    telefone: String,
    location: {
        type: {
            type: String,
            enum: ['Point'],
            // required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    createOn: {type: Date, default: Date.now},
    isActive: {type: Boolean, default: true}
});

module.exports = mongoose.model('Local', localSchema);
