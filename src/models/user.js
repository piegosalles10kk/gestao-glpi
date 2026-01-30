const mongoose = require('mongoose');

// 1. Competências (Categorias vindas do GLPI)
const CompetenciasSchema = new mongoose.Schema({
    _id: { type: Number }, 
    name: { type: String, required: true }, 
    completename: { type: String }, 
    level: { type: Number }
}, { versionKey: false });

const Competencia = mongoose.model('Competencia', CompetenciasSchema);

// 2. Cargos (Estrutura interna para agrupar competências)
const CargoSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true },
    descricao: { type: String },
    competencias: [{ 
        type: Number, 
        ref: 'Competencia' 
    }]
}, { versionKey: false, timestamps: true });

const Cargo = mongoose.model('Cargo', CargoSchema);

// 3. Usuário (Integrado com ID do GLPI e Cargo Interno)
const UserSchema = new mongoose.Schema({
    _id: { type: Number },           
    userNameGlpi: { type: String },  
    nome: { type: String, required: true },
    entidade: { type: String },
    telefone: { type: String },
    cargo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Cargo' 
    }
}, { versionKey: false, timestamps: true });

UserSchema.index({ email: 1 }, { sparse: true, unique: false, background: true });
const User = mongoose.model('User', UserSchema);

// ---------------------------------------------------------
// 4. NOVA IMPLEMENTAÇÃO: Entidades e Matriz de Prioridade
// ---------------------------------------------------------
const EntidadeSchema = new mongoose.Schema({
    _id: { type: Number }, // entidade_Id (ID vindo do GLPI)
    nome: { type: String, required: true }, // entidade_Name
    prioridade: { 
        type: Number, 
        default: 3, // Valor padrão de prioridade (ex: 1 a 5)
        min: 1,
        max: 5
    },
    // Se você precisar de uma matriz mais complexa, pode usar um campo Mixed:
    matriz_config: { type: mongoose.Schema.Types.Mixed } 
}, { versionKey: false, timestamps: true });

const Entidade = mongoose.model('Entidade', EntidadeSchema);

// Exportando o novo modelo junto com os outros
module.exports = { User, Competencia, Cargo, Entidade };