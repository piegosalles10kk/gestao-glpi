const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/MCP';
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        
        console.log('✅ MongoDB conectado com sucesso!');

        mongoose.connection.on('error', (err) => {
            console.error(`❌ Erro no Mongoose após conexão: ${err.message}`);
        });

    } catch (error) {
        console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
        
        process.exit(1); 
    }
};

module.exports = connectDB;