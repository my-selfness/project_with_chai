import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudnary} from "../utils/cloudnary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import { response } from "express";

const registerUser = asyncHandler(async (req,res)=>{
    // get users detail from fronted
    // validation - not empty
    // check if user already exists : username and email
    // check for images, check for avtar
    //upload them to cloudinary , avtar
    // create user obj - create entry in db
    // remove password and refresh token field from response
    // check for user creation creation
    //return res

    const {fullname,email,username,password}=req.body
    // console.log("email:",email);

    // beginer leve validation
    // if (fullname==="") {
    //     throw new ApiError(400,"FullName is Required")
    // }
    
    if ([fullname,email,username,password].some((field)=>field?.trim()==="")) {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser =await User.findOne({
        $or:[{username},{email}]
    })
    if (existedUser) {
        throw new ApiError(409,"User with email or username already exist")
    }
    // console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverImageLocatPath=req.files?.coverImage[0]?.path;
    let coverImageLocatPath;
    if (req.files && Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0) {
        coverImageLocatPath=req.files.coverImage[0].path
    }
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }
    
    const avatar=await uploadOnCloudnary(avatarLocalPath)
    const coverImage=await uploadOnCloudnary(coverImageLocatPath)
    
    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registerd Successfully")
    )

})


export {registerUser}