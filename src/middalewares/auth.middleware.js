import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Jwt  from "jsonwebtoken";





//  not used "res" that why used _ 
export const varifyJWT = asyncHandler(async (req, _ ,next)=>{
try {
    const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    // console.log(token);
    if(!token){
        throw new ApiError(401,"Unautherized Request")
    }
        
    const decodedToken=await Jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

    const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if(!user){
        // NEXT_VIDEO: discuss about fronted.
        throw new ApiError(401,"Invalid Access Token")
    }
    
    req.user=user
    next()

} catch (error) {
    throw new ApiError(401,"i write here is an error ")
    // throw new ApiError(401,error?.message || "Invalid access token")
}
})