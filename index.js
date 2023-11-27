const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000


// middleware
app.use(cors())
app.use(express.json())















const uri = process.env.DB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const talentSphere = client.db("Talent-Sphere")
    const contestCollection = talentSphere.collection("contest")

    //*contest related api calls

    app.get('/contest',async(req,res)=>{
        const result = await contestCollection
          .find({},{
            projection: {
              _id: 1,
              contestName: 1,
              contestImg: 1,
              attempt: 1,
              tags: 1,
              shortDescription: 1,
            },
          })
          .toArray();
        res.send(result)
    })

    app.get('/contest/:id',async(req,res)=>{
        const id = {_id: new ObjectId(req.params.id)}
        const result = await contestCollection.findOne(id)
        res.send(result)
    })

    app.get('/popular',async(req,res)=>{
        const result = await contestCollection
          .find(
            {},
            {
              projection: {
                _id: 1,
                contestName: 1,
                contestImg: 1,
                attempt: 1,
                tags: 1,
                shortDescription:1,
              },
            }
          )
          .sort({ attempt: -1 })
          .limit(6)
          .toArray();
        res.send(result)
    })








    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);













app.get('/',(req, res) => {
    res.send('TalentSphere is running')
})

app.listen(port,()=>{
    console.log(`TalentSphere is listening on ${port}`);
})