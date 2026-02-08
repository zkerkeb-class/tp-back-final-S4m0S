import express from 'express';
import pokemon from './schema/pokemon.js';

import './connect.js';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/pokemons', async (req, res) => {
  try {
    /* We implement pagination with the standar : offset and limit */

    /* Querry Params */
    const offset = req.query?.offset || 0; // 0 as default value if not provided
    const limit = req.query?.limit || 20; // 20 as the default value if not provided

    
    const pokemons = await pokemon.find({}).skip(offset).limit(limit);
    res.json(pokemons);

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