const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const busSchema = new Schema({
    name: {
        type: String,
        required:true
    },
    lat: {
        type: String,
        required:true
    },
    lon: {
        type: String,
        required:true
    },
})


module.exports = mongoose.model("Bus", busSchema)