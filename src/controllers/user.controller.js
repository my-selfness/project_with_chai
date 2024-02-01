import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudnary} from "../utils/cloudnary.js"
import { ApiResponse } from "../utils/apiResponse.js";

import jwt from "jsonwebtoken"

const generateAccessTokenAndRefreshToken = async (userId)=>{
    try {
        const user =await User.findById(userId)

        const accessToken=user.generateAccessToken()

        // console.log(accessToken);
        const refreshToken=user.generateRefreshToken() 
        // console.log(refreshToken);


        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,`${error}`)
        // throw new ApiError(500,"Something went wrong while genrating refresh token")
        
    }
}


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

const loginUser= asyncHandler(async (req,res)=>{
    //get the username or email and password
    //existing the given username or email 
    //find the user 
    //check password 
    //access and refresh token 
    //send cookies
    //success message

    const {email,username,password}=req.body

    if (!username && !email) {
        throw new ApiError(400,"Username or Password is required")
    }

    const user=await User.findOne({
        $or:[{email},{username}]
    })

    if (!user) {
        throw new ApiError(404,"User does not exist")
    }
    
    const isPasswordValid=await user.isPasswordCorrect(password)

    if (!isPasswordValid ) {
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)
    const loggedInUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },"User Logged In Successfully")
    )


})


const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
        new ApiResponse(200,{},"User Logout successfully")
    )
})


const refreshAccessToken = asyncHandler(async (req,res)=>{
    try {
        const incomingRefreshToken=req.cookies.refreshToken|| req.body.refreshToken
    
        if (!incomingRefreshToken) {
            throw new ApiError(401,"Unautherized Request")
        }
    
    
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.ACCESS_TOKEN_SECRET
        )
    
        const user=await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401,"Invalid token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh token is expired or used")
        }
        const options={
            httpOnly :true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
    
    
        return res.status(200).cookie("accessToken",accessToken).cookie("refreshToken",newRefreshToken).json(
            new ApiResponse(200,{accessToken,newRefreshToken},"Access token Refreshed")
        )
    
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})


const changeCurrentPassword= asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(
        new ApiResponse(200,{},"Password save successfuly")
    )
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res.status(200).json(
        new ApiResponse(200,req.user,"Current User Scuccessfully")
    )
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullname,email}=req.body

    if (!fullname || !email) {
        throw new ApiError(400,"All field are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullname,
            email:email
        }
    },{new:true}).select("-password")


    return res.status(200).json(
        new ApiResponse(200,"Account Updated Successfully")
    )


})


const updateUserAvatar= asyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudnary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400,"Error while uploadingon avatar")
    }


    const user =await User.findByIdAndUpdate(req.user?._id,{$set:{
        avatar:avatar.url
    }},{new:true}).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"avatar is successfully updated")
    )
})

const updateUserCoverImage= asyncHandler(async (req,res)=>{
    const coverLocalPath=req.file?.path
    if (!coverLocalPath) {
        throw new ApiError(400,"cover file is missing")
    }

    const cover = await uploadOnCloudnary(coverLocalPath)

    if (!cover.url) {
        throw new ApiError(400,"Error while uploading cover")
    }


    const user=await User.findByIdAndUpdate(req.user?._id,{$set:{
        coverImage:cover.url
    }},{new:true}).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"cover is successfully updated")
    )

})


const getUserChannelProfile =  asyncHandler(async (req,res)=>{
    const {username}=req.params

    if (!username?.trim) {
        throw new ApiError(400,"Username is missing")
    }
    const channel = await User.aggregate([{
        $match:{
            username:username?.toLowerCase()
        }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribed"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                subscribedCount:{
                    $size:"$subscribed"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribedCount:1,
                subscriberCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404,"channel does not exists")
    }

    return res.status(200).json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully ")
    )
})





export 
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}