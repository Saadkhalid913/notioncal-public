import axios from "axios"
import express from "express"
import {  GenerateNotionAuthURL, CreateDatabase } from "../utils/NotionUtils"
import { AddUserNotionAccessToken, GetUserLatestUserPagesAndUpdate } from "../UsersUtils/User";
import { NotionAccessToken } from "../main";
import auth from "../middlewear/auth"
import asyncHandlerWrapper from "../middlewear/asyncErrorHandler";
import prisma from "../db"

const router = express.Router()


const OauthCallbackHandler = asyncHandlerWrapper(async (req, res) => {
    const { code } = req.body
    const { id } = req._user
    const AccessTokenRequestEndpoint = "https://api.notion.com/v1/oauth/token"

    const RequestBody = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.client_origin + "/oauth/notion"
    }


    const OauthID = process.env.notion_oauth_id!
    const Secret = process.env.notion_api_key!
    const AuthorizationCredentials = `${OauthID}:${Secret}`
    const EncodedCredentials = unicodeBase64Encode(AuthorizationCredentials)
    const RequestHeaders = {
        Authorization: `Basic ${EncodedCredentials}`
    }   

    const response = await axios.post<NotionAccessToken>(AccessTokenRequestEndpoint,
        RequestBody,
        { headers: RequestHeaders }
    ).catch(err => console.log("There was an error getting notion credentials with code"))
    
    if (!response) throw new Error("There was an error getting your access token")
    
    const AccessTokenSaveResponse = await AddUserNotionAccessToken(id, response.data)
    
    await GetUserLatestUserPagesAndUpdate(id , response.data).catch(err => {console.log(err); throw new Error("There was an error updating pages")})
    res.status(200).send({success: "Added notion credentials to user account sucessfully"})
})

const LoginHandlerWrapper = asyncHandlerWrapper((req, res) => {
    res.redirect(GenerateNotionAuthURL().toString())
})


const GetLatestPagesHandler = asyncHandlerWrapper(async (req,res) => {
    const userID = req._user.id
    const user = await prisma.user.findFirst({where: {id: userID}})
    if (!user) throw new Error("Could not find user with given id")
    const token = (user.notion_access_token as NotionAccessToken)
    const pages = await GetUserLatestUserPagesAndUpdate(userID, token).catch(err => {console.log(err); throw new Error("There was an error updating pages")})
    return res.send(pages)
})

const CreateDatabaseHandler = asyncHandlerWrapper(async (req,res) => {
    const User = await prisma.user.findUnique({where: {id : req._user.id}})
    if (!User) return res.status(404).send({error: "Could not find your profile"})
    const { PageID } = req.body;
    const response = await CreateDatabase(PageID, (User.notion_access_token as NotionAccessToken).access_token, "Calendar database")
    res.send({id: response.id})
})



router.get("/login", LoginHandlerWrapper) // done 
router.post("/", auth, OauthCallbackHandler) 

router.get("/pages/latest", auth, GetLatestPagesHandler)
router.post("/database/create", auth, CreateDatabaseHandler)

function unicodeBase64Decode(text: string) { return decodeURIComponent(Array.prototype.map.call(atob(text), function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }

// @ts-ignore
function unicodeBase64Encode(text: string) { return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function (match, p1) { return String.fromCharCode('0x' + p1); })); }

export default router