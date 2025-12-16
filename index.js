require('dotenv').config()

// Import all dependencies
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin')

// Create app and configure middleware
const app = express()
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true
}))
app.use(express.json())

// Admin middleware creation for Security
const decoded = Buffer.from(process.env.FIREBASE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const verifyFirebaseToken = async (req, res, next) => {
    const token = req.headers.authorization
    if (!token) {
        return res.status(401).send({ errorCode: 401, message: 'Unauthorized Access' })
    }
    try {
        const idToken = token.split(' ')[1]
        const decoded = await admin.auth().verifyIdToken(idToken)
        req.decoded_email = decoded.email
        next()
    }
    catch {
        return res.status(401).send({ errorCode: 401, message: 'Unauthorized Access' })
    }
}

// Defining ports
const port = process.env.PORT || 3568


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@ticketkinen-app.zzmy5yu.mongodb.net/?appName=ticketkinen-app`;

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
        // await client.connect();


        // My code starts from here

        app.get('/', (req, res) => {
            res.send('Welcome to Ticket-kinen App database.')
        })

        // Collections
        const database = client.db('ticket-kinen-app')
        const users = database.collection('all-users')
        const tickets = database.collection('all-tickets')
        const bookings = database.collection('bookings')

        // Users
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.role = 'user'
            user.createdAt = new Date()
            const result = await users.insertOne(user)
            res.send(result)
        })
        app.get('/users', verifyFirebaseToken, async (req, res) => {
            const result = await users.find().toArray()
            res.send(result)
        })
        app.get('/users/user/:email', async (req, res) => {
            const { email } = req.params
            const query = { email: email }
            const result = await users.findOne(query)
            if (!result) {
                return res.send(false);
            }
            res.send(result.email === email || false)
        })
        app.get('/users/role/:email', async (req, res) => {
            const { email } = req.params
            const query = { email }
            const result = await users.findOne(query)
            if (!result) {
                return res.send(false);
            }
            res.send(result.role)
        })
        app.patch('/users/update-role', verifyFirebaseToken, async (req, res) => {
            const { email, role } = req.query
            const query = { email }
            const updateRole = {
                $set: { role: role }
            }
            const result = await users.updateOne(query, updateRole)
            res.send(result)
        })
        app.patch('/users/update-status', verifyFirebaseToken, async (req, res) => {
            const { email, status } = req.query
            const query = { email }
            const updateStatus = {
                $set: { status: status }
            }
            const result = await users.updateOne(query, updateStatus)
            res.send(result)
        })

        // Tickets
        app.post('/tickets', verifyFirebaseToken, async (req, res) => {
            const ticket = req.body
            ticket.createdAt = new Date()
            const result = await tickets.insertOne(ticket)
            res.send(result)
        })
        app.get('/tickets', verifyFirebaseToken, async (req, res) => {
            const result = await tickets.find().toArray()
            res.send(result)
        })
        app.get('/tickets/ticket/:id', verifyFirebaseToken, async (req, res) => {
            const { id } = req.params
            const query = { _id: new ObjectId(id) }
            const result = await tickets.findOne(query)
            res.send(result)
        })
        app.get('/tickets/my-tickets/:email', verifyFirebaseToken, async (req, res) => {
            const { email } = req.params
            const query = { vendorEmail: email }
            const result = await tickets.find(query).toArray()
            res.send(result)
        })
        app.get('/tickets/approved-tickets', async (req, res) => {
            const query = { status: 'approved' }
            const result = await tickets.find(query).toArray()
            res.send(result)
        })
        app.patch('/tickets/update/status', verifyFirebaseToken, async (req, res) => {
            const { id, status } = req.query
            const query = { _id: new ObjectId(id) }
            const updatedStatus = {
                $set: { status }
            }
            const result = await tickets.updateOne(query, updatedStatus)
            res.send(result)
        })
        app.patch('/tickets/update/onAdd', verifyFirebaseToken, async (req, res) => {
            const { id, onAdd } = req.query
            const query = { _id: new ObjectId(id) }
            const updateOnAdd = {
                $set: { onAdd: onAdd === 'false' ? false : true }
            }
            const result = await tickets.updateOne(query, updateOnAdd)
            res.send(result)
        })

        // ticket booking
        app.post('/bookings', verifyFirebaseToken, async (req, res) => {
            const bookingData = req.body
            bookingData.createdAt = new Date()
            const result = await bookings.insertOne(bookingData)
            res.send(result)
        })
        app.get('/bookings/my-bookings/:userEmail', verifyFirebaseToken, async (req, res) => {
            const { userEmail } = req.params
            const query = { userEmail }
            const result = await bookings.find(query).toArray()
            res.send(result)
        })
        app.get('/bookings/booking-request/:vendorEmail', verifyFirebaseToken, async (req, res) => {
            const { vendorEmail } = req.params
            const query = { vendorEmail }
            const result = await bookings.find(query).toArray()
            res.send(result)
        })
        app.patch('/bookings/update/booking-status', verifyFirebaseToken, async (req, res) => {
            const {id, bookingStatus} = req.query
            const query = {_id: new ObjectId(id)}
            const updateStatus = {
                $set: {bookingStatus}
            }
            const result = await bookings.updateOne(query, updateStatus)
            res.send(result)
        })


        // Listener
        app.listen(port, () => {
            console.log(`server is running on Port: ${port}`)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
