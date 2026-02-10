import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pokemon from './schema/pokemon.js';
import multer from 'multer';
import './connect.js';
import { log } from 'console';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'assets/pokemons');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/pokemons', async (req, res) => {
  try {
    /* We implement pagination with the standar : offset and limit */

    /* Querry Params */
    const offset = req.query?.offset || 0; // 0 as default value if not provided
    const limit = req.query?.limit || 20; // 20 as the default value if not provided
    
    const previousId = offset-limit-1 > 0 ? offset-limit-1 : 0;

    const pokemons = await pokemon.find({}).skip(offset).limit(limit);
    
    const firstId = pokemons.length > 0 ? pokemons[0].id : null;
    const lastId = pokemons.length > 0 ? pokemons[pokemons.length - 1].id : null;

    const lenght = (lastId-firstId) + 1;

    res.json({pagination : {nextId : lastId + 1, lenght : lenght, previousId : parseInt(previousId, 10)}, data :pokemons});

  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
})



app.get('/pokemons/search', async (req, res) => {
  try{

    const search_name = req.query?.name;

    if (!search_name) {
      return res.status(400).json({ message: 'Query param "name" is required.' });
    }

    const pokemons = await pokemon.find({
      "name.french": { $regex: search_name, $options: 'i' }
    });
    
    if(pokemons.length < 1){
      res.status(404).json({message : "Can't find this pokemon in database."})
    }
    res.json(pokemons);

  } catch (error){
    res.status(500).json({error: 'Internal Server Error'})
  }
})

app.delete('/pokemons/:id', async (req, res) => {
  try{
    const pokeId = parseInt(req.params.id, 10)

    const finPoke = await pokemon.findOne({ id: pokeId });

    if (!finPoke){
      res.json({message : "Can't find this pokemon"})
    }

    const poke = await pokemon.deleteOne({id : pokeId})
    console.log(poke)
    if (poke){
      res.json({message : "Succefully deleted pokemon"})
    }
    else{
      res.json({message : "Got wrong answer when tried to delete pokemon"})
    }
  } catch(error) {
    res.status(500).json({error: 'Internal Server Error'})
  }
})

app.put('/pokemons/:id', async (req, res) => {
  try {
    const pokeParams = req.body;
    const pokeId = parseInt(req.params.id, 10);

    const findPoke = await pokemon.findOne({ id: pokeId });
    if (!findPoke) {
      return res.status(404).json({ message: "Can't find this pokemon" });
    }

    
    const doc = new pokemon(pokeParams);
    await doc.validate(); // Checking if the params are good 

    const updated = await pokemon.findOneAndUpdate(
      { id: pokeId },
      { $set: pokeParams },
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({message: 'Validation failed: data does not match Pokemon schema.'});
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/pokemons', upload.single('file'), async (req, res) => {
  try {
    const rawBody = req.body;
    const maxIdDoc = await pokemon.findOne().sort({ id: -1 }).select('id').lean();
    const nextId = (maxIdDoc?.id ?? 0) + 1;

    const file = req.file;
    if (!file) {
      return res.status(400).send({ message: 'Please select a file.' });
    }
    const url = `http://localhost:3000/assets/pokemons/${file.filename}`;

    // Parse JSON strings sent from the frontend
    let parsedType = [];
    let parsedBase = {};

    try {
      if (rawBody.type) {
        parsedType = JSON.parse(rawBody.type);
      }
      if (rawBody.base) {
        parsedBase = JSON.parse(rawBody.base);
      }
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid JSON format for type or base.' });
    }

    const data = {
      id: nextId,
      name: {
        french: rawBody.nameFrench,
        english: rawBody.nameEnglish,
      },
      type: parsedType,
      base: parsedBase,
      image: url,
    };

    const doc = new pokemon(data);
    await doc.validate();

    const newPoke = await pokemon.create(data);
    return res.status(201).json(newPoke);
  } catch (error) {
    console.log("MEAAGE : ", error.message)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed: data does not match Pokemon schema.' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
})

app.get('/pokemons/:id', async (req, res) => {
  try {
    const pokeId = parseInt(req.params.id, 10);
    const poke = await pokemon.findOne({ id: pokeId });
    if (poke) {
      res.json(poke);
    } else {
      res.status(404).json({ error: 'Pokemon not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/pokemons')


console.log('Server is set up. Ready to start listening on a port.');

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});