const express = require('express');
const mongoose = require('mongoose');
const User = require('./Models/UserModel')
const jwt = require('jsonwebtoken')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcryptjs = require('bcryptjs')


//It is not good to have passwords in the code.
//Hence, we are saving the connection string to mongodb (which has password)
//in the .env file and loading it though dotenv package.
require('dotenv').config();
mongoose.connect(process.env.MONGO_URL);

const bcryptSalt = bcryptjs.genSaltSync(10);
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}))

app.get("/test", (req, res) => {
    res.json("test ok");
})

app.get('/profile', (req, res)=>{
    const token = req.cookies?.token;
    if(token){
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData)=>{
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

app.post("/register",async (req, res) => {
    const {username, password} = req.body;
    try {
        const hashedPwd = bcryptjs.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username, password: hashedPwd
        });
        //we are signing in the user as soon as he is registered
        jwt.sign({userId:createdUser._id, username}, process.env.JWT_SECRET, {}, (err, token) => {
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

app.listen(4000);