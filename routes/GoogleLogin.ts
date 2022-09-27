import express from "express"
import { GetOAuth2, getAccessTokenURL, getCreds, GetUserCalendars} from "../utils/utils"
import { AddUserCalendars,  GenerateAuthToken } from "../UsersUtils/User";
import axios from "axios";
import _ from "lodash"
import asyncHandlerWrapper from "../middlewear/asyncErrorHandler";
import prisma from "../db";
import { User } from "@prisma/client";
import Auth from "../middlewear/auth";


const router = express.Router()

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

router.get("/oauth/google", (req,res) => {
    const content = getCreds() // get token from file 
    const OAuthClient = GetOAuth2(content); // add token to oauth client 
    res.redirect(getAccessTokenURL(OAuthClient, SCOPES)) // redirect user to google auth url 
})



const OauthLoginHandler = asyncHandlerWrapper((req, res) => {
    const { code, scope } = req.query // we get the code from the query params of URL
    const content = getCreds() // get token from file 
    const OAuthClient = GetOAuth2(content);
  
    if (!code) return res.send({error: "No token found"})

    // get the token from oauth client 
    OAuthClient
        .getToken(code as string,
             async (err: any, token: any) => {
                    if (err) return res.send("There was an error getting your credentials")
                    OAuthClient.setCredentials(token); // setting credentials to token
                    const { access_token, id_token } = token // getting access and id from token 
                    const UserURL = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`
  
                    // fetching user email and name from google servers 
                    try {
                        const googleUser = await axios
                        .get(UserURL,{headers: {Authorization: `Bearer ${id_token}`}})
                        .then((res) => res.data)

                        if (googleUser) {
                            const { name , email, picture } = googleUser
                            let user: User | null 

                            user = await prisma.user.findUnique({ where: { email }})

                            if (!user) user = await prisma.user.create({
                                data: {
                                    email,
                                    token,
                                    name,
                                    pfpUrl: picture
                                }
                            })  

                            const calendars = await prisma.calendar.findMany({where: {ownerId: user.id}})

                            const authJWT = GenerateAuthToken(user)

                            if (!calendars || calendars.length == 0) { 
                                const UserId = user.id
                                GetUserCalendars(email, (Calendars) => AddUserCalendars(UserId, Calendars))
                            }
                            // @ts-ignore
                            req.session.name = authJWT
                            req.session.save()
                            
                            res.cookie("auth-cookie", authJWT, {
                                maxAge: 1000 * 60 * 30,
                                secure: true,
                                httpOnly: true,
                                sameSite: "none",
                                domain: process.env.cookie_domain
                            })
                            return res.redirect(process.env.client_origin! + "/dashboard")

                        }
                        if (!googleUser) {
                            console.log("NO GOOGLE USER FOUND")
                        }
                    }
                    catch (err: any) {
                            if (err.code = "P2002")
                            return res.send({error: "There is already a user with this email"})
                    }

                })
})

router.get("/oauth/", OauthLoginHandler)
router.get("/logout", Auth, (req, res) => {
    res.clearCookie("gac_nc")
    res.status(200).send()
})

router.get("/cookie_test", (req,res) => {
    // @ts-ignore 
    req.session.name = "cookie!!!!!"
    res.send("Done request, check your cookies")
})

router.get("/cookie_test_get", (req,res) => {
    // @ts-ignore
    res.send(req.session.name)
})




export default router