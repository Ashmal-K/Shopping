var  mongoClient =require('mongodb').MongoClient
const state = { 
    db:null 
}
module.exports.connect = function (done, callback) {
    const ConnectionUrl = 'mongodb://localhost:27017'
    const dbname = 'Shopping'
    mongoClient.connect(ConnectionUrl, (err,data)=>{
        if (err) return done(err)

        state.db = data.db(dbname)
       
    })
}
module.exports.get = () => {
    return state.db
}