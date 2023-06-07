const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const port = process.env.PORT || 3001;
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');
const { compareSync } = require('bcryptjs');
require('dotenv').config();

const firebase = require('firebase-admin');
const firebaseAccount = JSON.parse(process.env.FIREBASE);

firebase.initializeApp({
  credential: firebase.credential.cert(firebaseAccount)
});
const db = firebase.firestore();

async function getFirebaseDoc() {
  const doc = db.collection('names').doc('names');
  const docData = await doc.get();

  if (docData.exists) {
    return docData.data();
  }
  return null;
}

async function drawWinner() {
  const names = await getFirebaseDoc();
  const doc = db.collection('names').doc('names');

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
  await doc.set({drawn, notDrawn});

  return names;
}

async function getDrawnAndNotDrawn() {
    const names = await getFirebaseDoc();
    return names;
}

async function addName(name) {
    // lire le fichier names.json
    const names = await getFirebaseDoc();
    const doc = db.collection('names').doc('names');

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
    await doc.set(names);

    return { notDrawn: names.notDrawn, drawn: names.drawn };
}

async function resetNames() {
  // lire le fichier names.json
  const names = await getFirebaseDoc();
  const doc = db.collection('names').doc('names');
  const concat = (...arrays) => [].concat(...arrays.filter(Array.isArray));

  const newList = { notDrawn: concat(names.notDrawn, names.drawn), drawn: []};
  // écrire les données dans le fichier names.json
  await doc.set(newList);

  return newList;
}

async function deleteNames(name) {
  const names = await getFirebaseDoc();
  const doc = db.collection('names').doc('names');

  const notDrawn = names.notDrawn.filter((n) => n.name !== name);
  const drawn = names.drawn.filter((n) => n.name !== name);

  names.notDrawn = notDrawn;
  names.drawn = drawn;

  await doc.set(names);
  
  return names;
}

async function undo(name) {
  if (name === "") { return; }

  const names = await getFirebaseDoc();
  const doc = db.collection('names').doc('names');
  
  names.drawn.map((person, index) => {
    if (person.name === name && person.dates.length > 0) {
      person.dates.pop();
      const personToMove = names.drawn.splice(index, 1)[0];
      names.notDrawn.push(personToMove);
    }
  });

  // écrire le fichier names.json mis à jour
  await doc.set(names);

  return names;
}


const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001/vendredi-musique-front', 'https://qbreton.github.io']
};

app.use(cors());

app.use('/draw', expressjwt({secret : process.env.JWT_SECRET, algorithms: ['HS256']}));
app.get('/draw', async (req, res) => {
  const list = await drawWinner();
  res.json(list);
});

// We block access to post names for unauthorized users
app.use('/names', expressjwt({secret : process.env.JWT_SECRET, algorithms: ['HS256']}).unless({ method: ['GET'] }));
app.get('/names', async (req, res) => {
    const names = await getDrawnAndNotDrawn();
    res.json(names);
});

app.post('/names', jsonParser, async (req, res) => {
    const { name } = req.body;
    try {
      const names = await addName(name);
      res.json(names);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
});

app.use('/names/:name', expressjwt({secret : process.env.JWT_SECRET, algorithms: ['HS256']}));
app.delete('/names/:name', async (req, res) => {
  const names = await deleteNames(req.params.name);
  res.json(names);
});

app.use('/:name/undo', expressjwt({secret : process.env.JWT_SECRET, algorithms: ['HS256']}));
app.post('/:name/undo', async(req, res) => {
  const names = await undo(req.params.name);
  res.json(names);
});

app.use('/reset', expressjwt({secret : process.env.JWT_SECRET, algorithms: ['HS256']}));
app.post('/reset', async (req, res) => {
  const names = await resetNames();
  res.json(names);
});

app.post('/login', jsonParser, (req, res) => {
  // Récupérer les identifiants d'utilisateur envoyés via la requête POST
  const { username, password } = req.body;

  // Vérifier si l'utilisateur est un admin
  if (username === process.env.ADMIN_USERNAME && compareSync(password, process.env.ADMIN_PASSWORD)) {
      // Si les identifiants sont valides, générer un token d'authentification
      const token = jwt.sign({ username: username }, process.env.JWT_SECRET);

      // Retourner le token d'authentification
      res.status(200).json({ token });
  } else {
      // Sinon, retourner un message d'erreur
      res.status(401).json({ message: "Invalid credentials" });
  }
})

app.listen(port, () => {
  console.log(`API is running on port ${port}`);
});