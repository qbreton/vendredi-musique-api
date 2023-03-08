const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

function drawWinner() {
  // lire le fichier names.json
  const filePath = path.join(__dirname, 'names.json');
  const names = JSON.parse(fs.readFileSync(filePath));

  // choisir un nom au hasard parmi ceux qui n'ont pas encore été tirés
  const notDrawn = names.notDrawn;
  const drawn = names.drawn;
  const winnerIndex = Math.floor(Math.random() * notDrawn.length);
  const winner = notDrawn[winnerIndex];

  // mettre à jour les tableaux "notDrawn" et "drawn"
  notDrawn.splice(winnerIndex, 1);
  drawn.push(winner);

  // écrire le fichier names.json mis à jour
  const data = JSON.stringify(names, null, 2);
  fs.writeFileSync(filePath, data);

  return winner;
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

app.get('/draw', (req, res) => {
  const winner = drawWinner();
  res.json({ winner });
});

app.get('/names', (req, res) => {
    const { notDrawn, drawn } = getDrawnAndNotDrawn();
    res.json({ notDrawn, drawn });
});

app.listen(3001, () => {
  console.log('API is running on port 3001');
});