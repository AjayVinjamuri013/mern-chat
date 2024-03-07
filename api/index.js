const express = require('express');
const mongoose = require('mongoose');
const User = require('./Models/UserModel')
const jwt = require('jsonwebtoken')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcryptjs = require('bcryptjs')
const ws = require('ws');
const MessageModel = require('./Models/Message');


//It is not good to have passwords in the code.
//Hence, we are saving the connection string to mongodb (which has password)
//in the .env file and loading it though dotenv package.
require('dotenv').config();
mongoose.connect(process.env.MONGO_URL);

const bcryptSalt = bcryptjs.genSaltSync(10);
const app = express();
const jwtSecret = process.env.JWT_SECRET;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}))

async function getUserDataFromRequest(req) {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if(token){
            jwt.verify(token, jwtSecret, {}, (err, userData)=>{
                if(err) throw err;
                resolve(userData);
            });
        } else {
            reject('No token!');
        }
    });
}

app.get("/test", (req, res) => {
    res.json("test ok");
})

app.get('/messages/:userId', async (req, res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await MessageModel.find({
        sender: {$in:[userId, ourUserId]},
        recipient: {$in:[userId, ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
})

app.get('/people', async (req, res) => {
    res.json(await User.find({},{'_id':1,username:1}));
})

app.get('/profile', (req, res)=>{
    const token = req.cookies?.token;
    if(token){
        jwt.verify(token, jwtSecret, {}, (err, userData)=>{
            if(err) throw err;
            res.json(userData)
        })
    } else {
        res.status(401).json('no token');
    }
})

app.post('/login',async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if(foundUser){
        const passOk = bcryptjs.compareSync(password, foundUser.password)
        if(passOk){
            jwt.sign({userId:foundUser._id, username}, process.env.JWT_SECRET, {}, (err, token) => {
                if(err) throw err;
                res.cookie('token',token, {sameSite:'none', secure:true}).status(201).json({
                    id: foundUser._id,
                });
            })
        }
    }
})

app.post('/logout', (req, res) => {
  res.cookie('token','', {sameSite:'none', secure:true}).json('ok');
})

app.post("/register",async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPwd = bcryptjs.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username, password: hashedPwd
        });
        //we are signing in the user as soon as he is registered
        jwt.sign({userId:createdUser._id, username}, jwtSecret, {}, (err, token) => {
            if(err) throw err;
            res.cookie('token',token, {sameSite:'none', secure:true}).status(201).json({
                id: createdUser._id,
            });
        })
    }catch(err){
        if(err) throw err;
        res.status(500).json('error');
    }
    
})

const server = app.listen(4000);

//creating new web scoket server
const wss = new ws.WebSocketServer({server});

//all connections sit inside web socket.clients
wss.on('connection', (connection, req) => {

    function notifyAboutOnlinePeople(){
        //notifying everyone who is online about new connection.
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify(
                {
                    online : [...wss.clients].map(c => ({userId:c.userId,username:c.username}))
                }
            ))
        });
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate()
            notifyAboutOnlinePeople();
        }, 1000);
    }, 5000);

    connection.on('pong', () => {
        clearTimeout(connection.deathTimer);
    })
    //req.headers will have all the headers including cookies
    //cookies has token which as user information
    //there can be multiple cookie but we need only the token.
    //is there are multiple cookies, they will be separated by ";"
    const cookies = req.headers.cookie;
    if(cookies){
        const tokenCookieString = cookies.split(";").find(str => str.startsWith('token='));
        if(tokenCookieString){
            const token = tokenCookieString.split("=")[1];
            if(token){
                jwt.verify(token, jwtSecret, (error, userData)=>{
                    if(error) throw error;
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                })
            }
        }
    }

    connection.on('message', async (msg) => {
        const msgData = JSON.parse(msg.toString());
        const {recipient, text} = msgData;
        if(recipient && text){
            const msgDoc = await MessageModel.create({
                sender: connection.userId,
                recipient,
                text,
            });
            [...wss.clients]
                //we are not using find here because find will only return one instance
                //the user can be connected through multiple devices
                .filter(c => c.userId === recipient)
                .forEach(c => c.send(JSON.stringify({
                    _id: msgDoc._id,
                    text, 
                    recipient,
                    sender:connection.userId
                })));
        }
    });

    notifyAboutOnlinePeople();
});