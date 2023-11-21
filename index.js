const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());

console.log(process.env.DB_PASS)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m8ywqwd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const userCollection = client.db("bistroDb").collection("users");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartsCollection = client.db("bistroDb").collection("carts");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1hr' })
            res.send({ token })
        })

        const verifytoken = (req, res, next) => {
            console.log('access token', req.headers.authorization)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "forbidden access" })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verrfyadmin = async (req, res, next) => {
            const email = req.decoded?.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isadmin = user?.role == 'admin';
            if (!isadmin) {
                return res.status(401).send({ message: 'unauthorized access'})
            }
            next();
        }


        // users related api
        app.get('/users', verifytoken, async (req, res) => {
            console.log(req.headers)
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', verifytoken, verrfyadmin, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded?.email) {
                return res.status(401).send({ message: 'unathourized access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user.role === 'admin'
            }
            res.send({ admin })
        })

        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            const query = { email: userInfo.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "existing already added", insertedId: null })
            }
            const result = await userCollection.insertOne(userInfo)
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedoc)
            res.send(result)
        })


        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })



        // menu related api
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const cartsItem = req.body;
            const result = await cartsCollection.insertOne(cartsItem);
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('bistro boss clint is running')
})

app.listen(port, () => {
    console.log(`bistro boss pport is ruuning out ${port}`)
})