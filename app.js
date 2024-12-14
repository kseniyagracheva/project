// Подключение необходимых библиотек
import express from 'express'; //фрейм-ворк для создания веб сервреров
import mongoose from 'mongoose';//работа с MOngoDB
import bodyParser from 'body-parser';//парсер тела http запросов
import path from 'path';//модуль для работы с путями файлов
import { fileURLToPath } from 'url';//модуль для преобразования URL в пути файловой системы
import Vacancy from './models/Vacancies.js';
import Company from './models/Companies.js';
import Category from './models/Categories.js';
import { getInformation } from './handlers/informationHandler.js';


// Создание приложения Express
const app = express(); //создание экземпляра приложение Express
const port = 3000;
app.use(bodyParser.json());//мидлвейр для парсинга JSON в теле запросов    
app.use(express.json()); // Для обработки JSON-данных
app.use(express.urlencoded({ extended: true })); // Для обработки URL-кодированных данных

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); //получение пути к файлам

// Настройка EJS как шаблонизатора
app.set('view engine', 'ejs');//рендерим шаблоны с помощью ejs 
app.set('views', path.join(__dirname, 'templates'));//указываем директорию с шаблонами

// Подключение к MongoDB (реплика-сет)
mongoose.connect('mongodb://localhost:27017/job_portal?replicaSet=rs0&directConnection=true')
.then(() => {
    console.log('Подключение к MongoDB успешно!');
})
.catch(err => {
    console.error('Ошибка подключения к MongoDB:', err);
});

// Главная страница
app.get('/', async (req, res) => { //обработчик get-запроса к корневому url
    try {
        const { categoryId, companyId } = req.query; // Получаем параметры фильтрации из запроса
        // Начинаем агрегатный запрос
        let matchStage = {}; // Этап для фильтрации
        // Добавляем фильтрацию по категории, если указана
        if (categoryId) {
            matchStage.category_id = new mongoose.Types.ObjectId(categoryId); // Создаем ObjectId
        }
        // Добавляем фильтрацию по компании, если указана
        if (companyId) {
            matchStage.company_id = new mongoose.Types.ObjectId(companyId); // Создаем ObjectId
        }
        const allVacancies = await Vacancy.aggregate([
            { $match: matchStage }, // Применяем фильтрацию
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company_id',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category_id',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } }, // Сохраняем вакансии без компании
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }, // Сохраняем вакансии без категории
        ]);
        // Получаем все категории и компании для выпадающих списков
        const categories = await Category.find();
        const companies = await Company.find();

        res.render('index', {
            vacancies: allVacancies,
            categories,
            companies,
            selectedCategory: categoryId,
            selectedCompany: companyId,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});


// Вакансии
app.get('/vacancies', async (req, res) => {
    try {
        const allVacancies = await Vacancy.aggregate([
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company_id',
                    foreignField: '_id',
                    as: 'company',
                },
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category_id',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: '$company' },
            { $unwind: '$category' },
        ]);
        res.render('vacancies', { vacancies: allVacancies });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Добавить вакансию
app.route('/vacancies/add')
    .get(async (req, res) => {
        try {
            const companies = await Company.find(); // Получаем список компаний
            const categories = await Category.find(); // Получаем список категорий
            res.render('add_vacancy', { companies, categories }); // Рендерим шаблон с данными
        } catch (error) {
            console.error('Ошибка при получении компаний или категорий:', error);
            res.status(500).send('Ошибка при получении данных');
        }
    })
    .post(async (req, res) => {
        try {
            const newVacancy = new Vacancy({
                title: req.body.title,
                company_id: req.body.company_id,
                category_id: req.body.category_id,
            });
    
            await newVacancy.save();
            res.redirect('/vacancies');
        } catch (error) {
            console.error('Ошибка при добавлении вакансии:', error);
            res.status(400).send(error);
        }
    });

// Редактировать вакансию
app.route('/vacancies/edit/:id')
    .get(async (req, res) => {
        const vacancy = await Vacancy.findById(req.params.id);
        const companies = await Company.find();
        const categories = await Category.find();
        if (!vacancy) return res.status(404).send('Vacancy not found');
        res.render('edit_vacancy', { vacancy, companies, categories });
    })
    .post(async (req, res) => {
        try {    
            const updatedVacancy = {
                title: req.body.title,
                company_id: req.body.company_id,
                category_id: req.body.category_id,
            };
            // Обновляем вакансию
            await Vacancy.findByIdAndUpdate(req.params.id, updatedVacancy);
            res.redirect('/vacancies');
        } catch (error) {
            console.error('Ошибка при редактировании вакансии:', error);
            res.status(400).send(error);
        } 
});


// Удалить вакансию
app.get('/vacancies/delete/:id', async (req, res) => {
    try {
        const deletedVacancy = await Vacancy.findByIdAndDelete(req.params.id);
        if (!deletedVacancy) return res.status(404).send('Вакансия не найдена');
        res.redirect('/vacancies');
    } catch (error) {
        res.status(500).send(error);
    }
});

// Категории
app.get('/categories', async (req, res) => {
    try {
        const allCategories = await Category.find();
        res.render('categories', { categories: allCategories });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Добавить категорию
app.route('/categories/add')
    .get(async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render('add_category', { categories }); 
    } catch (error) {
        console.error('Ошибка при получении компаний или категорий:', error);
        res.status(500).send('Ошибка при получении данных');
    }
})
    .post(async (req, res) => {
        try {
            // Создаем новую категорию
            const newCategory = new Category({ name: req.body.name });
            await newCategory.save();
            res.redirect('/categories');
        } catch (error) {
            console.error('Ошибка при добавлении категории:', error);
            res.status(400).send(error);
        } 
});


// Редактировать категорию
app.route('/categories/edit/:id')
    .get(async (req, res) => {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send('Category not found');
        res.render('edit_category', { category });
    })
    .post(async (req, res) => {
        const updatedCategory = {
            name: req.body.name
        };
        await Category.findByIdAndUpdate(req.params.id, updatedCategory);
        res.redirect('/categories');
    });

// Удалить категорию
app.get('/categories/delete/:id', async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) return res.status(404).send('Категория не найдена');
        res.redirect('/categories');
    } catch (error) {
        res.status(500).send(error);
    }
});

// Компании
app.get('/companies', async (req, res) => {
    try {
        const allCompanies = await Company.find();
        res.render('companies', { companies: allCompanies });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Добавить компанию
app.route('/companies/add')
    .get(async (req, res) => {
    try {
        const companies = await Company.find(); 
        res.render('add_company', { companies }); 
    } catch (error) {
        console.error('Ошибка при получении компаний или категорий:', error);
        res.status(500).send('Ошибка при получении данных');
    }
})
.post(async (req, res) => {
    try {
        // Создаем новую категорию
        const newCompany = new Company({ name: req.body.name });
        await newCompany.save();
        res.redirect('/companies');
    } catch (error) {
        console.error('Ошибка при добавлении компании:', error);
        res.status(400).send(error);
    } 
});

// Редактировать компанию
app.route('/companies/edit/:id')
    .get( async (req, res) => {
        const company = await Company.findById(req.params.id);
        if (!company) return res.status(404).send('Компания не найдена');
        res.render('edit_company', { company });
    })
    .post( async (req, res) => {
        const updatedCompany ={
            name: req.body.name
        };
        await Company.findByIdAndUpdate(req.params.id, updatedCompany);
        res.redirect('/companies');
});

// Удалить компанию
app.get('/companies/delete/:id', async (req, res) => {
    try {
        const deletedCompany = await Company.findByIdAndDelete(req.params.id);
        if (!deletedCompany) return res.status(404).send('Компания не найдена');
        res.redirect('/companies');
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/information', getInformation);


// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
   console.log(`Сервер запущен на порту ${PORT}`);
});