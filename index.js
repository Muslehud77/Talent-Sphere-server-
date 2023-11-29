const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = process.env.DB_URI;

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

    const talentSphere = client.db("Talent-Sphere");
    const contestCollection = talentSphere.collection("contest");
    const usersCollection = talentSphere.collection("users");

    //*contest related api calls

    app.get("/contest", async (req, res) => {
      let query = {
        detailedDescription: { $regex: req.query.search, $options: "i" },
      };

      let countQuery = { contestCategory: req.query.sort };

      try {
          const page = parseInt(req.query.page) - 1;
          const size = parseInt(req.query.size);

        

        if (req.query.sort) {
          if (req.query.sort === "All") {
            query = query;
            countQuery = {}
          } else {
            query = {
              ...query,
              contestCategory: req.query.sort,
            };
          }
        }

       console.log(query);

        const result = await contestCollection
          .find(query, {
            projection: {
              _id: 1,
              contestName: 1,
              contestImg: 1,
              attempt: 1,
              tags: 1,
              shortDescription: 1,
              detailedDescription: 1,
            contestCategory: 1,
            },
          }).skip(page*size).limit(size)
          .toArray();

          const documentCount = await contestCollection.find(countQuery).toArray()
          



        res.send({ contests: result ,count:documentCount.length});
      } catch (e) {
        console.log(e);
      }
    });

    app.get("/contest/:id", async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const result = await contestCollection.findOne(id);
      res.send(result);
    });

    app.get("/popular", async (req, res) => {
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
              shortDescription: 1,
            },
          }
        )
        .sort({ attempt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });



    //*user related api calls

    app.get('/talented-users',async(req,res)=>{
      
    try{
        const talented = await usersCollection.find(
        { contestWon: { $gt: 50 } },
        {
          projection: {
            _id: 1,
            userImg: 1,
            name: 1,
            contestWon: 1,
            contestParticipated : 1,
          },
        }
      ).toArray();

      res.send(talented)

    }catch(e) {
      console.log(e);
    }
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

app.get("/", (req, res) => {
  res.send("TalentSphere is running");
});

app.listen(port, () => {
  console.log(`TalentSphere is listening on ${port}`);
});
