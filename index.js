const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const port = process.env.PORT || 3000;
const cors = require('cors');

function drawWinner() {
  // lire le fichier names.json
  const filePath = path.join(__dirname, 'names.json');
  const names = JSON.parse(fs.readFileSync(filePath));

  // choisir un nom au hasard parmi ceux qui n'ont pas encore été tirés
  const notDrawn = names.notDrawn;
  if (notDrawn.length === 0) { return; }
  const drawn = names.drawn;
  const winnerIndex = Math.floor(Math.random() * notDrawn.length);
  let winner = notDrawn[winnerIndex];
  winner.dates.push(new Date().toISOString().slice(0, 10));

  // mettre à jour les tableaux "notDrawn" et "drawn"
  notDrawn.splice(winnerIndex, 1);
  drawn.push(winner);

  // écrire le fichier names.json mis à jour
  const data = JSON.stringify(names, null, 2);
  fs.writeFileSync(filePath, data);

  return names;
}

function getDrawnAndNotDrawn() {
    // lire le fichier names.json
    const filePath = path.join(__dirname, 'names.json');
    const names = JSON.parse(fs.readFileSync(filePath));
  
    // récupérer les tableaux "notDrawn" et "drawn"
    const notDrawn = names.notDrawn;
    const drawn = names.drawn;
  
    // retourner les tableaux "notDrawn" et "drawn"
    return { notDrawn, drawn };
}

function addName(name) {
    // lire le fichier names.json
    const filePath = path.join(__dirname, 'names.json');
    const names = JSON.parse(fs.readFileSync(filePath));

    // vérifier si le nom existe déjà
    const existsCondition = (person) => person.name === name;
    const nameExists = names.notDrawn.some(existsCondition)
      || names.drawn.some(existsCondition);
    if (nameExists) {
      throw new Error(`Le nom ${name} existe déjà.`);
    }

    // ajouter le nom à la liste "notDrawn"
    names.notDrawn.push({name, dates: []});

    // écrire les données dans le fichier names.json
    fs.writeFileSync(filePath, JSON.stringify(names));

    return { notDrawn: names.notDrawn, drawn: names.drawn };
}

function resetNames() {
  // lire le fichier names.json
  const filePath = path.join(__dirname, 'names.json');
  const names = JSON.parse(fs.readFileSync(filePath));
  const concat = (...arrays) => [].concat(...arrays.filter(Array.isArray));

  const newList = { notDrawn: concat(names.notDrawn, names.drawn), drawn: []};
  // écrire les données dans le fichier names.json
  fs.writeFileSync(filePath, JSON.stringify(newList));

  return newList;
}

function deleteNames(name) {
  const filePath = path.join(__dirname, 'names.json');
  const names = JSON.parse(fs.readFileSync(filePath));

  const notDrawn = names.notDrawn.filter((n) => n.name !== name);
  const drawn = names.drawn.filter((n) => n.name !== name);

  names.notDrawn = notDrawn;
  names.drawn = drawn;

  fs.writeFileSync(filePath, JSON.stringify(names));
  
  return names;
}

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001/vendredi-musique-front', 'https://qbreton.github.io']
};

app.use(cors());

app.get('/draw', (req, res) => {
  const list = drawWinner();
  res.json(list);
});

app.get('/names', (req, res) => {
    const { notDrawn, drawn } = getDrawnAndNotDrawn();
    res.json({ notDrawn, drawn });
});

app.post('/names', jsonParser, (req, res) => {
    const { name } = req.body;
    try {
      const { notDrawn, drawn } = addName(name);
      res.json({ notDrawn, drawn });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
});

app.delete('/names/:name', (req, res) => {
  res.json(deleteNames(req.params.name))
});

app.post('/reset', (req, res) => {
  const { notDrawn, drawn } = resetNames();
  res.json({ notDrawn, drawn });
});

app.listen(port, () => {
  console.log(`API is running on port ${port}`);
});