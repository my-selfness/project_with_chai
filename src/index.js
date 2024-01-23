// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()







/*
import express from "express";

const app = express()

(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODOB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Err: ", error);
            throw error 
        })
        app.listem(process.env.PORT,()=>{
            console.log(`App is listing on ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error: ",error);
        throw error
    }
})()

*/