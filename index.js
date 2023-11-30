const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
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

    //*middlewares

    const verifyToken = (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res.status(401).send({ message: "Forbidden access" });
      }
      const token = authorization.split(" ")[1];
      jwt.verify(token, process.env.Token, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const result = await usersCollection.findOne({ email });
      const isAdmin = result?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };
    const verifyCreator = async (req, res, next) => {
      const email = req.decoded.email;
      const result = await usersCollection.findOne({ email });
      const isAdmin = result?.role === "creator";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    //* jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Token, { expiresIn: "5hr" });
      res.send({ token });
    });

    
    //* payment intent
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseInt(price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (err) {
        console.log(err);
      }
    });

    
    app.get("/paymentHistory", verifyToken, async (req, res) => {
      if (req.query.email === req.decoded.email) {
        const query = { email: req.query.email };
        const paymentHistory = await paymentCollection.find(query).toArray();
        res.send(paymentHistory);
      }
    });

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
            countQuery = {};
          } else {
            query = {
              ...query,
              contestCategory: req.query.sort,
            };
          }
        }

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
          })
          .skip(page * size)
          .limit(size)
          .toArray();

        const documentCount = await contestCollection
          .find(countQuery)
          .toArray();

        res.send({ contests: result, count: documentCount.length });
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

    app.get("/talented-users", async (req, res) => {
      try {
        const talented = await usersCollection
          .find(
            { contestWon: { $gt: 50 } },
            {
              projection: {
                _id: 1,
                userImg: 1,
                name: 1,
                contestWon: 1,
                contestParticipated: 1,
                prizeMoney: 1,
              },
            }
          )
          .toArray();

        res.send(talented);
      } catch (e) {
        console.log(e);
      }
    });

    app.post("/user", async (req, res) => {
      try {
        const user = req.body;

        const isExist = await usersCollection.findOne({ email: user.email });
        if (isExist) {
          return res.send({ isExist: isExist && true });
        }

        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/user", async (req, res) => {
      try {
        const query = { email: req.query.email };

        const user = await usersCollection.findOne(query);
        res.send(user);
      } catch (err) {
        console.log(err);
      }
    });

    //* Creator related api

    app.get("/happy-creators", async (req, res) => {
      const pipeline = [
        {
          $unwind: "$creatorInfo",
        },
        {
          $sort: { "creatorInfo.attempt": -1 },
        },
        {
          $group: {
            _id: "$creatorInfo.creatorName",
            creatorImage: { $first: "$creatorInfo.creatorImage" },
            totalContests: { $sum: 1 },
            contests: {
              $push: {
                id: "$_id",
                contestName: "$contestName",
                shortDescription: "$shortDescription",
                prizeMoney: "$prizeMoney",
                attempt: "$attempt",
                contestCategory: "$contestCategory",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            creatorName: "$_id",
            creatorImage: 1,
            totalContests: 1,
            contests: {
              $slice: ["$contests", 3], // Get at least 3 contests
            },
          },
        },
      ];

      const result = await contestCollection.aggregate(pipeline).toArray();
      res.json(result);
    });

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
