import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: String,
});

export default mongoose.model('Company', companySchema);
