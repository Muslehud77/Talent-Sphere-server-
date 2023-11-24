const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = 5000


// middleware
app.use(cors())
app.use(express.json())
















app.get('/',(req, res) => {
    res.send('TalentSphere is running')
})

app.listen(port,()=>{
    console.log(`TalentSphere is listening on ${port}`);
})