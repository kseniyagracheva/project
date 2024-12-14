import mongoose from 'mongoose';

const vacancySchema = new mongoose.Schema({
    title: { type: String, required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
});

export default mongoose.model('Vacancy', vacancySchema);
