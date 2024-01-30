import { Router } from "express";
import { registerUser,loginUser,logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middalewares/multer.middleware.js";
import { varifyJWT } from "../middalewares/auth.middleware.js";

const router = Router()

router.route("/register").post(upload.fields([
    {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverImage",
        maxCount:1
    }
]),registerUser)

router.route('/login').post(loginUser)

//secured routes
router.route("/logout").post(varifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router